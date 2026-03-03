"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import {
    History,
    Plus,
    TrendingUp,
    Wallet,
    ArrowRightLeft,
    ChevronRight,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../../store/hooks';
import AppLayout from '../../components/AppLayout';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import CustomSelect from '../../components/CustomSelect';

// --- TYPE DEFINITIONS ---
interface Product {
    id: string;
    name: string;
    sku: string;
    stock: number;
}

interface Transaction {
    id: string;
    product_id: string;
    product: Product;
    type: 'IN' | 'OUT';
    quantity: number;
    note: string;
    created_by_user: {
        id: string;
        email: string;
        full_name: string;
    };
    created_at: string;
}

interface TxFormData {
    product_id: string;
    type: 'IN' | 'OUT';
    quantity: number | string;
    note: string;
    payment_type: 'cash' | 'transfer';
    total_payment: number;
}

interface ToastData {
    message: string;
    type: 'success' | 'error';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
    const [isCashModalOpen, setIsCashModalOpen] = useState<boolean>(false);
    const [cashGiven, setCashGiven] = useState<number>(0);
    const [pendingTxPayload, setPendingTxPayload] = useState<any | null>(null);
    const [isSubmittingTx, setIsSubmittingTx] = useState<boolean>(false);
    const [toast, setToast] = useState<ToastData | null>(null);

    const [txForm, setTxForm] = useState<TxFormData>({
        product_id: '', type: 'IN', quantity: 1, note: '', payment_type: 'cash', total_payment: 0
    });

    const accessToken = useAppSelector((state) => state.auth.accessToken);
    const privileges = useAppSelector((state) => state.auth.privileges);

    const hasPrivilege = (permission: string) => privileges.includes(permission);

    const fetchTransactions = async (): Promise<void> => {
        try {
            const res = await fetch(`${API_URL}/transactions`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data: Transaction[] = await res.json();
            setTransactions(data);
        } catch {
            console.log("Failed to fetch transactions");
        }
    };

    const fetchProductsForSelection = async (): Promise<void> => {
        try {
            const res = await fetch(`${API_URL}/products`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data: Product[] = await res.json();
            setProducts(data);
        } catch {
            console.log("Failed to fetch products for selection");
        }
    };

    useEffect(() => {
        if (accessToken && hasPrivilege('transaction:view')) {
            fetchTransactions();
            fetchProductsForSelection();
        }
    }, [accessToken, privileges]);

    // WebSocket for real-time transaction updates
    useEffect(() => {
        if (!WS_URL || !accessToken) return;

        let ws: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout;

        const connectWebSocket = () => {
            ws = new WebSocket(WS_URL);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const eventType = data.event || data.type;
                    if (['TRANSACTION_CREATED', 'STOCK_UPDATE'].includes(eventType)) {
                        fetchTransactions();
                    }
                } catch (err) {
                    console.error('WS parse error', err);
                }
            };
            ws.onclose = () => {
                reconnectTimeout = setTimeout(connectWebSocket, 3000);
            };
        };

        connectWebSocket();
        return () => {
            clearTimeout(reconnectTimeout);
            ws?.close();
        };
    }, [accessToken]);

    const handleTxSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (isSubmittingTx) return;

        const quantity = parseInt(String(txForm.quantity));
        const payload = {
            product_id: txForm.product_id,
            type: txForm.type,
            quantity: quantity,
            note: txForm.note,
            payment_type: txForm.payment_type,
            total_payment: txForm.total_payment
        };

        if (txForm.payment_type === 'cash') {
            setPendingTxPayload(payload);
            setCashGiven(0);
            setIsCashModalOpen(true);
            return;
        }

        await submitTransaction(payload);
    };

    const handleCashTxSubmit = async (): Promise<void> => {
        if (!pendingTxPayload || isSubmittingTx) return;

        if (cashGiven < pendingTxPayload.total_payment) {
            setToast({ message: 'Uang yang diberikan kurang!', type: 'error' });
            return;
        }

        await submitTransaction(pendingTxPayload);
    };

    const submitTransaction = async (payload: any) => {
        setIsSubmittingTx(true);
        try {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Transaction failed');
            setToast({ message: 'Transaction recorded!', type: 'success' });
            setIsTxModalOpen(false);
            setIsCashModalOpen(false);
            setPendingTxPayload(null);
            setTxForm({ product_id: '', type: 'IN', quantity: 1, note: '', payment_type: 'cash', total_payment: 0 });
            fetchTransactions();
        } catch (err) {
            setToast({ message: err instanceof Error ? err.message : 'Unknown error', type: 'error' });
        } finally {
            setIsSubmittingTx(false);
        }
    };

    return (
        <AppLayout pageTitle="Transaction History">
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">History Log</h3>
                        <p className="text-sm text-slate-500">Record of all stock movements</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchTransactions}
                            className="p-3 text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-xl transition-all border border-slate-200"
                            title="Refresh"
                        >
                            <History size={20} />
                        </button>
                        {hasPrivilege('transaction:create') && (
                            <button
                                onClick={() => setIsTxModalOpen(true)}
                                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg"
                            >
                                <Plus size={18} />
                                New Transaction
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Qty</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <History size={24} className="opacity-50" />
                                            </div>
                                            <p>No transaction history found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-slate-700">
                                                    {new Date(tx.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-slate-800">{tx.product?.name || 'Unknown Item'}</div>
                                                <div className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-1 rounded border border-slate-200">{tx.product?.sku || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${tx.type === 'IN'
                                                    ? 'bg-teal-50 text-teal-600 border-teal-100'
                                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                                                    }`}>
                                                    {tx.type === 'IN' ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-bold text-slate-700">{tx.quantity}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                        {tx.created_by_user?.full_name?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div className="text-sm text-slate-600">{tx.created_by_user?.full_name || 'System'}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-500 italic truncate max-w-[200px] block" title={tx.note}>
                                                    {tx.note || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* New Transaction Modal */}
            <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title="New Transaction">
                <form onSubmit={handleTxSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Select Product</label>
                        <CustomSelect
                            value={txForm.product_id}
                            onChange={(val) => setTxForm({ ...txForm, product_id: String(val) })}
                            placeholder="-- Choose Item --"
                            options={products.map(p => ({
                                value: p.id,
                                label: `${p.name} (Stock: ${p.stock})`
                            }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {['IN', 'OUT'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setTxForm({ ...txForm, type: type as 'IN' | 'OUT' })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${txForm.type === type ? (type === 'IN' ? 'bg-white text-teal-600 shadow-sm' : 'bg-white text-rose-500 shadow-sm') : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity</label>
                            <input
                                type="number"
                                min="1"
                                required
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                                value={txForm.quantity}
                                onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Type</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {[{ key: 'cash', label: 'Cash' }, { key: 'transfer', label: 'Transfer' }].map(pt => (
                                <button
                                    key={pt.key}
                                    type="button"
                                    onClick={() => setTxForm({ ...txForm, payment_type: pt.key as 'cash' | 'transfer' })}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${txForm.payment_type === pt.key ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {pt.key === 'cash' ? <Wallet size={16} /> : <ArrowRightLeft size={16} />}
                                    {pt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Total Payment (IDR)</label>
                        <input
                            type="number"
                            min="0"
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                            value={txForm.total_payment}
                            onChange={(e) => setTxForm({ ...txForm, total_payment: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                        <textarea
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                            rows={2}
                            value={txForm.note}
                            onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                        ></textarea>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmittingTx}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-teal-600 transition-all flex justify-center items-center gap-2"
                    >
                        {isSubmittingTx ? <Loader2 className="animate-spin" size={20} /> : (txForm.payment_type === 'cash' ? 'Lanjutkan ke Pembayaran' : 'Confirm Transaction')}
                    </button>
                </form>
            </Modal>

            {/* Cash Modal */}
            <Modal isOpen={isCashModalOpen} onClose={() => setIsCashModalOpen(false)} title="Peralatan Kembalian">
                <div className="space-y-6">
                    <div className="bg-teal-50 rounded-2xl p-5 border border-teal-100">
                        <p className="text-sm font-medium text-teal-600 mb-1">Total Belanja</p>
                        <p className="text-3xl font-bold text-slate-800">
                            IDR {(pendingTxPayload?.total_payment || 0).toLocaleString('id-ID')}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Uang Diberikan (IDR)</label>
                        <input
                            type="number"
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                            value={cashGiven || ''}
                            onChange={(e) => setCashGiven(parseInt(e.target.value) || 0)}
                            autoFocus
                        />
                    </div>
                    <div className={`rounded-2xl p-5 border ${cashGiven >= (pendingTxPayload?.total_payment || 0) ? 'bg-teal-50' : 'bg-rose-50'}`}>
                        <p className="text-sm">Kembalian: <span className="font-bold">IDR {Math.max(0, cashGiven - (pendingTxPayload?.total_payment || 0)).toLocaleString('id-ID')}</span></p>
                    </div>
                    <button
                        onClick={handleCashTxSubmit}
                        disabled={isSubmittingTx || cashGiven < (pendingTxPayload?.total_payment || 0)}
                        className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700"
                    >
                        Simpan Transaksi
                    </button>
                </div>
            </Modal>

            <AnimatePresence>
                {toast && (
                    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
