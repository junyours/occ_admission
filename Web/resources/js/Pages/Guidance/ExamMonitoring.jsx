import React, { useState, useEffect, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import Layout from '../../Components/Layout';

// An exam still "taking" after this long is almost certainly abandoned
// (app closed, data cleared, phone died) rather than actually in progress.
const STUCK_AFTER_HOURS = 3;

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Taking now' },
    { key: 'stuck', label: 'Possibly stuck' },
];

const formatDuration = (ms) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
};

const formatDateTime = (timestamp) =>
    new Date(timestamp).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

const getPhaseLabel = (remarks) => {
    if (remarks === 'Personality Test') return 'Personality Test';
    if (remarks === 'In Progress') return 'Academic Exam';
    return remarks || 'Unknown';
};

const getInitials = (name = '') =>
    name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .filter((_, i, arr) => i === 0 || i === arr.length - 1)
        .join('')
        .toUpperCase() || '?';

export default function ExamMonitoring({ user, flash }) {
    const [examStatuses, setExamStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPolling, setIsPolling] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [now, setNow] = useState(Date.now()); // drives the live "time elapsed"
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [resetTarget, setResetTarget] = useState(null); // row awaiting reset confirmation
    const [isResetting, setIsResetting] = useState(false);

    const fetchExamStatuses = async () => {
        try {
            const response = await fetch('/guidance/exam-monitoring/status');
            const data = await response.json();
            if (data.success) {
                setExamStatuses(data.data || []);
            }
        } catch (error) {
            console.error('[ExamMonitoring] Error fetching statuses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchExamStatuses();
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleConfirmReset = async () => {
        if (!resetTarget) return;
        setIsResetting(true);
        try {
            const response = await axios.post('/guidance/exam-monitoring/reset', {
                examinee_id: resetTarget.examinee_id,
                exam_id: resetTarget.exam_id,
            });
            window?.showAlert?.(response.data.message || 'Exam reset successfully.', 'success');
            setResetTarget(null);
            await fetchExamStatuses();
        } catch (error) {
            console.error('[ExamMonitoring] Reset error:', error);
            window?.showAlert?.(error.response?.data?.message || 'Failed to reset the exam.', 'error');
        } finally {
            setIsResetting(false);
        }
    };

    // Poll every 15 seconds while monitoring is on
    useEffect(() => {
        if (!isPolling) return;
        fetchExamStatuses();
        const interval = setInterval(fetchExamStatuses, 15000);
        return () => clearInterval(interval);
    }, [isPolling]);

    // Tick every second so elapsed times stay live
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    // Rows still taking the exam, with derived fields
    const takingRows = useMemo(() => {
        const stuckMs = STUCK_AFTER_HOURS * 60 * 60 * 1000;
        return examStatuses
            .filter((s) => s.status === 'taking')
            .map((s) => {
                const startedMs = s.started_at ? new Date(s.started_at).getTime() : null;
                const elapsedMs = startedMs ? now - startedMs : 0;
                return { ...s, startedMs, elapsedMs, isStuck: elapsedMs > stuckMs };
            });
    }, [examStatuses, now]);

    const counts = useMemo(() => {
        const stuck = takingRows.filter((r) => r.isStuck).length;
        return { all: takingRows.length, active: takingRows.length - stuck, stuck };
    }, [takingRows]);

    const visibleRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return takingRows
            .filter((r) => (filter === 'stuck' ? r.isStuck : filter === 'active' ? !r.isStuck : true))
            .filter((r) =>
                !q ||
                r.examinee_name?.toLowerCase().includes(q) ||
                String(r.examinee_id).includes(q) ||
                r.exam_title?.toLowerCase().includes(q)
            )
            // Most recent first, so students actually taking the exam stay on top
            .sort((a, b) => (b.startedMs || 0) - (a.startedMs || 0));
    }, [takingRows, filter, search]);

    return (
        <Layout user={user}>
            <Head title="Exam Monitoring" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6 rounded-3xl overflow-hidden shadow-sm bg-[#1D293D] px-6 py-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">Exam Monitoring</h1>
                            <p className="mt-1 text-sm text-white/80">
                                Students taking the entrance exam right now. Use Reset for a student who can't log back in.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-white/80">
                                <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-emerald-400 animate-pulse' : 'bg-white/50'}`} />
                                {isPolling ? 'Live · updates every 15s' : 'Paused'}
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPolling(!isPolling)}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-white/10 border border-white/15 hover:bg-white/15"
                            >
                                {isPolling ? 'Pause' : 'Resume'}
                            </button>
                            <button
                                type="button"
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-[#1D293D] bg-white hover:bg-white/90 disabled:opacity-60"
                            >
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </button>
                        </div>
                    </div>
                </div>

                {flash?.success && (
                    <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">{flash.error}</div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    {/* Toolbar: filters + search */}
                    <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {FILTERS.map((f) => {
                                const active = filter === f.key;
                                const isStuckTab = f.key === 'stuck';
                                return (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => setFilter(f.key)}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                            active
                                                ? 'bg-[#1D293D] text-white border-[#1D293D]'
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {f.label}
                                        <span
                                            className={`min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                                                active
                                                    ? 'bg-white/20 text-white'
                                                    : isStuckTab && counts.stuck > 0
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {counts[f.key]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="relative md:w-80">
                            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                            </svg>
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, examinee ID or exam code"
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#1447E6] focus:ring-[#1447E6]"
                            />
                        </div>
                    </div>

                    {filter === 'stuck' && counts.stuck > 0 && (
                        <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-900">
                            These students started more than {STUCK_AFTER_HOURS} hours ago and never submitted. If one of them
                            can't log in ("Currently Taking an Exam on another device"), reset their exam.
                        </div>
                    )}

                    {/* List */}
                    {loading ? (
                        <div className="flex items-center justify-center p-12 text-slate-600">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1447E6] mr-3" />
                            Loading...
                        </div>
                    ) : visibleRows.length === 0 ? (
                        <div className="text-center p-12 text-slate-500">
                            {search
                                ? `No students match "${search}".`
                                : filter === 'stuck'
                                    ? 'No stuck exams.'
                                    : 'No students are taking the entrance exam right now.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <th className="px-4 sm:px-6 py-3">Student</th>
                                        <th className="px-4 py-3">Exam code</th>
                                        <th className="px-4 py-3">Phase</th>
                                        <th className="px-4 py-3">Started</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 sm:px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {visibleRows.map((row) => (
                                        <tr
                                            key={`${row.examinee_id}-${row.exam_id}`}
                                            className={row.isStuck ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'}
                                        >
                                            <td className="px-4 sm:px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                                        {getInitials(row.examinee_name)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-[#1D293D] leading-snug">{row.examinee_name}</div>
                                                        <div className="text-xs text-slate-500">Examinee ID {row.examinee_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-[#1D293D] whitespace-nowrap">{row.exam_title}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">{getPhaseLabel(row.remarks)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {row.startedMs ? (
                                                    <>
                                                        <div className="text-slate-800">{formatDuration(row.elapsedMs)} ago</div>
                                                        <div className="text-xs text-slate-500">{formatDateTime(row.started_at)}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {row.isStuck ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-100 text-amber-800 border-amber-300">
                                                        Possibly stuck
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Taking now
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 sm:px-6 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setResetTarget(row)}
                                                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-300 text-red-700 bg-white hover:bg-red-50"
                                                >
                                                    Reset
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && visibleRows.length > 0 && (
                        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 text-xs text-slate-500">
                            Showing {visibleRows.length} of {counts.all} student{counts.all === 1 ? '' : 's'} taking the exam
                        </div>
                    )}
                </div>
            </div>

            {/* Reset confirmation modal */}
            {resetTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-[#1D293D]">Reset exam?</h3>
                        </div>
                        <div className="px-6 py-5 space-y-3 text-sm text-slate-700">
                            <p>
                                This resets <span className="font-semibold text-[#1D293D]">{resetTarget.examinee_name}</span>'s
                                {' '}exam <span className="font-semibold text-[#1D293D]">{resetTarget.exam_title}</span>
                                {resetTarget.startedMs ? <> (started {formatDuration(resetTarget.elapsedMs)} ago)</> : null}.
                            </p>
                            {!resetTarget.isStuck && (
                                <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">
                                    This student started recently and may still be taking the exam. Reset only if they
                                    can't log in.
                                </p>
                            )}
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Deletes the answers they have saved so far. They will start the exam over.</li>
                                <li>Signs them out of the mobile app on every device.</li>
                                <li>Lets them log in again. This fixes the "Currently Taking an Exam on another device" error.</li>
                            </ul>
                            <p className="text-red-700 font-medium">This cannot be undone.</p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setResetTarget(null)}
                                disabled={isResetting}
                                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReset}
                                disabled={isResetting}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                            >
                                {isResetting ? 'Resetting...' : 'Reset exam'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
