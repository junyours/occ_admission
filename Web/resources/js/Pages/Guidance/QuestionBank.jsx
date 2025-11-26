import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const QuestionBank = ({ user, questions, categories, categoryCounts, currentFilters }) => {
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(currentFilters?.category || '');
    const [sortOrder, setSortOrder] = useState(currentFilters?.sort || 'latest');
    const [searchQuery, setSearchQuery] = useState(currentFilters?.search || '');
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(currentFilters?.per_page || 20);
    const [isTableMinimized, setIsTableMinimized] = useState(() => {
        // Get saved state from localStorage
        const saved = localStorage.getItem('questionBankTableMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [highlightedQuestionId, setHighlightedQuestionId] = useState(null);

    // Handle questionId query parameter - scroll to and highlight the question
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const questionIdParam = urlParams.get('questionId');
        
        if (questionIdParam) {
            // Remove the query parameter from URL
            urlParams.delete('questionId');
            const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
            window.history.replaceState({}, '', newUrl);

            // Expand table if minimized
            if (isTableMinimized) {
                setIsTableMinimized(false);
                localStorage.setItem('questionBankTableMinimized', JSON.stringify(false));
            }

            // Wait a bit for table to render, then scroll to question
            setTimeout(() => {
                const questionRow = document.getElementById(`question-row-${questionIdParam}`);
                if (questionRow) {
                    questionRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Highlight the question
                    setHighlightedQuestionId(parseInt(questionIdParam));
                    
                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                        setHighlightedQuestionId(null);
                    }, 3000);
                } else {
                    // Question might be on another page - check if question exists in current page
                    const questionExists = questions.data?.some(q => q.questionId === parseInt(questionIdParam));
                    if (!questionExists && questions.data && questions.data.length > 0) {
                        console.log(`Question ${questionIdParam} not found on current page`);
                        // Could show an alert to user here
                    }
                }
            }, 500);
        }
    }, [questions.data, isTableMinimized]);

    // Live search: debounce searchQuery changes and update URL automatically
    const hasMountedRef = useRef(false);
    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }
        const handle = setTimeout(() => {
            updateURL({ search: searchQuery, page: 1 });
        }, 400);
        return () => clearTimeout(handle);
    }, [searchQuery]);

    // Helper function to render formatted text
    const renderFormattedText = (text, formattedText) => {
        console.log('renderFormattedText called:', { text, formattedText });

        // Prioritize formatted text if it exists and contains HTML formatting
        if (formattedText && formattedText.trim() !== '' && formattedText.includes('<')) {
            console.log('Using formatted text with HTML:', formattedText);
            return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
        }
        // Fallback to raw text if no formatted text or no HTML formatting
        if (text && text.trim() !== '') {
            console.log('Using raw text:', text);
            return <div>{text}</div>;
        }
        console.log('Using fallback:', formattedText || text || '');
        return <div>{formattedText || text || ''}</div>;
    };

    // Helper function to get available answer options for modal
    const getModalAvailableOptions = (question) => {
        const options = [];
        for (let i = 1; i <= 5; i++) {
            if (question[`option${i}`] && question[`option${i}`].trim()) {
                options.push(String.fromCharCode(64 + i));
            }
        }
        return options;
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('csv_file', file);

        router.post('/guidance/questions/upload', formData, {
            onSuccess: () => {
                setShowUploadModal(false);
                window.showAlert('Questions uploaded successfully', 'success');
            },
            onError: (errors) => {
                window.showAlert('Failed to upload questions', 'error');
            }
        });
    };

    const handleEdit = (question) => {
        setEditingQuestion(question);
    };

    const handleImagePreview = (imageSrc, title = 'Image Preview') => {
        setPreviewImage({ src: imageSrc, title });
        setShowImagePreviewModal(true);
    };

    const handleUpdate = (questionId) => {
        // Validation: Check if at least option A is filled
        if (!editingQuestion.option1 || !editingQuestion.option1.trim()) {
            window.showAlert('Option A is required', 'warning');
            return;
        }

        // Validation: Check if correct answer is valid
        const availableOptions = getModalAvailableOptions(editingQuestion);
        if (!availableOptions.includes(editingQuestion.correct_answer)) {
            window.showAlert('Please select a valid correct answer from the available options', 'warning');
            return;
        }

        const formData = {
            question: editingQuestion.question,
            option1: editingQuestion.option1,
            option1_image: editingQuestion.option1_image,
            option2: editingQuestion.option2,
            option2_image: editingQuestion.option2_image,
            option3: editingQuestion.option3,
            option3_image: editingQuestion.option3_image,
            option4: editingQuestion.option4,
            option4_image: editingQuestion.option4_image,
            option5: editingQuestion.option5,
            option5_image: editingQuestion.option5_image,
            correct_answer: editingQuestion.correct_answer,
            category: editingQuestion.category,
            direction: editingQuestion.direction,
            image: editingQuestion.image
        };

        router.put(`/guidance/questions/${questionId}`, formData, {
            onSuccess: () => {
                setEditingQuestion(null);
                window.showAlert('Question updated successfully', 'success');
                // Force page refresh to show updated data
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            },
            onError: (errors) => {
                window.showAlert('Failed to update question', 'error');
            }
        });
    };



    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [questionToArchive, setQuestionToArchive] = useState(null);

    const handleArchive = (questionId) => {
        setQuestionToArchive(questionId);
        setShowArchiveModal(true);
    };

    const confirmArchive = () => {
        if (questionToArchive) {
            router.put(`/guidance/questions/${questionToArchive}/archive`, {}, {
                onSuccess: () => {
                    setShowArchiveModal(false);
                    setQuestionToArchive(null);
                    window.showAlert('Question archived successfully', 'success');
                },
                onError: (errors) => {
                    window.showAlert('Failed to archive question', 'error');
                }
            });
        }
    };

    const cancelArchive = () => {
        setShowArchiveModal(false);
        setQuestionToArchive(null);
    };

    const handleBulkArchive = () => {
        if (selectedQuestions.length === 0) {
            window.showAlert('Please select questions to archive', 'warning');
            return;
        }

        if (confirm(`Are you sure you want to archive ${selectedQuestions.length} questions?`)) {
            router.post('/guidance/questions/bulk-archive', { questionIds: selectedQuestions }, {
                onSuccess: () => {
                    setSelectedQuestions([]);
                    setSelectAll(false);
                    window.showAlert(`${selectedQuestions.length} questions archived successfully`, 'success');
                },
                onError: (errors) => {
                    window.showAlert('Failed to archive questions', 'error');
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
            setSelectedQuestions(questions.data.map(q => q.questionId));
        }
        setSelectAll(!selectAll);
    };



    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        updateURL({ category, page: 1 });
    };

    const handleSortChange = (order) => {
        setSortOrder(order);
        updateURL({ sort: order, page: 1 });
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        updateURL({ per_page: newItemsPerPage, page: 1 });
    };

    const handleSearchChange = (query) => {
        setSearchQuery(query);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        updateURL({ search: searchQuery, page: 1 });
    };

    const clearSearch = () => {
        setSearchQuery('');
        updateURL({ search: null, page: 1 });
    };

    const updateURL = (params) => {
        const url = new URL(window.location);

        // Update or remove parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        });

        // Navigate to new URL
        window.location.href = url.toString();
    };

    const clearFilters = () => {
        setSelectedCategory('');
        setSortOrder('latest');
        setItemsPerPage(20);
        setSearchQuery('');
        updateURL({ category: null, sort: 'latest', per_page: 20, search: null, page: 1 });
    };

    const hasActiveFilters = selectedCategory || sortOrder !== 'latest' || itemsPerPage !== 20 || searchQuery;

    // Get category counts for dynamic items per page
    const getCategoryCount = (category) => {
        if (!category) return questions.total;
        return categoryCounts[category] || 0;
    };

    const currentCategoryCount = getCategoryCount(selectedCategory);

    // Save table minimized state to localStorage
    const toggleTableMinimized = () => {
        const newState = !isTableMinimized;
        setIsTableMinimized(newState);
        localStorage.setItem('questionBankTableMinimized', JSON.stringify(newState));
    };

    // Dynamic items per page options based on category count
    const getDynamicItemsPerPageOptions = () => {
        const count = currentCategoryCount;
        const options = [5, 20, 30, 40, 50];

        // Add options that make sense for the current count
        const relevantOptions = options.filter(option => option <= count || option === 50);

        // If no relevant options, at least show 5
        if (relevantOptions.length === 0) {
            relevantOptions.push(5);
        }

        // Always include "All" option if there are items
        if (count > 0) {
            relevantOptions.push(-1);
        }

        return relevantOptions;
    };

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-slate-50 animate-up" style={{ animationDelay: '60ms' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-up" style={{ animationDelay: '120ms' }}>
                    {/* Modern Header Section */}
                    <div className="mb-8 animate-up" style={{ animationDelay: '180ms' }}>
                        <div className="rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm overflow-hidden">
                            <div className="px-8 py-8">
                                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                                            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
                                            <p className="mt-2 text-sm text-white/75">
                                                Manage admission exam questions, categories, and supporting assets in one place.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <a
                                            href="/guidance/questions/builder"
                                            className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6]/30 bg-[#1447E6] px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                                            </svg>
                                            Create Question
                                        </a>
                                        <a
                                            href="/guidance/archived-questions"
                                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/20"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8l6 6m-6 0l6-6m2-3h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                                            </svg>
                                            Archived
                                        </a>
                                        <a
                                            href="/guidance/question-analysis-page"
                                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/20"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            Question Analysis
                                        </a>
                                    </div>
                                </div>
                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                                        Updated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full border border-[#1447E6]/30 bg-[#1447E6]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                                        {questions.total || 0} Questions
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Questions</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{questions.total || 0}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Across all categories</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Categories</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{categories.length}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Active classification tags</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M19 11H5m14-4H3m16 8H9m-2 2l3-3-3-3" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">With Images</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">
                                        {questions.data ? questions.data.filter(q => q.image).length : 0}
                                    </p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Questions containing media</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current Page</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{questions.data ? questions.data.length : 0}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Visible records</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Modern Templates & Upload Section */}
                    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-[#1D293D]">Templates & Upload</h2>
                                    <p className="text-sm text-slate-500">Download standardized formats or upload your curated questions.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Download Templates Card */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-[#1D293D]">Download Templates</h3>
                                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ready-made formats</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowDownloadModal(!showDownloadModal)}
                                        className="rounded-lg border border-[#1447E6]/20 bg-white px-3 py-2 text-xs font-semibold text-[#1447E6] transition-colors duration-200 hover:bg-[#1447E6]/10"
                                    >
                                        <svg className={`h-4 w-4 transition-transform ${showDownloadModal ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>

                                {showDownloadModal && (
                                    <div className="space-y-3 animate-fadeIn">
                                        <button
                                            onClick={() => {
                                                window.open('/guidance/questions/template', '_blank');
                                                setShowDownloadModal(false);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors duration-200 hover:border-[#1447E6]/30 hover:bg-[#1447E6]/5"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-[#1D293D]">Excel Template</p>
                                                <p className="text-xs text-slate-500">Download .xlsx format</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                window.open('/sample_questions_template.csv', '_blank');
                                                setShowDownloadModal(false);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors duration-200 hover:border-[#1447E6]/30 hover:bg-[#1447E6]/5"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-[#1D293D]">CSV Template</p>
                                                <p className="text-xs text-slate-500">Download .csv format</p>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Upload Questions Card */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-[#1D293D]">Upload Questions</h3>
                                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Bulk import</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowUploadModal(!showUploadModal)}
                                        className="rounded-lg border border-[#1447E6]/20 bg-white px-3 py-2 text-xs font-semibold text-[#1447E6] transition-colors duration-200 hover:bg-[#1447E6]/10"
                                    >
                                        <svg className={`h-4 w-4 transition-transform ${showUploadModal ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>

                                {showUploadModal && (
                                    <div className="animate-fadeIn">
                                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                                            <label className="mb-2 block text-sm font-semibold text-[#1D293D]">
                                                Supported Formats
                                            </label>
                                            <p className="mb-3 text-xs text-slate-500">
                                                CSV, Excel (.xlsx, .xls)
                                            </p>
                                            <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                                                CSV Format: question,option1,option2,option3,option4,correct_answer,category,image
                                            </p>
                                            <input
                                                type="file"
                                                accept=".csv,.xlsx,.xls"
                                                onChange={handleFileUpload}
                                                className="block w-full rounded-lg border border-slate-200 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#1447E6]/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#1447E6] hover:file:bg-[#1447E6]/15"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Modern Filters & Questions Container */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {/* Header with Filters and Minimize Toggle */}
                        <div className="border-b border-slate-200 bg-slate-50 px-8 py-6">
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.5a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-[#1D293D]">Filters & Questions</h2>
                                        <p className="text-sm text-slate-500">Locate, filter, and curate exam questions quickly.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleTableMinimized}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1447E6] hover:text-[#1447E6]"
                                >
                                    {isTableMinimized ? (
                                        <>
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            Show Table
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                            Hide Table
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Search Bar Section */}
                            <div className="px-8 pt-6 pb-2">
                                <form onSubmit={handleSearchSubmit} className="relative">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                                <svg className="h-5 w-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => handleSearchChange(e.target.value)}
                                                placeholder="Search questions, options, categories..."
                                                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/40"
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={clearSearch}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors duration-200 hover:text-slate-600"
                                                >
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            Search
                                        </button>
                                    </div>
                                    {searchQuery && (
                                        <div className="mt-3 flex items-center gap-2 text-sm">
                                            <span className="inline-flex items-center gap-2 rounded-lg border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                                Searching for: "{searchQuery}"
                                            </span>
                                        </div>
                                    )}
                                </form>
                            </div>

                            {/* Modern Filters Section */}
                            <div className="grid grid-cols-1 gap-6 px-8 pt-4 md:grid-cols-3">
                                {/* Category Filter */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category Filter</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => handleCategoryChange(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/40"
                                    >
                                        <option value="">All Categories ({questions.total})</option>
                                        {categories.map((category) => {
                                            const categoryCount = categoryCounts[category] || 0;
                                            return (
                                                <option key={category} value={category}>
                                                    {category} ({categoryCount})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Sort Order */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sort Order</label>
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => handleSortChange(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/40"
                                    >
                                        <option value="latest">Latest First</option>
                                        <option value="oldest">Oldest First</option>
                                    </select>
                                </div>

                                {/* Items per page */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Items Per Page</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/40"
                                    >
                                        {getDynamicItemsPerPageOptions().map((option) => (
                                            <option key={option} value={option}>
                                                {option === -1 ? 'Show All' : `${option} per page`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Modern Results Summary */}
                            <div className="border-t border-slate-200 pt-6">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <span className="text-sm font-semibold text-[#1D293D]">
                                                {questions.data ? questions.data.length : 0} of {currentCategoryCount} questions
                                            </span>
                                            <p className="text-xs text-slate-500">Currently displayed in this table</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {hasActiveFilters && (
                                            <button
                                                onClick={clearFilters}
                                                className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Clear Filters
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modern Questions Table - Conditionally Rendered */}
                        {!isTableMinimized && (
                            <>
                                {/* Table Header */}
                                <div className="border-b border-slate-200 bg-slate-50 px-8 py-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-[#1D293D]">Questions Table</h3>
                                                <p className="text-sm text-slate-500">Manage and organize exam questions</p>
                                            </div>
                                        </div>
                                        <div className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectAll}
                                                onChange={handleSelectAll}
                                                className="h-4 w-4 rounded border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                            />
                                            <span className="text-sm font-semibold text-[#1D293D]">Select All</span>

                                            {/* Bulk Operations Modal */}
                                            {selectedQuestions.length > 0 && (
                                                <div className="absolute right-0 top-full z-10 mt-3 min-w-72 animate-fadeIn rounded-2xl border border-slate-200 bg-white shadow-lg">
                                                    <div className="border-b border-slate-200 p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <span className="text-sm font-semibold text-[#1D293D]">
                                                                    {selectedQuestions.length} questions selected
                                                                </span>
                                                                <p className="text-xs text-slate-500">Choose an action below</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3 p-4">
                                                        <button
                                                            onClick={handleBulkArchive}
                                                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1D293D] bg-[#1D293D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#142033]"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6m-6 0l6-6m2-3h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                                                            </svg>
                                                            Archive Selected
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedQuestions([])}
                                                            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-200"
                                                        >
                                                            Clear Selection
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto max-w-full">
                                    <table className="w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="w-8 px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectAll}
                                                        onChange={handleSelectAll}
                                                        className="rounded border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                                    />
                                                </th>
                                                <th className="w-1/3 px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Question
                                                    </div>
                                                </th>
                                                <th className="w-24 px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Image
                                                    </div>
                                                </th>
                                                <th className="w-2/5 px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                        </svg>
                                                        Options
                                                    </div>
                                                </th>
                                                <th className="w-16 px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Answer
                                                    </div>
                                                </th>
                                                <th className="w-24 px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                        </svg>
                                                        Category
                                                    </div>
                                                </th>
                                                <th className="w-32 px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        Direction
                                                    </div>
                                                </th>
                                                <th className="w-24 px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                        </svg>
                                                        Actions
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {questions.data && questions.data.map((question) => (
                                                <tr 
                                                    key={question.questionId} 
                                                    id={`question-row-${question.questionId}`}
                                                    className={`transition-all duration-300 ${
                                                        highlightedQuestionId === question.questionId 
                                                            ? 'bg-[#1447E6]/20 ring-2 ring-[#1447E6] shadow-lg' 
                                                            : 'hover:bg-[#1447E6]/5'
                                                    }`}
                                                >
                                                    <td className="w-8 px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedQuestions.includes(question.questionId)}
                                                            onChange={() => handleSelectQuestion(question.questionId)}
                                                            className="rounded border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                                        />
                                                    </td>
                                                    <td className="w-1/3 px-6 py-4 whitespace-normal text-sm text-[#1D293D]">
                                                        <div className="font-medium leading-relaxed">
                                                            {renderFormattedText(question.question, question.question_formatted)}
                                                        </div>
                                                    </td>
                                                    <td className="w-24 px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        <div>
                                                            {question.image ? (
                                                                <img
                                                                    src={question.image.startsWith('data:') ? question.image : `data:image/jpeg;base64,${question.image}`}
                                                                    alt="Question"
                                                                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-200"
                                                                    onClick={() => {
                                                                        const imageSrc = question.image.startsWith('data:') ? question.image : `data:image/jpeg;base64,${question.image}`;
                                                                        handleImagePreview(imageSrc, 'Question Image');
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="text-center">
                                                                    <span className="text-gray-400 text-xs">No image</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="w-2/5 px-6 py-4 whitespace-normal text-sm text-slate-500">
                                                        <div className="space-y-2">
                                                            {/* Render only options that have content */}
                                                            {[
                                                                { key: 'option1', letter: 'A', formatted: 'option1_formatted', image: 'option1_image' },
                                                                { key: 'option2', letter: 'B', formatted: 'option2_formatted', image: 'option2_image' },
                                                                { key: 'option3', letter: 'C', formatted: 'option3_formatted', image: 'option3_image' },
                                                                { key: 'option4', letter: 'D', formatted: 'option4_formatted', image: 'option4_image' },
                                                                { key: 'option5', letter: 'E', formatted: 'option5_formatted', image: 'option5_image' }
                                                            ].map((option) => {
                                                                // Only render if option has content
                                                                if (!question[option.key] || !question[option.key].trim()) {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <div key={option.key} className="flex items-start gap-2">
                                                                        <span className="font-semibold text-[#1D293D]">{option.letter}.</span>
                                                                        <div className="flex-1">
                                                                            <div className="text-sm">{renderFormattedText(question[option.key], question[option.formatted])}</div>
                                                                            {question[option.image] && (
                                                                                <img
                                                                                    src={question[option.image].startsWith('data:') ? question[option.image] : `data:image/jpeg;base64,${question[option.image]}`}
                                                                                    alt={`Option ${option.letter}`}
                                                                                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg mt-1 cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-200"
                                                                                    onClick={() => {
                                                                                        const imageSrc = question[option.image].startsWith('data:') ? question[option.image] : `data:image/jpeg;base64,${question[option.image]}`;
                                                                                        handleImagePreview(imageSrc, `Option ${option.letter} Image`);
                                                                                    }}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="w-16 px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        <span className="inline-flex rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                            {question.correct_answer}
                                                        </span>
                                                    </td>
                                                    <td className="w-24 px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        <span className="inline-flex rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                            {question.category}
                                                        </span>
                                                    </td>
                                                    <td className="w-32 px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        <div className="max-w-xs truncate text-xs text-slate-500">
                                                            {question.direction || 'No direction'}
                                                        </div>
                                                    </td>
                                                    <td className="w-24 px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={() => handleEdit(question)}
                                                                className="inline-flex items-center gap-2 rounded-lg border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6] transition-colors duration-200 hover:bg-[#1447E6]/20"
                                                                title="Edit question"
                                                            >
                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleArchive(question.questionId)}
                                                                className="inline-flex items-center gap-2 rounded-lg border border-[#1D293D]/20 bg-[#1D293D]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1D293D] transition-colors duration-200 hover:bg-[#1D293D]/15"
                                                                title="Archive question"
                                                            >
                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6m-6 0l6-6m2-3h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                                                                </svg>
                                                                Archive
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Modern Pagination */}
                    {questions.links && (
                        <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
                            <div className="flex-1 flex justify-between sm:hidden">
                                {questions.prev_page_url && (
                                    <a
                                        href={(() => {
                                            try {
                                                const url = new URL(questions.prev_page_url);
                                                if (selectedCategory) url.searchParams.set('category', selectedCategory);
                                                if (sortOrder) url.searchParams.set('sort', sortOrder);
                                                if (itemsPerPage && itemsPerPage !== -1) url.searchParams.set('per_page', itemsPerPage);
                                                return url.toString();
                                            } catch (e) {
                                                console.error('Invalid prev URL:', questions.prev_page_url, e);
                                                return '#';
                                            }
                                        })()}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Previous
                                    </a>
                                )}
                                {questions.next_page_url && (
                                    <a
                                        href={(() => {
                                            try {
                                                const url = new URL(questions.next_page_url);
                                                if (selectedCategory) url.searchParams.set('category', selectedCategory);
                                                if (sortOrder) url.searchParams.set('sort', sortOrder);
                                                if (itemsPerPage && itemsPerPage !== -1) url.searchParams.set('per_page', itemsPerPage);
                                                return url.toString();
                                            } catch (e) {
                                                console.error('Invalid next URL:', questions.next_page_url, e);
                                                return '#';
                                            }
                                        })()}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                    >
                                        Next
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-semibold text-[#1D293D]">
                                            Showing <span className="font-bold">{questions.from || 0}</span> to <span className="font-bold">{questions.to || 0}</span> of{' '}
                                            <span className="font-bold">{questions.total}</span> results
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex -space-x-px overflow-hidden rounded-xl border border-slate-200 shadow-sm" aria-label="Pagination">
                                        {questions.links.map((link, index) => {
                                            // Add current filters to pagination links
                                            let url = link.url;
                                            if (url) {
                                                try {
                                                    const linkUrl = new URL(url);
                                                    if (selectedCategory) linkUrl.searchParams.set('category', selectedCategory);
                                                    if (sortOrder) linkUrl.searchParams.set('sort', sortOrder);
                                                    if (itemsPerPage && itemsPerPage !== -1) linkUrl.searchParams.set('per_page', itemsPerPage);
                                                    url = linkUrl.toString();
                                                } catch (e) {
                                                    console.error('Invalid URL:', url, e);
                                                }
                                            }

                                            return (
                                                <a
                                                    key={index}
                                                    href={url || '#'}
                                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors duration-200 ${link.active
                                                        ? 'z-10 bg-[#1447E6] text-white'
                                                        : 'bg-white text-slate-600 hover:bg-[#1447E6]/10'
                                                        } ${index < questions.links.length - 1 ? 'border-r border-slate-200' : ''} ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
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
                        </div>
                    )}
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
            {/* Modern Edit Question Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-[#1D293D] px-8 py-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Edit Question</h2>
                                        <p className="text-sm text-white/70">Update question information and settings</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingQuestion(null)}
                                    className="p-2 rounded-lg transition-colors hover:bg-white/15"
                                >
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); handleUpdate(editingQuestion.questionId); }} className="p-8 space-y-6">
                            {/* Question Section */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#1D293D]">
                                    <div className="p-2 rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    Question Details
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#1D293D]">
                                            Question Text
                                        </label>
                                        <textarea
                                            value={editingQuestion.question || ''}
                                            onChange={(e) => setEditingQuestion({
                                                ...editingQuestion,
                                                question: e.target.value
                                            })}
                                            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                            rows="4"
                                            placeholder="Enter the question text..."
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-semibold text-[#1D293D]">
                                            Question Image
                                        </label>
                                        <div className="flex items-center space-x-3">
                                            {editingQuestion.image && (
                                                <img
                                                    src={editingQuestion.image}
                                                    alt="Question"
                                                    className="w-16 h-16 object-cover rounded border"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (e) => {
                                                                setEditingQuestion({
                                                                    ...editingQuestion,
                                                                    image: e.target.result
                                                                });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                    className="w-full text-sm text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-[#1447E6]/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#1447E6] hover:file:bg-[#1447E6]/15"
                                                />
                                            </div>
                                            {editingQuestion.image && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingQuestion({
                                                        ...editingQuestion,
                                                        image: null
                                                    })}
                                                    className="rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 transition-colors duration-200 hover:bg-rose-50"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Options Section */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1D293D]">
                                    <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    Answer Options
                                </h3>
                                <div className="space-y-3">
                                    {['option1', 'option2', 'option3', 'option4', 'option5'].map((optionKey, index) => {
                                        // Only show option if it has content or if it's option A (required)
                                        const hasContent = editingQuestion[optionKey] && editingQuestion[optionKey].trim();
                                        const isOptionA = index === 0;

                                        if (!hasContent && !isOptionA) {
                                            return null;
                                        }

                                        return (
                                            <div key={optionKey} className="space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="w-6 text-sm font-medium text-[#1D293D]">
                                                        {String.fromCharCode(65 + index)}.
                                                    </span>
                                                    <input
                                                        value={editingQuestion[optionKey] || ''}
                                                        onChange={(e) => setEditingQuestion({
                                                            ...editingQuestion,
                                                            [optionKey]: e.target.value
                                                        })}
                                                        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                        placeholder={`Option ${String.fromCharCode(65 + index)}${index === 0 ? ' (Required)' : ' (Optional)'}`}
                                                        required={index === 0}
                                                    />
                                                    {index === 0 && <span className="text-xs font-semibold text-rose-600">*</span>}
                                                </div>

                                                {/* Option Image */}
                                                <div className="flex items-center space-x-2 ml-6">
                                                    {editingQuestion[`${optionKey}_image`] && (
                                                        <img
                                                            src={editingQuestion[`${optionKey}_image`]}
                                                            alt={`Option ${String.fromCharCode(65 + index)}`}
                                                            className="w-12 h-12 object-cover rounded border"
                                                        />
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onload = (e) => {
                                                                    setEditingQuestion({
                                                                        ...editingQuestion,
                                                                        [`${optionKey}_image`]: e.target.result
                                                                    });
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                        className="flex-1 text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-[#1447E6]/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#1447E6] hover:file:bg-[#1447E6]/15"
                                                    />
                                                    {editingQuestion[`${optionKey}_image`] && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingQuestion({
                                                                ...editingQuestion,
                                                                [`${optionKey}_image`]: null
                                                            })}
                                                            className="rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 transition-colors duration-200 hover:bg-rose-50"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Settings Section */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1D293D]">
                                    <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Question Settings
                                </h3>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold text-[#1D293D]">
                                                Correct Answer
                                            </label>
                                            <select
                                                value={editingQuestion.correct_answer}
                                                onChange={(e) => setEditingQuestion({
                                                    ...editingQuestion,
                                                    correct_answer: e.target.value
                                                })}
                                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                required
                                            >
                                                {getModalAvailableOptions(editingQuestion).map(option => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                            {getModalAvailableOptions(editingQuestion).length === 0 && (
                                                <p className="mt-1 text-xs font-medium text-rose-600">Please add at least one option</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold text-[#1D293D]">
                                                Category
                                            </label>
                                            <input
                                                value={editingQuestion.category}
                                                onChange={(e) => setEditingQuestion({
                                                    ...editingQuestion,
                                                    category: e.target.value
                                                })}
                                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-semibold text-[#1D293D]">
                                            Direction (Optional)
                                        </label>
                                        <textarea
                                            value={editingQuestion.direction}
                                            onChange={(e) => setEditingQuestion({
                                                ...editingQuestion,
                                                direction: e.target.value
                                            })}
                                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                            rows="2"
                                            placeholder="Enter direction for this question..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-4 border-t border-slate-200 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingQuestion(null)}
                                    className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modern Image Preview Modal */}
            {showImagePreviewModal && previewImage && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-[#1D293D] px-8 py-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{previewImage.title}</h2>
                                        <p className="text-sm text-white/70">Image preview and details</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowImagePreviewModal(false)}
                                    className="p-2 rounded-lg transition-colors hover:bg-white/15"
                                >
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="flex justify-center">
                                <img
                                    src={previewImage.src}
                                    alt={previewImage.title}
                                    className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xl border border-gray-200"
                                />
                            </div>

                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => setShowImagePreviewModal(false)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modern Archive Confirmation Modal */}
            {showArchiveModal && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="bg-[#1D293D] px-8 py-6 rounded-t-2xl">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Archive Question</h3>
                                    <p className="text-sm text-white/70">This action cannot be undone</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="mb-6">
                                <p className="text-[#1D293D] leading-relaxed">
                                    Are you sure you want to archive this question? The question will be moved to the archived section and will no longer be available for new exams.
                                </p>
                            </div>

                            <div className="flex gap-4 justify-end">
                                <button
                                    onClick={cancelArchive}
                                    className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmArchive}
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-600 bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-700"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6m-6 0l6-6m2-3h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                                    </svg>
                                    Archive Question
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default QuestionBank; 