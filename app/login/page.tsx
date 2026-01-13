"use client";

import React, { useState, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export default function LoginPage() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loadingStep, setLoadingStep] = useState<string>('');

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);
        setLoadingStep('Logging in...');

        try {
            // Step 1: Login
            const loginRes = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const loginData = await loginRes.json();

            if (!loginRes.ok) {
                throw new Error(loginData.error || 'Login failed');
            }

            const token = loginData.token;

            if (!token) {
                throw new Error('No token received from server');
            }

            // Step 2: Validate token and get full privileges
            setLoadingStep('Validating credentials...');
            const validateRes = await fetch(`${API_URL}/auth/validate-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });

            const validateData = await validateRes.json();

            if (!validateRes.ok) {
                throw new Error(validateData.error || 'Token validation failed');
            }

            // Step 3: Store in Redux
            setLoadingStep('Setting up your session...');
            const { setCredentials } = await import('../../store/slices/authSlice');
            const { store } = await import('../../store');

            // Extract privileges as string array
            const privilegeCodes = validateData.privileges || [];

            store.dispatch(setCredentials({
                token,
                privileges: validateData.privileges || [],
                user: {
                    id: validateData.user?.id || '',
                    name: validateData.user?.full_name || '',
                    email: validateData.user?.email || '',
                    role: validateData.role?.name || validateData.user?.role?.name || 'User',
                    roleCode: validateData.role?.code || validateData.user?.role?.code || ''
                }
            }));

            // Store token in localStorage as backup
            localStorage.setItem('accessToken', token);

            setSuccess('Login successful!');
            setLoadingStep('Redirecting to dashboard...');

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/';
            }, 800);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoadingStep('');
            setIsLoading(false);
        }
    };

    // Better error message helper
    const getErrorMessage = (error: any): string => {
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            return 'Unable to connect to server. Please check your internet connection.';
        }
        if (error.message?.includes('invalid email or password')) {
            return 'Invalid email or password. Please try again.';
        }
        if (error.message?.includes('token')) {
            return 'Session validation failed. Please try logging in again.';
        }
        return error.message || 'Something went wrong. Please try again.';
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
            </div>

            {/* Semi-Transparent Loading Overlay */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full" />
                                <Loader2 className="w-16 h-16 text-teal-400 animate-spin relative z-10" strokeWidth={2} />
                            </div>
                            <h3 className="mt-6 text-xl font-bold text-white">{loadingStep}</h3>
                            <p className="mt-2 text-sm text-slate-400">Please wait...</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-3 mb-4"
                    >
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
                            <Box size={24} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                            <h1 className="text-2xl font-extrabold tracking-tight text-white leading-none">PRABS</h1>
                            <span className="text-xs font-semibold text-teal-400 tracking-widest uppercase">Inventory</span>
                        </div>
                    </motion.div>
                    <p className="text-slate-400 text-sm">Sign in to your account</p>
                </div>

                {/* Login Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl"
                >
                    {/* Error Alert */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3"
                        >
                            <AlertCircle className="text-rose-400 flex-shrink-0" size={20} />
                            <p className="text-sm text-rose-400">{error}</p>
                        </motion.div>
                    )}

                    {/* Success Alert */}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center gap-3"
                        >
                            <CheckCircle2 className="text-teal-400 flex-shrink-0" size={20} />
                            <p className="text-sm text-teal-400">{success}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type="email"
                                    required
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full pl-12 pr-12 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="flex justify-end">
                            <Link
                                href="/reset-password"
                                className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-slate-900 text-slate-500">Don&apos;t have an account?</span>
                        </div>
                    </div>

                    {/* Register Link */}
                    <div className="text-center">
                        <p className="text-slate-400 text-sm">
                            Contact your administrator to get access
                        </p>
                    </div>
                </motion.div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-xs mt-8">
                    © 2026 PRABS Inventory. All rights reserved.
                </p>
            </motion.div>
        </div>
    );
}
