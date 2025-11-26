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
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                    <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm overflow-hidden">
                        <div className="px-6 py-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-white">Preferred Courses Overview</h1>
                                    <p className="text-sm text-white/80 mt-1">
                                        Snapshot of the programs examinees choose during registration.
                                    </p>
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-2">
                                    <span className="text-xs text-white/80">
                                        Last updated: <span className="font-medium text-white">{formatTimestamp(stats?.lastUpdated)}</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/15"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total selections</p>
                                <p className="text-2xl font-bold text-[#1D293D] mt-2">{stats?.totalSelections || 0}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Distinct courses</p>
                                <p className="text-2xl font-bold text-[#1D293D] mt-2">{stats?.distinctCourses || 0}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Most selected</p>
                                <p className="text-sm font-semibold text-[#1D293D] mt-2">
                                    {stats?.topCourse ? `${stats.topCourse.course_name} (${stats.topCourse.count})` : 'No data yet'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="relative flex-1 sm:max-w-xs">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search course name"
                                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-sm text-[#1D293D] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] transition-all duration-200"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="font-medium">Show top:</span>
                                {[5, 10, 15, 20].map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => setVisibleCount(option)}
                                        className={`px-3 py-1 rounded-xl border text-sm font-semibold transition-colors duration-150 ${
                                            visibleCount === option
                                                ? 'border-[#1447E6] bg-[#1447E6] text-white'
                                                : 'border-slate-300 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6]'
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#1447E6]/10 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-[#1D293D]">Course Popularity</h2>
                                <p className="text-sm text-slate-500">Visual representation of course selection trends</p>
                            </div>
                        </div>
                        <div style={{ height: 320 }}>
                            <Bar data={courseDataset} options={courseChartOptions} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[#1447E6]/10 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-[#1D293D]">Top Courses</h3>
                                        <p className="text-xs text-slate-500">Top {Math.min(filteredCourses.length, visibleCount)} results</p>
                                    </div>
                                </div>
                            </div>
                            <ul className="divide-y divide-slate-200">
                                {filteredCourses.slice(0, visibleCount).map((course, index) => (
                                    <li
                                        key={`${course.course_name}-${index}`}
                                        className="px-6 py-3 flex items-center justify-between text-sm hover:bg-[#1447E6]/5 transition-colors duration-150"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 text-slate-500 font-semibold">{index + 1}.</span>
                                            <span className="text-[#1D293D] font-medium">{course.course_name}</span>
                                        </div>
                                        <span className="text-slate-600 font-semibold">{course.count}</span>
                                    </li>
                                ))}
                                {!filteredCourses.length && (
                                    <li className="px-6 py-8 text-center text-sm text-slate-500">
                                        No courses match your search.
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[#1447E6]/10 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-[#1D293D]">Latest Submissions</h3>
                                        <p className="text-xs text-slate-500">{recentSelections.length} records</p>
                                    </div>
                                </div>
                            </div>
                            <ul className="divide-y divide-slate-200">
                                {recentSelections.map((entry, index) => (
                                    <li
                                        key={`${entry.course_name}-${entry.created_at}-${index}`}
                                        className="px-6 py-3 flex items-center justify-between text-sm hover:bg-[#1447E6]/5 transition-colors duration-150"
                                    >
                                        <span className="text-[#1D293D] font-medium">{entry.course_name}</span>
                                        <span className="text-slate-500 text-xs">{formatTimestamp(entry.created_at)}</span>
                                    </li>
                                ))}
                                {!recentSelections.length && (
                                    <li className="px-6 py-8 text-center text-sm text-slate-500">
                                        No selections yet.
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PreferredCourses;

