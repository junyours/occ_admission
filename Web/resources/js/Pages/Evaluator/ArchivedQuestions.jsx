import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function ArchivedQuestions({ user, evaluator, questions, categories, filters }) {
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(filters?.category || '');
    const [itemsPerPage, setItemsPerPage] = useState(filters?.per_page || 20);
    const [isLoading, setIsLoading] = useState(false);
    const [urlParams, setUrlParams] = useState({
        category: filters?.category || '',
        per_page: filters?.per_page || 20,
        page: questions?.current_page || 1
    });

    // Load selected questions from localStorage on component mount
    useEffect(() => {
        const savedSelections = localStorage.getItem('evaluatorArchivedSelectedQuestions');
        if (savedSelections) {
            try {
                const parsed = JSON.parse(savedSelections);
                setSelectedQuestions(parsed);
                if (parsed.length > 0) {
                    setSelectAll(true);
                }
            } catch (error) {
                console.error('Error loading saved selections:', error);
            }
        }
    }, []);

    // Save selected questions to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('evaluatorArchivedSelectedQuestions', JSON.stringify(selectedQuestions));
    }, [selectedQuestions]);

    // Function to reload questions with current filters
    const reloadQuestions = (newParams = {}) => {
        const params = { ...urlParams, ...newParams };
        setUrlParams(params);
        setIsLoading(true);
        
        // Clear selected questions when changing filters (except page changes and items per page)
        if (newParams.category !== undefined || newParams.sort !== undefined) {
            setSelectedQuestions([]);
            setSelectAll(false);
        }
        
        router.get('/evaluator/archived-questions', params, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                console.log('Archived questions reloaded with params:', params);
                setIsLoading(false);
            },
            onError: () => {
                setIsLoading(false);
            }
        });
    };

    // Handle filter changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            reloadQuestions({
                category: selectedCategory,
                per_page: itemsPerPage,
                page: 1
            });
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [selectedCategory, itemsPerPage]);

    const handleSelectQuestion = (questionId) => {
        setSelectedQuestions(prev => prev.includes(questionId)
            ? prev.filter(id => id !== questionId)
            : [...prev, questionId]);
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedQuestions([]);
        } else {
            // Select all questions across all pages
            const allQuestionIds = questions.data.map(q => q.questionId);
            setSelectedQuestions(allQuestionIds);
        }
        setSelectAll(!selectAll);
    };

    const clearSelections = () => {
        setSelectedQuestions([]);
        setSelectAll(false);
        localStorage.removeItem('evaluatorArchivedSelectedQuestions');
    };

    const handleBulkRestore = () => {
        if (selectedQuestions.length === 0) {
            window.showAlert('Please select questions to restore', 'warning');
            return;
        }
        router.post('/evaluator/question-bank/bulk-restore', { questionIds: selectedQuestions }, {
            onSuccess: () => {
                localStorage.removeItem('evaluatorArchivedSelectedQuestions');
                setSelectedQuestions([]);
                setSelectAll(false);
                window.showAlert('Questions restored successfully', 'success');
                reloadQuestions({ page: 1 });
            },
            onError: () => window.showAlert('Failed to restore questions', 'error')
        });
    };

    const handleRestore = (id) => {
        router.put(`/evaluator/question-bank/${id}/restore`, {}, {
            onSuccess: () => {
                // Remove from selected questions if it was selected
                setSelectedQuestions(prev => prev.filter(qId => qId !== id));
                window.showAlert('Question restored successfully', 'success');
                reloadQuestions({ page: questions.current_page });
            },
            onError: () => window.showAlert('Failed to restore question', 'error')
        });
    };

    return (
        <Layout user={user}>
            <div className="max-w-7xl mx-auto animate-up" style={{ animationDelay: '60ms' }}>
                {/* Modern Header */}
                <div className="rounded-3xl border border-slate-800 bg-[#1D293D] text-white shadow-xl mb-8 animate-up" style={{ animationDelay: '120ms' }}>
                    <div className="p-8">
                        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-1 flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                                        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8l6 6m-6 0l6-6m2-3h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Evaluator · Archived Questions</p>
                                        <h1 className="text-3xl font-bold md:text-4xl">
                                            Archived Questions
                                        </h1>
                                    </div>
                                </div>
                                <p className="text-white/80 text-base md:text-lg max-w-2xl">
                                    Manage archived questions for {evaluator?.Department || 'your department'}. Restore questions back to your active question bank.
                                </p>
                                <div className="flex items-center gap-6">
                                    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                        <p className="text-xs uppercase tracking-[0.25em] text-white/60">Archived</p>
                                        <p className="text-3xl font-semibold">{questions?.data?.length || 0}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                        <p className="text-xs uppercase tracking-[0.25em] text-white/60">Categories</p>
                                        <p className="text-3xl font-semibold">{categories?.length || 0}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                <a 
                                    href="/evaluator/question-bank" 
                                    className="group relative overflow-hidden font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center space-x-3 shadow-lg transform hover:scale-105 bg-white text-[#1D293D] hover:bg-slate-50 hover:shadow-xl"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span>Back to Question Bank</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Filters & Controls Section */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-8 animate-up" style={{ animationDelay: '180ms' }}>
                    <div className="p-6 border-b border-slate-200 bg-slate-50 animate-up" style={{ animationDelay: '220ms' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.5a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Filters & Actions</h2>
                                    <p className="text-gray-600">Filter archived questions and manage bulk operations</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 animate-up" style={{ animationDelay: '260ms' }}>
                        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                            {/* Filters */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Category Filter */}
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Filter by Category</label>
                                        <div className="relative">
                                            <select 
                                                value={selectedCategory} 
                                                onChange={(e) => setSelectedCategory(e.target.value)} 
                                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300 appearance-none bg-white"
                                            >
                                                <option value="">All Categories</option>
                                                {categories?.map((c) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Per Page Filter */}
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Items Per Page</label>
                                        <div className="relative">
                                            <select 
                                                value={itemsPerPage} 
                                                onChange={(e) => setItemsPerPage(parseInt(e.target.value))} 
                                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300 appearance-none bg-white"
                                            >
                                                <option value={10}>10 questions</option>
                                                <option value={20}>20 questions</option>
                                                <option value={30}>30 questions</option>
                                                <option value={40}>40 questions</option>
                                                <option value={50}>50 questions</option>
                                                <option value={100}>100 questions</option>
                                            </select>
                                            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bulk Actions */}
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="flex items-center gap-3 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200">
                                        <input
                                            type="checkbox"
                                            checked={selectAll}
                                            onChange={handleSelectAll}
                                            className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="text-sm font-semibold text-emerald-800">Select All</span>
                                        
                                        {/* Bulk Operations Modal */}
                                        {selectedQuestions.length > 0 && (
                                            <div className="absolute top-full right-0 mt-3 bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 min-w-72">
                                                <div className="p-4 border-b border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                {selectedQuestions.length} questions selected
                                                            </p>
                                                            <p className="text-xs text-gray-500">Choose an action to perform</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-4 space-y-3">
                                                    <button
                                                        onClick={handleBulkRestore}
                                                        className="w-full bg-emerald-600 text-white px-4 py-3 rounded-xl hover:bg-emerald-700 transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transform hover:scale-105"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        Restore Selected Questions
                                                    </button>
                                                    <button
                                                        onClick={clearSelections}
                                                        className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all duration-300 text-sm font-semibold"
                                                    >
                                                        Clear Selection
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Results Summary */}
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {isLoading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                                            <span className="text-sm font-semibold text-gray-900">Applying filters...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M5 8l6 6m-6 0l6-6m2-3h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {questions?.total || 0} archived questions
                                                </span>
                                            </div>
                                            {selectedCategory && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        Filtered by: {selectedCategory}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedQuestions.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {selectedQuestions.length} selected
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Questions Table */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-up" style={{ animationDelay: '300ms' }}>
                    {/* Table Header */}
                    <div className="p-6 border-b border-slate-200 bg-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Archived Questions</h3>
                                <p className="text-gray-600">View and restore archived questions</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                                        <input 
                                            type="checkbox" 
                                            checked={selectAll} 
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Question
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Archived Date
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                            </svg>
                                            Actions
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {questions.data.map((q) => (
                                    <tr key={q.questionId} className="hover:bg-gray-50 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap w-12">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedQuestions.includes(q.questionId)} 
                                                onChange={() => handleSelectQuestion(q.questionId)}
                                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="max-w-md">
                                                <p className="font-medium text-gray-900 truncate">{q.question}</p>
                                                {q.category && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 mt-1">
                                                        {q.category}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-40">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">{new Date(q.updated_at).toLocaleDateString()}</p>
                                                    <p className="text-xs text-gray-400">{new Date(q.updated_at).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium w-32">
                                            <button 
                                                onClick={() => handleRestore(q.questionId)} 
                                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Restore
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    {questions.data.length > 0 && questions.last_page > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-700">
                                    <span>
                                        Showing {((questions.current_page - 1) * questions.per_page) + 1} to{' '}
                                        {Math.min(questions.current_page * questions.per_page, questions.total)} of{' '}
                                        {questions.total} results
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {/* Previous Page */}
                                    <button
                                        onClick={() => reloadQuestions({ page: questions.current_page - 1 })}
                                        disabled={questions.current_page === 1}
                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>

                                    {/* Page Numbers */}
                                    {Array.from({ length: Math.min(5, questions.last_page) }, (_, i) => {
                                        let pageNum;
                                        if (questions.last_page <= 5) {
                                            pageNum = i + 1;
                                        } else if (questions.current_page <= 3) {
                                            pageNum = i + 1;
                                        } else if (questions.current_page >= questions.last_page - 2) {
                                            pageNum = questions.last_page - 4 + i;
                                        } else {
                                            pageNum = questions.current_page - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => reloadQuestions({ page: pageNum })}
                                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                                    pageNum === questions.current_page
                                                        ? 'bg-slate-700 text-white shadow-lg'
                                                        : 'text-gray-700 bg-white border border-slate-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    {/* Next Page */}
                                    <button
                                        onClick={() => reloadQuestions({ page: questions.current_page + 1 })}
                                        disabled={questions.current_page === questions.last_page}
                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Empty State */}
                    {questions.data.length === 0 && (
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6m-6 0l6-6m2-3h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Archived Questions</h3>
                            <p className="text-gray-600 mb-6">There are no archived questions to display.</p>
                            <a 
                                href="/evaluator/question-bank" 
                                className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-300 font-semibold"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Question Bank
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}



