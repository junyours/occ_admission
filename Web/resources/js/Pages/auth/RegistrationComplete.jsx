import React, { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';

export default function RegistrationComplete() {
    const [countdown, setCountdown] = useState(5);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Detect if running in mobile app (check for custom user agent or query parameter)
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
        const isInApp = window.location.search.includes('mobile=true') || window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
        
        const mobileDetected = isMobileDevice || isInApp;
        setIsMobile(mobileDetected);

        // Countdown timer
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // If mobile, close browser UI (send message to parent or close window)
                    if (mobileDetected) {
                        // Try to close the browser UI (for future mobile implementation)
                        if (window.ReactNativeWebView) {
                            // React Native WebView
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'close_browser' }));
                        } else if (window.webkit?.messageHandlers?.closeBrowser) {
                            // iOS WKWebView
                            window.webkit.messageHandlers.closeBrowser.postMessage({});
                        } else if (window.Android?.closeBrowser) {
                            // Android WebView
                            window.Android.closeBrowser();
                        } else {
                            // Fallback: redirect to login
                            router.visit('/login');
                        }
                    } else {
                        // Desktop/Web: redirect to login
                        router.visit('/login');
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleRedirectNow = () => {
        if (isMobile) {
            // Try to close browser UI
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'close_browser' }));
            } else if (window.webkit?.messageHandlers?.closeBrowser) {
                window.webkit.messageHandlers.closeBrowser.postMessage({});
            } else if (window.Android?.closeBrowser) {
                window.Android.closeBrowser();
            } else {
                router.visit('/login');
            }
        } else {
            router.visit('/login');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4">
                        <div className="w-full h-full bg-[#1447E6] rounded-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-extrabold text-[#1D293D] mb-2">Registration Complete!</h1>
                    <p className="text-slate-600 text-lg">Your account has been successfully created.</p>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                    {/* Success Message */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-[#1D293D] mb-3">Email Verified Successfully</h2>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                            <p className="text-slate-700 text-sm leading-relaxed">
                                Email verified successfully. Your account has been created. Please login to see your exam schedule.
                            </p>
                        </div>
                        <p className="text-slate-600 text-sm">
                            {isMobile ? 'Returning to mobile app...' : 'Redirecting to login page...'}
                        </p>
                    </div>

                    {/* Countdown Timer */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                            <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-700">
                                Redirecting in <span className="text-[#1447E6] font-bold">{countdown}</span> second{countdown !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Mobile App Instructions */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-[#1447E6] rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-[#1D293D] mb-2">Proceed to Mobile App</h3>
                                <p className="text-sm text-slate-600 mb-4">
                                    Download and install the OCC Admission mobile app to continue with your admission process, take exams, and access your results.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center text-sm text-slate-600">
                                        <svg className="w-4 h-4 text-[#1447E6] mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span>Access your exam schedule</span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600">
                                        <svg className="w-4 h-4 text-[#1447E6] mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span>Take entrance examinations</span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600">
                                        <svg className="w-4 h-4 text-[#1447E6] mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span>View your results and recommendations</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Download APK Button */}
                    <div className="mb-6">
                        <a
                            href="/download/apk"
                            className="w-full bg-[#1447E6] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#1240d0] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 transition-colors flex items-center justify-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download Mobile App (APK)</span>
                        </a>
                    </div>

                    {/* Additional Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                        <div className="flex items-start space-x-3">
                            <svg className="w-5 h-5 text-[#1447E6] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="text-sm text-slate-700">
                                    <strong className="text-[#1D293D]">Note:</strong> The mobile app provides a seamless experience for taking exams and viewing results. You can also access the web version through the mobile app's built-in browser.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={handleRedirectNow}
                            className="w-full bg-[#1447E6] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#1240d0] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 transition-colors"
                        >
                            {isMobile ? 'Return to App Now' : 'Go to Login Page Now'}
                        </button>
                        <div className="text-center">
                            <Link
                                href="/register"
                                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                Back to Registration
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                    <p className="text-xs text-slate-400">
                        © 2025 OCC Admission System. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

