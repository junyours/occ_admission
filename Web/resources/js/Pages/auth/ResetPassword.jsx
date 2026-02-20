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
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            },
        });
    };

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

    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setData('password', newPassword);
        setPasswordStrength(checkPasswordStrength(newPassword));
    };

    const getPasswordStrengthColor = () => {
        if (passwordStrength.score <= 1) return 'text-slate-500';
        if (passwordStrength.score <= 2) return 'text-slate-600';
        if (passwordStrength.score <= 3) return 'text-slate-700';
        return 'text-[#1447E6]';
    };

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
                                <p className="text-slate-300 text-xs mt-0.5">Reset Your Password</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 sm:p-8">
                            {showSuccess ? (
                                <div className="text-center login-fade-in login-fade-in-1">
                                    <div className="w-16 h-16 mx-auto mb-5 bg-emerald-50 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Password Reset Successful!</h2>
                                    <p className="text-slate-600 text-sm mb-5">
                                        Your password has been successfully updated. You will be redirected to the login page in a few seconds.
                                    </p>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
                                        <p className="text-sm font-medium text-slate-800 mb-2">Next steps:</p>
                                        <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
                                            <li>You can now log in with your new password</li>
                                            <li>Keep your password secure and don't share it</li>
                                            <li>Consider using a password manager for better security</li>
                                        </ol>
                                    </div>
                                </div>
                            ) : step === 'code' ? (
                                <>
                                    <div className="mb-6 login-fade-in login-fade-in-1">
                                        <h2 className="text-xl font-semibold text-slate-800">Enter Reset Code</h2>
                                        <p className="text-slate-500 text-sm mt-1">Enter the 6-digit code sent to your email address.</p>
                                    </div>

                                    <form onSubmit={handleCodeSubmit} className="space-y-5">
                                        {!email && (
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
                                                        {errors.email}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="login-fade-in login-fade-in-3">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">6-Digit Reset Code</label>
                                            <div className="flex items-center justify-center gap-2" role="group" aria-label="Reset code inputs">
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
                                                        className={`w-11 h-12 text-center text-lg font-semibold tracking-widest bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20 transition-all ${
                                                            errors.code ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-[#1447E6]'
                                                        }`}
                                                        aria-label={`Digit ${idx + 1}`}
                                                    />
                                                ))}
                                            </div>
                                            {errors.code && (
                                                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    {errors.code}
                                                </p>
                                            )}
                                        </div>

                                        <div className="pt-1 login-fade-in login-fade-in-4">
                                            <button
                                                type="submit"
                                                disabled={processing || otpValues.join('').length !== 6}
                                                className="w-full bg-[#1447E6] text-white font-medium py-3 px-4 rounded-xl hover:bg-[#0f3bb8] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none transition-colors text-sm"
                                            >
                                                {processing ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        Verifying...
                                                    </span>
                                                ) : (
                                                    'Verify Code'
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <>
                                    <div className="mb-6 login-fade-in login-fade-in-1">
                                        <div className="w-12 h-12 mx-auto mb-4 bg-emerald-50 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800 text-center">Create New Password</h2>
                                        <p className="text-slate-500 text-sm mt-1 text-center">Your code has been verified. Please create a new password.</p>
                                    </div>

                                    <form onSubmit={handlePasswordSubmit} className="space-y-5">
                                        <div className="login-fade-in login-fade-in-2">
                                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
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
                                                    onChange={handlePasswordChange}
                                                    className="w-full pl-10 pr-10 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20 focus:border-[#1447E6] focus:bg-white transition-colors"
                                                    placeholder="••••••••"
                                                    required
                                                    autoComplete="new-password"
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
                                            {data.password && (
                                                <div className="mt-2">
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className="text-slate-600">Password strength:</span>
                                                        <span className={`font-medium ${getPasswordStrengthColor()}`}>
                                                            {passwordStrength.message}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                                passwordStrength.score <= 1 ? 'bg-slate-400' :
                                                                passwordStrength.score <= 2 ? 'bg-slate-500' :
                                                                passwordStrength.score <= 3 ? 'bg-slate-600' : 'bg-[#1447E6]'
                                                            }`}
                                                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {errors.password && (
                                                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                                                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    {getErrorMessage('password')}
                                                </p>
                                            )}
                                        </div>

                                        <div className="login-fade-in login-fade-in-3">
                                            <label htmlFor="password_confirmation" className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                </div>
                                                <input
                                                    id="password_confirmation"
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    value={data.password_confirmation}
                                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                                    className="w-full pl-10 pr-10 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20 focus:border-[#1447E6] focus:bg-white transition-colors"
                                                    placeholder="••••••••"
                                                    required
                                                    autoComplete="new-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword((p) => !p)}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                                >
                                                    {showConfirmPassword ? (
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
                                            {errors.password_confirmation && (
                                                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                                                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    {getErrorMessage('password_confirmation')}
                                                </p>
                                            )}
                                        </div>

                                        {data.password && data.password_confirmation && data.password !== data.password_confirmation && (
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 login-fade-in login-fade-in-4">
                                                <div className="flex items-start gap-2">
                                                    <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">Password Mismatch</p>
                                                        <p className="text-sm text-slate-600 mt-0.5">The passwords you entered do not match. Please make sure both passwords are identical.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-1 login-fade-in login-fade-in-5">
                                            <button
                                                type="submit"
                                                disabled={processing || (data.password && data.password_confirmation && data.password !== data.password_confirmation)}
                                                className="w-full bg-[#1447E6] text-white font-medium py-3 px-4 rounded-xl hover:bg-[#0f3bb8] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none transition-colors text-sm"
                                            >
                                                {processing ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        Updating...
                                                    </span>
                                                ) : (
                                                    'Reset Password'
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}

                            <div className="mt-6 pt-5 border-t border-slate-100 text-center login-fade-in login-fade-in-6">
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
