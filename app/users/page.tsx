"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Plus,
    Search,
    Edit,
    Trash2,
    X,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Calendar,
    Mail,
    Phone,
    User,
    Shield,
    ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../store/hooks';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

interface UserData {
    id?: string;
    full_name: string;
    email: string;
    phone_number: string;
    role_id: number;
    birth_date: string;
    password?: string;
    is_active?: boolean;
    last_seen_at?: string;
}

interface Role {
    id: number;
    code: string;
    name: string;
    description: string;
}

interface ToastData {
    message: string;
    type: 'success' | 'error';
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [toast, setToast] = useState<ToastData | null>(null);

    const [isValidating, setIsValidating] = useState(true);

    const router = useRouter();
    const privileges = useAppSelector((state) => state.auth.privileges);
    const hasPrivilege = (permission: string) => privileges.includes(permission);

    // RBAC Check
    useEffect(() => {
        if (!hasPrivilege('user:view')) {
            router.push('/');
        }
    }, [privileges, router]);

    const [formData, setFormData] = useState<UserData>({
        full_name: '',
        email: '',
        phone_number: '',
        role_id: 0,
        birth_date: '',
        password: '',
        is_active: true
    });

    // Form validation state
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    // Validation helpers
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone: string): boolean => {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phone.length >= 10 && phoneRegex.test(phone);
    };

    const validatePassword = (password: string): boolean => {
        return password.length >= 6;
    };

    const validateForm = (): boolean => {
        const errors: { [key: string]: string } = {};

        if (!formData.full_name.trim()) {
            errors.full_name = 'Full name is required';
        }

        if (!validateEmail(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (formData.phone_number && !validatePhone(formData.phone_number)) {
            errors.phone_number = 'Please enter a valid phone number (min. 10 digits)';
        }

        if (!formData.role_id || formData.role_id === 0) {
            errors.role_id = 'Please select a role';
        }

        if (!editingUser && formData.password && !validatePassword(formData.password)) {
            errors.password = 'Password must be at least 6 characters';
        }

        if (!editingUser && !formData.password) {
            errors.password = 'Password is required for new users';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Phone number formatting helpers
    const formatPhoneNumber = (value: string): string => {
        let digits = value.replace(/\D/g, '');
        if (digits.startsWith('0')) digits = '62' + digits.substring(1);
        if (!digits.startsWith('62')) digits = '62' + digits;
        return digits;
    };

    const displayPhoneNumber = (value: string): string => {
        if (!value) return '';
        return value.startsWith('62') ? '+' + value : value;
    };

    // Format time ago helper
    const formatTimeAgo = (dateString: string | undefined) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 120) return 'Online'; // < 2 mins

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ${diffInMinutes % 60}m ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays} days ago`;

        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Validate auth on mount
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
                    window.location.href = '/login';
                    return;
                }

                setIsValidating(false);
            } catch (err) {
                console.error('Auth validation error:', err);
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
            }
        };

        validateAuth();
        validateAuth();
    }, []);

    // WebSocket Connection for Real-time Updates
    useEffect(() => {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return;

        const ws = new WebSocket(`${WS_URL}?token=${accessToken}`);

        ws.onopen = () => {
            console.log('Connected to WebSocket (Users)');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                // Assumption: Backend sends payload with type 'user_activity' or just matches structure
                // We'll optimistically update if we see a matching user ID and last_seen_at
                const data = message.data || message;

                if (data.user_id || data.id) {
                    setUsers(prevUsers => prevUsers.map(u => {
                        if (u.id === (data.user_id || data.id)) {
                            return {
                                ...u,
                                last_seen_at: data.last_seen_at || new Date().toISOString(),
                                is_active: data.is_active !== undefined ? data.is_active : u.is_active
                            };
                        }
                        return u;
                    }));
                }
            } catch (error) {
                console.error('WS Parse Error:', error);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    // Helper function for better error messages
    const getErrorMessage = (err: any, defaultMsg: string): string => {
        if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
            return 'Unable to connect to server. Please check your internet connection.';
        }
        if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
            return 'Your session has expired. Please login again.';
        }
        if (err.message?.includes('email already exists')) {
            return 'This email is already registered. Please use a different email.';
        }
        return err instanceof Error ? err.message : defaultMsg;
    };

    // Fetch users
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            // Handle both array response and data wrapper
            setUsers(Array.isArray(data) ? data : data.data || []);
        } catch (err) {
            const errorMsg = getErrorMessage(err, 'Failed to load users. Please try again.');
            setToast({ message: errorMsg, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch roles
    const fetchRoles = async () => {
        try {
            const res = await fetch(`${API_URL}/roles`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch roles');
            const data = await res.json();
            setRoles(data);
        } catch (err) {
            const errorMsg = getErrorMessage(err, 'Failed to load roles. Please try again.');
            setToast({ message: errorMsg, type: 'error' });
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    // Handle create/update
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            setToast({ message: 'Please fix the form errors before submitting', type: 'error' });
            return;
        }

        setIsSubmitting(true);

        try {
            const url = editingUser
                ? `${API_URL}/users/${editingUser.id}`
                : `${API_URL}/users`;

            const method = editingUser ? 'PUT' : 'POST';

            // Don't send password on update if not provided
            const payload: any = { ...formData };
            // Convert role_id to number
            payload.role_id = Number(payload.role_id);

            // Don't send password on update if not provided
            if (editingUser && !payload.password) {
                delete payload.password;
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (!res.ok) throw new Error(result.error || (editingUser ? 'Failed to update user' : 'Failed to create user'));

            setToast({
                message: result.message || (editingUser ? 'User updated successfully!' : 'User created successfully!'),
                type: 'success'
            });

            setIsModalOpen(false);
            resetForm();
            fetchUsers();
        } catch (err) {
            const errorMsg = getErrorMessage(err, editingUser ? 'Failed to update user. Please try again.' : 'Failed to create user. Please try again.');
            setToast({ message: errorMsg, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deletingUserId) return;
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/users/${deletingUserId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            const result = await res.json();

            if (!res.ok) throw new Error(result.error || 'Failed to delete user');

            setToast({ message: result.message || 'User deleted successfully!', type: 'success' });
            setIsDeleteModalOpen(false);
            setDeletingUserId(null);
            fetchUsers();
        } catch (err) {
            const errorMsg = getErrorMessage(err, 'Failed to delete user. Please try again.');
            setToast({ message: errorMsg, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open edit modal
    const openEditModal = (user: UserData) => {
        setEditingUser(user);
        setFormData({
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number || '',
            role_id: user.role_id,
            birth_date: user.birth_date || '',
            password: '',
            is_active: user.is_active
        });
        setIsModalOpen(true);
    };

    // Open delete modal
    const openDeleteModal = (userId: string) => {
        setDeletingUserId(userId);
        setIsDeleteModalOpen(true);
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            full_name: '',
            email: '',
            phone_number: '',
            role_id: 0,
            birth_date: '',
            password: '',
            is_active: true
        });
        setEditingUser(null);
    };

    // Filter users
    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Show loading while validating
    if (isValidating) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full" />
                        <Loader2 className="w-16 h-16 text-teal-400 animate-spin relative z-10" strokeWidth={2} />
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-white">Validating session...</h3>
                    <p className="mt-2 text-sm text-slate-400">Please wait</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
                                <Users size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                                <p className="text-sm text-slate-500">Manage system users and roles</p>
                            </div>
                        </div>

                        {hasPrivilege('user:create') && (
                            <button
                                onClick={() => {
                                    resetForm();
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5"
                            >
                                <Plus size={20} />
                                Add User
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-teal-500" size={40} />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-20">
                            <Users className="mx-auto mb-4 text-slate-300" size={48} />
                            <p className="text-slate-500 font-medium">No users found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Full Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Active</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date of Birth</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((user, index) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
                                                        {user.full_name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-slate-800">{user.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                            <td className="px-6 py-4 text-slate-600">{user.phone_number}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-semibold">
                                                    {roles.find(r => r.id === user.role_id)?.name || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.last_seen_at ? (
                                                    <div className="flex items-center gap-2">
                                                        {/* Online Indicator */}
                                                        {formatTimeAgo(user.last_seen_at) === 'Online' ? (
                                                            <>
                                                                <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                                                                <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                                                                    Online
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-slate-600">
                                                                    {formatTimeAgo(user.last_seen_at)}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {new Date(user.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic bg-slate-50 px-2 py-1 rounded border border-slate-100">Never Active</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {user.birth_date ? new Date(user.birth_date).toLocaleDateString('id-ID') : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {hasPrivilege('user:update') && (
                                                        <button
                                                            onClick={() => openEditModal(user)}
                                                            className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {hasPrivilege('user:delete') && (
                                                        <button
                                                            onClick={() => openDeleteModal(user.id!)}
                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-1 h-6 bg-teal-500 rounded-full" />
                                    {editingUser ? 'Edit User' : 'Add New User'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}
                                    className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {/* Full Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="text"
                                            required
                                            value={formData.full_name}
                                            onChange={(e) => {
                                                setFormData({ ...formData, full_name: e.target.value });
                                                setFormErrors({ ...formErrors, full_name: '' });
                                            }}
                                            className={`w-full pl-12 pr-4 py-3 bg-slate-50 border ${formErrors.full_name ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20`}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    {formErrors.full_name && (
                                        <p className="mt-1 text-xs text-rose-600">{formErrors.full_name}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Email <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => {
                                                setFormData({ ...formData, email: e.target.value });
                                                setFormErrors({ ...formErrors, email: '' });
                                            }}
                                            className={`w-full pl-12 pr-4 py-3 bg-slate-50 border ${formErrors.email ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20`}
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    {formErrors.email && (
                                        <p className="mt-1 text-xs text-rose-600">{formErrors.email}</p>
                                    )}
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Phone Number <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="tel"
                                            required
                                            value={displayPhoneNumber(formData.phone_number)}
                                            onChange={(e) => {
                                                const formatted = formatPhoneNumber(e.target.value);
                                                setFormData({ ...formData, phone_number: formatted });
                                                setFormErrors({ ...formErrors, phone_number: '' });
                                            }}
                                            className={`w-full pl-12 pr-4 py-3 bg-slate-50 border ${formErrors.phone_number ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20`}
                                            placeholder="+62 812 3456 7890"
                                        />
                                    </div>
                                    {formErrors.phone_number && (
                                        <p className="mt-1 text-xs text-rose-600">{formErrors.phone_number}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Role */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Role <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                            <select
                                                required
                                                value={formData.role_id || ''}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, role_id: Number(e.target.value) });
                                                    setFormErrors({ ...formErrors, role_id: '' });
                                                }}
                                                className={`w-full pl-12 pr-4 py-3 bg-slate-50 border ${formErrors.role_id ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 appearance-none`}
                                            >
                                                <option value="">Select Role</option>
                                                {roles.map(role => (
                                                    <option key={role.id} value={role.id}>{role.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {formErrors.role_id && (
                                            <p className="mt-1 text-xs text-rose-600">{formErrors.role_id}</p>
                                        )}
                                    </div>

                                    {/* Date of Birth */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Date of Birth <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                            <input
                                                type="date"
                                                value={formData.birth_date}
                                                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Password (only for create or if user wants to change) */}
                                {!editingUser && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Password <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            required={!editingUser}
                                            value={formData.password}
                                            onChange={(e) => {
                                                setFormData({ ...formData, password: e.target.value });
                                                setFormErrors({ ...formErrors, password: '' });
                                            }}
                                            className={`w-full px-4 py-3 bg-slate-50 border ${formErrors.password ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20`}
                                            placeholder="••••••••"
                                        />
                                        {formErrors.password && (
                                            <p className="mt-1 text-xs text-rose-600">{formErrors.password}</p>
                                        )}
                                    </div>
                                )}

                                {editingUser && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            New Password <span className="text-slate-400 text-xs">(leave empty to keep current)</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            resetForm();
                                        }}
                                        className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} />
                                                {editingUser ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            editingUser ? 'Update User' : 'Create User'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                        >
                            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="text-rose-600" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Delete User?</h3>
                            <p className="text-slate-600 text-center mb-6">
                                Are you sure you want to delete this user? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setDeletingUserId(null);
                                    }}
                                    className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl border border-slate-700/50"
                    >
                        <div className={`p-2 rounded-full ${toast.type === 'success' ? 'bg-teal-500/20 text-teal-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm">{toast.type === 'success' ? 'Success' : 'Error'}</h4>
                            <p className="text-sm text-slate-300">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-4 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
