import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const ArchivedQuestions = ({ user, questions, categories }) => {
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        // Get per_page from URL parameters, default to 20
        const urlParams = new URLSearchParams(window.location.search);
        const perPage = urlParams.get('per_page');
        return perPage ? parseInt(perPage) : 20;
    });

    const handleRestore = (questionId) => {
        if (confirm('Are you sure you want to restore this question?')) {
            router.put(`/guidance/questions/${questionId}/restore`, {}, {
                onSuccess: () => {
                    window.showAlert('Question restored successfully', 'success');
                },
                onError: (errors) => {
                    window.showAlert('Failed to restore question', 'error');
                }
            });
        }
    };

    const handleBulkRestore = () => {
        if (selectedQuestions.length === 0) {
            window.showAlert('Please select questions to restore', 'warning');
            return;
        }

        if (confirm(`Are you sure you want to restore ${selectedQuestions.length} questions?`)) {
            router.post('/guidance/questions/bulk-restore', { questionIds: selectedQuestions }, {
                onSuccess: () => {
                    setSelectedQuestions([]);
                    setSelectAll(false);
                    window.showAlert(`${selectedQuestions.length} questions restored successfully`, 'success');
                },
                onError: (errors) => {
                    window.showAlert('Failed to restore questions', 'error');
                }
            });
        }
    };

    const handleSelectQuestion = (questionId) => {
        setSelectedQuestions(prev => 
            prev.includes(questionId) 
                ? prev.filter(id => id !== questionId)
                : [...prev, questionId]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedQuestions([]);
        } else {
            setSelectedQuestions(filteredQuestions.map(q => q.questionId));
        }
        setSelectAll(!selectAll);
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        // Reset to first page when changing items per page
        const url = new URL(window.location);
        url.searchParams.set('per_page', newItemsPerPage);
        url.searchParams.delete('page'); // Reset to first page
        window.location.href = url.toString();
    };

    const filteredQuestions = selectedCategory 
        ? questions.data.filter(q => q.category === selectedCategory)
        : questions.data;

    return (
        <Layout user={user}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-up" style={{ animationDelay: '60ms' }}>
                {/* Header Section */}
                <div className="mb-8 bg-gradient-to-r from-gray-600 to-gray-800 rounded-lg p-6 text-white animate-fadeIn animate-up" style={{ animationDelay: '120ms' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Archived Questions</h1>
                            <p className="mt-2 text-gray-100">View and restore previously deleted questions</p>
                            <div className="mt-4 flex items-center space-x-6">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm">Total: {questions.total} archived</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right hidden md:block">
                                <div className="text-2xl font-bold">{filteredQuestions.length}</div>
                                <div className="text-gray-100">Showing</div>
                            </div>
                            <a
                                href="/guidance/question-bank"
                                className="bg-white text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-lg flex items-center gap-2 font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Question Bank
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bulk Operations */}
                {selectedQuestions.length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-6 shadow-lg animate-fadeIn animate-up" style={{ animationDelay: '160ms' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-lg font-semibold text-green-900">
                                        {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                                    </span>
                                </div>
                                <button
                                    onClick={handleBulkRestore}
                                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                    Restore Selected
                                </button>
                            </div>
                            <button
                                onClick={() => setSelectedQuestions([])}
                                className="text-green-600 hover:text-green-800 px-4 py-2 rounded-lg hover:bg-green-100 transition-all duration-200 flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Clear Selection
                            </button>
                        </div>
                    </div>
                )}

                {/* Filter Section */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-4 border-blue-500 animate-fadeIn animate-up" style={{ animationDelay: '180ms' }}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                                    </svg>
                                </div>
                                <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Filter by Category:</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 bg-white"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-700">
                                    Showing <span className="text-blue-600 font-bold">{filteredQuestions.length}</span> of <span className="text-blue-600 font-bold">{questions.total}</span> archived questions
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Items per page:</label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                                className="border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-1 bg-white text-sm"
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
                </div>

                {/* Questions Table */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden animate-fadeIn animate-up" style={{ animationDelay: '200ms' }}>
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                                    </svg>
                                </div>
                                Archived Questions
                            </h3>
                            <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm border">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                />
                                <span className="text-sm font-medium text-gray-700">Select All ({filteredQuestions.length})</span>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <input
                                            type="checkbox"
                                            checked={selectAll}
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct Answer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredQuestions.map((question, index) => (
                                    <tr key={question.questionId} className="hover:bg-gray-50 transition-all duration-200 animate-up" style={{ animationDelay: `${160 + index * 40}ms` }}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedQuestions.includes(question.questionId)}
                                                onChange={() => handleSelectQuestion(question.questionId)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {index + 1}
                                                </div>
                                                <span className="ml-3 text-sm font-medium text-gray-900">#{question.questionId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                                            <div className="flex items-start space-x-3">
                                                <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="truncate" title={question.question}>{question.question}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 shadow-sm">
                                                {question.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-600">
                                                    {question.correct_answer}
                                                </div>
                                                <span className="text-sm text-gray-500">Correct Answer</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleRestore(question.questionId)}
                                                className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 hover:text-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
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
                        <div className="text-center py-12">
                            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No archived questions found</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                {selectedCategory ? `No questions found in the "${selectedCategory}" category.` : 'There are no archived questions to display.'}
                            </p>
                            {selectedCategory && (
                                <button
                                    onClick={() => setSelectedCategory('')}
                                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Clear Filter
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {questions.links && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            {questions.prev_page_url && (
                                <a href={questions.prev_page_url} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                    Previous
                                </a>
                            )}
                            {questions.next_page_url && (
                                <a href={questions.next_page_url} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                    Next
                                </a>
                            )}
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{questions.from || 0}</span> to <span className="font-medium">{questions.to || 0}</span> of{' '}
                                    <span className="font-medium">{questions.total}</span> archived questions
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    {questions.links.map((link, index) => (
                                        <a
                                            key={index}
                                            href={link.url}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                link.active
                                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                            } ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
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

export default ArchivedQuestions; 