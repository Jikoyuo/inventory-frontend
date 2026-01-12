"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  Plus,
  Search,
  Bell,
  TrendingUp,
  Box,
  X,
  AlertTriangle,
  CheckCircle2,
  Menu,
  ChevronRight,
  Wallet,
  Edit,
  LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPE DEFINITIONS ---
interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  attributes: Record<string, string>;
}

interface ToastData {
  message: string;
  type: 'success' | 'error';
}

interface PreloaderProps {
  onComplete: () => void;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend: string;
  trendUp: boolean;
  delay: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

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

interface TxFormData {
  product_id: string;
  type: 'IN' | 'OUT';
  quantity: number | string;
  note: string;
}

interface ProdFormData {
  name: string;
  sku: string;
  stock: number;
  attributes: { key: string; value: string }[];
}

const API_URL = "http://localhost:8080/api/v1";
const WS_URL = "ws://localhost:8080/ws";

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="flex flex-col items-center relative"
      >
        {/* Glowing Background Effect */}
        <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full" />

        <Box className="w-20 h-20 mb-6 text-teal-400 relative z-10" strokeWidth={1.5} />
        <h1 className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-cyan-400">
          PRABS
        </h1>
        <p className="text-sm tracking-[0.5em] text-teal-600 font-medium mt-2 uppercase">Inventory</p>

        <div className="mt-8 h-1 w-48 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            onAnimationComplete={onComplete}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

// 2. Stat Card (Modern Glassy Look)
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(20, 184, 166, 0.2)" }}
    className="relative p-6 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className="p-3 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-colors duration-300">
        <Icon size={22} strokeWidth={2} />
      </div>
    </div>

    <div className="mt-4 flex items-center text-sm">
      <span className={`font-medium flex items-center ${trendUp ? 'text-teal-600' : 'text-rose-500'}`}>
        {trendUp ? <TrendingUp size={16} className="mr-1" /> : <TrendingUp size={16} className="mr-1 rotate-180" />}
        {trend}
      </span>
      <span className="text-slate-400 ml-2 text-xs">vs last month</span>
    </div>
  </motion.div>
);

// 3. Modal Component
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1 h-6 bg-teal-500 rounded-full" />
            {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// 4. Toast Notification
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl border border-slate-700/50"
    >
      <div className={`p-2 rounded-full ${type === 'success' ? 'bg-teal-500/20 text-teal-400' : 'bg-rose-500/20 text-rose-400'}`}>
        {type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
      </div>
      <div>
        <h4 className="font-semibold text-sm">{type === 'success' ? 'Success' : 'Attention'}</h4>
        <p className="text-sm text-slate-300">{message}</p>
      </div>
    </motion.div>
  );
};

// --- MAIN APPLICATION ---

export default function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory'>('dashboard');
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Forms State
  const [txForm, setTxForm] = useState<TxFormData>({ product_id: '', type: 'IN', quantity: 1, note: '' });
  const [prodForm, setProdForm] = useState<ProdFormData>({
    name: '', sku: '', stock: 0,
    attributes: [{ key: '', value: '' }]
  });

  // Edit Product State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    sku: string;
    stock: number;
    unit: string;
    price: number;
  }>({ name: '', sku: '', stock: 0, unit: 'pcs', price: 0 });

  // Calculate unread notifications count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Mock Fetch & WS Logic
  const fetchProducts = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/products`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: Product[] = await res.json();
      setProducts(data);
    } catch {
      console.log("Using Mock Data");
      setProducts([
        { id: '1', name: 'Macbook Pro M3', sku: 'MBP-001', stock: 12, attributes: { color: 'Space Grey', ram: '16GB' } },
        { id: '2', name: 'Logitech MX Master 3S', sku: 'LOG-MX3', stock: 4, attributes: { color: 'Black' } },
        { id: '3', name: 'Keychron Q1 Pro', sku: 'KEY-Q1', stock: 0, attributes: { switch: 'Banana', layout: '75%' } },
      ]);
    }
  };

  // WebSocket Connection
  useEffect(() => {
    if (loading) return;

    fetchProducts();

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting in 3s...');
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws?.close();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          console.log('WebSocket message received:', event.data);
          const data = JSON.parse(event.data as string);

          // Handle various event types from backend
          const eventType = data.event || data.type;

          // Determine notification details based on event type
          let message = '';
          let notifType: 'stock_update' | 'info' | 'warning' = 'stock_update';
          let changeType: 'IN' | 'OUT' | undefined = undefined;
          let productName = data.name || data.product_name || '';
          let quantity = data.stock || data.quantity;

          switch (eventType) {
            case 'PRODUCT_CREATED':
              message = `New product "${productName}" created with ${quantity} stock`;
              notifType = 'info';
              changeType = 'IN';
              break;
            case 'PRODUCT_UPDATED':
              message = data.message || `Product "${productName}" updated`;
              notifType = 'info';
              break;
            case 'PRODUCT_DELETED':
              message = data.message || `Product "${productName}" deleted`;
              notifType = 'warning';
              break;
            case 'STOCK_UPDATE':
            case 'stock_update':
              message = data.message || `Stock updated for ${productName}`;
              changeType = data.change_type || data.transaction_type;
              break;
            case 'TRANSACTION_CREATED':
              message = data.message || `Transaction recorded for ${productName}`;
              changeType = data.type === 'IN' ? 'IN' : 'OUT';
              quantity = data.quantity;
              break;
            default:
              // Handle any other events
              message = data.message || `Update received: ${eventType}`;
              console.log('Unknown event type:', eventType);
          }

          // Create notification
          const newNotification: Notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message,
            timestamp: new Date(),
            type: notifType,
            read: false,
            productName,
            changeType,
            quantity
          };

          // Add to notifications (max 50)
          setNotifications(prev => [newNotification, ...prev].slice(0, 50));

          // Show toast
          setToast({
            message: newNotification.message,
            type: 'success'
          });

          // Refresh products
          fetchProducts();
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Handlers (Keeping logic same as before)
  const handleTxSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      const payload = { ...txForm, quantity: parseInt(String(txForm.quantity)) };
      const res = await fetch(`${API_URL}/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Transaction failed');
      setToast({ message: 'Transaction recorded!', type: 'success' });
      setIsTxModalOpen(false);
      fetchProducts();
    } catch (err) { setToast({ message: err instanceof Error ? err.message : 'Unknown error', type: 'error' }); }
  };

  const handleProdSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const attrObj: Record<string, string> = {};
    prodForm.attributes.forEach(a => { if (a.key) attrObj[a.key] = a.value; });
    try {
      const payload = { name: prodForm.name, sku: prodForm.sku, stock: parseInt(String(prodForm.stock)), attributes: attrObj };
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create');
      setToast({ message: 'Product created!', type: 'success' });
      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err) { setToast({ message: err instanceof Error ? err.message : 'Unknown error', type: 'error' }); }
  };

  // Open Edit Modal
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      sku: product.sku,
      stock: product.stock,
      unit: 'pcs',
      price: 0
    });
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!editingProduct) return;

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update product');
      setToast({ message: 'Product updated successfully!', type: 'success' });
      setIsEditModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Unknown error', type: 'error' });
    }
  };

  const handlePreloaderComplete = (): void => {
    setTimeout(() => setLoading(false), 500);
  };

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      <AnimatePresence>
        {loading && <Preloader onComplete={handlePreloaderComplete} />}
      </AnimatePresence>

      {!loading && (
        <div className="flex h-screen overflow-hidden">

          {/* MOBILE OVERLAY */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          )}

          {/* SIDEBAR */}
          <aside className={`
            fixed md:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className="p-8">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
                  <Box size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">PRABS</h1>
                  <span className="text-xs font-semibold text-teal-600 tracking-widest uppercase">Inventory</span>
                </div>
              </div>

              <nav className="space-y-2">
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                  { id: 'inventory', icon: Package, label: 'Inventory' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as 'dashboard' | 'inventory'); setIsMobileMenuOpen(false); }}
                    className={`
                      w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group
                      ${activeTab === item.id
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-teal-600'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} className={activeTab === item.id ? 'text-teal-100' : 'text-slate-400 group-hover:text-teal-500'} />
                      {item.label}
                    </div>
                    {activeTab === item.id && <ChevronRight size={16} className="text-teal-100 opacity-80" />}
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-auto p-6 m-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border-2 border-white shadow-sm">
                  AP
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Admin Prabs</p>
                  <p className="text-xs text-slate-500">Warehouse Mgr</p>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="flex-1 flex flex-col overflow-hidden relative">
            {/* HEADER */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 md:px-8 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden"
                >
                  <Menu size={24} />
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                  {activeTab === 'dashboard' ? 'Overview' : 'Warehouse Inventory'}
                </h2>
              </div>

              <div className="flex items-center gap-3 md:gap-4">
                {/* WebSocket Status Indicator */}
                <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${wsConnected ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-teal-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  {wsConnected ? 'Live' : 'Offline'}
                </div>

                {/* Notification Bell with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors relative group"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  <AnimatePresence>
                    {isNotifOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsNotifOpen(false)}
                        />

                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
                        >
                          {/* Header */}
                          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-5 bg-teal-500 rounded-full" />
                              <h3 className="font-bold text-slate-800">Notifications</h3>
                              {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-xs font-bold rounded-full">
                                  {unreadCount} new
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {unreadCount > 0 && (
                                <button
                                  onClick={markAllAsRead}
                                  className="text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 hover:bg-teal-50 rounded-lg transition-colors"
                                >
                                  Mark all read
                                </button>
                              )}
                              {notifications.length > 0 && (
                                <button
                                  onClick={clearAllNotifications}
                                  className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Notification List */}
                          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                              <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <Bell size={24} className="text-slate-400" />
                                </div>
                                <p className="text-sm font-medium text-slate-600">No notifications</p>
                                <p className="text-xs text-slate-400 mt-1">Stock updates will appear here</p>
                              </div>
                            ) : (
                              notifications.map((notif) => (
                                <motion.div
                                  key={notif.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  onClick={() => markAsRead(notif.id)}
                                  className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.read ? 'bg-teal-50/50' : ''}`}
                                >
                                  <div className="flex gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.changeType === 'IN'
                                      ? 'bg-teal-100 text-teal-600'
                                      : notif.changeType === 'OUT'
                                        ? 'bg-rose-100 text-rose-600'
                                        : 'bg-cyan-100 text-cyan-600'
                                      }`}>
                                      {notif.changeType === 'IN' ? (
                                        <TrendingUp size={18} />
                                      ) : notif.changeType === 'OUT' ? (
                                        <TrendingUp size={18} className="rotate-180" />
                                      ) : (
                                        <Package size={18} />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm ${!notif.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                        {notif.message}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {notif.productName && (
                                          <span className="text-xs font-medium text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded">
                                            {notif.productName}
                                          </span>
                                        )}
                                        {notif.quantity && (
                                          <span className={`text-xs font-bold ${notif.changeType === 'IN' ? 'text-teal-600' : 'text-rose-500'}`}>
                                            {notif.changeType === 'IN' ? '+' : '-'}{notif.quantity}
                                          </span>
                                        )}
                                        <span className="text-xs text-slate-400">
                                          {formatTimeAgo(notif.timestamp)}
                                        </span>
                                      </div>
                                    </div>
                                    {!notif.read && (
                                      <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-2"></div>
                                    )}
                                  </div>
                                </motion.div>
                              ))
                            )}
                          </div>

                          {/* Footer */}
                          {notifications.length > 0 && (
                            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/30">
                              <p className="text-xs text-center text-slate-400">
                                Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => setIsTxModalOpen(true)}
                  className="hidden md:flex bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all items-center gap-2 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <ArrowRightLeft size={18} />
                  Transaction
                </button>
                {/* Mobile Floating Button Replacement */}
                <button onClick={() => setIsTxModalOpen(true)} className="md:hidden bg-slate-900 text-white p-3 rounded-full shadow-lg">
                  <ArrowRightLeft size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
              {activeTab === 'dashboard' && (
                <div className="space-y-8 max-w-7xl mx-auto">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                      title="Total Products"
                      value={products.length}
                      icon={Package}
                      trend="+12.5%"
                      trendUp={true}
                      delay={0.1}
                    />
                    <StatCard
                      title="Low Stock Alert"
                      value={products.filter(p => p.stock < 5).length}
                      icon={AlertTriangle}
                      trend="+2 items"
                      trendUp={false} // means bad trend (increase in low stock)
                      delay={0.2}
                    />
                    <StatCard
                      title="Est. Valuation"
                      value="IDR 45M"
                      icon={Wallet}
                      trend="+5.2%"
                      trendUp={true}
                      delay={0.3}
                    />
                  </div>

                  {/* Visual Chart Placeholder */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Stock Movement</h3>
                        <p className="text-sm text-slate-500">Inbound vs Outbound Analysis</p>
                      </div>
                      <select className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-600 outline-none focus:ring-2 focus:ring-teal-500/20">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                      </select>
                    </div>

                    {/* Fake Chart Visualization */}
                    <div className="h-64 flex items-end justify-between gap-2 md:gap-4 px-2">
                      {[40, 65, 30, 80, 55, 90, 45, 60, 75, 50, 85, 60].map((h, i) => (
                        <div key={i} className="w-full bg-slate-100 rounded-t-lg relative group overflow-hidden">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ duration: 1, delay: i * 0.05 }}
                            className="absolute bottom-0 w-full bg-teal-500 opacity-20 group-hover:opacity-40 transition-opacity"
                          />
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${h * 0.6}%` }}
                            transition={{ duration: 1, delay: i * 0.05 + 0.2 }}
                            className="absolute bottom-0 w-full bg-gradient-to-t from-teal-600 to-cyan-400 rounded-t-sm group-hover:from-teal-500 group-hover:to-cyan-300 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-slate-400 uppercase font-medium tracking-wider">
                      <span>Jan 01</span>
                      <span>Jan 15</span>
                      <span>Jan 30</span>
                    </div>
                  </motion.div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 max-w-7xl mx-auto"
                >
                  {/* Action Bar */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative w-full md:w-96 group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={20} />
                      <input
                        type="text"
                        placeholder="Search items..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent group-focus-within:bg-white group-focus-within:border-teal-500/50 rounded-xl outline-none transition-all placeholder:text-slate-400 text-slate-700"
                      />
                    </div>
                    <button
                      onClick={() => setIsProductModalOpen(true)}
                      className="w-full md:w-auto text-slate-700 hover:text-teal-700 hover:bg-teal-50 font-semibold text-sm flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 hover:border-teal-200 rounded-xl transition-all"
                    >
                      <Plus size={18} /> Add Product
                    </button>
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
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Attributes</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Stock</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {products.map((product, index) => (
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
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(product.attributes || {}).map(([key, val]) => (
                                    <span key={key} className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-100 uppercase tracking-wide">
                                      <span className="opacity-50 mr-1">{key}:</span> {val}
                                    </span>
                                  ))}
                                </div>
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
                                <button
                                  onClick={() => openEditModal(product)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-600 border border-slate-200 hover:border-teal-200 transition-all"
                                >
                                  <Edit size={14} />
                                  Edit
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {products.length === 0 && (
                      <div className="p-16 text-center text-slate-400">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Package size={32} className="opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-slate-600">No products found</p>
                        <p className="text-sm">Start by adding your first item to the inventory.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* --- MODALS (Re-styled inputs) --- */}

      <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title="New Transaction">
        <form onSubmit={handleTxSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Select Product</label>
            <div className="relative">
              <select
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none appearance-none transition-all"
                value={txForm.product_id}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setTxForm({ ...txForm, product_id: e.target.value })}
                required
              >
                <option value="">-- Choose Item --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Current: {p.stock})</option>
                ))}
              </select>
              <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400"><ChevronRight size={16} className="rotate-90" /></div>
            </div>
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
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-mono"
                value={txForm.quantity}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTxForm({ ...txForm, quantity: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
            <textarea
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
              rows={3}
              placeholder="E.g. Restock from vendor..."
              value={txForm.note}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTxForm({ ...txForm, note: e.target.value })}
            ></textarea>
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-teal-600 transition-colors shadow-lg shadow-slate-900/10">
            Confirm Transaction
          </button>
        </form>
      </Modal>

      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Add Product">
        <form onSubmit={handleProdSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
              <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                value={prodForm.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">SKU</label>
              <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-mono uppercase"
                value={prodForm.sku} onChange={(e: ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, sku: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Initial Stock</label>
            <input type="number" min="0" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              value={prodForm.stock} onChange={(e: ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, stock: parseInt(e.target.value) || 0 })} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-semibold text-slate-700">Attributes (JSON)</label>
              <button type="button" onClick={() => setProdForm({ ...prodForm, attributes: [...prodForm.attributes, { key: '', value: '' }] })}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-lg">
                <Plus size={12} /> ADD NEW
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {prodForm.attributes.map((attr, idx) => (
                <div key={idx} className="flex gap-2">
                  <input type="text" placeholder="Key" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-teal-500 outline-none"
                    value={attr.key} onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const newAttrs = [...prodForm.attributes];
                      newAttrs[idx].key = e.target.value;
                      setProdForm({ ...prodForm, attributes: newAttrs });
                    }} />
                  <input type="text" placeholder="Value" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-teal-500 outline-none"
                    value={attr.value} onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const newAttrs = [...prodForm.attributes];
                      newAttrs[idx].value = e.target.value;
                      setProdForm({ ...prodForm, attributes: newAttrs });
                    }} />
                  <button type="button" onClick={() => {
                    const newAttrs = prodForm.attributes.filter((_, i) => i !== idx);
                    setProdForm({ ...prodForm, attributes: newAttrs });
                  }} className="text-rose-400 hover:text-rose-600 px-1"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-teal-600 transition-colors shadow-lg shadow-slate-900/10">
            Create Product
          </button>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingProduct(null); }} title="Edit Product">
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
              <input
                type="text"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                value={editForm.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">SKU</label>
              <input
                type="text"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-mono uppercase"
                value={editForm.sku}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, sku: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Stock</label>
              <input
                type="number"
                min="0"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                value={editForm.stock}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Unit</label>
              <input
                type="text"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                value={editForm.unit}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, unit: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Price (IDR)</label>
              <input
                type="number"
                min="0"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                value={editForm.price}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">Editing Product ID:</p>
            <code className="text-xs font-mono text-slate-600 break-all">{editingProduct?.id}</code>
          </div>

          <button
            type="submit"
            className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
          >
            Update Product
          </button>
        </form>
      </Modal>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

    </div>
  );
}