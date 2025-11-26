import React from 'react';
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

const GuidanceDashboard = ({ user, guidanceCounselor, stats, recent_exams, recent_results }) => {
    // Calculate analytics data
    console.log('[Dashboard] Props:', { user, stats, recent_exams, recent_results });
    const averageScore = recent_results?.length > 0 
        ? Math.round(recent_results.reduce((sum, r) => sum + (r.score || 0), 0) / recent_results.length) 
        : 0;
    const passRate = recent_results?.length > 0 
        ? Math.round((recent_results.filter(r => (r.score || 0) >= 10).length / recent_results.length) * 100) 
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

    // Charts datasets
    const passCount = (recent_results || []).filter(r => (r.score || 0) >= 10).length;
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
        labels: recentScores.map(r => r.examinee?.full_name || 'Student'),
        datasets: [
            {
                label: 'Score %',
                data: recentScores.map(r => r.score || 0),
                borderColor: '#1447E6',
                backgroundColor: 'rgba(20, 71, 230, 0.15)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
            },
        ],
    };

    const activeExams = (recent_exams || []).filter(e => e.status === 'active').length;
    const inactiveExams = Math.max((recent_exams || []).length - activeExams, 0);
    const barData = {
        labels: ['Active', 'Other'],
        datasets: [
            {
                label: 'Exams',
                data: [activeExams, inactiveExams],
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

    return (
        <Layout user={user}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm animate-fadeIn">
                    <div className="px-6 py-7">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Guidance Dashboard</h1>
                                    <p className="mt-2 text-sm text-white/80">
                                        Visibility into admission exams, student performance, and guidance activity.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                                <div className="flex items-center gap-2 rounded-full border border-[#1447E6]/20 bg-[#1447E6]/20 px-4 py-2">
                                    <span className="text-sm font-semibold text-white">{stats?.active_exams || 0}</span>
                                    <span className="text-xs font-medium text-white/80">Active exams</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
                    <div className="animate-up rounded-2xl border border-slate-200 border-t-[5px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '60ms' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Questions</p>
                                <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{stats?.total_questions || 0}</p>
                                <p className="mt-2 text-xs font-medium text-[#1447E6]">Available in bank</p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="animate-up rounded-2xl border border-slate-200 border-t-[5px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '160ms' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active Exams</p>
                                <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{stats?.active_exams || 0}</p>
                                <p className="mt-2 text-xs font-medium text-[#1447E6]">Currently running</p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="animate-up rounded-2xl border border-slate-200 border-t-[5px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '260ms' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Students</p>
                                <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{stats?.total_students ?? 0}</p>
                                <p className="mt-2 text-xs font-medium text-[#1447E6]">Registered users</p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="animate-up rounded-2xl border border-slate-200 border-t-[5px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '360ms' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Average Score</p>
                                <p className={`mt-3 text-3xl font-semibold ${getScoreColor(averageScore)}`}>{averageScore}%</p>
                                <p className="mt-2 text-xs font-medium text-[#1447E6]">Overall performance</p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preferred Courses quick link */}
                <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
                    <Link
                        href="/guidance/preferred-courses"
                        className="group flex flex-col gap-6 px-6 py-6 transition-colors duration-200 md:flex-row md:items-center md:justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1447E6]/20 bg-[#1447E6]/10 text-[#1447E6] transition-colors duration-200 group-hover:bg-[#1447E6]/20">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-[#1D293D]">Preferred Courses Insights</h2>
                                <p className="text-sm text-slate-500">
                                    Explore which programs examinees are most interested in and uncover opportunities for upcoming academic offerings.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">View analytics</span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1447E6]/30 bg-white text-[#1447E6] shadow-sm transition-transform duration-200 group-hover:translate-x-1">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Performance Overview */}
                <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="animate-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '80ms' }}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-[#1D293D]">Pass Rate</h3>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1447E6]/20 bg-[#1447E6]/10 text-[#1447E6]">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <div className={`mb-2 text-4xl font-semibold ${getPassRateColor(passRate)}`}>{passRate}%</div>
                            <p className="text-sm text-slate-500">Students passing exams</p>
                            <div className="mt-3 h-2 rounded-full bg-slate-100">
                                <div 
                                    className="h-2 rounded-full bg-[#1447E6] transition-all duration-700" 
                                    style={{ width: `${Math.min(passRate, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="animate-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '180ms' }}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-[#1D293D]">Total Courses</h3>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1447E6]/20 bg-[#1447E6]/10 text-[#1447E6]">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <div className="mb-2 text-4xl font-semibold text-[#1447E6]">{stats?.total_courses || 0}</div>
                            <p className="text-sm text-slate-500">Available courses</p>
                            <div className="mt-3 inline-flex items-center rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                Active
                            </div>
                        </div>
                    </div>

                    <div className="animate-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '280ms' }}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-[#1D293D]">Personality Tests</h3>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1447E6]/20 bg-[#1447E6]/10 text-[#1447E6]">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <div className="mb-2 text-4xl font-semibold text-[#1447E6]">{stats?.total_personality_tests || 0}</div>
                            <p className="text-sm text-slate-500">MBTI questions</p>
                            <div className="mt-3 inline-flex items-center rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                Ready
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#1D293D]">Charts</h2>
                <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="animate-up" style={{ animationDelay: '120ms' }}>
                        <ChartCard title="Pass vs Fail" subtitle="Last 10 results">
                            <div style={{ height: 260 }}>
                                <Doughnut data={passFailData} options={{ ...chartOptions, scales: {} }} />
                            </div>
                        </ChartCard>
                    </div>
                    <div className="animate-up" style={{ animationDelay: '220ms' }}>
                        <ChartCard title="Recent Scores" subtitle="Trend">
                            <div style={{ height: 260 }}>
                                <Line data={lineData} options={chartOptions} />
                            </div>
                        </ChartCard>
                    </div>
                    <div className="animate-up" style={{ animationDelay: '320ms' }}>
                        <ChartCard title="Exams Status" subtitle="Recent exams">
                            <div style={{ height: 260 }}>
                                <Bar data={barData} options={chartOptions} />
                            </div>
                        </ChartCard>
                    </div>
                </div>

                {/* Recent Activity */}
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#1D293D]">Recent Activity</h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="animate-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style={{ animationDelay: '140ms' }}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1D293D]">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1447E6]/20 bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                Recent Exams
                            </h3>
                          
                        </div>
                        <div className="space-y-2">
                            {(recent_exams || []).slice(0, 5).map((exam, index) => (
                                <div key={exam.examId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 transition-colors duration-200 hover:border-[#1447E6]/30 hover:bg-[#1447E6]/5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1447E6]/10 text-xs font-semibold text-[#1447E6]">
                                                {index + 1}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#1D293D]">{exam['exam-ref-no']}</p>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">{exam.status}</p>
                                        </div>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${exam.status === 'active' ? 'border border-[#1447E6]/30 bg-[#1447E6]/10 text-[#1447E6]' : 'border border-slate-200 bg-slate-100 text-[#1D293D]'}`}>
                                        {exam.status}
                                    </span>
                                </div>
                            ))}
                            {(!recent_exams || recent_exams.length === 0) && (
                                <div className="text-center py-8">
                                    <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p className="text-sm text-gray-500 mt-2">No exams created yet</p>
                                    <p className="text-xs text-gray-400">Create your first exam to get started</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="animate-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style={{ animationDelay: '240ms' }}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1D293D]">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1447E6]/20 bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                Recent Results
                            </h3>
                           
                        </div>
                        <div className="space-y-2">
                            {(recent_results || []).slice(0, 5).map((result, index) => (
                                <div key={result.id || `result-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 transition-colors duration-200 hover:border-[#1447E6]/30 hover:bg-[#1447E6]/5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0">
                                            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${result.score >= 10 ? 'bg-[#1447E6]/10 text-[#1447E6]' : 'bg-amber-100 text-amber-600'}`}>{index + 1}</div>
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#1D293D]">{result.examinee?.full_name || 'Unknown Student'}</p>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">{result.exam?.['exam-ref-no'] || 'Unknown Exam'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-semibold ${result.score >= 10 ? 'text-[#1447E6]' : 'text-amber-600'}`}>{result.score}%</p>
                                        <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${result.score >= 10 ? 'border border-[#1447E6]/30 bg-[#1447E6]/10 text-[#1447E6]' : 'border border-amber-200 bg-amber-100 text-amber-600'}`}>{result.score >= 10 ? 'Passed' : 'Failed'}</span>
                                    </div>
                                </div>
                            ))}
                            {(!recent_results || recent_results.length === 0) && (
                                <div className="text-center py-8">
                                    <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <p className="text-sm text-gray-500 mt-2">No results available yet</p>
                                    <p className="text-xs text-gray-400">Result s will appear here once students take exams</p>
                                </div>
                            )}
                        </div>
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
};

export default GuidanceDashboard;