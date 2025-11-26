import React, { useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const ExamResultsArchived = ({ user, results, allResults = [], years = [], filters = {} }) => {
    const [selectedYear, setSelectedYear] = useState(filters.year || '');
    const [collapsed, setCollapsed] = useState(() => {
        try {
            const raw = localStorage.getItem('archived_collapsed');
            return raw ? JSON.parse(raw) : {};
        } catch (_) { return {}; }
    });

    const toggleCollapsed = (key) => {
        setCollapsed(prev => {
            const next = { ...prev, [key]: !prev[key] };
            try { localStorage.setItem('archived_collapsed', JSON.stringify(next)); } catch (_) {}
            return next;
        });
    };
    const [search, setSearch] = useState('');
    const [popover, setPopover] = useState({ open: false, x: 0, y: 0, loading: false, data: null });

    const openPersonalityPopover = async (event, type) => {
        try {
            const rect = event.currentTarget.getBoundingClientRect();
            setPopover({ open: true, x: rect.right + 8, y: rect.top + window.scrollY, loading: true, data: null });
            const { data } = await axios.get(`/guidance/personality-types/${encodeURIComponent(type)}`);
            setPopover(prev => ({ ...prev, loading: false, data: data?.data || { type, title: type, description: '' } }));
        } catch (e) {
            setPopover(prev => ({ ...prev, loading: false, data: { type, title: type, description: 'No description found.' } }));
        }
    };
    const closePopover = () => setPopover({ open: false, x: 0, y: 0, loading: false, data: null });

    const applyFilters = (yearVal) => {
        router.get('/guidance/exam-results/archived', { year: yearVal || undefined }, { preserveState: true, preserveScroll: true });
    };

    const handleUnarchive = async (id) => {
        router.post(`/guidance/exam-results/${id}/unarchive`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                window.showAlert('Result unarchived', 'success');
                applyFilters(selectedYear);
            },
            onError: () => {
                window.showAlert('Failed to unarchive result', 'error');
            }
        });
    };

    const handleUnarchiveYear = async (year) => {
        router.post('/guidance/exam-results/unarchive-year', { year }, {
            preserveScroll: true,
            onSuccess: () => {
                window.showAlert(`Unarchived results for ${year}`, 'success');
                applyFilters(selectedYear);
            },
            onError: () => {
                window.showAlert('Failed to unarchive year', 'error');
            }
        });
    };

    const handleUnarchiveDate = async (date) => {
        router.post('/guidance/exam-results/unarchive-date', { date }, {
            preserveScroll: true,
            onSuccess: () => {
                window.showAlert(`Unarchived results for ${date}`, 'success');
                applyFilters(selectedYear);
            },
            onError: () => {
                window.showAlert('Failed to unarchive date', 'error');
            }
        });
    };

    // Use allResults (complete archived set) if available; fallback to paginated results
    const sourceList = (allResults && allResults.length ? allResults : (results?.data || []));

    // Text search across key fields
    const needle = search.trim().toLowerCase();
    // Show only rows explicitly marked archived in the database
    const archivedOnly = sourceList.filter(r => r && (r.is_archived === 1 || r.is_archived === true));

    const filtered = !needle ? archivedOnly : archivedOnly.filter(r => {
        const name = (r.examinee?.full_name || '').toLowerCase();
        const examRef = (r.exam ? (r.exam['exam-ref-no'] || '') : '').toLowerCase();
        const personality = (r.personality_type || '').toLowerCase();
        const courses = Array.isArray(r.recommended_courses) ? r.recommended_courses.map(c => `${c.course_code || ''} ${c.course_name || ''}`.toLowerCase()).join(' ') : '';
        return [name, examRef, personality, courses].some(s => s.includes(needle));
    });

    // Helpers to safely extract Y/M/D from finished_at (no timezone conversion)
    const extractYMD = (finishedAt) => {
        if (!finishedAt || typeof finishedAt !== 'string') return null;
        try {
            const datePart = finishedAt.includes('T') ? finishedAt.split('T')[0] : finishedAt.split(' ')[0];
            const [y, m, d] = datePart.split('-');
            if (!y || !m || !d) return null;
            return { year: y, month: m, day: d };
        } catch (_) { return null; }
    };
    const monthName = (y, m) => new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long' });

    // Group archived results by Year -> Month -> Day using finished_at
    const grouped = filtered.reduce((acc, r) => {
        const parts = extractYMD(r.finished_at || r.created_at);
        if (!parts) return acc;
        const { year, month, day } = parts;
        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = {};
        if (!acc[year][month][day]) acc[year][month][day] = [];
        acc[year][month][day].push(r);
        return acc;
    }, {});

    const groupYears = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

    return (
        <>
        <Layout user={user}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-up" style={{ animationDelay: '60ms' }}>
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-5 animate-up" style={{ animationDelay: '120ms' }}>
                    <div className="bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 px-6 py-5 animate-up" style={{ animationDelay: '160ms' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Archived Exam Results</h2>
                                    <p className="text-xs text-white/80">View, search, and unarchive historical results</p>
                                </div>
                            </div>
                            <a href="/guidance/exam-results" className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-800 bg-white rounded-md hover:bg-slate-100 transition-colors">Back to Results</a>
                        </div>
                    </div>
                    {/* Controls */}
                    <div className="px-6 py-4 bg-white animate-up" style={{ animationDelay: '200ms' }}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <input
                                    value={search}
                                    onChange={(e)=>setSearch(e.target.value)}
                                    placeholder="Search name, exam, personality, course..."
                                    className="border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500 px-3 py-2 w-72"
                                />
                                <select value={selectedYear} onChange={(e)=>{ setSelectedYear(e.target.value); applyFilters(e.target.value); }} className="border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500 min-w-[140px] px-2 py-2 text-sm">
                                    <option value="">All Years</option>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="text-sm text-gray-600">Total: {filtered.length}</div>
                        </div>
                    </div>
                </div>

                {/* Year -> Month -> Day groups (based on finished_at) */}
                <div className="space-y-4 animate-up" style={{ animationDelay: '240ms' }}>
                    {groupYears.map((y) => {
                        const months = Object.keys(grouped[y] || {}).sort((a,b)=> Number(b)-Number(a));
                        const totalYearItems = months.reduce((sum,m)=> sum + Object.values(grouped[y][m]).reduce((s, d) => s + (d?.length || 0), 0), 0);
                        const yearKey = `y-${y}`;
                        return (
                            <div key={y} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-up" style={{ animationDelay: '260ms' }}>
                                <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-gray-50 to-slate-100 border-b">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => toggleCollapsed(yearKey)}
                                            className="w-7 h-7 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-300 transition-colors"
                                            aria-label="Toggle"
                                        >
                                            {collapsed[yearKey] ? '▸' : '▾'}
                                        </button>
                                        <div className="font-semibold text-slate-800">{y}</div>
                                        <div className="text-xs text-slate-500">{totalYearItems} item(s)</div>
                                    </div>
                                    
                                </div>
                                {!collapsed[yearKey] && (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 animate-up" style={{ animationDelay: '280ms' }}>
                                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Exam & Personality</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Score</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Semester</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                                    <th className="px-6 py-3" />
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {months.flatMap((m) => {
                                                    const days = Object.keys(grouped[y][m]).sort((a,b)=> Number(b)-Number(a));
                                                    const monthLabel = `${monthName(y, m)} ${y}`;
                                                    const monthTotal = days.reduce((s,d)=> s + (grouped[y][m][d]?.length || 0), 0);
                                                    const monthKey = `${y}-${m}`;
                                                    const monthHeader = (
                                                        <tr key={`m-${y}-${m}`} className="bg-gray-50">
                                                            <td colSpan={6} className="px-6 py-2 text-sm font-semibold text-gray-700">
                                                                <button
                                                                    onClick={() => toggleCollapsed(monthKey)}
                                                                    className="mr-2 w-6 h-6 rounded-md bg-slate-200 text-slate-700 inline-flex items-center justify-center hover:bg-slate-300"
                                                                    aria-label="Toggle Month"
                                                                >
                                                                    {collapsed[monthKey] ? '▸' : '▾'}
                                                                </button>
                                                                {monthLabel} • {monthTotal} item(s)
                                                            </td>
                                                        </tr>
                                                    );

                                                    if (collapsed[monthKey]) {
                                                        return [monthHeader];
                                                    }

                                                    const dayRows = days.flatMap((d) => {
                                                        const dayKey = `${y}-${m}-${d}`;
                                                        const dateHeader = (
                                                            <tr key={`d-${y}-${m}-${d}`} className="bg-gray-50/60">
                                                                <td colSpan={6} className="px-6 py-2 text-xs font-semibold text-gray-600">
                                                                    <button
                                                                        onClick={() => toggleCollapsed(dayKey)}
                                                                        className="mr-2 w-5 h-5 rounded-md bg-slate-200 text-slate-700 inline-flex items-center justify-center hover:bg-slate-300 text-[11px]"
                                                                        aria-label="Toggle Day"
                                                                    >
                                                                        {collapsed[dayKey] ? '▸' : '▾'}
                                                                    </button>
                                                                    {`${monthName(y, m)} ${d}, ${y}`} • {(grouped[y][m][d] || []).length} item(s)
                                                                    <button
                                                                        onClick={() => handleUnarchiveDate(`${y}-${m}-${d}`)}
                                                                        className="ml-3 inline-flex items-center px-2 py-1 text-[11px] font-medium rounded-md bg-slate-700 text-white hover:bg-slate-800"
                                                                    >
                                                                        Unarchive All (this date)
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                        if (collapsed[dayKey]) {
                                                            return [dateHeader];
                                                        }
                                                        const rows = (grouped[y][m][d] || []).map((r, idx) => (
                                                            <tr key={r.resultId || r.id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-gray-100 animate-up" style={{ animationDelay: `${160 + idx * 60}ms` }}>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    <div className="font-medium">{r.examinee?.full_name || 'Unknown'}</div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600">#</div>
                                                                        <div className="font-medium text-gray-700">{r.exam ? r.exam['exam-ref-no'] : 'N/A'}</div>
                                                                    </div>
                                                                    {(() => {
                                                                        const p = r.personality_type;
                                                                        if (!p) return null;
                                                                        return (
                                                                            <div className="mt-2">
                                                                                <button onClick={(e)=>openPersonalityPopover(e, p)} className="inline-flex items-center px-2 py-1 text-[11px] font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">
                                                                                    Personality: {p}
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                    {Array.isArray(r.recommended_courses) && r.recommended_courses.length > 0 && (
                                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                                            {r.recommended_courses.map((c) => (
                                                                                <span key={c.course_id || c.id} className="inline-flex items-center px-2 py-1 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                                    {c.course_code || c.course_name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                    <span className={`inline-flex items-center px-2 py-1 text-[11px] font-semibold rounded-full ${r.score >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.score}%</span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.semester || '—'}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(() => {
                                                                    const parts = extractYMD(r.finished_at || r.created_at);
                                                                    if (!parts) return 'N/A';
                                                                    const { year, month, day } = parts;
                                                                    return `${month}/${day}/${year}`;
                                                                })()}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                                    <button onClick={() => handleUnarchive(r.resultId || r.id)} className="px-3 py-1.5 rounded-md bg-slate-700 text-white hover:bg-slate-800 text-xs shadow-sm">Unarchive</button>
                                                                </td>
                                                            </tr>
                                                        ));
                                                        return [dateHeader, ...rows];
                                                    });

                                                    return [monthHeader, ...dayRows];
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {groupYears.length === 0 && (
                        <div className="text-center py-10 text-sm text-gray-500">No archived results found.</div>
                    )}
                </div>
            </div>
        </Layout>

        {/* Personality Popover */}
        {popover.open && (
            <div onClick={closePopover} className="fixed inset-0 z-40" style={{ background: 'transparent' }} />
        )}
        {popover.open && (
            <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-72" style={{ top: popover.y, left: popover.x }}>
                {popover.loading ? (
                    <div className="text-xs text-gray-500">Loading...</div>
                ) : (
                    <div>
                        <div className="text-sm font-semibold text-gray-900">{popover.data?.title || popover.data?.type}</div>
                        <div className="text-xs text-gray-500 mb-2">Type: {popover.data?.type}</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{popover.data?.description || 'No description available.'}</div>
                    </div>
                )}
            </div>
        )}
        </>
    );
};

export default ExamResultsArchived;


