"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Clock,
    ChevronLeft,
    ChevronRight,
    Plus,
    Edit,
    Trash2,
    X,
    AlertCircle,
    CheckCircle2,
    Loader2,
    User,
    Users,
    Moon,
    Sun,
    List,
    Grid3X3,
    Bell,
    RefreshCw
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import AppLayout from '../../components/AppLayout';
import CustomSelect from '../../components/CustomSelect';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

// Types
interface ShiftUser {
    id: string;
    full_name: string;
    email: string;
}

interface Shift {
    id: string;
    user_id: string;
    user: ShiftUser;
    start_time: string;
    end_time: string;
    start_date: string;
    end_date: string;
    is_overnight: boolean;
    note?: string;
    total_days: number;
    created_at: string;
    updated_at: string;
}

interface ShiftFormData {
    user_id: string;
    start_time: string;
    end_time: string;
    start_date: string;
    end_date: string;
    note: string;
}

interface ToastData {
    message: string;
    type: 'success' | 'error' | 'info';
}

interface UserOption {
    id: string;
    full_name: string;
    email: string;
}

type ViewType = 'daily' | 'weekly' | 'monthly';

// Helper functions
const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (timeStr: string): string => timeStr;

const getWeekDays = (referenceDate: Date): Date[] => {
    const day = referenceDate.getDay();
    const diff = referenceDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(referenceDate);
    monday.setDate(diff);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
    }
    return days;
};

// Get all days in a month with padding for calendar grid
const getMonthDays = (referenceDate: Date): (Date | null)[] => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];

    // Add padding for days before the first day (to align with week grid)
    const firstDayOfWeek = firstDay.getDay();
    const paddingStart = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday = 0
    for (let i = 0; i < paddingStart; i++) {
        days.push(null);
    }

    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push(new Date(year, month, d));
    }

    // Add padding at the end to complete the grid
    while (days.length % 7 !== 0) {
        days.push(null);
    }

    return days;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.toDateString() === date2.toDateString();
};

const isDateInRange = (date: Date, startDate: string, endDate: string): boolean => {
    // Parse dates correctly without timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const d = new Date(year, month, day);

    // Parse start and end dates as local dates (YYYY-MM-DD format)
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay);

    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    const end = new Date(eYear, eMonth - 1, eDay);

    return d >= start && d <= end;
};

const generateUserColor = (userId: string): string => {
    const colors = [
        'bg-teal-100 text-teal-700 border-teal-200',
        'bg-cyan-100 text-cyan-700 border-cyan-200',
        'bg-blue-100 text-blue-700 border-blue-200',
        'bg-indigo-100 text-indigo-700 border-indigo-200',
        'bg-purple-100 text-purple-700 border-purple-200',
        'bg-pink-100 text-pink-700 border-pink-200',
        'bg-rose-100 text-rose-700 border-rose-200',
        'bg-orange-100 text-orange-700 border-orange-200',
        'bg-amber-100 text-amber-700 border-amber-200',
        'bg-emerald-100 text-emerald-700 border-emerald-200',
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export default function ShiftsPage() {
    const user = useAppSelector((state) => state.auth.user);
    const accessToken = useAppSelector((state) => state.auth.accessToken);
    const privileges = useAppSelector((state) => state.auth.privileges);
    const hasPrivilege = (permission: string) => privileges.includes(permission);

    // State
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);

    const [viewType, setViewType] = useState<ViewType>('weekly');
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [referenceDate, setReferenceDate] = useState(new Date());

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [toast, setToast] = useState<ToastData | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [shiftNotifications, setShiftNotifications] = useState<string[]>([]);

    const [formData, setFormData] = useState<ShiftFormData>({
        user_id: '',
        start_time: '08:00',
        end_time: '17:00',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        note: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});



    // Fetch shifts
    const fetchShifts = async () => {
        setIsLoading(true);
        try {
            const dateStr = referenceDate.toISOString().split('T')[0];
            const res = await fetch(
                `${API_URL}/shifts?view_type=${viewType}&reference_date=${dateStr}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!res.ok) throw new Error('Failed to fetch shifts');

            const data = await res.json();
            setShifts(data.data || []);
            setIsMasterAdmin(data.is_master_admin || false);
        } catch (err) {
            console.error('Error fetching shifts:', err);
            setToast({ message: 'Failed to load shifts', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch users (for MASTER_ADMIN)
    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : data.data || []);
        } catch {
            console.error('Failed to fetch users');
        }
    };

    useEffect(() => {
        if (accessToken) {
            fetchShifts();
            fetchUsers();
        }
    }, [accessToken, viewType, referenceDate]);

    // WebSocket for real-time notifications
    useEffect(() => {
        if (!user?.id || !WS_URL) return;

        const ws = new WebSocket(`${WS_URL}?user_id=${user.id}`);

        ws.onopen = () => {
            console.log('WebSocket connected (Shifts)');
            setWsConnected(true);
        };

        ws.onclose = () => {
            setWsConnected(false);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'shift_notification') {
                    setShiftNotifications(prev => [data.message, ...prev].slice(0, 10));
                    setToast({ message: data.message, type: 'info' });
                    fetchShifts();
                }
            } catch {
                console.error('WS parse error');
            }
        };

        return () => ws.close();
    }, [user?.id]);

    // Form validation
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.user_id) errors.user_id = 'Please select a user';
        if (!formData.start_time.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
            errors.start_time = 'Invalid time format (HH:MM)';
        }
        if (!formData.end_time.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
            errors.end_time = 'Invalid time format (HH:MM)';
        }
        if (formData.start_time === formData.end_time) {
            errors.end_time = 'End time cannot be same as start time';
        }
        if (!formData.start_date) errors.start_date = 'Start date is required';
        if (!formData.end_date) errors.end_date = 'End date is required';
        if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
            errors.end_date = 'End date cannot be before start date';
        }

        const today = new Date().toISOString().split('T')[0];
        if (!editingShift && formData.start_date < today) {
            errors.start_date = 'Start date cannot be in the past';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle create/update
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validateForm() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const url = editingShift
                ? `${API_URL}/shifts/${editingShift.id}`
                : `${API_URL}/shifts`;

            const method = editingShift ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || result.message || 'Operation failed');
            }

            setToast({
                message: editingShift ? 'Shift updated successfully!' : 'Shift created successfully!',
                type: 'success'
            });

            setIsModalOpen(false);
            resetForm();
            fetchShifts();
        } catch (err) {
            setToast({
                message: err instanceof Error ? err.message : 'Operation failed',
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deletingShiftId || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/shifts/${deletingShiftId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!res.ok) {
                const result = await res.json();
                throw new Error(result.error || 'Delete failed');
            }

            setToast({ message: 'Shift deleted successfully!', type: 'success' });
            setIsDeleteModalOpen(false);
            setDeletingShiftId(null);
            fetchShifts();
        } catch (err) {
            setToast({
                message: err instanceof Error ? err.message : 'Delete failed',
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            user_id: '',
            start_time: '08:00',
            end_time: '17:00',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            note: ''
        });
        setFormErrors({});
        setEditingShift(null);
    };

    const openEditModal = (shift: Shift) => {
        setEditingShift(shift);
        setFormData({
            user_id: shift.user_id,
            start_time: shift.start_time,
            end_time: shift.end_time,
            start_date: shift.start_date,
            end_date: shift.end_date,
            note: shift.note || ''
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (shiftId: string) => {
        setDeletingShiftId(shiftId);
        setIsDeleteModalOpen(true);
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(referenceDate);
        if (viewType === 'daily') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (viewType === 'weekly') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else if (viewType === 'monthly') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        }
        setReferenceDate(newDate);
    };

    const goToToday = () => setReferenceDate(new Date());

    // Get week days for calendar
    const weekDays = getWeekDays(referenceDate);

    // Get month days for monthly calendar
    const monthDays = getMonthDays(referenceDate);

    // Filter shifts for a specific day
    const getShiftsForDay = (day: Date): Shift[] => {
        return shifts.filter(shift => isDateInRange(day, shift.start_date, shift.end_date));
    };

    return (
        <AppLayout>
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border ${toast.type === 'success' ? 'bg-teal-50 border-teal-200 text-teal-800' :
                            toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                                'bg-cyan-50 border-cyan-200 text-cyan-800'
                            }`}>
                            {toast.type === 'success' ? <CheckCircle2 size={20} /> :
                                toast.type === 'error' ? <AlertCircle size={20} /> : <Bell size={20} />}
                            <span className="font-medium">{toast.message}</span>
                            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
                                <X size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="px-4 md:px-6 py-4 md:py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-slate-800">Shift Schedule</h1>
                                <p className="text-sm text-slate-500">
                                    {hasPrivilege('shift:create') ? 'Manage all user shifts' : 'Your shift schedule'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            {/* WS Status */}
                            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${wsConnected ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                {wsConnected ? 'Live' : 'Offline'}
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={() => fetchShifts()}
                                disabled={isLoading}
                                className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                            >
                                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                            </button>

                            {/* View Mode Toggle */}
                            <div className="flex bg-slate-100 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-teal-600' : 'text-slate-400'
                                        }`}
                                >
                                    <Grid3X3 size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-teal-600' : 'text-slate-400'
                                        }`}
                                >
                                    <List size={18} />
                                </button>
                            </div>

                            {/* Add Shift Button (MASTER ADMIN only) */}
                            {hasPrivilege('shift:create') && (
                                <button
                                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-slate-800/25 transition-all"
                                >
                                    <Plus size={20} />
                                    <span className="hidden sm:inline">Add Shift</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Date Navigation */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigateDate('prev')}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={goToToday}
                                className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg"
                            >
                                Today
                            </button>
                            <button
                                onClick={() => navigateDate('next')}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                            >
                                <ChevronRight size={20} />
                            </button>
                            <span className="text-sm font-semibold text-slate-800 ml-2">
                                {viewType === 'weekly' ? (
                                    `${formatDate(weekDays[0].toISOString())} - ${formatDate(weekDays[6].toISOString())}`
                                ) : viewType === 'monthly' ? (
                                    referenceDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                                ) : viewType === 'daily' ? (
                                    formatDate(referenceDate.toISOString())
                                ) : 'Semua Jadwal'}
                            </span>
                        </div>

                        {/* View Type Selector */}
                        <div className="flex bg-slate-100 rounded-xl p-1">
                            {(['daily', 'weekly', 'monthly'] as ViewType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setViewType(type)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${viewType === type ? 'bg-white shadow text-teal-600' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {type === 'daily' ? 'Harian' : type === 'weekly' ? 'Mingguan' : 'Bulanan'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-slate-500 animate-spin" />
                    </div>
                ) : viewMode === 'calendar' ? (
                    /* Calendar View */
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Daily View */}
                        {viewType === 'daily' && (
                            <>
                                <div className="p-4 bg-slate-50 border-b border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {referenceDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </h3>
                                </div>
                                <div className="p-4">
                                    {getShiftsForDay(referenceDate).length === 0 ? (
                                        <div className="text-center py-12">
                                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500">Tidak ada jadwal untuk hari ini</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {getShiftsForDay(referenceDate).map(shift => (
                                                <motion.div
                                                    key={shift.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${generateUserColor(shift.user_id)}`}
                                                    onClick={() => hasPrivilege('shift:update') && openEditModal(shift)}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${generateUserColor(shift.user_id)}`}>
                                                                {shift.user.full_name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800">{shift.user.full_name}</p>
                                                                <p className="text-xs opacity-70">{shift.user.email}</p>
                                                            </div>
                                                        </div>
                                                        {shift.is_overnight && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                                <Moon size={12} /> Shift Malam
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm font-mono">
                                                        <Clock size={16} className="opacity-60" />
                                                        <span className="font-bold">{shift.start_time} - {shift.end_time}</span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Weekly View */}
                        {viewType === 'weekly' && (
                            <>
                                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                                    {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, i) => (
                                        <div key={day} className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider ${i >= 5 ? 'text-rose-500' : 'text-slate-600'}`}>
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 divide-x divide-slate-100">
                                    {weekDays.map((day, idx) => {
                                        const dayShifts = getShiftsForDay(day);
                                        const isToday = isSameDay(day, new Date());
                                        const isWeekend = idx >= 5;

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={`min-h-[160px] md:min-h-[200px] p-2 ${isToday ? 'bg-teal-50/50' : isWeekend ? 'bg-slate-50/50' : ''}`}
                                            >
                                                <div className={`text-sm font-bold mb-2 ${isToday ? 'text-teal-600' : isWeekend ? 'text-rose-500' : 'text-slate-700'}`}>
                                                    {day.getDate()}
                                                </div>
                                                <div className="space-y-1.5">
                                                    {dayShifts.slice(0, 3).map(shift => (
                                                        <motion.div
                                                            key={shift.id}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className={`p-2 rounded-lg text-xs border cursor-pointer transition-all hover:shadow-md ${generateUserColor(shift.user_id)}`}
                                                            onClick={() => hasPrivilege('shift:update') && openEditModal(shift)}
                                                        >
                                                            <div className="font-semibold truncate flex items-center gap-1">
                                                                {shift.is_overnight && <Moon size={10} className="text-purple-500" />}
                                                                {shift.start_time} - {shift.end_time}
                                                            </div>
                                                            <div className="truncate opacity-80">
                                                                {shift.user.full_name}
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                    {dayShifts.length > 3 && (
                                                        <div className="text-xs text-slate-500 font-medium pl-1">
                                                            +{dayShifts.length - 3} lainnya
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* Monthly View */}
                        {viewType === 'monthly' && (
                            <>
                                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                                    {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, i) => (
                                        <div key={day} className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider ${i >= 5 ? 'text-rose-500' : 'text-slate-600'}`}>
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 divide-x divide-slate-100">
                                    {monthDays.map((day, idx) => {
                                        if (!day) {
                                            return <div key={`empty-${idx}`} className="min-h-[80px] md:min-h-[100px] bg-slate-50/30" />;
                                        }

                                        const dayShifts = getShiftsForDay(day);
                                        const isToday = isSameDay(day, new Date());
                                        const dayOfWeek = day.getDay();
                                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={`min-h-[80px] md:min-h-[100px] p-1 md:p-2 border-b border-slate-100 ${isToday ? 'bg-teal-50/50' : isWeekend ? 'bg-slate-50/50' : ''}`}
                                            >
                                                <div className={`text-xs md:text-sm font-bold mb-1 ${isToday ? 'text-teal-600' : isWeekend ? 'text-rose-500' : 'text-slate-700'}`}>
                                                    {day.getDate()}
                                                </div>
                                                <div className="space-y-0.5">
                                                    {dayShifts.slice(0, 2).map(shift => (
                                                        <div
                                                            key={shift.id}
                                                            className={`p-1 rounded text-[10px] md:text-xs border cursor-pointer ${generateUserColor(shift.user_id)}`}
                                                            onClick={() => hasPrivilege('shift:update') && openEditModal(shift)}
                                                        >
                                                            <div className="truncate flex items-center gap-0.5">
                                                                {shift.is_overnight && <Moon size={8} className="text-purple-500" />}
                                                                {shift.user.full_name.split(' ')[0]}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {dayShifts.length > 2 && (
                                                        <div className="text-[10px] text-slate-400 pl-0.5">
                                                            +{dayShifts.length - 2}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    /* List View */
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {shifts.length === 0 ? (
                            <div className="text-center py-16">
                                <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 font-medium">No shifts found</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    {hasPrivilege('shift:create') ? 'Click "Add Shift" to create one' : 'No shifts assigned to you'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">User</th>
                                            <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Time</th>
                                            <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Date Range</th>
                                            <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                                            <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Note</th>
                                            {(hasPrivilege('shift:update') || hasPrivilege('shift:delete')) && (
                                                <th className="px-4 md:px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {shifts.map((shift, idx) => (
                                            <motion.tr
                                                key={shift.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="hover:bg-slate-50"
                                            >
                                                <td className="px-4 md:px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${generateUserColor(shift.user_id)
                                                            }`}>
                                                            {shift.user.full_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-800">{shift.user.full_name}</p>
                                                            <p className="text-xs text-slate-500">{shift.user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={16} className="text-slate-400" />
                                                        <span className="font-mono text-sm text-slate-700">
                                                            {shift.start_time} - {shift.end_time}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 md:px-6 py-4 text-sm text-slate-600">
                                                    {formatDate(shift.start_date)} - {formatDate(shift.end_date)}
                                                    <span className="text-xs text-slate-400 ml-1">({shift.total_days} days)</span>
                                                </td>
                                                <td className="px-4 md:px-6 py-4">
                                                    {shift.is_overnight ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                            <Moon size={12} /> Shift Malam
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                                            <Sun size={12} /> Shift Siang
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 md:px-6 py-4 text-sm text-slate-500 max-w-[200px] truncate">
                                                    {shift.note || '-'}
                                                </td>
                                                {(hasPrivilege('shift:update') || hasPrivilege('shift:delete')) && (
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="flex justify-end gap-1">
                                                            {hasPrivilege('shift:update') && (
                                                                <button
                                                                    onClick={() => openEditModal(shift)}
                                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                            )}
                                                            {hasPrivilege('shift:delete') && (
                                                                <button
                                                                    onClick={() => openDeleteModal(shift.id)}
                                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-1 h-6 bg-slate-800 rounded-full" />
                                    {editingShift ? 'Edit Shift' : 'Create New Shift'}
                                </h3>
                                <button
                                    onClick={() => { setIsModalOpen(false); resetForm(); }}
                                    className="p-2 hover:bg-slate-200 rounded-full text-slate-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {/* User Select */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Assign to User <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <CustomSelect
                                            value={formData.user_id}
                                            onChange={(val) => {
                                                setFormData({ ...formData, user_id: String(val) });
                                                setFormErrors({ ...formErrors, user_id: '' });
                                            }}
                                            placeholder="Select user..."
                                            icon={<User size={18} />}
                                            error={!!formErrors.user_id}
                                            options={users.map(u => ({
                                                value: u.id,
                                                label: `${u.full_name} (${u.email})`
                                            }))}
                                        />
                                    </div>
                                    {formErrors.user_id && <p className="mt-1 text-xs text-rose-600">{formErrors.user_id}</p>}
                                </div>

                                {/* Time Inputs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Start Time <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="time"
                                                value={formData.start_time}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, start_time: e.target.value });
                                                    setFormErrors({ ...formErrors, start_time: '' });
                                                }}
                                                className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl ${formErrors.start_time ? 'border-rose-500' : 'border-slate-200'
                                                    } focus:outline-none focus:border-slate-400`}
                                            />
                                        </div>
                                        {formErrors.start_time && <p className="mt-1 text-xs text-rose-600">{formErrors.start_time}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            End Time <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="time"
                                                value={formData.end_time}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, end_time: e.target.value });
                                                    setFormErrors({ ...formErrors, end_time: '' });
                                                }}
                                                className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl ${formErrors.end_time ? 'border-rose-500' : 'border-slate-200'
                                                    } focus:outline-none focus:border-slate-400`}
                                            />
                                        </div>
                                        {formErrors.end_time && <p className="mt-1 text-xs text-rose-600">{formErrors.end_time}</p>}
                                    </div>
                                </div>

                                {/* Overnight indicator */}
                                {formData.start_time && formData.end_time && formData.end_time < formData.start_time && (
                                    <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl">
                                        <Moon size={18} className="text-purple-600" />
                                        <span className="text-sm text-purple-700 font-medium">
                                            This is an overnight shift (crossing midnight)
                                        </span>
                                    </div>
                                )}

                                {/* Date Range */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Start Date <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => {
                                                setFormData({ ...formData, start_date: e.target.value });
                                                setFormErrors({ ...formErrors, start_date: '' });
                                            }}
                                            className={`w-full px-4 py-3 bg-slate-50 border rounded-xl ${formErrors.start_date ? 'border-rose-500' : 'border-slate-200'
                                                } focus:outline-none focus:border-slate-400`}
                                        />
                                        {formErrors.start_date && <p className="mt-1 text-xs text-rose-600">{formErrors.start_date}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            End Date <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => {
                                                setFormData({ ...formData, end_date: e.target.value });
                                                setFormErrors({ ...formErrors, end_date: '' });
                                            }}
                                            className={`w-full px-4 py-3 bg-slate-50 border rounded-xl ${formErrors.end_date ? 'border-rose-500' : 'border-slate-200'
                                                } focus:outline-none focus:border-slate-400`}
                                        />
                                        {formErrors.end_date && <p className="mt-1 text-xs text-rose-600">{formErrors.end_date}</p>}
                                    </div>
                                </div>

                                {/* Note */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Note (optional)</label>
                                    <textarea
                                        value={formData.note}
                                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 resize-none"
                                        placeholder="Additional notes..."
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setIsModalOpen(false); resetForm(); }}
                                        className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="animate-spin" size={18} /> Saving...</>
                                        ) : editingShift ? 'Update Shift' : 'Create Shift'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-8 h-8 text-rose-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Shift?</h3>
                                <p className="text-slate-500 text-sm mb-6">
                                    This action cannot be undone. The assigned user will be notified about this cancellation.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setIsDeleteModalOpen(false); setDeletingShiftId(null); }}
                                        className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isSubmitting}
                                        className="flex-1 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
