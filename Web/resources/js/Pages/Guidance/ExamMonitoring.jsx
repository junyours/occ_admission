import React, { useState, useEffect, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function ExamMonitoring({ user, flash }) {
    const [examStatuses, setExamStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPolling, setIsPolling] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [liveTick, setLiveTick] = useState(0); // trigger re-render for live timeago

    // Fetch exam statuses from API
    const fetchExamStatuses = async () => {
        try {
            console.log('[ExamMonitoring] Fetching exam statuses...');
            
            // Fetch regular exam statuses only
            const regularResponse = await fetch('/guidance/exam-monitoring/status');
            const regularData = await regularResponse.json();
            
            if (regularData.success) {
                setExamStatuses(regularData.data || []);
            }
            console.log('[ExamMonitoring] Statuses updated:', {
                regular: regularData.data?.length || 0
            });
            
        } catch (error) {
            console.error('[ExamMonitoring] Error fetching statuses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleManualRefresh = async () => {
        try {
            console.log('[ExamMonitoring] Manual refresh triggered');
            setIsRefreshing(true);
            await fetchExamStatuses();
            console.log('[ExamMonitoring] Manual refresh completed');
        } catch (e) {
            console.error('[ExamMonitoring] Manual refresh error:', e);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Polling effect
    useEffect(() => {
        if (!isPolling) return;
        
        // Initial fetch
        fetchExamStatuses();
        
        // Set up polling every 15 seconds
        const interval = setInterval(fetchExamStatuses, 15000);
        
        return () => clearInterval(interval);
    }, [isPolling]);

    // Live ticker for "Started Xs ago" updating automatically
    useEffect(() => {
        const t = setInterval(() => setLiveTick(v => v + 1), 1000);
        return () => clearInterval(t);
    }, []);


    // Filter out examinees with "Done" status
    const activeExamStatuses = useMemo(() => {
        return examStatuses.filter(s => s.status !== 'done');
    }, [examStatuses]);

    // Memoized status counts
    const statusCounts = useMemo(() => {
        const regular = activeExamStatuses.length;
        const currentlyTaking = activeExamStatuses.filter(s => s.status === 'taking').length;
        const recentlyDone = examStatuses.filter(s => s.status === 'done').length;
        
        return {
            total: regular,
            currentlyTaking,
            recentlyDone,
            regular
        };
    }, [activeExamStatuses, examStatuses]);

    // Format time ago
    const getTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        
        if (diffMins > 0) {
            return `${diffMins}m ${diffSecs}s ago`;
        }
        return `${diffSecs}s ago`;
    };

    // Get status badge color
    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'taking':
                return 'bg-slate-100 text-slate-700 border-slate-300';
            case 'done':
                return 'bg-slate-100 text-slate-700 border-slate-300';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-300';
        }
    };

    // Get phase badge color and label
    const getPhaseBadge = (remarks) => {
        if (remarks === 'Personality Test') {
            return {
                label: 'Personality Test',
                color: 'bg-slate-100 text-slate-700 border-slate-300'
            };
        } else if (remarks === 'In Progress') {
            return {
                label: 'Academic Exam',
                color: 'bg-slate-100 text-slate-700 border-slate-300'
            };
        }
        // Default for other remarks
        return {
            label: remarks || 'Unknown',
            color: 'bg-slate-100 text-slate-700 border-slate-300'
        };
    };


    return (
        <Layout user={user}>
            <Head title="Exam Monitoring" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-up" style={{ animationDelay: '60ms' }}>
                {/* Header Section */}
                <div className="mb-8 rounded-3xl border border-[#1D293D] overflow-hidden shadow-sm animate-fadeIn animate-up" style={{ animationDelay: '120ms' }}>
                    <div className="bg-[#1D293D] px-6 py-6 animate-up" style={{ animationDelay: '160ms' }}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-up" style={{ animationDelay: '200ms' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-white">Exam Monitoring</h1>
                                    <p className="mt-1 text-sm text-white/80">Real-time monitoring of examinees taking entrance exams</p>
                                </div>
                            </div>

                            {/* Controls moved into header */}
                            <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:gap-4 animate-up" style={{ animationDelay: '220ms' }}>
                                <div className="flex items-center gap-2 text-sm text-white/80">
                                    <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-[#1447E6] animate-pulse' : 'bg-white/60'}`}></div>
                                    <span>{isPolling ? 'Live monitoring active' : 'Monitoring paused'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsPolling(!isPolling)}
                                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors duration-150 ${
                                            isPolling 
                                                ? 'bg-white/10 border border-white/15 text-white hover:bg-white/15' 
                                                : 'bg-white border border-white/15 text-[#1D293D] hover:bg-white/90'
                                        }`}
                                    >
                                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isPolling ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                        </svg>
                                        {isPolling ? 'Stop Monitoring' : 'Start Monitoring'}
                                    </button>
                                    <button
                                        onClick={handleManualRefresh}
                                        disabled={isRefreshing}
                                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors duration-150 text-white border border-white/15 ${
                                            isRefreshing ? 'bg-white/20 cursor-not-allowed' : 'bg-white/10 hover:bg-white/15'
                                        }`}
                                    >
                                        {isRefreshing ? (
                                            <>
                                                <svg className="w-4 h-4 inline mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Refreshing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Refresh
                                            </>
                                        )}
                                    </button>
                                </div>
                                {/* Last Updated removed per request */}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg animate-up" style={{ animationDelay: '240ms' }}>
                        {flash.success}
                    </div>
                )}
                
                {flash?.error && (
                    <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg animate-up" style={{ animationDelay: '260ms' }}>
                        {flash.error}
                    </div>
                )}

                {/* Removed stats cards for a cleaner layout */}

                {/* Controls moved to header; removed separate control panel */}

                {/* Regular Exams Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 animate-up" style={{ animationDelay: '280ms' }}>
                    <div className="px-6 py-4 border-b border-slate-200 animate-up" style={{ animationDelay: '300ms' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#1447E6]/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-[#1D293D]">Entrance Exams</h2>
                                <p className="text-sm text-slate-600">Monitor examinees taking entrance exams</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 animate-up" style={{ animationDelay: '320ms' }}>
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1447E6]"></div>
                                <span className="ml-3 text-slate-600">Loading exam statuses...</span>
                            </div>
                        ) : activeExamStatuses.length === 0 ? (
                            <div className="text-center p-8 text-slate-500">
                                <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p>No examinees currently taking entrance exams</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto animate-up" style={{ animationDelay: '340ms' }}>
                                <div className="min-w-[980px]">
                                {/* Header row - added Phase column */}
                                <div className="grid grid-cols-2 md:grid-cols-6 items-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border border-slate-200 rounded-lg animate-up" style={{ animationDelay: '360ms' }}>
                                    <div className="md:col-span-1">Name</div>
                                    <div className="hidden md:block">Time</div>
                                    <div className="hidden md:block">Exam Code</div>
                                    <div className="hidden md:block">Phase</div>
                                    <div className="hidden md:block">Exam Type</div>
                                    <div className="text-left md:text-right">Status</div>
                                </div>

                                {/* Data rows */}
                                <div className="mt-2 divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                                    {activeExamStatuses.map((status, index) => {
                                        const phaseBadge = getPhaseBadge(status.remarks);
                                        return (
                                            <div
                                                key={`regular-${status.examinee_id}-${index}`}
                                                className="grid grid-cols-2 md:grid-cols-6 items-center px-5 py-4 hover:bg-[#1447E6]/10 transition-colors duration-150 animate-up"
                                                style={{ animationDelay: `${160 + index * 80}ms` }}
                                            >
                                                {/* Name */}
                                                <div className="flex items-center gap-3 pr-4">
                                                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <span className="text-slate-700 font-semibold text-sm">
                                                            {status.examinee_name?.charAt(0)?.toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-[#1D293D] truncate">{status.examinee_name}</div>
                                                    </div>
                                                </div>

                                                {/* Time */}
                                                <div className="hidden md:block text-slate-700">Started {getTimeAgo(status.started_at)}</div>

                                                {/* Exam Code */}
                                                <div className="hidden md:block text-[#1D293D] font-medium">{status.exam_title}</div>

                                                {/* Phase - NEW COLUMN */}
                                                <div className="hidden md:block">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${phaseBadge.color}`}>
                                                        {phaseBadge.label}
                                                    </span>
                                                </div>

                                                {/* Exam Type */}
                                                <div className="hidden md:block">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-300">
                                                        Entrance Exam
                                                    </span>
                                                </div>

                                                {/* Status */}
                                                <div className="text-left md:text-right">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(status.status)}`}>
                                                        {status.status === 'taking' ? 'Currently Taking' : 'Done'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </Layout>
    );
}