import { useState, useEffect } from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import { Head, usePage, router } from '@inertiajs/react';

const Layout = ({ children, routes, title }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLeavingImpersonation, setIsLeavingImpersonation] = useState(false);
    const { user, impersonator } = usePage().props.auth;

    const stopImpersonating = () => {
        router.post('/impersonate/stop', {}, {
            onStart: () => setIsLeavingImpersonation(true),
            onFinish: () => setIsLeavingImpersonation(false),
        });
    };

    // Add global alert function to window
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.showAlert = (message, type = 'info') => {
                const alertDiv = document.createElement('div');
                alertDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;

                const bgColor = type === 'success' ? 'bg-green-500' :
                    type === 'error' ? 'bg-red-500' :
                        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

                alertDiv.className += ` ${bgColor} text-white`;
                alertDiv.innerHTML = `
                    <div class="flex items-center">
                        <span class="mr-2">${message}</span>
                        <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-white hover:text-gray-200">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                `;
                
                document.body.appendChild(alertDiv);
                
                // Animate in
                setTimeout(() => {
                    alertDiv.classList.remove('translate-x-full');
                }, 100);
                
                // Auto remove after 5 seconds
                setTimeout(() => {
                    if (alertDiv.parentElement) {
                        alertDiv.classList.add('translate-x-full');
                        setTimeout(() => alertDiv.remove(), 300);
                    }
                }, 5000);
            };
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Head title={title || ''} />
            <Topbar user={user} />

            <div className="pt-16 flex flex-1 min-h-0">
                {/* Desktop Sidebar */}
                <div className="hidden md:block md:sticky md:top-16 md:h-[calc(100vh-4rem)]">
                    <Sidebar user={user} routes={routes} />
                </div>

                {/* Mobile Sidebar Overlay */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-40 md:hidden">
                        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
                        <div className="relative flex-1 flex flex-col max-w-xs w-full h-full bg-gradient-to-b from-blue-800 to-blue-900">
                            <div className="absolute top-0 right-0 -mr-12 pt-2">
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                >
                                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                                <Sidebar user={user} routes={routes} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile menu button */}
                <div className="md:hidden fixed top-16 left-4 z-30">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-0">
                    <main className={`flex-1 p-4 md:p-6 overflow-auto min-h-0 ${impersonator ? 'pb-20' : ''}`}>
                        {children}
                    </main>
                </div>
            </div>

            {/* Shown while an admin is signed in as another user */}
            {impersonator && (
                <div className="fixed inset-x-0 bottom-0 z-[60] bg-amber-500 text-amber-950 shadow-lg">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm">
                            You are signed in as <span className="font-semibold">{user?.username || user?.email}</span>
                            {user?.role ? ` (${user.role})` : ''}. Your admin account:{' '}
                            <span className="font-semibold">{impersonator.username || impersonator.email}</span>.
                        </p>
                        <button
                            type="button"
                            onClick={stopImpersonating}
                            disabled={isLeavingImpersonation}
                            className="self-start sm:self-auto px-4 py-1.5 rounded-lg text-sm font-semibold bg-amber-950 text-white hover:bg-amber-900 disabled:opacity-60"
                        >
                            {isLeavingImpersonation ? 'Returning...' : 'Return to admin'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout; 