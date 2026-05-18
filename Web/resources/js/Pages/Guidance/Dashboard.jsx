import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import ChartCard from '../../Components/ChartCard';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
);

const CHART_TABS = [
    { id: 'passfail', label: 'Pass vs fail', title: 'Pass vs Fail', subtitle: 'Last 10 results' },
    { id: 'scores', label: 'Score trend', title: 'Recent Scores', subtitle: 'Last 10 examinees' },
    { id: 'exams', label: 'Exam status', title: 'Exams Status', subtitle: 'Recent exams' },
];

/** Same resolution as ExamResults.jsx — uses Examinee full_name append or fname/mname/lname */
const getExamineeDisplayName = (result) => {
    const ex = result?.examinee;
    if (!ex) {
        console.log('[Dashboard] Missing examinee for result', result?.resultId, 'examineeId', result?.examineeId);
        return 'Unknown Student';
    }
    if (ex.full_name && String(ex.full_name).trim()) {
        return String(ex.full_name).trim();
    }
    const parts = [ex.fname, ex.mname, ex.lname].filter((p) => p != null && String(p).trim() !== '');
    if (parts.length > 0) {
        return parts.join(' ').replace(/\s+/g, ' ').trim();
    }
    return 'Unknown Student';
};

const GuidanceDashboard = ({ user, guidanceCounselor, stats, recent_exams, recent_results }) => {
    const [activeChart, setActiveChart] = useState('passfail');

    console.log('[Dashboard] Props:', { user, stats, recent_exams, recent_results });

    const averageScore = recent_results?.length > 0
        ? Math.round(recent_results.reduce((sum, r) => sum + (r.score || 0), 0) / recent_results.length)
        : 0;
    const passRate = recent_results?.length > 0
        ? Math.round((recent_results.filter((r) => (r.score || 0) >= 10).length / recent_results.length) * 100)
        : 0;

    const getScoreColor = (score) => {
        if (score >= 85) return 'text-[#1447E6]';
        if (score >= 70) return 'text-emerald-600';
        if (score >= 60) return 'text-amber-500';
        return 'text-rose-600';
    };

    const getPassRateColor = (rate) => {
        if (rate >= 80) return 'text-[#1447E6]';
        if (rate >= 60) return 'text-emerald-600';
        if (rate >= 40) return 'text-amber-500';
        return 'text-rose-600';
    };

    const passCount = (recent_results || []).filter((r) => (r.score || 0) >= 10).length;
    const failCount = Math.max((recent_results || []).length - passCount, 0);

    const passFailData = {
        labels: ['Passed', 'Failed'],
        datasets: [
            {
                label: 'Results',
                data: [passCount, failCount],
                backgroundColor: ['#1447E6', '#1D293D'],
                borderColor: ['#1447E6', '#1D293D'],
                borderWidth: 1,
            },
        ],
    };

    const recentScores = (recent_results || []).slice(0, 10).reverse();
    const lineData = {
        labels: recentScores.map((r) => {
            const name = getExamineeDisplayName(r);
            return name === 'Unknown Student' ? 'Student' : name;
        }),
        datasets: [
            {
                label: 'Score %',
                data: recentScores.map((r) => r.score || 0),
                borderColor: '#1447E6',
                backgroundColor: 'rgba(20, 71, 230, 0.15)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
            },
        ],
    };

    const activeExamsCount = (recent_exams || []).filter((e) => e.status === 'active').length;
    const inactiveExams = Math.max((recent_exams || []).length - activeExamsCount, 0);
    const barData = {
        labels: ['Active', 'Other'],
        datasets: [
            {
                label: 'Exams',
                data: [activeExamsCount, inactiveExams],
                backgroundColor: ['#1447E6', 'rgba(29, 41, 61, 0.4)'],
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12 } },
            tooltip: { mode: 'index', intersect: false },
        },
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 20 } },
        },
    };

    const activeChartMeta = CHART_TABS.find((t) => t.id === activeChart) || CHART_TABS[0];

    const renderActiveChart = () => {
        const height = 280;
        if (activeChart === 'passfail') {
            return (
                <div style={{ height }}>
                    <Doughnut data={passFailData} options={{ ...chartOptions, scales: {} }} />
                </div>
            );
        }
        if (activeChart === 'scores') {
            return (
                <div style={{ height }}>
                    <Line data={lineData} options={chartOptions} />
                </div>
            );
        }
        return (
            <div style={{ height }}>
                <Bar data={barData} options={chartOptions} />
            </div>
        );
    };

    const counselorName = guidanceCounselor?.name || user?.name || 'Counselor';
    const todayLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const handleChartTab = (tabId) => {
        setActiveChart(tabId);
        console.log('[Dashboard] Chart tab:', tabId);
    };

    return (
        <Layout user={user}>
            <div className="mx-auto max-w-6xl space-y-10">
                {/* Header */}
                <header className="rounded-2xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm">
                    <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm text-white/70">{todayLabel}</p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                                Welcome back, {counselorName}
                            </h1>
                            <p className="mt-2 max-w-xl text-sm text-white/75">
                                Admission exams, student performance, and guidance activity at a glance.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/guidance/preferred-courses"
                                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                            >
                                Preferred courses
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                            <Link
                                href="/guidance/exam-management"
                                className="inline-flex items-center rounded-lg bg-[#1447E6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1039c4]"
                            >
                                Manage exams
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Overview */}
                <section aria-labelledby="overview-heading">
                    <h2 id="overview-heading" className="mb-4 text-lg font-semibold text-[#1D293D]">
                        Overview
                    </h2>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Questions in bank</p>
                            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1D293D]">
                                {stats?.total_questions || 0}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Active exams</p>
                            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1D293D]">
                                {stats?.active_exams || 0}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Registered students</p>
                            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1D293D]">
                                {stats?.total_students ?? 0}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Average score</p>
                            <p className={`mt-1 text-2xl font-semibold tabular-nums ${getScoreColor(averageScore)}`}>
                                {averageScore}%
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Pass rate</span>
                            <span className={`font-semibold tabular-nums ${getPassRateColor(passRate)}`}>{passRate}%</span>
                            <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 sm:inline-block">
                                <span
                                    className="block h-full rounded-full bg-[#1447E6] transition-all duration-500"
                                    style={{ width: `${Math.min(passRate, 100)}%` }}
                                />
                            </span>
                        </div>
                        <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden="true" />
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Courses</span>
                            <span className="font-semibold tabular-nums text-[#1D293D]">{stats?.total_courses || 0}</span>
                        </div>
                        <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden="true" />
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Personality test items</span>
                            <span className="font-semibold tabular-nums text-[#1D293D]">
                                {stats?.total_personality_tests || 0}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Analytics */}
                <section aria-labelledby="analytics-heading">
                    <h2 id="analytics-heading" className="mb-4 text-lg font-semibold text-[#1D293D]">
                        Analytics
                    </h2>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div
                            className="flex flex-wrap gap-1 border-b border-slate-100 p-2"
                            role="tablist"
                            aria-label="Chart views"
                        >
                            {CHART_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeChart === tab.id}
                                    onClick={() => handleChartTab(tab.id)}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                        activeChart === tab.id
                                            ? 'bg-[#1447E6] text-white'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="p-4 sm:p-6" role="tabpanel">
                            <ChartCard title={activeChartMeta.title} subtitle={activeChartMeta.subtitle}>
                                {renderActiveChart()}
                            </ChartCard>
                        </div>
                    </div>
                </section>

                {/* Recent activity */}
                <section aria-labelledby="recent-heading">
                    <h2 id="recent-heading" className="mb-4 text-lg font-semibold text-[#1D293D]">
                        Recent activity
                    </h2>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                <h3 className="text-sm font-semibold text-[#1D293D]">Recent exams</h3>
                                <Link
                                    href="/guidance/exam-management"
                                    className="text-xs font-medium text-[#1447E6] hover:underline"
                                >
                                    View all
                                </Link>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {(recent_exams || []).slice(0, 5).map((exam) => (
                                    <li
                                        key={exam.examId}
                                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/80"
                                    >
                                        <p className="truncate text-sm font-medium text-[#1D293D]">
                                            {exam['exam-ref-no']}
                                        </p>
                                        <span
                                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                                exam.status === 'active'
                                                    ? 'bg-[#1447E6]/10 text-[#1447E6]'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {exam.status}
                                        </span>
                                    </li>
                                ))}
                                {(!recent_exams || recent_exams.length === 0) && (
                                    <li className="px-4 py-10 text-center text-sm text-slate-500">
                                        No exams created yet. Create your first exam to get started.
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                <h3 className="text-sm font-semibold text-[#1D293D]">Recent results</h3>
                                <Link
                                    href="/guidance/exam-results"
                                    className="text-xs font-medium text-[#1447E6] hover:underline"
                                >
                                    View all
                                </Link>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {(recent_results || []).slice(0, 5).map((result, index) => {
                                    const passed = (result.score || 0) >= 10;
                                    return (
                                        <li
                                            key={result.resultId || `result-${index}`}
                                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/80"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-[#1D293D]">
                                                    {getExamineeDisplayName(result)}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {result.exam?.['exam-ref-no'] || 'Unknown exam'}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p
                                                    className={`text-sm font-semibold tabular-nums ${
                                                        passed ? 'text-[#1447E6]' : 'text-amber-600'
                                                    }`}
                                                >
                                                    {result.score}%
                                                </p>
                                                <p className={`text-xs ${passed ? 'text-[#1447E6]' : 'text-amber-600'}`}>
                                                    {passed ? 'Passed' : 'Failed'}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                                {(!recent_results || recent_results.length === 0) && (
                                    <li className="px-4 py-10 text-center text-sm text-slate-500">
                                        No results yet. They will appear once students complete exams.
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
};

export default GuidanceDashboard;
