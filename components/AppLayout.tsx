"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Menu, Bell, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

interface Notification {
    id: string;
    message: string;
    timestamp: Date;
    type: 'stock_update' | 'info' | 'warning';
    read: boolean;
    productName?: string;
    changeType?: 'IN' | 'OUT';
    quantity?: number;
}

interface AppLayoutProps {
    children: React.ReactNode;
    pageTitle?: string;
    headerActions?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, pageTitle, headerActions }) => {
    const user = useAppSelector((state) => state.auth.user);
    const privileges = useAppSelector((state) => state.auth.privileges);
    const accessToken = useAppSelector((state) => state.auth.accessToken);

    // Only show loading spinner if there's no token in Redux yet (first load / page refresh)
    const [isValidating, setIsValidating] = useState(!accessToken);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    const formatTimeAgo = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        return date.toLocaleDateString();
    };

    useEffect(() => {
        const validateAuth = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }

                const res = await fetch(`${API_URL}/auth/validate-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                if (!res.ok) {
                    localStorage.removeItem('accessToken');
                    const { logout } = await import('../store/slices/authSlice');
                    const { store } = await import('../store');
                    store.dispatch(logout());
                    window.location.href = '/login';
                    return;
                }

                const data = await res.json();
                const { setCredentials } = await import('../store/slices/authSlice');
                const { store } = await import('../store');
                store.dispatch(setCredentials({
                    token,
                    privileges: data.privileges || [],
                    user: {
                        id: data.user?.id || '',
                        name: data.user?.full_name || '',
                        email: data.user?.email || '',
                        role: data.role?.name || data.user?.role?.name || 'User',
                        roleCode: data.role?.code || data.user?.role?.code || ''
                    }
                }));

                setIsValidating(false);
            } catch (err) {
                console.error('Auth validation error:', err);
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
            }
        };

        validateAuth();
    }, []);

    useEffect(() => {
        if (!WS_URL || !accessToken || isValidating) return;

        let ws: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout;

        const connectWebSocket = () => {
            ws = new WebSocket(WS_URL);
            ws.onopen = () => setWsConnected(true);
            ws.onclose = () => {
                setWsConnected(false);
                reconnectTimeout = setTimeout(connectWebSocket, 3000);
            };
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const eventType = data.event || data.type;
                    if (eventType === 'HEARTBEAT') return;

                    const newNotif: Notification = {
                        id: `notif-${Date.now()}`,
                        message: data.message || `New update: ${eventType}`,
                        timestamp: new Date(),
                        type: 'info',
                        read: false,
                        productName: data.name || data.product_name,
                        changeType: data.change_type || (data.type === 'IN' ? 'IN' : data.type === 'OUT' ? 'OUT' : undefined),
                        quantity: data.stock || data.quantity
                    };
                    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
                } catch (err) { }
            };
        };

        connectWebSocket();
        return () => {
            clearTimeout(reconnectTimeout);
            ws?.close();
        };
    }, [accessToken, isValidating]);

    if (isValidating) {
        return (
            <div className="min-h-screen bg-[#CAF0F8] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <p className="text-sm text-white/80">Memuat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#CAF0F8] font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
            <div className="flex h-screen overflow-hidden">
                <Sidebar
                    user={user}
                    privileges={privileges}
                    isMobileMenuOpen={isMobileMenuOpen}
                    onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
                />

                <main className="flex-1 flex flex-col overflow-hidden relative bg-white rounded-tl-3xl shadow-xl">
                    <header className="sticky top-0 z-30 px-6 md:px-8 py-5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden"
                            >
                                <Menu size={24} />
                            </button>
                            <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                                {pageTitle || 'PRABS Inventory'}
                            </h2>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button
                                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                                    className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors relative"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {isNotifOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
                                            >
                                                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                                    <h3 className="font-bold text-slate-800">Notifications</h3>
                                                    <button onClick={() => setNotifications([])} className="text-xs text-slate-400 hover:text-rose-500">Clear</button>
                                                </div>
                                                <div className="max-h-[400px] overflow-y-auto">
                                                    {notifications.length === 0 ? (
                                                        <div className="p-8 text-center text-slate-400 text-sm">No notifications</div>
                                                    ) : (
                                                        notifications.map(notif => (
                                                            <div key={notif.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 flex gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.changeType === 'IN' ? 'bg-teal-100 text-teal-600' : 'bg-rose-100 text-rose-600'}`}>
                                                                    {notif.changeType === 'IN' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-slate-700">{notif.message}</p>
                                                                    <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(notif.timestamp)}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 overflow-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
