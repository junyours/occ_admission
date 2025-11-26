import React, { useState, useEffect } from 'react';
import { Link, useForm } from '@inertiajs/react';

export default function ResetPassword({ email, codeVerified = false }) {
    const [step, setStep] = useState(codeVerified ? 'password' : 'code');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '' });

    const { data, setData, post, processing, errors } = useForm({
        email: email || '',
        code: '',
        password: '',
        password_confirmation: '',
    });
    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const inputRefs = React.useRef([]);

    useEffect(() => {
        if (email) {
            setData('email', email);
        }
    }, [email]);

    const handleCodeSubmit = (e) => {
        e.preventDefault();
        const code = otpValues.join('');
        setData('code', code);
        post('/reset-password/verify', {
            onSuccess: () => {
                setStep('password');
            },
        });
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        post('/reset-password/update', {
            onSuccess: () => {
                setShowSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            },
        });
    };

    const handleBackToLogin = () => {
        window.location.href = '/login';
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    // Password strength checker
    const checkPasswordStrength = (password) => {
        let score = 0;
        let message = '';

        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score === 0) message = 'Very Weak';
        else if (score === 1) message = 'Weak';
        else if (score === 2) message = 'Fair';
        else if (score === 3) message = 'Good';
        else if (score === 4) message = 'Strong';
        else message = 'Very Strong';

        return { score, message };
    };

    // Handle password change
    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setData('password', newPassword);
        setPasswordStrength(checkPasswordStrength(newPassword));
    };

    // Get password strength color
    const getPasswordStrengthColor = () => {
        if (passwordStrength.score <= 1) return 'text-slate-500';
        if (passwordStrength.score <= 2) return 'text-slate-600';
        if (passwordStrength.score <= 3) return 'text-slate-700';
        if (passwordStrength.score <= 4) return 'text-[#1447E6]';
        return 'text-[#1447E6]';
    };

    // Get detailed error message
    const getErrorMessage = (field) => {
        if (!errors[field]) return null;
        
        const error = errors[field];
        
        if (field === 'password' && error.includes('confirmed')) {
            return 'Password confirmation does not match. Please make sure both passwords are identical.';
        }
        if (field === 'password' && error.includes('min')) {
            return 'Password must be at least 8 characters long.';
        }
        
        return error;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl lg:max-w-3xl">
                {/* Reset Password Card - Two Column Layout */}
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
                                    <p className="text-white/80 text-xs lg:text-sm mb-2 lg:mb-3">Reset Your Password</p>
                                    <div className="w-12 lg:w-16 h-1 bg-white/30 mx-auto rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Right Section - Reset Password Form */}
                        <div className="w-full lg:w-1/2 p-4 lg:p-6 flex items-center justify-center bg-white">
                            <div className="w-full max-w-sm">
                                {showSuccess ? (
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h2 className="text-xl font-bold text-[#1D293D] mb-2">Password Reset Successful!</h2>
                                        <p className="text-slate-600 mb-4">
                                            Your password has been successfully updated. You will be redirected to the login page in a few seconds.
                                        </p>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                            <p className="text-sm font-semibold text-[#1D293D] mb-2">
                                                Next steps:
                                            </p>
                                            <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1 text-left">
                                                <li>You can now log in with your new password</li>
                                                <li>Keep your password secure and don't share it</li>
                                                <li>Consider using a password manager for better security</li>
                                            </ol>
                                        </div>
                                    </div>
                                ) : (
                                    step === 'code' ? (
                                    <>
                                        <div className="text-center mb-4 lg:mb-6">
                                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D293D] mb-2 lg:mb-3">Enter Reset Code</h1>
                                            <p className="text-slate-600 text-sm">
                                                Enter the 6-digit code sent to your email address.
                                            </p>
                                        </div>

                                        {/* Code Verification Form */}
                                        <form onSubmit={handleCodeSubmit} className="space-y-4 lg:space-y-5">
                                            {/* Email Field (hidden if provided) */}
                                            {!email && (
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
                                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4 a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                            {errors.email}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Code Field - 6-box OTP */}
                                            <div className="group">
                                                <label htmlFor="code" className="block text-sm font-semibold text-[#1D293D] mb-2">
                                                    6-Digit Reset Code
                                                </label>
                                                <div>
                                                    <div className="flex items-center justify-center gap-2 sm:gap-3" role="group" aria-label="Reset code inputs">
                                                        {Array.from({ length: 6 }).map((_, idx) => (
                                                            <input
                                                                key={idx}
                                                                ref={(el) => (inputRefs.current[idx] = el)}
                                                                type="text"
                                                                inputMode="numeric"
                                                                pattern="[0-9]*"
                                                                maxLength={1}
                                                                value={otpValues[idx] || ''}
                                                                onChange={(e) => {
                                                                    const digit = e.target.value.replace(/\D/g, '').slice(0, 1);
                                                                    const next = [...otpValues];
                                                                    next[idx] = digit;
                                                                    setOtpValues(next);
                                                                    setData('code', next.join(''));
                                                                    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Backspace') {
                                                                        if (!otpValues[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
                                                                    }
                                                                    if (e.key === 'ArrowLeft' && idx > 0) {
                                                                        e.preventDefault();
                                                                        inputRefs.current[idx - 1]?.focus();
                                                                    }
                                                                    if (e.key === 'ArrowRight' && idx < 5) {
                                                                        e.preventDefault();
                                                                        inputRefs.current[idx + 1]?.focus();
                                                                    }
                                                                }}
                                                                onPaste={(e) => {
                                                                    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                                                                    if (!pasted) return;
                                                                    e.preventDefault();
                                                                    const next = [...otpValues];
                                                                    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
                                                                    setOtpValues(next);
                                                                    setData('code', next.join(''));
                                                                    const lastIndex = Math.min(pasted.length - 1, 5);
                                                                    inputRefs.current[lastIndex]?.focus();
                                                                }}
                                                                className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-2xl font-semibold tracking-widest bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 transition-all duration-200 ${errors.code ? 'border-slate-400 focus:border-slate-400' : 'border-slate-300 focus:border-[#1447E6]'}`}
                                                                aria-label={`Digit ${idx + 1}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {errors.code && (
                                                    <p className="mt-2 text-sm text-slate-600 flex items-center">
                                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        {errors.code}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Submit Button */}
                                            <button
                                                type="submit"
                                                disabled={processing || (otpValues.join('').length !== 6)}
                                                className="w-full bg-[#1447E6] text-white font-semibold py-2.5 px-6 rounded-xl hover:bg-[#1240d0] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processing ? (
                                                    <div className="flex items-center justify-center">
                                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Verifying...
                                                    </div>
                                                ) : (
                                                    'Verify Code'
                                                )}
                                            </button>
                                        </form>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center mb-4 lg:mb-6">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D293D] mb-2 lg:mb-3">Create New Password</h1>
                                            <p className="text-slate-600 text-sm">
                                                Your code has been verified. Please create a new password.
                                            </p>
                                        </div>

                                        {/* Password Reset Form */}
                                        <form onSubmit={handlePasswordSubmit} className="space-y-4 lg:space-y-5">
                                            {/* New Password Field */}
                                            <div className="group">
                                                <label htmlFor="password" className="block text-sm font-semibold text-[#1D293D] mb-2">
                                                    New Password
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
                                                        onChange={handlePasswordChange}
                                                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-[#1D293D] placeholder-slate-400 focus:outline-none focus:border-[#1447E6] focus:ring-2 focus:ring-[#1447E6]/30 transition-all duration-200"
                                                        placeholder="Enter your new password"
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
                                                {/* Password Strength Indicator */}
                                                {data.password && (
                                                    <div className="mt-2">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-slate-600">Password strength:</span>
                                                            <span className={`font-medium ${getPasswordStrengthColor()}`}>
                                                                {passwordStrength.message}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 w-full bg-slate-200 rounded-full h-2">
                                                            <div 
                                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                                    passwordStrength.score <= 1 ? 'bg-slate-400' :
                                                                    passwordStrength.score <= 2 ? 'bg-slate-500' :
                                                                    passwordStrength.score <= 3 ? 'bg-slate-600' :
                                                                    passwordStrength.score <= 4 ? 'bg-[#1447E6]' : 'bg-[#1447E6]'
                                                                }`}
                                                                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}
                                                {errors.password && (
                                                    <p className="mt-2 text-sm text-slate-600 flex items-center">
                                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        {getErrorMessage('password')}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Confirm Password Field */}
                                            <div className="group">
                                                <label htmlFor="password_confirmation" className="block text-sm font-semibold text-[#1D293D] mb-2">
                                                    Confirm New Password
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <svg className="h-5 w-5 text-slate-400 group-focus-within:text-[#1447E6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                        </svg>
                                                    </div>
                                                    <input
                                                        id="password_confirmation"
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        value={data.password_confirmation}
                                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-[#1D293D] placeholder-slate-400 focus:outline-none focus:border-[#1447E6] focus:ring-2 focus:ring-[#1447E6]/30 transition-all duration-200"
                                                        placeholder="Confirm your new password"
                                                        required
                                                    />
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                                        <button
                                                            type="button"
                                                            onClick={toggleConfirmPasswordVisibility}
                                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            {showConfirmPassword ? (
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
                                                {errors.password_confirmation && (
                                                    <p className="mt-2 text-sm text-slate-600 flex items-center">
                                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        {getErrorMessage('password_confirmation')}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Password Match Warning */}
                                            {data.password && data.password_confirmation && data.password !== data.password_confirmation && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0">
                                                            <svg className="h-5 w-5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm font-semibold text-[#1D293D]">
                                                                Password Mismatch
                                                            </p>
                                                            <p className="text-sm text-slate-600 mt-1">
                                                                The passwords you entered do not match. Please make sure both passwords are identical.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Submit Button */}
                                            <button
                                                type="submit"
                                                disabled={processing || (data.password && data.password_confirmation && data.password !== data.password_confirmation)}
                                                className="w-full bg-[#1447E6] text-white font-semibold py-2.5 px-6 rounded-xl hover:bg-[#1240d0] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processing ? (
                                                    <div className="flex items-center justify-center">
                                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Updating...
                                                    </div>
                                                ) : (
                                                    'Reset Password'
                                                )}
                                            </button>
                                        </form>
                                    </>
                                )
                                )}

                                {/* Footer */}
                                <div className="text-center mt-4 lg:mt-6 pt-3 lg:pt-4 border-t border-slate-200">
                                    <button
                                        onClick={handleBackToLogin}
                                        className="text-[#1447E6] hover:text-[#1240d0] transition-colors duration-200 font-semibold"
                                    >
                                        ← Back to Login
                                    </button>
                                    
                                    <div className="mt-2 lg:mt-3">
                                        <p className="text-slate-500 text-sm">
                                        © Developed By: Althian James P. Baron - 2025 OCC Admission System. All rights reserved.
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
