import React, { useState } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';

export default function Login() {
    const { props } = usePage();
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/login');
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl lg:max-w-3xl">
                {/* Login Card - Two Column Layout */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex flex-col lg:flex-row min-h-[400px] lg:min-h-[450px]">
                        {/* Left Section - Logo/Branding */}
                        <div className="w-full lg:w-1/2 bg-[#1D293D] relative overflow-hidden p-4 lg:p-6">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-5">
                                <div className="absolute top-8 left-8 w-12 h-12 lg:w-16 lg:h-16 bg-white rounded-full"></div>
                                <div className="absolute top-24 right-12 w-8 h-8 lg:w-12 lg:h-12 bg-white rounded-full"></div>
                                <div className="absolute bottom-16 left-16 w-6 h-6 lg:w-8 lg:h-8 bg-white rounded-full"></div>
                                <div className="absolute bottom-24 right-8 w-12 h-12 lg:w-16 lg:h-16 bg-white rounded-full"></div>
                            </div>
                            
                            <div className="relative z-10 flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-3 lg:mb-4">
                                        <img 
                                            src="/OCC logo.png" 
                                            alt="OCC Logo" 
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 lg:mb-3">OCC Admission System</h2>
                                    <p className="text-white/80 text-xs lg:text-sm mb-2 lg:mb-3">Welcome to Opol Community College Online Admission System.</p>
                                    <div className="w-12 lg:w-16 h-1 bg-white/30 mx-auto rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Right Section - Login Form */}
                        <div className="w-full lg:w-1/2 p-4 lg:p-6 flex items-center justify-center bg-white">
                            <div className="w-full max-w-sm">
                                <div className="text-center mb-4 lg:mb-6">
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D293D] mb-2 lg:mb-3">Login</h1>
                                    <p className="text-sm text-slate-500">Sign in to your account</p>
                                </div>

                                {/* Flash Success Message (e.g., after email verification) */}
                                {props?.flash?.success && (
                                    <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                                        {props.flash.success}
                                    </div>
                                )}

                                {/* Login Form */}
                                <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
                                    {/* Email Field */}
                                    <div className="group">
                                        <label htmlFor="email" className="block text-sm font-semibold text-[#1D293D] mb-2">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-[#1447E6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                </svg>
                                            </div>
                                            <input
                                                id="email"
                                                type="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-[#1D293D] placeholder-slate-400 focus:outline-none focus:border-[#1447E6] focus:ring-2 focus:ring-[#1447E6]/30 transition-all duration-200"
                                                placeholder="Enter your Email Address"
                                                required
                                            />
                                        </div>
                                        {errors.email && (
                                            <p className="mt-2 text-sm text-slate-600 flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {errors.email}
                                            </p>
                                        )}
                                    </div>

                                    {/* Password Field */}
                                    <div className="group">
                                        <label htmlFor="password" className="block text-sm font-semibold text-[#1D293D] mb-2">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-[#1447E6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-[#1D293D] placeholder-slate-400 focus:outline-none focus:border-[#1447E6] focus:ring-2 focus:ring-[#1447E6]/30 transition-all duration-200"
                                                placeholder="Enter your password"
                                                required
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={togglePasswordVisibility}
                                                    className="text-slate-400 hover:text-slate-600 transition-colors"
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
                                            <p className="mt-2 text-sm text-slate-600 flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {errors.password}
                                            </p>
                                        )}
                                    </div>

                                    {/* Forgot Password */}
                                    <div className="text-end">
                                        <Link
                                            href="/forgot-password"
                                            className="text-sm text-[#1447E6] hover:text-[#1240d0] transition-colors duration-200 font-semibold"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full bg-[#1447E6] text-white font-semibold py-2.5 px-6 rounded-xl hover:bg-[#1240d0] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                <div className="text-center mt-4 lg:mt-6 pt-3 lg:pt-4 border-t border-slate-200">
                                    <p className="text-slate-600 text-sm mb-3 lg:mb-4">
                                        Are you a student? <Link className="text-[#1447E6] hover:text-[#1240d0] transition-colors duration-200 font-semibold" href="/register">Register for the exam here.</Link>
                                    </p>
                                    
                                    {/* Download APK Button */}
                                    <div className="mb-3 lg:mb-4">
                                        <Link
                                            href="/download-apk"
                                            className="inline-flex items-center px-4 py-2 bg-slate-600 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-colors duration-150"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download APK
                                        </Link>
                                    </div>
                                    
                                    <div className="mt-2 lg:mt-3">
                                        <p className="text-slate-500 text-sm">
                                            © Developed By:Althian James P. Baron - 2025 OCC Admission System. All rights reserved.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 