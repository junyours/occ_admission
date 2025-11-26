import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';

const Topbar = ({ user, onLogout }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        setShowLogoutConfirm(false);
        setShowDropdown(false);
        router.post('/logout', {}, {
            onSuccess: () => {
                // Show success message
                if (typeof window !== 'undefined') {
                    window.showAlert('Successfully logged out!', 'success');
                }
            },
            onError: () => {
                if (typeof window !== 'undefined') {
                    window.showAlert('Error logging out. Please try again.', 'error');
                }
            }
        });
    };

    const cancelLogout = () => {
        setShowLogoutConfirm(false);
    };

    return (
        <div className="bg-white shadow-sm border-b border-gray-200 fixed inset-x-0 top-0 z-50">
            {/* Container with no padding - items will go to very edges */}
            <div className="w-full">
                <div className="flex justify-between items-center h-16 px-0">
                    {/* Logo/Brand - positioned at very start (left edge) */}
                    <div className="flex items-center pl-4 space-x-3">
                        <img 
                            src="/OCC logo.png" 
                            alt="OCC Logo" 
                            className="h-10 w-10 object-contain"
                        />
                        <Link className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                            OCC Admission System
                        </Link>
                    </div>

                    {/* User Menu - positioned at very end (right edge) */}
                    <div className="flex items-center pr-4">
                        {/* User Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="flex items-center space-x-3 focus:outline-none"
                            >
                                <div className="flex-shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors">
                                        <span className="text-sm font-medium text-white">
                                            {user?.guidanceCounselor?.name?.charAt(0) || user?.evaluator?.name?.charAt(0) || user?.name?.charAt(0) || user?.username?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                </div>
                                <div className="hidden md:block">
                                    <div className="text-sm font-medium text-gray-900">
                                        {user?.guidanceCounselor?.name || user?.evaluator?.name || user?.name || user?.username || user?.email}
                                    </div>
                                    <div className="text-xs text-gray-500 capitalize">
                                        {user?.role}
                                    </div>
                                </div>
                                <svg 
                                    className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {showDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                                    <Link
                                        href={`/${user?.role}/profile`}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        onClick={() => setShowDropdown(false)}
                                    >
                                        Profile
                                    </Link>
                                    {user?.role === 'guidance' && (
                                        <Link
                                            href="/guidance/settings"
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            onClick={() => setShowDropdown(false)}
                                        >
                                            Settings
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-stone-100 rounded-lg p-6 max-w-sm w-full mx-4 border-2 border-black animate-slideInRight ">
                        <div className="flex items-center mb-4">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-gray-900">Confirm Logout</h3>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Are you sure you want to log out? You will need to log in again to access the system.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={cancelLogout}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slideInRight {
                    animation: slideInRight 0.25s ease-out;
                }
            `}</style>
        </div>
    );
};

export default Topbar;