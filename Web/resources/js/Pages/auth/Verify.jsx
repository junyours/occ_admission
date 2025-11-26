import React, { useEffect, useRef, useState } from 'react';
import { Link, useForm, usePage, router } from '@inertiajs/react';

export default function Verify() {
    const { props } = usePage();
    const prefillEmail = props?.email || '';

    const verifyForm = useForm({ email: prefillEmail, code: '' });
    const resendForm = useForm({ email: prefillEmail });

    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const inputsRef = useRef([]);
    
    // Detect if opened in mobile WebView
    const [isMobileView, setIsMobileView] = useState(false);
    
    useEffect(() => {
        // Check if opened with mobile=true parameter or in WebView
        const urlParams = new URLSearchParams(window.location.search);
        const isMobile = urlParams.get('mobile') === 'true' || 
                        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setIsMobileView(isMobile);
        
        if (isMobile) {
            // Add mobile-specific viewport meta tag
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            }
        }
    }, []);

    useEffect(() => {
        verifyForm.setData('code', digits.join(''));
    }, [digits]);

    const handleDigitChange = (index, value) => {
        const v = (value || '').replace(/\D/g, '').slice(0, 1);
        const next = [...digits];
        next[index] = v;
        setDigits(next);
        if (v && inputsRef.current[index + 1]) {
            inputsRef.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (digits[index]) return; // clear current first
            if (inputsRef.current[index - 1]) {
                inputsRef.current[index - 1].focus();
            }
        }
        if (e.key === 'ArrowLeft' && inputsRef.current[index - 1]) {
            inputsRef.current[index - 1].focus();
        }
        if (e.key === 'ArrowRight' && inputsRef.current[index + 1]) {
            inputsRef.current[index + 1].focus();
        }
    };

    const handlePaste = (e) => {
        const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        if (!text) return;
        e.preventDefault();
        const next = ['','','','','',''];
        for (let i = 0; i < text.length && i < 6; i++) next[i] = text[i];
        setDigits(next);
        const lastIndex = Math.min(text.length, 6) - 1;
        if (inputsRef.current[lastIndex]) inputsRef.current[lastIndex].focus();
    };

    return (
        <div className={`min-h-screen bg-slate-50 flex items-center justify-center ${isMobileView ? 'p-2' : 'p-4'}`}>
            <div className={`w-full ${isMobileView ? 'max-w-full' : 'max-w-md'}`}>
                <div className={`text-center ${isMobileView ? 'mb-3' : 'mb-6'}`}>
                    <div className={`${isMobileView ? 'w-12 h-12' : 'w-16 h-16 sm:w-20 sm:h-20'} mx-auto ${isMobileView ? 'mb-2' : 'mb-3'}`}>
                        <img src="/OCC logo.png" alt="OCC Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className={`${isMobileView ? 'text-lg' : 'text-2xl'} font-extrabold text-[#1D293D]`}>Verify your email</h1>
                    <p className={`text-slate-600 mt-1 ${isMobileView ? 'text-xs' : 'text-base'}`}>Enter the 6-digit code sent to your email.</p>
                </div>

                <div className={`bg-white ${isMobileView ? 'rounded-xl' : 'rounded-3xl'} shadow-sm border border-slate-200 ${isMobileView ? 'p-3' : 'p-6'}`}>
                    {/* Dev Code Display */}
                    {props?.flash?.dev_verification_code && (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <div className="flex items-center mb-2">
                                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="font-bold text-yellow-800">DEV MODE</span>
                            </div>
                            <p className="text-sm text-yellow-700 mb-2">{props.flash.warning || 'Email sending failed. Use this code:'}</p>
                            <div className="text-center">
                                <div className="inline-block px-6 py-3 bg-white border border-yellow-300 rounded-xl">
                                    <span className="text-3xl font-bold text-yellow-800 tracking-widest">{props.flash.dev_verification_code}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <form onSubmit={(e) => { 
                        e.preventDefault(); 
                        verifyForm.post('/register/verify', {
                            onSuccess: () => {
                                // Redirect to registration complete page
                                router.visit('/registration/complete');
                            }
                        }); 
                    }} className={`${isMobileView ? 'space-y-2' : 'space-y-4'}`}>
                        <div>
                            <label className={`block ${isMobileView ? 'text-xs' : 'text-sm'} font-semibold text-slate-700 ${isMobileView ? 'mb-1' : 'mb-2'}`}>Email</label>
                            <input
                                type="email"
                                value={verifyForm.data.email}
                                onChange={(e) => verifyForm.setData('email', e.target.value)}
                                className={`w-full px-3 ${isMobileView ? 'py-2 text-sm' : 'py-2.5'} bg-slate-100 border border-slate-300 ${isMobileView ? 'rounded-lg' : 'rounded-xl'} focus:outline-none text-slate-600 cursor-not-allowed`}
                                placeholder="your.email@gmail.com"
                                disabled
                                readOnly
                            />
                            {verifyForm.errors.email && <p className={`mt-2 ${isMobileView ? 'text-xs' : 'text-sm'} text-red-600`}>{verifyForm.errors.email}</p>}
                        </div>
                        <div>
                            <label className={`block ${isMobileView ? 'text-xs' : 'text-sm'} font-semibold text-slate-700 ${isMobileView ? 'mb-1' : 'mb-2'}`}>Verification Code</label>
                            <div className={`flex items-center justify-between ${isMobileView ? 'gap-1.5' : 'gap-2'}`} onPaste={handlePaste}>
                                {digits.map((d, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (inputsRef.current[i] = el)}
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        type="text"
                                        value={d}
                                        onChange={(e) => handleDigitChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className={`${isMobileView ? 'w-10 h-10 text-base' : 'w-12 h-12 text-lg'} text-center bg-white border border-slate-300 ${isMobileView ? 'rounded-lg' : 'rounded-xl'} focus:outline-none focus:border-[#1447E6] ${isMobileView ? 'focus:ring-1' : 'focus:ring-2'} focus:ring-[#1447E6]/30 text-[#1D293D] font-semibold`}
                                        maxLength={1}
                                        required
                                    />
                                ))}
                            </div>
                            {verifyForm.errors.code && <p className={`mt-2 ${isMobileView ? 'text-xs' : 'text-sm'} text-red-600`}>{verifyForm.errors.code}</p>}
                        </div>
                        <button
                            type="submit"
                            disabled={verifyForm.processing}
                            className={`w-full bg-[#1447E6] text-white font-semibold ${isMobileView ? 'py-2 text-sm rounded-lg' : 'py-3 rounded-xl'} hover:bg-[#1240d0] focus:outline-none ${isMobileView ? 'focus:ring-1' : 'focus:ring-2'} focus:ring-[#1447E6]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                        >
                            {verifyForm.processing ? 'Verifying…' : 'Verify and Complete Registration'}
                        </button>
                    </form>

                    <div className="mt-4 border-t border-slate-200 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Didn't receive a code?</span>
                            <button
                                type="button"
                                onClick={() => resendForm.post('/register/resend')}
                                disabled={resendForm.processing}
                                className="text-sm text-[#1447E6] hover:text-[#1240d0] font-medium transition-colors"
                            >
                                {resendForm.processing ? 'Resending…' : 'Resend Code'}
                            </button>
                        </div>
                        {resendForm.errors.registration && (
                            <p className="mt-2 text-sm text-red-600">{resendForm.errors.registration}</p>
                        )}
                        {resendForm.recentlySuccessful && (
                            <p className="mt-2 text-sm text-green-600 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Verification code resent.
                            </p>
                        )}
                    </div>

                    <div className="text-center mt-6">
                        <Link href="/register" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Back to Registration</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
