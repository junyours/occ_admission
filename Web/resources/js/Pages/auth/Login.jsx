import React, { useState, useEffect } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';

// Messages shown on the custom loading screen to make the process feel legitimate
const LOADING_MESSAGES = [
    'Validating your credentials...',
    'Checking account status...',
    'Securing your session...',
    'Syncing latest admission data...',
    'Preparing your dashboard widgets...',
    'Loading your permissions and roles...',
    'Optimizing layout for your device...',
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

    // Rotate loading messages while the overlay is visible
    useEffect(() => {
        if (!isLoading) return;

        const interval = setInterval(() => {
            setCurrentLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);

        return () => clearInterval(interval);
    }, [isLoading]);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Start smooth loading screen immediately
        setIsLoading(true);
        const startTime = Date.now();

        post('/login', {
            onFinish: () => {
                // Ensure loading stays visible for at least 10 seconds in total
                const elapsed = Date.now() - startTime;
                const remaining = 10000 - elapsed;

                if (remaining > 0) {
                    setTimeout(() => {
                        setIsLoading(false);
                    }, remaining);
                } else {
                    setIsLoading(false);
                }
            },
        });
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes bounce-in {
                    0% {
                        transform: scale(0.3);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.05);
                    }
                    70% {
                        transform: scale(0.9);
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes slide-in-right {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.6s ease-out;
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out;
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.6s ease-out;
                }
                @keyframes pulse-glow {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.7;
                        transform: scale(1.05);
                    }
                }
                .animate-pulse-glow {
                    animation: pulse-glow 2s ease-in-out infinite;
                }
            `}} />
            {/* Custom Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#1D293D] via-[#0f172a] to-[#1D293D] flex items-center justify-center animate-fade-in-up">
                    <div className="text-center">
                        {/* Logo with bounce animation */}
                        <div className="mb-8 animate-bounce-in">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-6 animate-pulse-glow">
                                <img 
                                    src="/OCC logo.png" 
                                    alt="OCC Logo" 
                                    className="w-full h-full object-contain drop-shadow-2xl"
                                />
                            </div>
                        </div>
                        
                        {/* Loading Spinner */}
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
                                <div className="w-16 h-16 border-4 border-transparent border-t-white rounded-full animate-spin absolute top-0 left-0"></div>
                            </div>
                        </div>
                        
                        {/* Loading Text */}
                        <div className="space-y-2">
                            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Signing you in...</h3>
                            <p className="text-white/70 text-sm sm:text-base">
                                {LOADING_MESSAGES[currentLoadingMessageIndex]}
                            </p>
                        </div>
                        
                        {/* Animated Dots */}
                        <div className="flex justify-center gap-2 mt-6">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4">
                <div className="w-full max-w-5xl">
                    {/* Login Card - Two Column Layout */}
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-bounce-in">
                        <div className="flex flex-col lg:flex-row min-h-[500px] lg:min-h-[600px]">
                            {/* Left Section - Logo/Branding */}
                            <div className="w-full lg:w-2/5 bg-gradient-to-br from-[#1D293D] to-[#0f172a] relative overflow-hidden p-8 lg:p-12">
                                {/* Subtle Background Pattern */}
                                <div className="absolute inset-0 opacity-[0.03]">
                                    <div className="absolute top-12 left-12 w-20 h-20 bg-white rounded-full animate-pulse"></div>
                                    <div className="absolute top-32 right-16 w-16 h-16 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                    <div className="absolute bottom-24 left-20 w-12 h-12 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                                    <div className="absolute bottom-32 right-12 w-20 h-20 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                                </div>
                                
                                <div className="relative z-10 flex items-center justify-center h-full">
                                    <div className="text-center animate-fade-in-up">
                                        <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mx-auto mb-6 animate-bounce-in" style={{ animationDelay: '0.2s' }}>
                                            <img 
                                                src="/OCC logo.png" 
                                                alt="OCC Logo" 
                                                className="w-full h-full object-contain drop-shadow-lg"
                                            />
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight">OCC Admission System</h2>
                                        <p className="text-white/70 text-sm lg:text-base mb-6 max-w-xs mx-auto leading-relaxed">Welcome to Opol Community College Online Admission System</p>
                                        <div className="w-20 h-1 bg-white/20 mx-auto rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Section - Login Form */}
                            <div className="w-full lg:w-3/5 p-8 lg:p-12 flex items-center justify-center bg-white">
                                <div className="w-full max-w-md animate-slide-in-right" style={{ animationDelay: '0.3s' }}>
                                    <div className="text-center mb-8">
                                        <h1 className="text-3xl sm:text-4xl font-bold text-[#1D293D] mb-3">Welcome Back</h1>
                                        <p className="text-slate-500 text-sm">Sign in to continue to your account</p>
                                    </div>

                                {/* Flash Success Message */}
                                {props?.flash?.success && (
                                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 animate-fade-in-up">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            {props.flash.success}
                                        </div>
                                    </div>
                                )}

                                {/* Login Form */}
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Email Field */}
                                    <div className="group animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                                        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-[#1447E6] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                </svg>
                                            </div>
                                            <input
                                                id="email"
                                                type="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-[#1D293D] placeholder-slate-400 focus:outline-none focus:border-[#1447E6] focus:ring-2 focus:ring-[#1447E6]/20 focus:bg-white transition-all duration-200"
                                                placeholder="Enter your email"
                                                required
                                            />
                                        </div>
                                        {errors.email && (
                                            <p className="mt-2 text-sm text-rose-600 flex items-center animate-fade-in-up">
                                                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {errors.email}
                                            </p>
                                        )}
                                    </div>

                                    {/* Password Field */}
                                    <div className="group animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
                                        <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-[#1447E6] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl text-[#1D293D] placeholder-slate-400 focus:outline-none focus:border-[#1447E6] focus:ring-2 focus:ring-[#1447E6]/20 focus:bg-white transition-all duration-200"
                                                placeholder="Enter your password"
                                                required
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={togglePasswordVisibility}
                                                    className="text-slate-400 hover:text-slate-600 transition-colors duration-200 p-1 rounded-lg hover:bg-slate-100"
                                                >
                                                    {showPassword ? (
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        {errors.password && (
                                            <p className="mt-2 text-sm text-rose-600 flex items-center animate-fade-in-up">
                                                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {errors.password}
                                            </p>
                                        )}
                                    </div>

                                    {/* Forgot Password */}
                                    <div className="text-end animate-fade-in-up" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
                                        <Link
                                            href="/forgot-password"
                                            className="text-sm text-[#1447E6] hover:text-[#1240d0] transition-colors duration-200 font-medium"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full bg-gradient-to-r from-[#1447E6] to-[#1e40af] text-white font-semibold py-3.5 px-6 rounded-xl hover:from-[#1240d0] hover:to-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl animate-fade-in-up"
                                        style={{ animationDelay: '0.7s', animationFillMode: 'both' }}
                                    >
                                        {processing ? (
                                            <div className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Signing in...
                                            </div>
                                        ) : (
                                            'Sign In'
                                        )}
                                    </button>
                                </form>

                                {/* Footer */}
                                <div className="text-center mt-8 pt-6 border-t border-slate-200 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
                                    <p className="text-slate-600 text-sm mb-4">
                                        Are you a student? <Link className="text-[#1447E6] hover:text-[#1240d0] transition-colors duration-200 font-semibold" href="/register">Register here</Link>
                                    </p>
                                    
                                    {/* Download APK Button */}
                                    <div className="mb-4">
                                        <Link
                                            href="/download-apk"
                                            className="inline-flex items-center px-5 py-2.5 bg-slate-700 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download APK
                                        </Link>
                                    </div>
                                    
                                    <div className="mt-4">
                                        <p className="text-slate-400 text-xs">
                                            © Developed By: Althian James P. Baron - 2025 OCC Admission System. All rights reserved.
                                        </p>
                                    </div>
                                </div>{/* end footer */}
                            </div>{/* end max-w-md */}
                        </div>{/* end right section */}
                    </div>{/* end flex row */}
                </div>{/* end card */}
            </div>{/* end max-w-5xl */}
        </div>{/* end min-h-screen */}
    </div>
    );
} 