import React, { useState, useEffect } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';

const LOADING_MESSAGES = [
    'Validating your credentials...',
    'Securing your session...',
    'Preparing your dashboard...',
];

export default function Login() {
    const { props } = usePage();
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentLoadingMessageIndex, setCurrentLoadingMessageIndex] = useState(0);

    useEffect(() => {
        if (!isLoading) return;
        const interval = setInterval(() => {
            setCurrentLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2200);
        return () => clearInterval(interval);
    }, [isLoading]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        const startTime = Date.now();
        post('/login', {
            onFinish: () => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 8000 - elapsed);
                setTimeout(() => setIsLoading(false), remaining);
            },
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
                .login-fade-in-6 { animation-delay: 0.3s; opacity: 0; }
            `}} />

            {/* Loading overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center px-6">
                        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                            <img src="/OCC logo.png" alt="OCC" className="w-full h-full object-contain opacity-90" />
                        </div>
                        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-5" />
                        <p className="text-white font-medium text-lg">Signing you in</p>
                        <p className="text-slate-400 text-sm mt-1">{LOADING_MESSAGES[currentLoadingMessageIndex]}</p>
                    </div>
                </div>
            )}

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
                                <p className="text-slate-300 text-xs mt-0.5">Opol Community College</p>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="p-6 sm:p-8">
                            <div className="mb-6 login-fade-in login-fade-in-1">
                                <h2 className="text-xl font-semibold text-slate-800">Sign in</h2>
                                <p className="text-slate-500 text-sm mt-1">Use your email and password to continue.</p>
                            </div>

                            {props?.flash?.success && (
                                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-sm login-fade-in login-fade-in-2">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        {props.flash.success}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="login-fade-in login-fade-in-3">
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
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="login-fade-in login-fade-in-4">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                                        <Link href="/forgot-password" className="text-xs font-medium text-[#1447E6] hover:text-[#0f3bb8] transition-colors">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            className="w-full pl-10 pr-10 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20 focus:border-[#1447E6] focus:bg-white transition-colors"
                                            placeholder="••••••••"
                                            required
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((p) => !p)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-1 login-fade-in login-fade-in-5">
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
                                                Signing in...
                                            </span>
                                        ) : (
                                            'Sign in'
                                        )}
                                    </button>
                                </div>
                            </form>

                            <p className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-500 login-fade-in login-fade-in-6">
                                New student?{' '}
                                <Link href="/register" className="font-medium text-[#1447E6] hover:text-[#0f3bb8] transition-colors">
                                    Create an account
                                </Link>
                            </p>

                            <div className="mt-4 flex justify-center">
                                <Link
                                    href="/download-apk"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download mobile app
                                </Link>
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs text-slate-400">
                       Developed by: Althian James P. Baron - © 2025 OCC Admission System. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
