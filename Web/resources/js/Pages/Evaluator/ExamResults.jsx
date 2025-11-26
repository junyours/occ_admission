import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function ExamResults({ user, evaluator, department, examResults, availableExams, stats, filters }) {

    const [searchTerm, setSearchTerm] = useState(filters?.student_name || '');
    const [selectedExam, setSelectedExam] = useState(filters?.exam_id || '');
    const [showModal, setShowModal] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'score' | 'name'
    const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
    const [dense, setDense] = useState(false);

    // Add safety checks for null/undefined data
    const safeExamResults = examResults || { data: [], links: [] };
    const rows = Array.isArray(safeExamResults?.data)
        ? safeExamResults.data
        : (Array.isArray(safeExamResults) ? safeExamResults : []);
    const sortedRows = useMemo(() => {
        const copy = [...rows];
        const dir = sortDir === 'asc' ? 1 : -1;
        copy.sort((a, b) => {
            if (sortBy === 'score') {
                return ((a.score_percentage || 0) - (b.score_percentage || 0)) * dir;
            }
            if (sortBy === 'name') {
                const an = (a.student_name || '').toLowerCase();
                const bn = (b.student_name || '').toLowerCase();
                if (an < bn) return -1 * dir;
                if (an > bn) return 1 * dir;
                return 0;
            }
            // default: date
            const ad = new Date(a.date_taken || a.created_at || 0).getTime();
            const bd = new Date(b.date_taken || b.created_at || 0).getTime();
            return (ad - bd) * dir;
        });
        return copy;
    }, [rows, sortBy, sortDir]);
    const safeStats = stats || {};
    const safeAvailableExams = availableExams || [];

    // Compute stats from currently displayed rows when an exam filter is applied
    const computedStats = useMemo(() => {
        const totalAcross = Number(safeExamResults?.total) || rows.length;
        const total = rows.length;
        if (total === 0) {
            return { total_results: Number(safeExamResults?.total) || 0, passed_count: 0, average_score: 0, pass_rate: 0 };
        }
        const passed = rows.filter(r => (r.remarks || '').toLowerCase() === 'pass').length;
        const avg = rows.reduce((sum, r) => sum + (Number(r.score_percentage) || 0), 0) / total;
        const passRate = totalAcross > 0 ? (passed / totalAcross) * 100 : 0;
        return {
            total_results: totalAcross,
            passed_count: passed,
            average_score: Math.round(avg * 100) / 100,
            pass_rate: Math.round(passRate * 100) / 100
        };
    }, [rows, safeExamResults]);

    // Use computed stats when a specific exam is selected; otherwise fallback to server totals
    const displayStats = selectedExam ? computedStats : {
        total_results: safeStats.total_results || 0,
        passed_count: safeStats.passed_count || 0,
        average_score: safeStats.average_score || 0,
        pass_rate: safeStats.pass_rate || 0
    };

    const selectedExamObj = safeAvailableExams.find((ex) => String(ex.id) === String(selectedExam));
    const selectedPassing = typeof selectedExamObj?.passing_score === 'number' ? selectedExamObj.passing_score : (selectedExamObj?.passing_score ? Number(selectedExamObj.passing_score) : null);

    const handleSearch = () => {
        console.log('[ExamResults] Search clicked', { searchTerm, selectedExam });
        router.get('/evaluator/exam-results', {
            student_name: searchTerm,
            exam_id: selectedExam
        }, {
            preserveState: true,
            replace: true
        });
    };

    // Auto-search when exam selection changes
    const handleExamChange = (examId) => {
        console.log('[ExamResults] Exam filter changed', examId);
        setSelectedExam(examId);
        router.get('/evaluator/exam-results', {
            student_name: searchTerm,
            exam_id: examId
        }, {
            preserveState: true,
            replace: true
        });
    };

    const handleReset = () => {
        console.log('[ExamResults] Reset filters');
        setSearchTerm('');
        setSelectedExam('');
        router.get('/evaluator/exam-results', {}, {
            preserveState: true,
            replace: true
        });
    };

    const openDetails = async (id) => {
        try {
            setDetailLoading(true);
            setShowModal(true);
            const res = await fetch(`/evaluator/exam-results/${id}?as=json`);
            const data = await res.json();
            setDetailData(data);
        } catch (e) {
            console.error('Failed to load details', e);
            setDetailData({ error: 'Failed to load details' });
        } finally {
            setDetailLoading(false);
        }
    };

    const printDetails = () => {
        if (!detailData?.result?.id) return;
        window.open(`/evaluator/exam-results/${detailData.result.id}/export`, '_blank');
    };

    return (
        <>
            <Head title={`${department || evaluator?.Department || 'Department'} - Exam Results`} />
            
            <Layout user={user} routes={[]}>
                <div className="max-w-7xl mx-auto animate-up" style={{ animationDelay: '60ms' }}>
                    {/* Modern Header */}
                    <div className="rounded-3xl border border-slate-800 bg-[#1D293D] text-white shadow-xl mb-8 animate-up" style={{ animationDelay: '120ms' }}>
                        <div className="p-8">
                            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                                <div className="flex flex-1 flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                                            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Evaluator · Exam Results</p>
                                            <h1 className="text-3xl font-bold md:text-4xl">
                                                Exam Results
                                            </h1>
                                        </div>
                                    </div>
                                    <p className="text-white/80 text-base md:text-lg max-w-2xl">
                                        View and analyze departmental exam results for {department || evaluator?.Department || 'your department'}. Track student performance and exam statistics.
                                    </p>
                                    <div className="flex items-center gap-6">
                                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Total Results</p>
                                            <p className="text-3xl font-semibold">{displayStats.total_results}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Passed</p>
                                            <p className="text-3xl font-semibold">{displayStats.passed_count}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Average</p>
                                            <p className="text-3xl font-semibold">{displayStats.average_score}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Selected Exam Info */}
                            {selectedExamObj && (
                                <div className="mt-6 p-4 rounded-2xl border border-white/20 bg-white/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl border border-white/20 bg-white/10 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">{selectedExamObj.exam_title}</h3>
                                                <p className="text-white/70 text-sm">Reference: {selectedExamObj.exam_ref_no}</p>
                                            </div>
                                        </div>
                                        {typeof selectedPassing === 'number' && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg border border-emerald-400/30 bg-emerald-500/20 flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M20 6L9 17l-5-5" />
                                                    </svg>
                                                </div>
                                                <span className="text-white font-semibold">Passing: {selectedPassing}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Modern Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-up" style={{ animationDelay: '180ms' }}>
                        {/* Total Results Card */}
                        <div className="group relative bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                            <div className="relative p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-600 mb-1">Total Results</p>
                                        <p className="text-3xl font-bold text-gray-900">{displayStats.total_results}</p>
                                        <p className="text-xs text-gray-500 mt-1">All exam attempts</p>
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Students Passed Card */}
                        <div className="group relative bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                            <div className="relative p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-600 mb-1">Students Passed</p>
                                        <p className="text-3xl font-bold text-emerald-600">{displayStats.passed_count}</p>
                                        <p className="text-xs text-gray-500 mt-1">Successful attempts</p>
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl border border-emerald-200 bg-emerald-50 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Average Score Card */}
                        <div className="group relative bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                            <div className="relative p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-600 mb-1">Average Score</p>
                                        <p className="text-3xl font-bold text-gray-900">{displayStats.average_score}%</p>
                                        <p className="text-xs text-gray-500 mt-1">Overall performance</p>
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pass Rate Card */}
                        <div className="group relative bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                            <div className="relative p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-600 mb-1">Pass Rate</p>
                                        <p className="text-3xl font-bold text-gray-900">{displayStats.pass_rate}%</p>
                                        <p className="text-xs text-gray-500 mt-1">Success percentage</p>
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modern Filters Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-8 animate-up" style={{ animationDelay: '220ms' }}>
                        <div className="p-6 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                        <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.5a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Filters & Search</h2>
                                        <p className="text-gray-600">Filter and search exam results by student or exam</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <a
                                        href="/evaluator/question-analysis-page"
                                        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 text-white hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all duration-300 font-semibold"
                                        title="Go to Question Analysis"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6a2 2 0 012-2h6m0 0l-3 3m3-3l-3-3" />
                                        </svg>
                                        Question Analysis
                                    </a>
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {rows.length} results
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 animate-up" style={{ animationDelay: '260ms' }}>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Student Name Filter */}
                                <div>
                                    <label htmlFor="student-name" className="block text-sm font-semibold text-gray-700 mb-3">Student Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            id="student-name"
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300"
                                            placeholder="Search by student name..."
                                        />
                                    </div>
                                </div>
                                
                                {/* Exam Filter */}
                                <div>
                                    <label htmlFor="exam-select" className="block text-sm font-semibold text-gray-700 mb-3">Exam</label>
                                    <div className="relative">
                                        <select
                                            id="exam-select"
                                            value={selectedExam}
                                            onChange={(e) => handleExamChange(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300 appearance-none bg-white"
                                        >
                                            <option value="">All Exams</option>
                                            {safeAvailableExams.map((exam) => (
                                                <option key={exam.id} value={exam.id}>
                                                    {exam.exam_ref_no} - {exam.exam_title}
                                                </option>
                                            ))}
                                        </select>
                                        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                    {selectedExamObj && typeof selectedPassing === 'number' && (
                                        <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                            <p className="text-xs text-emerald-700">
                                                <span className="font-semibold">Passing Score:</span> {selectedPassing}%
                                            </p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex flex-col justify-end gap-3">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleSearch}
                                            className="flex-1 bg-slate-700 text-white px-4 py-3 rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all duration-300 font-semibold transform hover:scale-105"
                                        >
                                            Search
                                        </button>
                                        <button
                                            onClick={handleReset}
                                            className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-300 font-semibold transform hover:scale-105"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const params = new URLSearchParams({
                                                student_name: searchTerm || '',
                                                exam_id: selectedExam || ''
                                            });
                                            console.log('[ExamResults] Export clicked', Object.fromEntries(params.entries()));
                                            window.open(`/evaluator/exam-results-export?${params.toString()}`, '_blank');
                                        }}
                                        className="group w-full inline-flex items-center justify-center px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all duration-300 font-semibold transform hover:scale-105"
                                    >
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                            <polyline points="7 10 12 15 17 10"/>
                                            <line x1="12" y1="15" x2="12" y2="3"/>
                                        </svg>
                                        Download Reports
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modern Results Table */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-up" style={{ animationDelay: '300ms' }}>
                        {/* Table Header */}
                        <div className="p-6 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Exam Results</h3>
                                        <p className="text-gray-600">View and analyze student performance</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="hidden md:flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                            <span className="text-gray-600">Pass</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                            <span className="text-gray-600">Fail</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-semibold text-gray-700">Sort by:</label>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => { setSortBy(e.target.value); console.log('[ExamResults] sortBy', e.target.value); }}
                                                className="px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300 text-sm"
                                            >
                                                <option value="date">Date</option>
                                                <option value="score">Score</option>
                                                <option value="name">Name</option>
                                            </select>
                                            <button
                                                onClick={() => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); console.log('[ExamResults] sortDir toggled'); }}
                                                className="w-10 h-10 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-300 flex items-center justify-center"
                                                aria-label="Toggle sort direction"
                                                title="Toggle sort direction"
                                            >
                                                {sortDir === 'asc' ? '↑' : '↓'}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => { setDense(d => !d); console.log('[ExamResults] density toggled'); }}
                                            className={`px-4 py-2 border-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                                                dense 
                                                    ? 'bg-slate-800 text-white border-slate-800' 
                                                    : 'border-slate-200 hover:bg-slate-50 text-gray-700'
                                            }`}
                                            aria-pressed={dense}
                                        >
                                            {dense ? 'Comfortable' : 'Compact'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 animate-up" style={{ animationDelay: '340ms' }}>
                            {rows && rows.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {sortedRows.map((result, idx) => {
                                                const pass = result.remarks === 'Pass';
                                                return (
                                                <tr key={result.id} className={`hover:bg-gray-50 border-l-4 ${pass ? 'border-green-400' : 'border-red-400'} animate-up`} style={{ animationDelay: `${380 + idx * 35}ms` }}>
                                                    <td className={`${dense ? 'px-4 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm text-gray-900`}>{result.student_name}</td>
                                                    <td className={`${dense ? 'px-4 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm text-gray-500`}>
                                                        <div>
                                                            <div className="font-medium">{result.exam_ref_no}</div>
                                                            <div className="text-xs text-gray-400">{result.exam_title}</div>
                                                        </div>
                                                    </td>
                                                    <td className={`${dense ? 'px-4 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm text-gray-900 font-medium`}>
                                                        <div className="min-w-[120px]">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span>{result.score_percentage}%</span>
                                                                {typeof result.exam_passing_score === 'number' && (
                                                                    <span className="text-[11px] text-gray-500">Pass: {result.exam_passing_score}%</span>
                                                                )}
                                                            </div>
                                                            <div className="h-2 w-full bg-gray-200 rounded">
                                                                <div
                                                                    className={`h-2 rounded ${pass ? 'bg-green-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${Math.max(0, Math.min(100, result.score_percentage || 0))}%` }}
                                                                    aria-label={`Score ${result.score_percentage}%`}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`${dense ? 'px-4 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm text-gray-900`}>{result.correct_answers}</td>
                                                    <td className={`${dense ? 'px-4 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm text-gray-900`}>{result.total_items}</td>
                                                    <td className={`${dense ? 'px-4 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm`}>
                                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                                                            result.remarks === 'Pass' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${pass ? 'bg-green-600' : 'bg-red-600'}`}></span>
                                                            {result.remarks}
                                                        </span>
                                                    </td>
                                                    <td className={`${dense ? 'px-4 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm text-gray-500`}>
                                                        <div>
                                                            <div>{result.date_taken}</div>
                                                            <div className="text-xs text-gray-400">{result.time_taken}</div>
                                                        </div>
                                                    </td>
                                                    <td className={`${dense ? 'px-4 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm font-medium`}>
                                                        <button
                                                            onClick={() => openDetails(result.id)}
                                                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl bg-slate-700 text-white hover:bg-slate-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
                                                        >
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );})}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exam Results Found</h3>
                                    <p className="text-gray-600 mb-6">No exam results found for {department || evaluator?.Department || 'your department'}.</p>
                                    <button
                                        onClick={handleReset}
                                        className="inline-flex items-center px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-all duration-300 font-semibold"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Clear Filters
                                    </button>
                                </div>
                            )}

                            {/* Modern Pagination */}
                            {safeExamResults.links && (
                                <div className="mt-8 pt-6 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Showing <span className="text-[#1447E6]">{safeExamResults.from || 0}</span> to <span className="text-[#1447E6]">{safeExamResults.to || 0}</span> of{' '}
                                                    <span className="text-[#1447E6]">{safeExamResults.total || 0}</span> results
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            {safeExamResults.links.map((link, index) => {
                                                // Preserve current filters in pagination links
                                                const url = new URL(link.url || '', window.location.origin);
                                                if (searchTerm) url.searchParams.set('student_name', searchTerm);
                                                if (selectedExam) url.searchParams.set('exam_id', selectedExam);
                                                
                                                return link.url ? (
                                                    <a
                                                        key={index}
                                                        href={url.toString()}
                                                        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                                                            link.active
                                                                ? 'bg-slate-700 text-white shadow-lg'
                                                                : 'bg-white text-gray-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                        }`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                ) : (
                                                    <span
                                                        key={index}
                                                        className="px-4 py-2 text-sm font-semibold rounded-xl opacity-50 cursor-not-allowed bg-white text-gray-700 border-2 border-gray-200"
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Layout>

            {/* Modern Details Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300" id="dept-exam-details">
                        <div className="p-6 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Exam Result Details</h3>
                                        <p className="text-gray-600">Detailed view of student performance</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setShowModal(false); setDetailData(null); }} 
                                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                                >
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {detailLoading && (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center animate-spin">
                                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                    <span className="ml-3 text-gray-600 font-semibold">Loading details...</span>
                                </div>
                            )}
                            {!detailLoading && detailData && detailData.error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-red-700 font-semibold">{detailData.error}</p>
                                    </div>
                                </div>
                            )}
                            {!detailLoading && detailData && !detailData.error && (
                                <div>
                                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700">Student</span>
                                            </div>
                                            <div className="font-bold text-gray-900">{detailData.result?.student_name}</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700">Exam</span>
                                            </div>
                                            <div className="font-bold text-gray-900">{detailData.result?.exam_ref_no} — {detailData.result?.exam_title}</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-semibold text-emerald-700">Score</span>
                                            </div>
                                            <div className="font-bold text-gray-900">{detailData.result?.score_percentage}% ({detailData.result?.correct_answers}/{detailData.result?.total_items})</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-semibold text-amber-700">Remarks</span>
                                            </div>
                                            <div className="font-bold text-gray-900">{detailData.result?.remarks}</div>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <h4 className="text-lg font-bold text-gray-900">Answer Details</h4>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                    <span className="text-gray-600 font-semibold">Correct</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                    <span className="text-gray-600 font-semibold">Incorrect</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                        <tr>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Question</th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student Answer</th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Correct Answer</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {(detailData.answers || []).map((a, idx) => {
                                                            const isCorrect = !!a.is_correct;
                                                            return (
                                                                <tr key={`${a.question_id}-${idx}`} className={`hover:bg-gray-50 transition-colors duration-200 ${isCorrect ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                                                                    <td className="px-6 py-4 text-sm font-semibold text-gray-700">{idx + 1}</td>
                                                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">{a.question}</td>
                                                                    <td className={`px-6 py-4 text-sm font-medium inline-flex items-center gap-3 ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                                                            {isCorrect ? (
                                                                                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                                                            ) : (
                                                                                <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                                                            )}
                                                                        </div>
                                                                        <span>{a.student_answer}</span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{a.correct_answer}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <button 
                                    onClick={printDetails} 
                                    className="inline-flex items-center px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-all duration-300 font-semibold transform hover:scale-105 shadow-lg"
                                >
                                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="7 10 12 15 17 10"/>
                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    Download PDF
                                </button>
                                <button 
                                    onClick={() => { setShowModal(false); setDetailData(null); }} 
                                    className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-300 font-semibold transform hover:scale-105 shadow-lg"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
