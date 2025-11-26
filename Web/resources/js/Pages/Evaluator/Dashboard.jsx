import React from 'react';
import { Head, Link } from '@inertiajs/react';
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

export default function EvaluatorDashboard({
    user,
    evaluator,
    routes,
    stats,
    activities = [],
    recentResults = [],
    departmentExams = [],
}) {
    const safeRecentResults = recentResults || [];
    const safeActivities = activities || [];
    const safeDepartmentExams = departmentExams || [];

    const averageScore = safeRecentResults.length
        ? Math.round(
            safeRecentResults.reduce((sum, r) => sum + (r.score_percentage || 0), 0) / safeRecentResults.length,
        )
        : 0;

    const passCount = safeRecentResults.filter(r => r.remarks === 'Pass').length;
    const failCount = Math.max(safeRecentResults.length - passCount, 0);
    const passRate = safeRecentResults.length ? Math.round((passCount / safeRecentResults.length) * 100) : 0;

    const activeExams = safeDepartmentExams.filter(e => Number(e.status) === 1).length;
    const inactiveExams = Math.max(safeDepartmentExams.length - activeExams, 0);

    console.log('[EvaluatorDashboard] Snapshot', {
        averageScore,
        passRate,
        activeExams,
        totalResults: safeRecentResults.length,
    });

    const getScoreColor = (score) => {
        if (score >= 85) return 'text-emerald-600';
        if (score >= 70) return 'text-blue-600';
        if (score >= 50) return 'text-amber-500';
        return 'text-rose-600';
    };

    const passFailData = {
        labels: ['Passed', 'Failed'],
        datasets: [
            {
                label: 'Results',
                data: [passCount, failCount],
                backgroundColor: ['#10B981', '#EF4444'],
                borderColor: ['#10B981', '#EF4444'],
                borderWidth: 1,
            },
        ],
    };

    const recentScores = safeRecentResults.slice(0, 10).reverse();
    const lineData = {
        labels: recentScores.map(r => r.student_name || 'Student'),
        datasets: [
            {
                label: 'Score %',
                data: recentScores.map(r => r.score_percentage || 0),
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
            },
        ],
    };

    const barData = {
        labels: ['Active', 'Inactive'],
        datasets: [
            {
                label: 'Exams',
                data: [activeExams, inactiveExams],
                backgroundColor: ['#3B82F6', '#A78BFA'],
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

    const quickActions = [
        {
            label: 'Manage Exams',
            helper: 'Schedule, publish, and monitor exam windows',
            href: routes?.departmentExams || '/evaluator/department-exams',
            accentColor: 'text-[#1447E6]',
            icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            label: 'Evaluate Results',
            helper: 'Review answer sheets and remarks',
            href: routes?.examResults || '/evaluator/exam-results',
            accentColor: 'text-emerald-600',
            icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: 'View Students',
            helper: 'Track examinee progress and history',
            href: routes?.studentResults || '/evaluator/student-results',
            accentColor: 'text-slate-700',
            icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
        },
    ];

    const handleQuickAction = (label) => {
        console.log(`[EvaluatorDashboard] Quick action clicked: ${label}`);
    };

    return (
        <>
            <Head title="Evaluator Dashboard" />

            <Layout user={user} routes={routes}>
                <div className="min-h-screen bg-slate-50 py-8">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <section
                            className="mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-[#1D293D] text-white shadow-xl animate-up"
                            style={{ animationDelay: '60ms' }}
                        >
                            <div className="px-8 py-8">
                                <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                                    <div className="flex flex-1 flex-col gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                                                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Evaluator Dashboard</p>
                                                <h1 className="text-3xl font-bold md:text-4xl">
                                                    Welcome back, {evaluator?.name || user.username}!
                                                </h1>
                                            </div>
                                        </div>
                                        <p className="text-white/80 text-base md:text-lg max-w-2xl">
                                            Monitor exam health, validate student outcomes, and coordinate department readiness with live insights.
                                        </p>
                                    </div>
                                    <div className="grid w-full max-w-sm grid-cols-2 gap-4 text-center">
                                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-5">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Active Exams</p>
                                            <p className="text-3xl font-semibold">{stats?.activeExams ?? 0}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-5">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Pass Rate</p>
                                            <p className="text-3xl font-semibold">{passRate}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 animate-up" style={{ animationDelay: '120ms' }}>
                            {[
                                {
                                    label: 'Active Exams',
                                    value: stats?.activeExams ?? 0,
                                    helper: 'Currently running',
                                    icon: (
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                                        </svg>
                                    ),
                                    valueClass: 'text-[#1D293D]',
                                },
                                {
                                    label: 'Total Students',
                                    value: stats?.totalStudents ?? 0,
                                    helper: 'Registered examinees',
                                    icon: (
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    ),
                                    valueClass: 'text-[#1D293D]',
                                },
                                {
                                    label: 'Average Score',
                                    value: `${averageScore}%`,
                                    helper: 'Overall performance',
                                    icon: (
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 1.343-3 3v6m6 0v-5.5c0-1.933-1.567-3.5-3.5-3.5h0" />
                                        </svg>
                                    ),
                                    valueClass: getScoreColor(averageScore),
                                },
                                {
                                    label: 'Pass Rate',
                                    value: `${passRate}%`,
                                    helper: 'Successful submissions',
                                    icon: (
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ),
                                    valueClass: 'text-[#1D293D]',
                                },
                            ].map(card => (
                                <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                                            <p className={`mt-3 text-3xl font-semibold ${card.valueClass}`}>{card.value}</p>
                                            <p className="mt-2 text-xs font-medium text-slate-500">{card.helper}</p>
                                        </div>
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                            {card.icon}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-up" style={{ animationDelay: '160ms' }}>
                            <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D293D]">Next actions</h2>
                                    <p className="text-sm text-slate-500">Jump into frequent evaluator workflows</p>
                                </div>
                                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
                                    {quickActions.map(action => (
                                        <Link
                                            key={action.label}
                                            href={action.href}
                                            onClick={() => handleQuickAction(action.label)}
                                            className="group flex flex-1 min-w-[220px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-white"
                                        >
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-600 shadow-sm">
                                                {action.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-[#1D293D]">{action.label}</p>
                                                <p className="text-xs text-slate-500">{action.helper}</p>
                                            </div>
                                            <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${action.accentColor}`}>Go</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mb-10">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-2xl font-semibold text-[#1D293D]">Analytics overview</h2>
                                    <p className="text-sm text-slate-500">Track exam health, performance, and readiness.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-slate-400" />
                                    <span className="text-xs text-slate-500">Live data</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <ChartCard title="Pass vs Fail" subtitle="Department results (last 30 days)">
                                    <div style={{ height: 260 }}>
                                        <Doughnut data={passFailData} options={{ ...chartOptions, scales: {} }} />
                                    </div>
                                </ChartCard>
                                <ChartCard title="Recent Scores" subtitle="Latest examinee attempts">
                                    <div style={{ height: 260 }}>
                                        <Line data={lineData} options={chartOptions} />
                                    </div>
                                </ChartCard>
                                <ChartCard title="Exam Status" subtitle="Active vs inactive banks">
                                    <div style={{ height: 260 }}>
                                        <Bar data={barData} options={chartOptions} />
                                    </div>
                                </ChartCard>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-[#1D293D]">Department overview</h3>
                                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        Summary
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                                        <div>
                                            <p className="text-sm font-semibold text-[#1D293D]">Completed Results</p>
                                            <p className="text-xs text-slate-500">Finalized evaluations</p>
                                        </div>
                                        <p className="text-2xl font-semibold text-[#1447E6]">{stats?.completedResults ?? 0}</p>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                                        <div>
                                            <p className="text-sm font-semibold text-[#1D293D]">Question Bank</p>
                                            <p className="text-xs text-slate-500">Available exam items</p>
                                        </div>
                                        <p className="text-2xl font-semibold text-[#1447E6]">{stats?.questionBank ?? 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-[#1D293D]">Recent activity</h3>
                                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{safeActivities.length} items</span>
                                </div>
                                <div className="space-y-3 max-h-72 overflow-auto pr-2">
                                    {safeActivities.length ? (
                                        safeActivities.map((activity, idx) => (
                                            <div
                                                key={`${activity.label}-${idx}`}
                                                className="flex items-center gap-4 rounded-xl border border-slate-100 p-3 transition hover:border-[#1447E6]/30 hover:bg-[#1447E6]/5"
                                            >
                                                <div className={`h-10 w-10 rounded-xl ${activity.kind === 'exam_created' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'} flex items-center justify-center`}>
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#1D293D] truncate">{activity.label}</p>
                                                    <p className="text-xs text-slate-500">{new Date(activity.time).toLocaleString()}</p>
                                                </div>
                                                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                                                    {activity.kind === 'exam_created' ? 'Exam' : 'Update'}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                                            <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="mt-3 text-sm text-slate-500">No activity yet. Updates will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        </>
    );
}
