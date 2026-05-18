import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const ArchivedQuestions = ({ user, questions, categories }) => {
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const perPage = urlParams.get('per_page');
        return perPage ? parseInt(perPage) : 20;
    });

    const handleRestore = (questionId) => {
        if (confirm('Are you sure you want to restore this question?')) {
            console.log('[ArchivedQuestions] Restore question', questionId);
            router.put(`/guidance/questions/${questionId}/restore`, {}, {
                onSuccess: () => {
                    window.showAlert('Question restored successfully', 'success');
                },
                onError: () => {
                    window.showAlert('Failed to restore question', 'error');
                },
            });
        }
    };

    const handleBulkRestore = () => {
        if (selectedQuestions.length === 0) {
            window.showAlert('Please select questions to restore', 'warning');
            return;
        }

        if (confirm(`Are you sure you want to restore ${selectedQuestions.length} questions?`)) {
            console.log('[ArchivedQuestions] Bulk restore', selectedQuestions);
            router.post('/guidance/questions/bulk-restore', { questionIds: selectedQuestions }, {
                onSuccess: () => {
                    setSelectedQuestions([]);
                    setSelectAll(false);
                    window.showAlert(`${selectedQuestions.length} questions restored successfully`, 'success');
                },
                onError: () => {
                    window.showAlert('Failed to restore questions', 'error');
                },
            });
        }
    };

    const handleSelectQuestion = (questionId) => {
        setSelectedQuestions((prev) =>
            prev.includes(questionId)
                ? prev.filter((id) => id !== questionId)
                : [...prev, questionId],
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedQuestions([]);
        } else {
            setSelectedQuestions(filteredQuestions.map((q) => q.questionId));
        }
        setSelectAll(!selectAll);
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        console.log('[ArchivedQuestions] Items per page', newItemsPerPage);
        setItemsPerPage(newItemsPerPage);
        const url = new URL(window.location);
        url.searchParams.set('per_page', newItemsPerPage);
        url.searchParams.delete('page');
        window.location.href = url.toString();
    };

    const filteredQuestions = selectedCategory
        ? questions.data.filter((q) => q.category === selectedCategory)
        : questions.data;

    const visibleCount = filteredQuestions.length;
    const todayLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    console.log('[ArchivedQuestions] Render', {
        total: questions.total,
        visible: visibleCount,
        category: selectedCategory,
        selected: selectedQuestions.length,
    });

    const handleClearCategory = () => {
        console.log('[ArchivedQuestions] Clear category filter');
        setSelectedCategory('');
    };

    return (
        <Layout user={user}>
            <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
                <header className="rounded-2xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm">
                    <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm text-white/70">{todayLabel}</p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Archived questions</h1>
                            <p className="mt-2 max-w-xl text-sm text-white/75">
                                View and restore questions removed from the active bank.
                            </p>
                        </div>
                        <a
                            href="/guidance/question-bank"
                            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to question bank
                        </a>
                    </div>
                </header>

                <section aria-labelledby="aq-overview-heading">
                    <h2 id="aq-overview-heading" className="mb-4 text-lg font-semibold text-[#1D293D]">
                        Overview
                    </h2>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Total archived</p>
                            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1D293D]">{questions.total || 0}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Categories</p>
                            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1D293D]">{categories.length}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Showing (filtered)</p>
                            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1D293D]">{visibleCount}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                        <span className="text-slate-500">
                            Page: <span className="font-semibold text-[#1D293D]">{questions.from || 0}–{questions.to || 0}</span>
                             of <span className="font-semibold text-[#1D293D]">{questions.total}</span>
                        </span>
                        {selectedCategory && (
                            <>
                                <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" aria-hidden="true" />
                                <span className="text-slate-500">
                                    Category: <span className="font-semibold text-[#1447E6]">{selectedCategory}</span>
                                </span>
                            </>
                        )}
                    </div>
                </section>

                <section aria-labelledby="aq-list-heading">
                    <h2 id="aq-list-heading" className="mb-4 text-lg font-semibold text-[#1D293D]">
                        Archived list
                    </h2>
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div>
                                        <label htmlFor="aq-category" className="mb-1 block text-xs font-medium text-slate-500">Category</label>
                                        <select
                                            id="aq-category"
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#1D293D] focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        >
                                            <option value="">All categories</option>
                                            {categories.map((category) => (
                                                <option key={category} value={category}>{category}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="aq-per-page" className="mb-1 block text-xs font-medium text-slate-500">Per page</label>
                                        <select
                                            id="aq-per-page"
                                            value={itemsPerPage}
                                            onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#1D293D] focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={30}>30</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={-1}>All</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                    />
                                    <span className="text-sm font-medium text-[#1D293D]">
                                        Select all ({filteredQuestions.length})
                                    </span>
                                    {selectedQuestions.length > 0 && (
                                        <div className="absolute right-0 top-full z-20 mt-2 min-w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                                            <p className="text-sm font-semibold text-[#1D293D]">
                                                {selectedQuestions.length} selected
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleBulkRestore}
                                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                </svg>
                                                Restore selected
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedQuestions([]); setSelectAll(false); }}
                                                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                                            >
                                                Clear selection
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="mt-4 text-sm text-slate-600">
                                <span className="font-semibold text-[#1D293D]">{visibleCount}</span>
                                 of 
                                <span className="font-semibold text-[#1D293D]">{questions.total}</span>
                                 archived questions match your filters
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="w-10 px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectAll}
                                                onChange={handleSelectAll}
                                                className="rounded border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Question</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Category</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Answer</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {filteredQuestions.map((question, index) => (
                                        <tr key={question.questionId} className="hover:bg-[#1447E6]/5">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedQuestions.includes(question.questionId)}
                                                    onChange={() => handleSelectQuestion(question.questionId)}
                                                    className="rounded border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-[#1D293D]">
                                                #{question.questionId}
                                            </td>
                                            <td className="max-w-md px-4 py-3 text-sm text-slate-700">
                                                <span className="line-clamp-2" title={question.question}>{question.question}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-2.5 py-0.5 text-xs font-medium text-[#1447E6]">
                                                    {question.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-semibold text-emerald-700">
                                                    {question.correct_answer}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRestore(question.questionId)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                    Restore
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredQuestions.length === 0 && (
                            <div className="px-5 py-12 text-center">
                                <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                <h3 className="mt-4 text-base font-semibold text-[#1D293D]">No archived questions found</h3>
                                <p className="mt-2 text-sm text-slate-500">
                                    {selectedCategory
                                        ? `No questions in "${selectedCategory}".`
                                        : 'There are no archived questions to display.'}
                                </p>
                                {selectedCategory && (
                                    <button
                                        type="button"
                                        onClick={handleClearCategory}
                                        className="mt-4 rounded-lg bg-[#1447E6] px-4 py-2 text-sm font-medium text-white hover:bg-[#1039c4]"
                                    >
                                        Clear category filter
                                    </button>
                                )}
                            </div>
                        )}

                        {questions.links && (
                            <div className="border-t border-slate-200 px-5 py-4">
                                <div className="flex flex-1 justify-between sm:hidden">
                                    {questions.prev_page_url && (
                                        <a
                                            href={questions.prev_page_url}
                                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                            Previous
                                        </a>
                                    )}
                                    {questions.next_page_url && (
                                        <a
                                            href={questions.next_page_url}
                                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                            Next
                                        </a>
                                    )}
                                </div>
                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <p className="text-sm text-slate-600">
                                        Showing <span className="font-semibold text-[#1D293D]">{questions.from || 0}</span> to 
                                        <span className="font-semibold text-[#1D293D]">{questions.to || 0}</span> of 
                                        <span className="font-semibold text-[#1D293D]">{questions.total}</span> archived
                                    </p>
                                    <nav className="inline-flex overflow-hidden rounded-lg border border-slate-200" aria-label="Pagination">
                                        {questions.links.map((link, index) => {
                                            const linkClass = [
                                                'relative inline-flex items-center px-4 py-2 text-sm font-medium transition-colors',
                                                link.active ? 'bg-[#1447E6] text-white' : 'bg-white text-slate-600 hover:bg-[#1447E6]/10',
                                                !link.url ? 'cursor-not-allowed opacity-50' : '',
                                            ].join(' ');
                                            return (
                                                <a
                                                    key={index}
                                                    href={link.url || '#'}
                                                    className={linkClass}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                    onClick={(e) => {
                                                        if (!link.url) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                />
                                            );
                                        })}
                                    </nav>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </Layout>
    );
};

export default ArchivedQuestions;
