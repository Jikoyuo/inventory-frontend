"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import {
    Package,
    Plus,
    Search,
    Edit,
    TrendingUp,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../../store/hooks';
import AppLayout from '../../components/AppLayout';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';

// --- TYPE DEFINITIONS ---
interface Product {
    id: string;
    name: string;
    sku: string;
    stock: number;
    price: number;
}

interface ToastData {
    message: string;
    type: 'success' | 'error';
}

interface ProdFormData {
    name: string;
    sku: string;
    stock: number;
    price: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [toast, setToast] = useState<ToastData | null>(null);
    const [isSubmittingProd, setIsSubmittingProd] = useState<boolean>(false);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

    const [prodForm, setProdForm] = useState<ProdFormData>({
        name: '', sku: '', stock: 0, price: 0
    });

    const [editForm, setEditForm] = useState<{
        name: string;
        sku: string;
        stock: number;
        unit: string;
        price: number;
    }>({ name: '', sku: '', stock: 0, unit: 'pcs', price: 0 });

    const accessToken = useAppSelector((state) => state.auth.accessToken);
    const privileges = useAppSelector((state) => state.auth.privileges);

    const hasPrivilege = (permission: string) => privileges.includes(permission);

    const fetchProducts = async (): Promise<void> => {
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
            console.log("Failed to fetch products");
        }
    };

    useEffect(() => {
        if (accessToken && hasPrivilege('product:view')) {
            fetchProducts();
        }
    }, [accessToken, privileges]);

    // WebSocket for real-time stock updates
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
                    if (['STOCK_UPDATE', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED'].includes(eventType)) {
                        fetchProducts();
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

    const handleProdSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (isSubmittingProd) return;
        setIsSubmittingProd(true);
        try {
            const payload = {
                name: prodForm.name,
                sku: prodForm.sku,
                stock: parseInt(String(prodForm.stock)),
                price: parseInt(String(prodForm.price))
            };
            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to create');
            setToast({ message: 'Product created!', type: 'success' });
            setIsProductModalOpen(false);
            setProdForm({ name: '', sku: '', stock: 0, price: 0 });
            fetchProducts();
        } catch (err) { setToast({ message: err instanceof Error ? err.message : 'Unknown error', type: 'error' }); }
        finally { setIsSubmittingProd(false); }
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setEditForm({
            name: product.name,
            sku: product.sku,
            stock: product.stock,
            unit: 'pcs',
            price: product.price || 0
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (!editingProduct || isSubmittingEdit) return;
        setIsSubmittingEdit(true);

        try {
            const payload = {
                name: editForm.name,
                sku: editForm.sku,
                stock: parseInt(String(editForm.stock)),
                unit: editForm.unit,
                price: parseInt(String(editForm.price))
            };
            const res = await fetch(`${API_URL}/products/${editingProduct.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to update');
            setToast({ message: 'Product updated!', type: 'success' });
            setIsEditModalOpen(false);
            fetchProducts();
        } catch (err) { setToast({ message: err instanceof Error ? err.message : 'Unknown error', type: 'error' }); }
        finally { setIsSubmittingEdit(false); }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AppLayout pageTitle="Warehouse Inventory">
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
                {/* Action Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent group-focus-within:bg-white group-focus-within:border-slate-400 rounded-xl outline-none transition-all placeholder:text-slate-400 text-slate-700"
                        />
                    </div>
                    {hasPrivilege('product:create') && (
                        <button
                            onClick={() => setIsProductModalOpen(true)}
                            className="w-full md:w-auto text-white bg-slate-800 hover:bg-slate-700 font-semibold text-sm flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all shadow-lg shadow-slate-800/25"
                        >
                            <Plus size={18} /> Add Product
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-16">No.</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Stock</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map((product, index) => (
                                    <motion.tr
                                        key={product.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        whileHover={{ backgroundColor: "#f8fafc" }}
                                        className="group transition-colors"
                                    >
                                        <td className="px-4 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{product.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-mono text-slate-600 bg-slate-100 rounded border border-slate-200">
                                                {product.sku}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-slate-700">
                                                Rp {product.price?.toLocaleString('id-ID') || '0'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-lg font-bold ${product.stock < 5 ? 'text-rose-500' : 'text-slate-700'}`}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {product.stock > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-600 border border-teal-100">
                                                    In Stock
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                    Empty
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {hasPrivilege('product:update') && (
                                                <button
                                                    onClick={() => openEditModal(product)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-600 border border-slate-200 hover:border-teal-200 transition-all"
                                                >
                                                    <Edit size={14} />
                                                    Edit
                                                </button>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredProducts.length === 0 && (
                        <div className="p-16 text-center text-slate-400">
                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package size={32} className="opacity-50" />
                            </div>
                            <p className="text-lg font-medium text-slate-600">No products found</p>
                            <p className="text-sm">Start by adding your first item to the inventory.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Product Modal */}
            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Add New Product">
                <form onSubmit={handleProdSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Product Name</label>
                        <input
                            type="text"
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                            value={prodForm.name}
                            onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">SKU</label>
                        <input
                            type="text"
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                            value={prodForm.sku}
                            onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Initial Stock</label>
                            <input
                                type="number"
                                required
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                                value={prodForm.stock}
                                onChange={(e) => setProdForm({ ...prodForm, stock: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Price (IDR)</label>
                            <input
                                type="number"
                                required
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                                value={prodForm.price}
                                onChange={(e) => setProdForm({ ...prodForm, price: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmittingProd}
                        className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 flex justify-center items-center gap-2"
                    >
                        {isSubmittingProd ? <Loader2 className="animate-spin" size={20} /> : 'Create Product'}
                    </button>
                </form>
            </Modal>

            {/* Edit Product Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Product">
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Product Name</label>
                        <input
                            type="text"
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">SKU</label>
                        <input
                            type="text"
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                            value={editForm.sku}
                            onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Stock</label>
                            <input
                                type="number"
                                required
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                                value={editForm.stock}
                                onChange={(e) => setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Price (IDR)</label>
                            <input
                                type="number"
                                required
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all"
                                value={editForm.price}
                                onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmittingEdit}
                        className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 flex justify-center items-center gap-2"
                    >
                        {isSubmittingEdit ? <Loader2 className="animate-spin" size={20} /> : 'Update Product'}
                    </button>
                </form>
            </Modal>

            <AnimatePresence>
                {toast && (
                    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
