import React, { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';

export default function ForgotPassword() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/forgot-password', {
            onSuccess: () => {
                setShowSuccess(true);
            },
            onError: (errors) => {
                if (errors.email && errors.email.includes('exists')) {
                    // Error will be displayed automatically
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes login-fade-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .login-fade-in { animation: login-fade-in 0.4s ease-out forwards; }
                .login-fade-in-1 { animation-delay: 0.05s; opacity: 0; }
                .login-fade-in-2 { animation-delay: 0.1s; opacity: 0; }
                .login-fade-in-3 { animation-delay: 0.15s; opacity: 0; }
                .login-fade-in-4 { animation-delay: 0.2s; opacity: 0; }
                .login-fade-in-5 { animation-delay: 0.25s; opacity: 0; }
            `}} />

            <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-[420px]">
                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 overflow-hidden login-fade-in">
                        {/* Header strip */}
                        <div className="bg-[#1D293D] px-6 py-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                                <img src="/OCC logo.png" alt="OCC" className="w-8 h-8 object-contain" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-white tracking-tight">OCC Admission System</h1>
                                <p className="text-slate-300 text-xs mt-0.5">Password Reset Request</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 sm:p-8">
                            {!showSuccess ? (
                                <>
                                    <div className="mb-6 login-fade-in login-fade-in-1">
                                        <h2 className="text-xl font-semibold text-slate-800">Reset Password</h2>
                                        <p className="text-slate-500 text-sm mt-1">Enter your email address and we'll send you a 6-digit code to reset your password.</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="login-fade-in login-fade-in-2">
                                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                    </svg>
                                                </div>
                                                <input
                                                    id="email"
                                                    type="email"
                                                    value={data.email}
                                                    onChange={(e) => setData('email', e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20 focus:border-[#1447E6] focus:bg-white transition-colors"
                                                    placeholder="you@example.com"
                                                    required
                                                    autoComplete="email"
                                                />
                                            </div>
                                            {errors.email && (
                                                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                                                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    {errors.email.includes('exists') 
                                                        ? 'This email address is not registered in our system. Please check your email or contact support.' 
                                                        : errors.email}
                                                </p>
                                            )}
                                        </div>

                                        <div className="pt-1 login-fade-in login-fade-in-3">
                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="w-full bg-[#1447E6] text-white font-medium py-3 px-4 rounded-xl hover:bg-[#0f3bb8] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none transition-colors text-sm"
                                            >
                                                {processing ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        Sending...
                                                    </span>
                                                ) : (
                                                    'Send Reset Code'
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="text-center login-fade-in login-fade-in-1">
                                    <div className="w-16 h-16 mx-auto mb-5 bg-emerald-50 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Check Your Email</h2>
                                    <p className="text-slate-600 text-sm mb-5">
                                        We've sent a 6-digit reset code to <strong className="text-slate-800">{data.email}</strong>. 
                                        The code will expire in 15 minutes.
                                    </p>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-left">
                                        <p className="text-sm font-medium text-slate-800 mb-2">Next steps:</p>
                                        <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
                                            <li>Check your email inbox</li>
                                            <li>Enter the 6-digit code on the next page</li>
                                            <li>Create your new password</li>
                                        </ol>
                                    </div>
                                    <button
                                        onClick={() => window.location.href = `/reset-password?email=${encodeURIComponent(data.email)}`}
                                        className="w-full bg-[#1447E6] text-white font-medium py-3 px-4 rounded-xl hover:bg-[#0f3bb8] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 focus:ring-offset-2 transition-colors text-sm"
                                    >
                                        Enter Reset Code
                                    </button>
                                </div>
                            )}

                            <div className="mt-6 pt-5 border-t border-slate-100 text-center login-fade-in login-fade-in-4">
                                <Link
                                    href="/login"
                                    className="text-sm font-medium text-[#1447E6] hover:text-[#0f3bb8] transition-colors inline-flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs text-slate-400">
                        © Developed By: Althian James P. Baron - 2025 OCC Admission System. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
