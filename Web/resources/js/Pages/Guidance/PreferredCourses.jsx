import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
);

const PreferredCourses = ({
    user,
    stats = {},
    courses = [],
    trend = [],
    recentSelections = [],
}) => {
    console.log('[PreferredCourses] props', { stats, courses, trend, recentSelections });

    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(10);

    const formatDateTime = (isoString) => {
        if (!isoString) return 'N/A';
        try {
            return new Date(isoString).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (error) {
            console.error('[PreferredCourses] Failed to format date', isoString, error);
            return isoString;
        }
    };

    const handleDownload = () => {
        const reportWindow = window.open('', '_blank');
        if (!reportWindow) {
            window?.showAlert?.('Popup blocked. Please allow popups to download the report.', 'error');
            return;
        }

        const generatedAt = formatDateTime(new Date().toISOString());

        const courseRows = (courses || [])
            .map((course, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${course.course_name || 'N/A'}</td>
                    <td>${course.count || 0}</td>
                    <td>${formatDateTime(course.last_selected)}</td>
                </tr>
            `)
            .join('');

        const recentRows = (recentSelections || [])
            .map((entry, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${entry.course_name || 'N/A'}</td>
                    <td>${formatDateTime(entry.created_at)}</td>
                </tr>
            `)
            .join('');

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Preferred Courses Report</title>
                <style>
                    @media print {
                        @page { margin: 16mm; }
                    }
                    body {
                        font-family: 'Inter', Arial, sans-serif;
                        color: #1f2937;
                        padding: 24px;
                        margin: 0;
                        font-size: 12px;
                        background-color: #f9fafb;
                    }
                    h1 {
                        font-size: 24px;
                        margin-bottom: 4px;
                    }
                    h2 {
                        font-size: 16px;
                        margin-top: 28px;
                        margin-bottom: 8px;
                        color: #4b5563;
                    }
                    .meta {
                        font-size: 11px;
                        color: #6b7280;
                        margin-bottom: 20px;
                    }
                    .summary {
                        display: flex;
                        gap: 12px;
                        margin-bottom: 24px;
                    }
                    .card {
                        flex: 1;
                        border: 1px solid #e5e7eb;
                        border-radius: 10px;
                        padding: 12px 16px;
                        background-color: #ffffff;
                        box-shadow: 0 1px 3px rgba(17, 24, 39, 0.05);
                    }
                    .card-title {
                        text-transform: uppercase;
                        font-size: 10px;
                        letter-spacing: 0.08em;
                        color: #6b7280;
                        margin-bottom: 4px;
                    }
                    .card-value {
                        font-size: 18px;
                        font-weight: 600;
                        color: #111827;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                        background-color: #ffffff;
                        border-radius: 8px;
                        overflow: hidden;
                    }
                    th, td {
                        border: 1px solid #e5e7eb;
                        padding: 8px 10px;
                        text-align: left;
                    }
                    th {
                        background-color: #f3f4f6;
                        font-weight: 600;
                        color: #374151;
                        font-size: 12px;
                    }
                    tbody tr:nth-child(even) td {
                        background-color: #f9fafb;
                    }
                    .empty {
                        text-align: center;
                        color: #9ca3af;
                        padding: 24px 0;
                        background-color: #ffffff;
                        border: 1px dashed #d1d5db;
                        border-radius: 8px;
                        margin-top: 12px;
                    }
                    .footer {
                        margin-top: 28px;
                        font-size: 10px;
                        color: #9ca3af;
                        text-align: right;
                    }
                </style>
            </head>
            <body>
                <h1>Preferred Courses Report</h1>
                <p class="meta">Generated: ${generatedAt}</p>

                <div class="summary">
                    <div class="card">
                        <p class="card-title">Total selections</p>
                        <p class="card-value">${stats.totalSelections || 0}</p>
                    </div>
                    <div class="card">
                        <p class="card-title">Distinct courses</p>
                        <p class="card-value">${stats.distinctCourses || 0}</p>
                    </div>
                    <div class="card">
                        <p class="card-title">Most selected</p>
                        <p class="card-value">${stats.topCourse?.course_name || 'No data'}</p>
                        <p style="font-size: 11px; color: #6b7280;">
                            ${stats.topCourse ? `${stats.topCourse.count} selections` : ''}
                        </p>
                    </div>
                </div>

                <h2>Course popularity</h2>
                ${(courses || []).length ? `
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 6%;">#</th>
                                <th>Course name</th>
                                <th style="width: 18%;">Selections</th>
                                <th style="width: 26%;">Last selected</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${courseRows}
                        </tbody>
                    </table>
                ` : `<div class="empty">No course data available.</div>`}

                <h2>Latest selections</h2>
                ${(recentSelections || []).length ? `
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 6%;">#</th>
                                <th>Course name</th>
                                <th style="width: 26%;">Submitted at</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recentRows}
                        </tbody>
                    </table>
                ` : `<div class="empty">No recent selections recorded.</div>`}

                <div class="footer">
                    OCC Admission System • Preferred Courses Overview
                </div>
            </body>
            </html>
        `;

        reportWindow.document.open();
        reportWindow.document.write(html);
        reportWindow.document.close();
        reportWindow.onload = () => {
            reportWindow.focus();
            reportWindow.print();
        };
    };

    const filteredCourses = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            return courses;
        }
        return courses.filter((course) =>
            (course.course_name || '').toLowerCase().includes(term)
        );
    }, [courses, searchTerm]);

    const courseDataset = useMemo(() => {
        const sliced = filteredCourses.slice(0, visibleCount);
        const labels = sliced.map((item) => item.course_name || 'Unknown');
        const dataPoints = sliced.map((item) => item.count || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Number of Selections',
                    data: dataPoints,
                    backgroundColor: '#1447E6',
                    borderRadius: 12,
                },
            ],
        };
    }, [filteredCourses, visibleCount]);

    const courseChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.formattedValue} selections`,
                },
            },
        },
        scales: {
            x: {
                ticks: { color: '#1D293D', font: { weight: '600' } },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                ticks: { color: '#64748b', stepSize: 1 },
                grid: { color: 'rgba(148, 163, 184, 0.2)' },
            },
        },
    }), []);

    const trendDataset = useMemo(() => {
        const labels = trend.map((item) => item.date);
        const values = trend.map((item) => item.count);
        return {
            labels,
            datasets: [
                {
                    label: 'Selections (Last 30 days)',
                    data: values,
                    fill: true,
                    borderColor: '#1447E6',
                    backgroundColor: 'rgba(20, 71, 230, 0.15)',
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: '#1447E6',
                },
            ],
        };
    }, [trend]);

    const trendChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items) => {
                        const date = items[0]?.label;
                        return date ? new Date(date).toLocaleDateString() : '';
                    },
                    label: (context) => `${context.formattedValue} selections`,
                },
            },
        },
        scales: {
            x: {
                ticks: { color: '#1D293D', maxRotation: 0, minRotation: 0 },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                ticks: { color: '#64748b', stepSize: 1 },
                grid: { color: 'rgba(148, 163, 184, 0.18)' },
            },
        },
    }), []);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            return new Date(timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (error) {
            console.error('[PreferredCourses] Failed to format timestamp', { timestamp, error });
            return timestamp;
        }
    };

    return (
        <Layout user={user}>
            <Head title="Preferred Courses Overview" />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4 pl-1 border-l-4 border-[#1447E6]">
                                <div className="w-12 h-12 rounded-xl bg-[#1447E6]/10 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-[#1D293D] tracking-tight sm:text-3xl">Preferred Courses</h1>
                                    <p className="text-slate-500 text-sm mt-0.5">Programs examinees choose during registration</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-start sm:items-end gap-2">
                                <span className="text-xs text-slate-500">
                                    Last updated: <span className="font-medium text-slate-700">{formatTimestamp(stats?.lastUpdated)}</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#1447E6] text-white hover:bg-[#1240d0] transition-colors shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download PDF
                                </button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn" style={{ animationDelay: '60ms' }}>
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Total Selections</p>
                                <p className="text-3xl font-bold text-[#1D293D]">{stats?.totalSelections || 0}</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#1447E6]/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Distinct Courses</p>
                                <p className="text-3xl font-bold text-[#1D293D]">{stats?.distinctCourses || 0}</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Most Selected</p>
                                <p className="text-base font-semibold text-[#1D293D] leading-tight">
                                    {stats?.topCourse ? (
                                        <>
                                            <span className="block truncate">{stats.topCourse.course_name}</span>
                                            <span className="text-sm text-slate-500 font-normal">({stats.topCourse.count} selections)</span>
                                        </>
                                    ) : (
                                        <span className="text-slate-400">No data yet</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-6 animate-fadeIn" style={{ animationDelay: '100ms' }}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="relative flex-1 sm:max-w-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search course name..."
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1D293D] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20 focus:border-[#1447E6] transition-all bg-white"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 font-medium">Show top:</span>
                                <div className="flex gap-1.5">
                                    {[5, 10, 15, 20].map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => setVisibleCount(option)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                                                visibleCount === option
                                                    ? 'bg-[#1447E6] text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6 animate-fadeIn" style={{ animationDelay: '120ms' }}>
                        <div className="px-6 py-5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#1447E6]/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D293D]">Course Popularity</h2>
                                    <p className="text-sm text-slate-500">Visual representation of selection trends</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div style={{ height: 340 }}>
                                <Bar data={courseDataset} options={courseChartOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Lists Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn" style={{ animationDelay: '140ms' }}>
                        {/* Top Courses */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-[#1D293D]">Top Courses</h3>
                                        <p className="text-xs text-slate-500">Top {Math.min(filteredCourses.length, visibleCount)} results</p>
                                    </div>
                                </div>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {filteredCourses.slice(0, visibleCount).map((course, index) => (
                                    <li
                                        key={`${course.course_name}-${index}`}
                                        className="px-6 py-3.5 flex items-center justify-between text-sm hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-semibold flex items-center justify-center text-xs group-hover:bg-[#1447E6]/10 group-hover:text-[#1447E6] transition-colors">
                                                {index + 1}
                                            </span>
                                            <span className="text-[#1D293D] font-medium">{course.course_name}</span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg bg-[#1447E6]/10 text-[#1447E6] font-semibold text-xs">{course.count}</span>
                                    </li>
                                ))}
                                {!filteredCourses.length && (
                                    <li className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <p className="text-sm text-slate-500">No courses match your search</p>
                                        </div>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Latest Submissions */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-[#1D293D]">Latest Submissions</h3>
                                        <p className="text-xs text-slate-500">{recentSelections.length} records</p>
                                    </div>
                                </div>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {recentSelections.map((entry, index) => (
                                    <li
                                        key={`${entry.course_name}-${entry.created_at}-${index}`}
                                        className="px-6 py-3.5 flex items-center justify-between text-sm hover:bg-slate-50/80 transition-colors"
                                    >
                                        <span className="text-[#1D293D] font-medium">{entry.course_name}</span>
                                        <span className="text-xs text-slate-500 font-medium">{formatTimestamp(entry.created_at)}</span>
                                    </li>
                                ))}
                                {!recentSelections.length && (
                                    <li className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm text-slate-500">No selections yet</p>
                                        </div>
                                    </li>
                                )}
                            </ul>
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
                    animation: fadeIn 0.4s ease-out forwards;
                }
            `}</style>
        </Layout>
    );
};

export default PreferredCourses;

