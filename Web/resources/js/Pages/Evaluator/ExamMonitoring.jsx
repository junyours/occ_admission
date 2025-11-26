import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function EvaluatorExamMonitoring({ user, flash }) {
    const [examStatuses, setExamStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPolling, setIsPolling] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [liveTick, setLiveTick] = useState(0);

    const fetchExamStatuses = async () => {
        try {
            console.log('[EvaluatorExamMonitoring] Fetching departmental statuses...');
            const res = await fetch('/evaluator/exam-monitoring/status');
            const data = await res.json();
            if (data.success) {
                setExamStatuses(data.data || []);
            }
        } catch (e) {
            console.error('[EvaluatorExamMonitoring] Error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isPolling) return;
        fetchExamStatuses();
        const interval = setInterval(fetchExamStatuses, 15000);
        return () => clearInterval(interval);
    }, [isPolling]);

    useEffect(() => {
        const t = setInterval(() => setLiveTick(v => v + 1), 1000);
        return () => clearInterval(t);
    }, []);

    const handleManualRefresh = async () => {
        try {
            setIsRefreshing(true);
            await fetchExamStatuses();
        } finally {
            setIsRefreshing(false);
        }
    };

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        if (diffMins > 0) return `${diffMins}m ${diffSecs}s ago`;
        return `${diffSecs}s ago`;
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'taking':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'done':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <Layout user={user}>
            <Head title="Exam Monitoring" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-up" style={{ animationDelay: '60ms' }}>
                <div className="mb-8 rounded-3xl border border-slate-800 bg-[#1D293D] text-white shadow-xl animate-up" style={{ animationDelay: '120ms' }}>
                    <div className="px-8 py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Evaluator · Monitoring</p>
                            <h1 className="text-3xl md:text-4xl font-bold">Department Exam Monitoring</h1>
                            <p className="text-white/80 max-w-2xl">
                                Live snapshot of departmental examinees, update cadence {isPolling ? 'every 15 seconds' : 'paused'}.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <button
                                onClick={() => setIsPolling(!isPolling)}
                                className={`px-5 py-3 rounded-2xl font-semibold transition-all duration-300 border ${
                                    isPolling
                                        ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                                        : 'border-transparent bg-white text-[#1D293D] hover:bg-slate-50 hover:text-[#0f1c2f]'
                                }`}
                            >
                                {isPolling ? 'Pause Monitoring' : 'Resume Monitoring'}
                            </button>
                            <button
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                className={`px-5 py-3 rounded-2xl font-semibold transition-all duration-300 border ${
                                    isRefreshing
                                        ? 'border-white/15 bg-white/5 text-white/70 cursor-not-allowed'
                                        : 'border-white/15 bg-transparent text-white hover:bg-white/10'
                                }`}
                            >
                                {isRefreshing ? 'Refreshing…' : 'Refresh Snapshot'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-8 animate-up" style={{ animationDelay: '240ms' }}>
                    <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Departmental Exams</h2>
                            <p className="text-sm text-slate-500">Only exams from your department are shown</p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Live {isPolling ? `· ${liveTick}s` : '· paused'}</span>
                    </div>
                    <div className="p-6 animate-up" style={{ animationDelay: '320ms' }}>
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1447E6]"></div>
                                <span className="ml-3 text-slate-600">Loading exam statuses...</span>
                            </div>
                        ) : examStatuses.length === 0 ? (
                            <div className="text-center p-8 text-slate-500">No active exams found for your department</div>
                        ) : (
                            <div className="overflow-x-auto animate-up" style={{ animationDelay: '360ms' }}>
                                <div className="min-w-[980px]">
                                    <div className="grid grid-cols-5 items-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] bg-slate-50 border border-slate-200 rounded-lg">
                                        <div>Name</div>
                                        <div>Time</div>
                                        <div>Exam Code</div>
                                        <div>Exam Type</div>
                                        <div className="text-right">Status</div>
                                    </div>
                                    <div className="mt-2 divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                                        {examStatuses.map((status, idx) => (
                                            <div
                                                key={`dept-${status.examinee_id}-${idx}`}
                                                className="grid grid-cols-5 items-center px-5 py-4 hover:bg-slate-50 transition-colors animate-up"
                                                style={{ animationDelay: `${380 + idx * 40}ms` }}
                                            >
                                                <div className="flex items-center gap-3 pr-4">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-200">
                                                        <span className="text-slate-700 font-semibold text-sm">
                                                            {status.examinee_name?.charAt(0)?.toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-slate-900 truncate">{status.examinee_name}</div>
                                                    </div>
                                                </div>
                                                <div className="text-slate-600">Started {getTimeAgo(status.started_at)}</div>
                                                <div className="text-slate-900 font-medium">{status.exam_title}</div>
                                                <div>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                                                        Departmental Exam
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeColor(status.status)}`}
                                                    >
                                                        {status.status === 'taking' ? 'Currently Taking' : 'Done'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}


