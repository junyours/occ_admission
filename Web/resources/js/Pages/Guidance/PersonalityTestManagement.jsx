import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const PersonalityTestManagement = ({ user, questions, personalityTypes }) => {
    // Add safety checks for props
    const safeQuestions = questions?.data || questions || [];
    const safePersonalityTypes = personalityTypes || [];
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        // Load stored preference first, then URL, else default
        try {
            const stored = localStorage.getItem('ptm_itemsPerPage');
            if (stored) return parseInt(stored);
        } catch {}
        const urlParams = new URLSearchParams(window.location.search);
        const perPage = urlParams.get('per_page');
        return perPage ? parseInt(perPage) : 20;
    });
    const [formData, setFormData] = useState({
        question: '',
        dichotomy: 'E/I',
        positive_side: 'E',
        negative_side: 'I'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        router.post('/guidance/personality-questions', formData, {
            onSuccess: () => {
                setShowCreateForm(false);
                setFormData({
                    question: '',
                    dichotomy: 'E/I',
                    positive_side: 'E',
                    negative_side: 'I'
                });
                window.showAlert('Personality question created successfully', 'success');
            },
            onError: (errors) => {
                window.showAlert('Failed to create personality question', 'error');
            }
        });
    };

    const handleEdit = (question) => {
        setEditingQuestion(question);
        setFormData({
            question: question.question,
            dichotomy: question.dichotomy,
            positive_side: question.positive_side,
            negative_side: question.negative_side
        });
    };

    const handleUpdate = (questionId) => {
        router.put(`/guidance/personality-questions/${questionId}`, formData, {
            onSuccess: () => {
                setEditingQuestion(null);
                setFormData({
                    question: '',
                    dichotomy: 'E/I',
                    positive_side: 'E',
                    negative_side: 'I'
                });
                window.showAlert('Personality question updated successfully', 'success');
            },
            onError: (errors) => {
                window.showAlert('Failed to update personality question', 'error');
            }
        });
    };

    const handleDelete = (questionId) => {
        if (confirm('Are you sure you want to delete this personality question?')) {
            router.delete(`/guidance/personality-questions/${questionId}`, {
                onSuccess: () => {
                    window.showAlert('Personality question deleted successfully', 'success');
                },
                onError: (errors) => {
                    window.showAlert('Failed to delete personality question', 'error');
                }
            });
        }
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        // Clamp to 5 - 500
        let value = parseInt(newItemsPerPage);
        if (isNaN(value)) value = 20;
        value = Math.max(5, Math.min(500, value));
        setItemsPerPage(value);
        // Persist preference
        try { localStorage.setItem('ptm_itemsPerPage', String(value)); } catch {}
        // Reset to first page when changing items per page
        const url = new URL(window.location);
        url.searchParams.set('per_page', value);
        url.searchParams.delete('page');
        window.location.href = url.toString();
    };

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-slate-50">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm">
                        <div className="px-8 py-8">
                            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                                        <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Personality Test Management</h1>
                                        <p className="mt-2 text-sm text-white/80">
                                            Manage Myers-Briggs personality questions and maintain balanced dichotomies.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Questions</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{questions?.total || safeQuestions.length}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Across all pages</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Personality Types</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{safePersonalityTypes.length}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Configured dichotomies</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current Page</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{safeQuestions.length}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Visible questions</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Items Per Page</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{itemsPerPage === -1 ? 'All' : itemsPerPage}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Current preference</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-[#1D293D]">Question Management</h2>
                                <p className="text-sm text-slate-500">Create, edit, or import Myers-Briggs personality questions.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => setShowCreateForm(!showCreateForm)}
                                    className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-0.5 ${
                                        showCreateForm
                                            ? 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-700'
                                            : 'border-[#1447E6] bg-[#1447E6] text-white hover:bg-[#1240d0]'
                                    }`}
                                >
                                    {showCreateForm ? (
                                        <>
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Cancel
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                                            </svg>
                                            Add Question
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => document.getElementById('csv-upload').click()}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6]/30 bg-[#1447E6]/10 px-5 py-3 text-sm font-semibold text-[#1447E6] shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1447E6]/15"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Upload CSV
                                </button>
                            </div>
                    </div>
                    <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const formData = new FormData();
                                formData.append('csv_file', file);
                                router.post('/guidance/personality-questions/upload', formData, {
                                    onSuccess: () => {
                                        window.showAlert('CSV file uploaded successfully', 'success');
                                        e.target.value = '';
                                    },
                                    onError: (errors) => {
                                        window.showAlert('Failed to upload CSV file', 'error');
                                        e.target.value = '';
                                    }
                                });
                            }
                        }}
                        className="hidden"
                    />
                </div>

                    {/* Modern Create Question Form */}
                    {showCreateForm && (
                        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-6 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-[#1D293D]">Add Personality Question</h2>
                                    <p className="text-sm text-slate-500">Create a new Myers-Briggs personality test question.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                        Question Text
                                    </label>
                                    <textarea
                                        value={formData.question}
                                        onChange={(e) => setFormData({...formData, question: e.target.value})}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        rows="4"
                                        placeholder="Enter the personality test question..."
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                            Dichotomy
                                        </label>
                                        <select
                                            value={formData.dichotomy}
                                            onChange={(e) => setFormData({...formData, dichotomy: e.target.value})}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        >
                                            <option value="E/I">E/I - Extraversion/Introversion</option>
                                            <option value="S/N">S/N - Sensing/Intuition</option>
                                            <option value="T/F">T/F - Thinking/Feeling</option>
                                            <option value="J/P">J/P - Judging/Perceiving</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                            Positive Side
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.positive_side}
                                            onChange={(e) => setFormData({...formData, positive_side: e.target.value})}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl font-semibold text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                            maxLength="1"
                                            placeholder="E"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                            Negative Side
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.negative_side}
                                            onChange={(e) => setFormData({...formData, negative_side: e.target.value})}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl font-semibold text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                            maxLength="1"
                                            placeholder="I"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                                        </svg>
                                        Add Question
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}



                    {/* Display Options */}
                    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-[#1D293D]">Display Options</h3>
                                <p className="text-sm text-slate-500">
                                    Showing {safeQuestions.length} of {questions?.total || 0} personality questions.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                    Items per page:
                                </label>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                                    className="min-w-[120px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={30}>30</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={200}>200</option>
                                    <option value={300}>300</option>
                                    <option value={400}>400</option>
                                    <option value={500}>500</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Questions Table */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-6 py-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#1D293D]">Personality Test Questions</h3>
                                    <p className="text-sm text-slate-500">Manage Myers-Briggs indicator questions.</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Question</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dichotomy</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Positive/Negative</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Created</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {safeQuestions.map((question) => (
                                        <tr key={question.id} className="transition-colors duration-150 hover:bg-[#1447E6]/5">
                                            <td className="px-6 py-4 text-sm text-[#1D293D]">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                        Q
                                                    </div>
                                                    <span className="leading-relaxed">{question.question}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                <span className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                    {question.dichotomy}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                <div className="flex items-center gap-3">
                                                    <span className="inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                                                        {question.positive_side}
                                                    </span>
                                                    <span className="text-slate-400 font-semibold">/</span>
                                                    <span className="inline-flex items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
                                                        {question.negative_side}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(question.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(question)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6] transition-colors duration-200 hover:bg-[#1447E6]/15"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(question.id)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 transition-colors duration-200 hover:bg-rose-500/15"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    {safeQuestions.length === 0 && (
                        <div className="space-y-6 px-6 py-16 text-center">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10">
                                <svg className="h-10 w-10 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-[#1D293D]">No Questions Yet</h3>
                                <p className="mx-auto max-w-md text-sm text-slate-500">
                                    Start building your Myers-Briggs personality assessment by adding your first question.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                                </svg>
                                Add First Question
                            </button>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {(questions?.links || []).length > 0 && (
                    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-medium text-slate-600">
                                Showing <span className="font-semibold text-[#1447E6]">{questions?.from || 0}</span> to{' '}
                                <span className="font-semibold text-[#1447E6]">{questions?.to || 0}</span> of{' '}
                                <span className="font-semibold text-[#1447E6]">{questions?.total || 0}</span> personality questions.
                            </p>
                            <nav className="flex flex-wrap items-center gap-2" aria-label="Pagination">
                                {(questions?.links || []).map((link, index) => (
                                    <a
                                        key={index}
                                        href={link.url || '#'}
                                        className={`inline-flex min-w-[40px] items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                                            link.active
                                                ? 'border-[#1447E6] bg-[#1447E6] text-white'
                                                : 'border-slate-300 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6]'
                                        } ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </nav>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Question Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-[#1D293D] px-8 py-6 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">Edit Personality Question</h2>
                                    <p className="text-sm text-white/70">Update question content and dichotomy mapping.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingQuestion(null);
                                    setFormData({
                                        question: '',
                                        dichotomy: 'E/I',
                                        positive_side: 'E',
                                        negative_side: 'I'
                                    });
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="px-8 py-6">
                            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(editingQuestion.id); }} className="space-y-6">
                                <div>
                                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1D293D]">
                                        <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Question
                                    </label>
                                    <textarea
                                        value={formData.question}
                                        onChange={(e) => setFormData({...formData, question: e.target.value})}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        rows="3"
                                        placeholder="Enter the personality test question..."
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1D293D]">
                                            <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Dichotomy
                                        </label>
                                        <select
                                            value={formData.dichotomy}
                                            onChange={(e) => setFormData({...formData, dichotomy: e.target.value})}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        >
                                            <option value="E/I">E/I - Extraversion/Introversion</option>
                                            <option value="S/N">S/N - Sensing/Intuition</option>
                                            <option value="T/F">T/F - Thinking/Feeling</option>
                                            <option value="J/P">J/P - Judging/Perceiving</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1D293D]">
                                            <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Positive Side
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.positive_side}
                                            onChange={(e) => setFormData({...formData, positive_side: e.target.value})}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl font-semibold text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                            placeholder="e.g., E"
                                            maxLength="1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1D293D]">
                                            <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Negative Side
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.negative_side}
                                            onChange={(e) => setFormData({...formData, negative_side: e.target.value})}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl font-semibold text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                            placeholder="e.g., I"
                                            maxLength="1"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingQuestion(null);
                                            setFormData({
                                                question: '',
                                                dichotomy: 'E/I',
                                                positive_side: 'E',
                                                negative_side: 'I'
                                            });
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Update Question
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
            </div>
        </Layout>
    );
};

export default PersonalityTestManagement;