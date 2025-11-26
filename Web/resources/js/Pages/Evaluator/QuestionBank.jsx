import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';   

export default function QuestionBank({ user, evaluator, questions, categories, routes }) {
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortOrder, setSortOrder] = useState('latest');
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [isTableMinimized, setIsTableMinimized] = useState(() => {
        // Get saved state from localStorage
        const saved = localStorage.getItem('evaluatorQuestionBankTableMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    
    // Add URL parameters state
    const [urlParams, setUrlParams] = useState({
        category: selectedCategory,
        search: searchQuery,
        sort: sortOrder,
        per_page: itemsPerPage,
        page: 1
    });
    
    // Add loading state for filters
    const [isLoading, setIsLoading] = useState(false);
    
    // Console logging for debugging
    console.log('QuestionBank component loaded:', {
        user: user?.id,
        evaluator: evaluator?.id,
        department: evaluator?.Department,
        questionsCount: questions?.total || 0,
        categoriesCount: categories?.length || 0,
        routes: Object.keys(routes)
    });
    
    // Resolve endpoints with safe fallbacks in case props.routes is missing/incomplete
    const uploadUrl = (routes && routes['evaluator.question-import.store']) || '/evaluator/question-import';
    const templateUrl = (routes && routes['evaluator.question-import.template']) || '/evaluator/question-import/template';
    console.log('Resolved endpoints:', { uploadUrl, templateUrl });
    
    const { data, setData, post, processing, errors, reset } = useForm({
        file: null
    });

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
        
        router.get('/evaluator/question-bank', params, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                console.log('Questions reloaded with params:', params);
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
                search: searchQuery,
                sort: sortOrder,
                per_page: itemsPerPage,
                page: 1 // Reset to first page when filters change
            });
        }, 300); // Debounce filter changes

        return () => clearTimeout(timeoutId);
    }, [selectedCategory, sortOrder, itemsPerPage, searchQuery]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        reloadQuestions({ search: searchQuery, page: 1 });
    };
    const clearSearch = () => {
        setSearchQuery('');
        reloadQuestions({ search: null, page: 1 });
    };

    // Preserve selected questions across page changes
    useEffect(() => {
        const savedSelections = localStorage.getItem('evaluatorSelectedQuestions');
        if (savedSelections) {
            try {
                const parsed = JSON.parse(savedSelections);
                setSelectedQuestions(parsed);
            } catch (e) {
                console.error('Error parsing saved selections:', e);
            }
        }
    }, []);

    // Save selected questions to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('evaluatorSelectedQuestions', JSON.stringify(selectedQuestions));
    }, [selectedQuestions]);

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

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Uploading file:', file.name, 'for department:', evaluator?.Department);
        console.log('File size:', file.size, 'bytes');
        console.log('File type:', file.type);
        console.log('Upload URL:', uploadUrl);

        if (!uploadUrl) {
            window.showAlert('Upload endpoint is not configured. Please contact the administrator.', 'error');
            return;
        }

        // Upload via Inertia router with FormData
        router.post(
            uploadUrl,
            { file },
            {
                forceFormData: true,
                onStart: () => console.log('Starting upload...'),
                onSuccess: () => {
                    setShowUploadModal(false);
                    reset();
                    window.showAlert('Questions uploaded successfully to ' + (evaluator?.Department || 'department') + ' question bank', 'success');
                },
                onError: (errors) => {
                    console.error('Upload errors:', errors);
                    window.showAlert('Failed to upload questions: ' + (errors.file || 'Unknown error'), 'error');
                },
            }
        );
    };

    const downloadTemplate = () => {
        console.log('Downloading template for department:', evaluator?.Department);
        console.log('Template route:', templateUrl);

        if (!templateUrl) {
            window.showAlert('Download template endpoint is not configured. Please contact the administrator.', 'error');
            return;
        }

        // Show loading state
        window.showAlert('Generating ' + (evaluator?.Department || 'department') + ' template...', 'info');

        try {
            const opened = window.open(templateUrl, '_blank');
            if (!opened) {
                console.warn('Popup blocked. Falling back to same-tab navigation.');
                window.location.href = templateUrl;
            }
        } catch (err) {
            console.error('Failed to open template URL:', err);
            window.location.href = templateUrl; // Fallback
        }
    };

    const handleEdit = (question) => {
        setEditingQuestion(question);
    };

    const handleImagePreview = (imageSrc, title = 'Image Preview') => {
        setPreviewImage({ src: imageSrc, title });
        setShowImagePreviewModal(true);
    };

    const handleUpdate = (questionId) => {
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

        router.put(`/evaluator/question-bank/${questionId}`, formData, {
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

    const handleArchive = (questionId) => {
        if (confirm('Are you sure you want to archive this question?')) {
            router.delete(`/evaluator/question-bank/${questionId}`, {
                onSuccess: () => {
                    window.showAlert('Question archived successfully', 'success');
                    // Remove from selected questions if it was selected
                    setSelectedQuestions(prev => prev.filter(id => id !== questionId));
                    // Reload questions to reflect changes
                    reloadQuestions({ page: questions.current_page });
                },
                onError: (errors) => {
                    window.showAlert('Failed to archive question', 'error');
                }
            });
        }
    };

    const handleBulkArchive = () => {
        if (selectedQuestions.length === 0) {
            window.showAlert('Please select questions to archive', 'warning');
            return;
        }

        if (confirm(`Are you sure you want to archive ${selectedQuestions.length} questions?`)) {
            router.post('/evaluator/question-bank/bulk-archive', { questionIds: selectedQuestions }, {
                onSuccess: () => {
                    const archivedCount = selectedQuestions.length;
                    setSelectedQuestions([]);
                    setSelectAll(false);
                    localStorage.removeItem('evaluatorSelectedQuestions'); // Clear from localStorage
                    window.showAlert(`${archivedCount} questions archived successfully`, 'success');
                    // Reload questions to reflect changes
                    reloadQuestions({ page: 1 });
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

    const clearSelections = () => {
        setSelectedQuestions([]);
        setSelectAll(false);
        localStorage.removeItem('evaluatorSelectedQuestions');
    };

    // Save table minimized state to localStorage
    const toggleTableMinimized = () => {
        const newState = !isTableMinimized;
        setIsTableMinimized(newState);
        localStorage.setItem('evaluatorQuestionBankTableMinimized', JSON.stringify(newState));
    };

    return (
        <>
            <Head title="Question Bank" />
            
            <Layout user={user} routes={routes}>
                <div className="max-w-7xl mx-auto animate-up" style={{ animationDelay: '60ms' }}>
                    {/* Modern Header */}
                    <div className="rounded-3xl border border-slate-800 bg-[#1D293D] text-white shadow-xl mb-8 animate-up" style={{ animationDelay: '120ms' }}>
                        <div className="p-8">
                            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                                <div className="flex flex-1 flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                                            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Evaluator · Question Bank</p>
                                            <h1 className="text-3xl font-bold md:text-4xl">
                                                Question Bank
                                            </h1>
                                        </div>
                                    </div>
                                    <p className="text-white/80 text-base md:text-lg max-w-2xl">
                                        Manage {evaluator?.Department || 'department'}-specific exam questions and templates. Create, organize, and maintain your question database.
                                    </p>
                                    <div className="flex items-center gap-6">
                                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Total Questions</p>
                                            <p className="text-3xl font-semibold">{questions?.total || 0}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Categories</p>
                                            <p className="text-3xl font-semibold">{categories?.length || 0}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                    <a
                                        href="/evaluator/question-builder"
                                        className="group relative overflow-hidden font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center space-x-3 shadow-lg transform hover:scale-105 bg-white text-[#1D293D] hover:bg-slate-50 hover:shadow-xl"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span>Create Question</span>
                                    </a>
                                    <a
                                        href="/evaluator/archived-questions"
                                        className="group relative overflow-hidden font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center space-x-3 shadow-lg bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6m-6 0l6-6m2-3h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                                        </svg>
                                        <span>View Archived</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modern Templates & Upload Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-8">
                        <div className="p-6 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Templates & Upload</h2>
                                    <p className="text-gray-600">Download {evaluator?.Department || 'department'}-specific templates and import questions in bulk</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Download Template Card */}
                                        <div className="group relative bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all duration-300">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 mb-1">Download Template</h3>
                                                    <p className="text-sm text-gray-600">Get Excel template with sample data</p>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowDownloadModal(!showDownloadModal)}
                                                        className="w-full bg-slate-700 text-white px-4 py-3 rounded-xl hover:bg-slate-800 transition-all duration-300 font-semibold flex items-center justify-center gap-2 shadow-lg transform hover:scale-105"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        Download Template
                                                        <svg className={`w-4 h-4 transition-transform ${showDownloadModal ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                    
                                                    {/* Modern Download Dropdown */}
                                                    {showDownloadModal && (
                                                        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-80 z-50">
                                                            <div className="space-y-3">
                                                                <button
                                                                    onClick={() => {
                                                                        downloadTemplate();
                                                                        setShowDownloadModal(false);
                                                                    }}
                                                                    className="w-full flex items-center space-x-4 p-4 rounded-xl hover:bg-slate-50 transition-all duration-300 text-left group"
                                                                >
                                                                    <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-gray-900">{evaluator?.Department || 'Department'} Excel Template</p>
                                                                        <p className="text-sm text-gray-600">Download .xlsx format with {evaluator?.Department || 'department'}-specific sample data</p>
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Upload Questions Card */}
                                        <div className="group relative bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all duration-300">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 mb-1">Upload Questions</h3>
                                                    <p className="text-sm text-gray-600">Import questions from Excel file</p>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowUploadModal(!showUploadModal)}
                                                        className="w-full bg-slate-700 text-white px-4 py-3 rounded-xl hover:bg-slate-800 transition-all duration-300 font-semibold flex items-center justify-center gap-2 shadow-lg transform hover:scale-105"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        Upload Questions
                                                        <svg className={`w-4 h-4 transition-transform ${showUploadModal ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    
                                                    {/* Modern Upload Dropdown */}
                                                    {showUploadModal && (
                                                        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-96 z-50">
                                                            <div className="space-y-4">
                                                                <div className="flex items-center gap-3 mb-4">
                                                                    <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                                                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                        </svg>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-semibold text-gray-900">Upload Questions</h4>
                                                                        <p className="text-sm text-gray-600">Import from Excel file</p>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="space-y-3">
                                                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                                        <p className="text-sm font-medium text-slate-800 mb-1">Supported Formats</p>
                                                                        <p className="text-xs text-slate-600">Excel (.xlsx, .xls) only</p>
                                                                    </div>
                                                                    
                                                                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                                                                        <p className="text-sm font-medium text-emerald-800 mb-1">Import Location</p>
                                                                        <p className="text-xs text-emerald-700">Questions will be imported to {evaluator?.Department || 'your department'} question bank</p>
                                                                    </div>
                                                                    
                                                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                                        <p className="text-sm font-medium text-slate-800 mb-1">Template Includes</p>
                                                                        <p className="text-xs text-slate-600">Question, Options 1-5, Correct Answer, Category, Direction</p>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="pt-2">
                                                                    <input
                                                                        type="file"
                                                                        accept=".xlsx,.xls"
                                                                        onChange={handleFileUpload}
                                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-all duration-300"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                {/* Modern Filters & Questions Container */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                    {/* Modern Header with Filters */}
                    <div className="p-6 border-b border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.5a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Questions Management</h2>
                                    <p className="text-gray-600">Filter, search, and manage your question database</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleTableMinimized}
                                className="group flex items-center gap-3 px-4 py-3 border-2 border-slate-300 rounded-xl text-gray-700 hover:border-slate-500 hover:bg-slate-50 transition-all duration-300 font-semibold"
                            >
                                {isTableMinimized ? (
                                    <>
                                        <svg className="w-5 h-5 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        Show Questions
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                        Hide Questions
                                    </>
                                )}
                            </button>
                        </div>
                        
                        {/* Search Bar */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-4">
                            <form onSubmit={handleSearchSubmit} className="relative">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search questions, options, categories..."
                                            className="w-full pl-12 pr-12 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300"
                                        />
                                        {searchQuery && (
                                            <button type="button" onClick={clearSearch} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <button type="submit" className="inline-flex items-center px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Search
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Modern Filters Section */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                </svg>
                                Filters & Settings
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Category Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Category</label>
                                    <div className="relative">
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300 appearance-none bg-white"
                                        >
                                            <option value="">All Categories</option>
                                            {categories?.map((category) => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Sort Order */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Sort Order</label>
                                    <div className="relative">
                                        <select
                                            value={sortOrder}
                                            onChange={(e) => setSortOrder(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300 appearance-none bg-white"
                                        >
                                            <option value="latest">Latest First</option>
                                            <option value="oldest">Oldest First</option>
                                        </select>
                                        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Items per page */}
                                <div>
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
                                            <option value={50}>50 questions</option>
                                            <option value={100}>100 questions</option>
                                        </select>
                                        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Results Summary */}
                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                                {isLoading ? (
                                                    <svg className="w-4 h-4 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {isLoading ? 'Loading...' : `${questions?.data?.length || 0} of ${questions?.total || 0} questions`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M19 11H5m14-4H3m16 8H9m-2 2l3-3-3-3" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {categories?.length || 0} categories
                                            </span>
                                        </div>
                                    </div>
                                    {isLoading && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Applying filters...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Questions Table - Conditionally Rendered */}
                    {!isTableMinimized && (
                        <>
                            {/* Modern Table Header */}
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Questions Table</h3>
                                            <p className="text-gray-600">View and manage all questions in your database</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="flex items-center gap-3 bg-emerald-50 px-4 py-3 rounded-xl border border-slate-200">
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={handleSelectAll}
                                                    className="w-5 h-5 rounded border-gray-300 text-[#10B981] focus:ring-emerald-500"
                                                />
                                                <span className="text-sm font-semibold text-[#10B981]">Select All</span>
                                                
                                                {/* Modern Bulk Operations Modal */}
                                                {selectedQuestions.length > 0 && (
                                                    <div className="absolute top-full right-0 mt-3 bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 min-w-72">
                                                        <div className="p-4 border-b border-gray-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
                                                                    <svg className="w-4 h-4 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                                                onClick={handleBulkArchive}
                                                                className="w-full bg-[#F59E0B] text-white px-4 py-3 rounded-xl hover:bg-[#D97706] transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transform hover:scale-105"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6m-6 0l6-6m2-3h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                                                                </svg>
                                                                Archive Selected Questions
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
                            </div>
                            <div className="overflow-x-auto max-w-full">
                        <table className="w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                                        <input
                                            type="checkbox"
                                            checked={selectAll}
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-300 text-[#10B981] focus:ring-green-500"
                                        />
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                                        <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Question
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                        <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Image
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                                        <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                            Options
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                        <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Answer
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                        <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                            Category
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                        <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Direction
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                        <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                            </svg>
                                            Actions
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {questions.data.map((question) => (
                                    <tr key={question.questionId} className="hover:bg-gray-50 transition-colors duration-200">
                                        <td className="px-3 py-4 whitespace-nowrap w-8">
                                            <input
                                                type="checkbox"
                                                checked={selectedQuestions.includes(question.questionId)}
                                                onChange={() => handleSelectQuestion(question.questionId)}
                                                className="rounded border-gray-300 text-[#10B981] focus:ring-green-500"
                                            />
                                        </td>
                                        <td className="px-3 py-4 whitespace-normal text-xs sm:text-sm text-gray-900 w-1/3">
                                            {renderFormattedText(question.question, question.question_formatted)}
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 w-24">
                                            <div>
                                                {question.image ? (
                                                    <img 
                                                        src={question.image.startsWith('data:') ? question.image : `data:image/jpeg;base64,${question.image}`} 
                                                        alt="Question" 
                                                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
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
                                        <td className="px-3 py-4 whitespace-normal text-xs sm:text-sm text-gray-500 w-2/5">
                                            <div className="space-y-2">
                                                {( (question.option1 && question.option1.trim() !== '') || (question.option1_formatted && question.option1_formatted.replace(/<[^>]*>/g, '').trim() !== '') ) && (
                                                    <div className="flex items-start space-x-2">
                                                        <span className="font-medium text-gray-700">A.</span>
                                                        <div className="flex-1">
                                                            <div className="text-sm">{renderFormattedText(question.option1, question.option1_formatted)}</div>
                                                            {question.option1_image && (
                                                                <img 
                                                                    src={question.option1_image.startsWith('data:') ? question.option1_image : `data:image/jpeg;base64,${question.option1_image}`} 
                                                                    alt="Option A" 
                                                                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                                    onClick={() => {
                                                                        const imageSrc = question.option1_image.startsWith('data:') ? question.option1_image : `data:image/jpeg;base64,${question.option1_image}`;
                                                                        handleImagePreview(imageSrc, 'Option A Image');
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {( (question.option2 && question.option2.trim() !== '') || (question.option2_formatted && question.option2_formatted.replace(/<[^>]*>/g, '').trim() !== '') ) && (
                                                    <div className="flex items-start space-x-2">
                                                        <span className="font-medium text-gray-700">B.</span>
                                                        <div className="flex-1">
                                                            <div className="text-sm">{renderFormattedText(question.option2, question.option2_formatted)}</div>
                                                            {question.option2_image && (
                                                                <img 
                                                                    src={question.option2_image.startsWith('data:') ? question.option2_image : `data:image/jpeg;base64,${question.option2_image}`} 
                                                                    alt="Option B" 
                                                                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                                    onClick={() => {
                                                                        const imageSrc = question.option2_image.startsWith('data:') ? question.option2_image : `data:image/jpeg;base64,${question.option2_image}`;
                                                                        handleImagePreview(imageSrc, 'Option B Image');
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {( (question.option3 && question.option3.trim() !== '') || (question.option3_formatted && question.option3_formatted.replace(/<[^>]*>/g, '').trim() !== '') ) && (
                                                    <div className="flex items-start space-x-2">
                                                        <span className="font-medium text-gray-700">C.</span>
                                                        <div className="flex-1">
                                                            <div className="text-sm">{renderFormattedText(question.option3, question.option3_formatted)}</div>
                                                            {question.option3_image && (
                                                                <img 
                                                                    src={question.option3_image.startsWith('data:') ? question.option3_image : `data:image/jpeg;base64,${question.option3_image}`} 
                                                                    alt="Option C" 
                                                                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                                    onClick={() => {
                                                                        const imageSrc = question.option3_image.startsWith('data:') ? question.option3_image : `data:image/jpeg;base64,${question.option3_image}`;
                                                                        handleImagePreview(imageSrc, 'Option C Image');
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {( (question.option4 && question.option4.trim() !== '') || (question.option4_formatted && question.option4_formatted.replace(/<[^>]*>/g, '').trim() !== '') ) && (
                                                    <div className="flex items-start space-x-2">
                                                        <span className="font-medium text-gray-700">D.</span>
                                                        <div className="flex-1">
                                                            <div className="text-sm">{renderFormattedText(question.option4, question.option4_formatted)}</div>
                                                            {question.option4_image && (
                                                                <img 
                                                                    src={question.option4_image.startsWith('data:') ? question.option4_image : `data:image/jpeg;base64,${question.option4_image}`} 
                                                                    alt="Option D" 
                                                                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                                    onClick={() => {
                                                                        const imageSrc = question.option4_image.startsWith('data:') ? question.option4_image : `data:image/jpeg;base64,${question.option4_image}`;
                                                                        handleImagePreview(imageSrc, 'Option D Image');
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {( (question.option5 && question.option5.trim() !== '') || (question.option5_formatted && question.option5_formatted.replace(/<[^>]*>/g, '').trim() !== '') ) && (
                                                    <div className="flex items-start space-x-2">
                                                        <span className="font-medium text-gray-700">E.</span>
                                                        <div className="flex-1">
                                                            <div className="text-sm">{renderFormattedText(question.option5, question.option5_formatted)}</div>
                                                            {question.option5_image && (
                                                                <img 
                                                                    src={question.option5_image.startsWith('data:') ? question.option5_image : `data:image/jpeg;base64,${question.option5_image}`} 
                                                                    alt="Option E" 
                                                                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                                    onClick={() => {
                                                                        const imageSrc = question.option5_image.startsWith('data:') ? question.option5_image : `data:image/jpeg;base64,${question.option5_image}`;
                                                                        handleImagePreview(imageSrc, 'Option E Image');
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 w-16">
                                            <span className="font-semibold text-[#10B981]">{question.correct_answer}</span>
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 w-24">
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-[#10B981]/10 text-[#10B981]">
                                                {question.category}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 w-32">
                                            <div className="max-w-xs truncate text-xs">
                                                {question.direction || 'No direction'}
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium w-32">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(question)}
                                                    className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-all duration-300 transform hover:scale-105"
                                                >
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleArchive(question.questionId)}
                                                    className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
                                                >
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    {questions && questions.links && (
                        <div className="bg-white px-6 py-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    {questions.prev_page_url && (
                                        <button 
                                            onClick={() => {
                                                const prevPage = questions.current_page - 1;
                                                reloadQuestions({ page: prevPage });
                                            }}
                                            className="relative inline-flex items-center px-4 py-2 border-2 border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Previous
                                        </button>
                                    )}
                                    {questions.next_page_url && (
                                        <button 
                                            onClick={() => {
                                                const nextPage = questions.current_page + 1;
                                                reloadQuestions({ page: nextPage });
                                            }}
                                            className="ml-3 relative inline-flex items-center px-4 py-2 border-2 border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
                                        >
                                            Next
                                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                Showing <span className="text-[#10B981]">{questions.from || 0}</span> to <span className="text-[#10B981]">{questions.to || 0}</span> of{' '}
                                                <span className="text-[#10B981]">{questions.total}</span> questions
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px" aria-label="Pagination">
                                            {questions.links.map((link, index) => {
                                                const pageNumber = link.label.match(/\d+/);
                                                const isNumeric = pageNumber && !isNaN(parseInt(pageNumber[0]));
                                                
                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            if (link.url && isNumeric) {
                                                                reloadQuestions({ page: parseInt(pageNumber[0]) });
                                                            } else if (link.label.includes('Previous') && questions.current_page > 1) {
                                                                reloadQuestions({ page: questions.current_page - 1 });
                                                            } else if (link.label.includes('Next') && questions.current_page < questions.last_page) {
                                                                reloadQuestions({ page: questions.current_page + 1 });
                                                            }
                                                        }}
                                                        disabled={!link.url}
                                                        className={`relative inline-flex items-center px-4 py-2 border-2 text-sm font-semibold transition-all duration-300 ${
                                                            link.active
                                                                ? 'z-10 bg-[#10B981]/10 border-emerald-500 text-[#10B981] shadow-lg'
                                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400'
                                                        } ${!link.url ? 'cursor-not-allowed opacity-50' : ''} ${
                                                            index === 0 ? 'rounded-l-xl' : ''
                                                        } ${
                                                            index === questions.links.length - 1 ? 'rounded-r-xl' : ''
                                                        }`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                );
                                            })}
                                        </nav>
                                    </div>
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

                {/* Modern Edit Question Modal */}
                {editingQuestion && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">Edit Question</h2>
                                            <p className="text-gray-600">Update question details and settings</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setEditingQuestion(null)}
                                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            
                            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(editingQuestion.questionId); }} className="space-y-6">
                                {/* Question Section */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Question Details
                                    </h3>
                                    <div className="space-y-3">

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Question Text
                                            </label>
                                            <textarea
                                                value={editingQuestion.question || ''}
                                                onChange={(e) => setEditingQuestion({
                                                    ...editingQuestion,
                                                    question: e.target.value
                                                })}
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500 text-sm resize-none"
                                                rows="4"
                                                placeholder="Enter the question text..."
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-800 mb-1">
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
                                                        className="w-full text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                                    />
                                                </div>
                                                {editingQuestion.image && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingQuestion({
                                                            ...editingQuestion,
                                                            image: null
                                                        })}
                                                        className="text-xs text-red-600 hover:text-red-800 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Options Section */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                        Answer Options
                                    </h3>
                                    <div className="space-y-3">
                                        {['option1', 'option2', 'option3', 'option4', 'option5'].map((optionKey, index) => (
                                            <div key={optionKey} className="space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-gray-600 w-6">
                                                        {String.fromCharCode(65 + index)}.
                                                    </span>
                                                    {index >= 1 && (
                                                        <span className="text-xs text-gray-500">(Optional)</span>
                                                    )}
                                                    <input
                                                        value={editingQuestion[optionKey]}
                                                        onChange={(e) => setEditingQuestion({
                                                            ...editingQuestion,
                                                            [optionKey]: e.target.value
                                                        })}
                                                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500 text-sm"
                                                        placeholder={`Option ${String.fromCharCode(65 + index)}${index >= 1 ? ' (Optional)' : ''}`}
                                                    />
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
                                                        className="flex-1 text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                                                    />
                                                    {editingQuestion[`${optionKey}_image`] && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingQuestion({
                                                                ...editingQuestion,
                                                                [`${optionKey}_image`]: null
                                                            })}
                                                            className="text-xs text-red-600 hover:text-red-800 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Settings Section */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Question Settings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-800 mb-1">
                                                    Correct Answer
                                                </label>
                                                <select
                                                    value={editingQuestion.correct_answer}
                                                    onChange={(e) => setEditingQuestion({
                                                        ...editingQuestion,
                                                        correct_answer: e.target.value
                                                    })}
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500 text-sm"
                                                    required
                                                >
                                                    <option value="A">A</option>
                                                    <option value="B">B</option>
                                                    <option value="C">C</option>
                                                    <option value="D">D</option>
                                                    <option value="E">E</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Category
                                                </label>
                                                <input
                                                    value={editingQuestion.category}
                                                    onChange={(e) => setEditingQuestion({
                                                        ...editingQuestion,
                                                        category: e.target.value
                                                    })}
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500 text-sm"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Direction (Optional)
                                            </label>
                                            <textarea
                                                value={editingQuestion.direction}
                                                onChange={(e) => setEditingQuestion({
                                                    ...editingQuestion,
                                                    direction: e.target.value
                                                })}
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#5439F7] focus:border-[#5439F7] text-sm"
                                                rows="2"
                                                placeholder="Enter direction for this question..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Modern Action Buttons */}
                                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setEditingQuestion(null)}
                                        className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="group relative overflow-hidden px-8 py-3 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 bg-slate-700 hover:bg-slate-800 shadow-lg hover:shadow-xl"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <span className="relative z-10 flex items-center justify-center">
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Save Changes
                                        </span>
                                    </button>
                                </div>
                            </form>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => setEditingQuestion(null)} 
                                        className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modern Image Preview Modal */}
                {showImagePreviewModal && previewImage && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden transform transition-all duration-300">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">{previewImage.title}</h2>
                                            <p className="text-gray-600">Image preview and details</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowImagePreviewModal(false)}
                                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div className="flex justify-center">
                                    <div className="relative">
                                        <img 
                                            src={previewImage.src} 
                                            alt={previewImage.title}
                                            className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-gray-200"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setShowImagePreviewModal(false)}
                                        className="px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                                    >
                                        Close Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Layout>
        </>
    );
}

