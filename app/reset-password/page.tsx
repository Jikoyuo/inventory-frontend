"use client";

import React, { useState, FormEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import {
    Box,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
    KeyRound
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ResetPasswordPage() {
    // Step management: 'request' | 'verify' | 'reset' | 'success'
    const [step, setStep] = useState<'request' | 'verify' | 'reset' | 'success'>('request');

    // Form fields
    const [email, setEmail] = useState<string>('');
    const [otp, setOtp] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

    // State
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Step 1: Request password reset (send OTP to email)
    const handleRequestReset = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to send reset email');
            }

            setMessage('Reset code sent to your email');
            setStep('verify');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Invalid or expired code');
            }

            setMessage('Code verified successfully');
            setStep('reset');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Reset password
    const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, new_password: newPassword })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to reset password');
            }

            setStep('success');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
            </div>

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
                    <p className="text-slate-400 text-sm">
                        {step === 'request' && 'Reset your password'}
                        {step === 'verify' && 'Enter verification code'}
                        {step === 'reset' && 'Create new password'}
                        {step === 'success' && 'Password reset successful'}
                    </p>
                </div>

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl"
                >
                    {/* Progress Steps */}
                    {step !== 'success' && (
                        <div className="flex items-center justify-center gap-2 mb-8">
                            {['request', 'verify', 'reset'].map((s, i) => (
                                <React.Fragment key={s}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === s ? 'bg-teal-500 text-white' :
                                        ['request', 'verify', 'reset'].indexOf(step) > i ? 'bg-teal-500/20 text-teal-400' :
                                            'bg-slate-700 text-slate-500'
                                        }`}>
                                        {i + 1}
                                    </div>
                                    {i < 2 && (
                                        <div className={`w-12 h-0.5 transition-colors ${['request', 'verify', 'reset'].indexOf(step) > i ? 'bg-teal-500' : 'bg-slate-700'
                                            }`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

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

                    {/* Success Message */}
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center gap-3"
                        >
                            <CheckCircle2 className="text-teal-400 flex-shrink-0" size={20} />
                            <p className="text-sm text-teal-400">{message}</p>
                        </motion.div>
                    )}

                    {/* Step 1: Request Reset */}
                    {step === 'request' && (
                        <form onSubmit={handleRequestReset} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        type="email"
                                        required
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">We&apos;ll send a verification code to this email</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Send Reset Code
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Verify OTP */}
                    {step === 'verify' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Verification Code</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter 6-digit code"
                                        value={otp}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)}
                                        maxLength={6}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all text-center text-2xl tracking-[0.5em] font-mono"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Enter the code sent to {email}</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || otp.length < 6}
                                className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Verify Code
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('request')}
                                className="w-full py-3 text-slate-400 hover:text-white font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowLeft size={16} />
                                Back to email
                            </button>
                        </form>
                    )}

                    {/* Step 3: Reset Password */}
                    {step === 'reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Password Requirements */}
                            <div className="p-3 bg-slate-800/30 rounded-lg">
                                <p className="text-xs text-slate-400 mb-2">Password must:</p>
                                <ul className="text-xs space-y-1">
                                    <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-teal-400' : 'text-slate-500'}`}>
                                        <CheckCircle2 size={12} />
                                        Be at least 8 characters
                                    </li>
                                    <li className={`flex items-center gap-2 ${newPassword === confirmPassword && newPassword.length > 0 ? 'text-teal-400' : 'text-slate-500'}`}>
                                        <CheckCircle2 size={12} />
                                        Match confirmation password
                                    </li>
                                </ul>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Reset Password
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="text-teal-400" size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Password Reset Complete</h3>
                            <p className="text-slate-400 text-sm mb-8">
                                Your password has been reset successfully. You can now sign in with your new password.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-teal-500/25"
                            >
                                Go to Login
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    )}

                    {/* Back to Login Link */}
                    {step !== 'success' && (
                        <div className="mt-8 pt-6 border-t border-slate-700 text-center">
                            <Link
                                href="/login"
                                className="text-sm text-slate-400 hover:text-teal-400 transition-colors inline-flex items-center gap-2"
                            >
                                <ArrowLeft size={16} />
                                Back to login
                            </Link>
                        </div>
                    )}
                </motion.div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-xs mt-8">
                    © 2026 PRABS Inventory. All rights reserved.
                </p>
            </motion.div>
        </div>
    );
}
