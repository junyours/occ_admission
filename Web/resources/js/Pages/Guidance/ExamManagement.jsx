import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const ExamManagement = ({ user, exams, categories, questions, personalityDichotomies, personalityQuestions }) => {
    // Add safety checks for props
    const safeExams = exams?.data || exams || [];
    const safeCategories = categories || [];
    const safeQuestions = questions || [];
    const safePersonalityDichotomies = personalityDichotomies || [];
    const safePersonalityQuestions = personalityQuestions || [];
    
    // Debug: Log exam data to console
    console.log('ExamManagement - Received data:', {
        exams: safeExams,
        firstExam: safeExams[0],
        firstExamPersonalityQuestions: safeExams[0]?.personalityQuestions,
        firstExamPersonalityCount: safeExams[0]?.personalityQuestions?.length
    });
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [examType, setExamType] = useState('manual');
    const [personalityExamType, setPersonalityExamType] = useState('manual');
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        // Get per_page from URL parameters, default to 20
        const urlParams = new URLSearchParams(window.location.search);
        const perPage = urlParams.get('per_page');
        return perPage ? parseInt(perPage) : 20;
    });
    const [formData, setFormData] = useState({
        time_limit: 60,
        exam_type: 'manual',
        question_ids: [],
        category_counts: {},
        include_personality_test: false,
        personality_exam_type: 'manual',
        personality_question_ids: [],
        personality_category_counts: {}
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const submitData = {
            time_limit: formData.time_limit,
            exam_type: formData.exam_type,
            include_personality_test: formData.include_personality_test
        };

        if (formData.exam_type === 'manual') {
            submitData.question_ids = formData.question_ids;
        } else {
            submitData.category_counts = formData.category_counts;
        }

        if (formData.include_personality_test) {
            submitData.personality_exam_type = formData.personality_exam_type;
            
            if (formData.personality_exam_type === 'manual') {
                submitData.personality_question_ids = formData.personality_question_ids;
            } else {
                submitData.personality_category_counts = formData.personality_category_counts;
            }
        }

        // Debug log
        console.log('Submitting exam data:', submitData);

        router.post('/guidance/exams', submitData, {
            onSuccess: () => {
                setShowCreateForm(false);
                setFormData({
                    time_limit: 60,
                    exam_type: 'manual',
                    question_ids: [],
                    category_counts: {},
                    include_personality_test: false,
                    personality_exam_type: 'manual',
                    personality_question_ids: [],
                    personality_category_counts: {}
                });
                window.showAlert('Exam created successfully', 'success');
            },
            onError: (errors) => {
                window.showAlert('Failed to create exam', 'error');
            }
        });
    };

    const handleQuestionToggle = (questionId) => {
        const newQuestionIds = formData.question_ids.includes(questionId)
            ? formData.question_ids.filter(id => id !== questionId)
            : [...formData.question_ids, questionId];
        
        setFormData({
            ...formData,
            question_ids: newQuestionIds
        });
    };

    const handleCategoryCountChange = (category, count) => {
        setFormData({
            ...formData,
            category_counts: {
                ...formData.category_counts,
                [category]: parseInt(count) || 0
            }
        });
    };

    const handlePersonalityQuestionToggle = (questionId) => {
        const newQuestionIds = formData.personality_question_ids.includes(questionId)
            ? formData.personality_question_ids.filter(id => id !== questionId)
            : [...formData.personality_question_ids, questionId];
        
        setFormData({
            ...formData,
            personality_question_ids: newQuestionIds
        });
    };

    const handlePersonalityCategoryCountChange = (dichotomy, count) => {
        setFormData({
            ...formData,
            personality_category_counts: {
                ...formData.personality_category_counts,
                [dichotomy]: parseInt(count) || 0
            }
        });
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        // Reset to first page when changing items per page
        const url = new URL(window.location);
        url.searchParams.set('per_page', newItemsPerPage);
        url.searchParams.delete('page'); // Reset to first page
        window.location.href = url.toString();
    };

    const downloadExamPdf = (examId, examRefNo) => {
        try {
            console.log('Opening PDF for guidance exam:', examId, examRefNo);
            // Use the same approach as DepartmentExams.jsx - direct URL navigation
            window.open(`/guidance/exams/${examId}/pdf`, '_blank');
        } catch (error) {
            console.error('Error opening PDF:', error);
            window.showAlert?.('Failed to open PDF', 'error');
        }
    };

    // Normalize category names to handle case sensitivity issues
    const normalizeCategoryName = (category) => {
        if (!category) return '';
        // Convert to lowercase and handle common variations
        const normalized = category.toLowerCase().trim();
        // Handle specific cases like "spelled english" -> "english"
        if (normalized === 'spelled english') return 'english';
        return normalized;
    };

    const questionsByCategory = safeQuestions.reduce((acc, question) => {
        const normalizedCategory = normalizeCategoryName(question.category);
        if (!acc[normalizedCategory]) {
            acc[normalizedCategory] = [];
        }
        acc[normalizedCategory].push(question);
        return acc;
    }, {});

    // Create normalized categories list for display
    const normalizedCategories = Object.keys(questionsByCategory).sort();

    const personalityQuestionsByDichotomy = safePersonalityQuestions.reduce((acc, question) => {
        if (!acc[question.dichotomy]) {
            acc[question.dichotomy] = [];
        }
        acc[question.dichotomy].push(question);
        return acc;
    }, {});

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
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Exam Management</h1>
                                        <p className="mt-2 text-sm text-white/80">
                                            Create and manage academic and personality assessments with streamlined workflows.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-white/80">
                                    <span className="text-white">{safeExams.filter(exam => exam.status === 'active').length}</span>
                                    Active exams
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Exams</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{safeExams.length}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Across all departments</p>
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
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active Exams</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{safeExams.filter(exam => exam.status === 'active').length}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Currently published</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Academic Questions</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{safeQuestions.length}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">In the question bank</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Personality Items</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{safePersonalityQuestions.length}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Available dichotomy prompts</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-[#1D293D]">Exam Actions</h2>
                                <p className="text-sm text-slate-500">Create a new exam or review the existing catalog.</p>
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
                                            Create Exam
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        {safeExams.length > 0 && (
                            <div className="mt-4 rounded-xl border border-[#1447E6]/20 bg-[#1447E6]/10 px-4 py-3">
                                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-[#1D293D]">
                                    <span className="inline-flex items-center gap-2">
                                        <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        Managing {safeExams.length} exam{safeExams.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="inline-flex items-center gap-2 text-[#1447E6]">
                                        <span className="inline-block h-2 w-2 rounded-full bg-[#1447E6]"></span>
                                        {safeExams.filter(exam => exam.status === 'active').length} active
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Create Exam Form */}
                    {showCreateForm && (
                        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-200 bg-[#1D293D] px-8 py-6 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-semibold">Create New Exam</h2>
                                        <p className="text-sm text-white/70">Configure duration, question sourcing, and personality assessment options.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8 px-8 py-6">
                                {/* Basic Settings */}
                                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-[#1D293D]">Basic Settings</h3>
                                            <p className="text-sm text-slate-500">Define the core limits and structure of the exam.</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1D293D]">
                                                <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Time Limit (minutes)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={formData.time_limit}
                                                    onChange={(e) => setFormData({...formData, time_limit: parseInt(e.target.value)})}
                                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-14 text-sm font-semibold text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                    min="1"
                                                    placeholder="60"
                                                    required
                                                />
                                                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                    min
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500">Configure how long examinees have to finish the assessment.</p>
                                        </div>
                                    </div>
                                </section>

                                {/* Personality Assessment */}
                                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-[#1D293D]">Personality Assessment</h3>
                                            <p className="text-sm text-slate-500">Optionally include Myers-Briggs prompts for deeper profiling.</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            id="include_personality_test"
                                            checked={formData.include_personality_test}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    include_personality_test: e.target.checked
                                                })
                                            }
                                            className="mt-1 h-5 w-5 rounded border border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                        />
                                        <label htmlFor="include_personality_test" className="text-sm font-semibold text-[#1D293D]">
                                            Include personality test alongside the academic section.
                                        </label>
                                    </div>

                                    {formData.include_personality_test && (
                                        <div className="mt-6 space-y-6">
                                            <div>
                                                <p className="mb-3 text-sm font-semibold text-[#1D293D]">Question selection method</p>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    {[ 
                                                        { key: 'manual', title: 'Manual Selection', description: 'Pick individual personality questions for the exam.' },
                                                        { key: 'random', title: 'Random Generation', description: 'Define counts per dichotomy and auto-generate.' }
                                                    ].map(option => (
                                                        <button
                                                            type="button"
                                                            key={option.key}
                                                            onClick={() => {
                                                                setPersonalityExamType(option.key);
                                                                setFormData({...formData, personality_exam_type: option.key});
                                                            }}
                                                            className={`text-left ${
                                                                personalityExamType === option.key
                                                                    ? 'border-[#1447E6] bg-[#1447E6]/10 text-[#1D293D]'
                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#1447E6]/30'
                                                            } rounded-xl border px-5 py-4 transition-colors duration-200`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="radio"
                                                                    value={option.key}
                                                                    checked={personalityExamType === option.key}
                                                                    readOnly
                                                                    className="h-4 w-4 border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                                                />
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-[#1D293D]">{option.title}</h4>
                                                                    <p className="text-xs text-slate-500">{option.description}</p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {personalityExamType === 'manual' && (
                                                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <h4 className="text-sm font-semibold text-[#1D293D]">Select personality questions</h4>
                                                        <span className="inline-flex items-center gap-2 rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                            {formData.personality_question_ids.length} chosen
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        {safePersonalityDichotomies.map((dichotomy) => (
                                                            <div key={dichotomy} className="rounded-xl border border-slate-200 p-4">
                                                                <h5 className="mb-3 text-sm font-semibold text-[#1D293D]">{dichotomy}</h5>
                                                                <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '180px' }}>
                                                                    {personalityQuestionsByDichotomy[dichotomy]?.map((question) => (
                                                                        <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-3 py-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-50">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={formData.personality_question_ids.includes(question.id)}
                                                                                onChange={() => handlePersonalityQuestionToggle(question.id)}
                                                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                                                            />
                                                                            <span className="leading-relaxed">{question.question.substring(0, 120)}...</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {personalityExamType === 'random' && (
                                                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                                    <h4 className="mb-4 text-sm font-semibold text-[#1D293D]">Questions per dichotomy</h4>
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                        {safePersonalityDichotomies.map((dichotomy) => (
                                                            <div key={dichotomy} className="rounded-xl border border-slate-200 p-4">
                                                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                                    {dichotomy}
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={formData.personality_category_counts[dichotomy] || 0}
                                                                    onChange={(e) => handlePersonalityCategoryCountChange(dichotomy, e.target.value)}
                                                                    className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                                    min="0"
                                                                    max={personalityQuestionsByDichotomy[dichotomy]?.length || 0}
                                                                />
                                                                <p className="mt-2 text-xs text-slate-500">
                                                                    Available: {personalityQuestionsByDichotomy[dichotomy]?.length || 0} questions
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                        Total configured: {Object.values(formData.personality_category_counts).reduce((sum, count) => sum + (count || 0), 0)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </section>

                                {/* Academic Exam */}
                                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-[#1D293D]">Academic Exam</h3>
                                            <p className="text-sm text-slate-500">Configure how academic questions are sourced and balanced.</p>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <p className="mb-3 text-sm font-semibold text-[#1D293D]">Question selection method</p>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            {[ 
                                                { key: 'manual', title: 'Manual Selection', description: 'Pick questions for each category manually.' },
                                                { key: 'random', title: 'Random Generation', description: 'Specify counts per category and auto-generate.' }
                                            ].map(option => (
                                                <button
                                                    type="button"
                                                    key={option.key}
                                                    onClick={() => {
                                                        setExamType(option.key);
                                                        setFormData({...formData, exam_type: option.key});
                                                    }}
                                                    className={`text-left ${
                                                        examType === option.key
                                                            ? 'border-[#1447E6] bg-[#1447E6]/10 text-[#1D293D]'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-[#1447E6]/30'
                                                    } rounded-xl border px-5 py-4 transition-colors duration-200`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            value={option.key}
                                                            checked={examType === option.key}
                                                            readOnly
                                                            className="h-4 w-4 border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                                        />
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-[#1D293D]">{option.title}</h4>
                                                            <p className="text-xs text-slate-500">{option.description}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {examType === 'manual' && (
                                        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                            <div className="mb-4 flex items-center justify-between">
                                                <h4 className="text-sm font-semibold text-[#1D293D]">Select academic questions</h4>
                                                <span className="inline-flex items-center gap-2 rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                    {formData.question_ids.length} chosen
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                                {normalizedCategories.map((category) => (
                                                    <div key={category} className="rounded-xl border border-slate-200 p-4">
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <h5 className="text-sm font-semibold capitalize text-[#1D293D]">{category}</h5>
                                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                                {questionsByCategory[category]?.length || 0} items
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '220px' }}>
                                                            {questionsByCategory[category]?.map((question) => (
                                                                <label key={question.questionId} className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-3 py-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-50">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.question_ids.includes(question.questionId)}
                                                                        onChange={() => handleQuestionToggle(question.questionId)}
                                                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1447E6] focus:ring-[#1447E6]"
                                                                    />
                                                                    <span className="leading-relaxed">{question.question.substring(0, 160)}...</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {examType === 'random' && (
                                        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                            <div className="mb-4 flex items-center justify-between">
                                                <h4 className="text-sm font-semibold text-[#1D293D]">Configure counts per category</h4>
                                                <span className="inline-flex items-center gap-2 rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                    Total {Object.values(formData.category_counts).reduce((sum, count) => sum + (count || 0), 0)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                {normalizedCategories.map((category) => {
                                                    const max = questionsByCategory[category]?.length || 0;
                                                    const value = formData.category_counts[category] || 0;
                                                    const percent = max === 0 ? 0 : Math.min(100, (value / max) * 100);
                                                    return (
                                                        <div key={category} className="rounded-xl border border-slate-200 p-4">
                                                            <div className="mb-2 flex items-center justify-between">
                                                                <label className="text-sm font-semibold capitalize text-[#1D293D]">
                                                                    {category}
                                                                </label>
                                                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                                    Max {max}
                                                                </span>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                value={value}
                                                                onChange={(e) => handleCategoryCountChange(category, e.target.value)}
                                                                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-[#1D293D] shadow-sm transition-colors.duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                                min="0"
                                                                max={max}
                                                                placeholder="0"
                                                            />
                                                            <div className="mt-3 flex items-center justify-between">
                                                                <span className="text-xs text-slate-500">Available {max}</span>
                                                                <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                                                                    <div className="h-full bg-[#1447E6]" style={{ width: `${percent}%` }}></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </section>

                                <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
                                    <div className="text-sm text-slate-500">
                                        Primary exam:
                                        <span className="ml-2 font-semibold text-[#1447E6]">
                                            {formData.exam_type === 'manual'
                                                ? `${formData.question_ids.length} questions selected`
                                                : `${Object.values(formData.category_counts).reduce((sum, count) => sum + (count || 0), 0)} questions configured`}
                                        </span>
                                        {formData.include_personality_test && (
                                            <span className="ml-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                + Personality
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateForm(false)}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                                            </svg>
                                            Create Exam
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Display Options */}
                    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#1D293D]">Display Options</h3>
                                    <p className="text-sm text-slate-500">Choose how many exams appear per page.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-semibold text-slate-600">Items per page:</label>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
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

                    {/* Existing Exams */}
                    <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-[#1D293D]">Existing Exams</h3>
                                    <p className="text-sm text-slate-500">Manage created exams and review their details.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500">
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                    <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    {safeExams.length} exam{safeExams.length !== 1 ? 's' : ''}
                                </span>
                                <span className="inline-flex items-center gap-2 text-[#1447E6]">
                                    <span className="inline-block h-2 w-2 rounded-full bg-[#1447E6]" />
                                    {safeExams.filter(exam => exam.status === 'active').length} active
                                </span>
                            </div>
                        </div>

                        {safeExams.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-2 xl:grid-cols-3">
                                {safeExams.map((exam, index) => {
                                    const statusClasses = exam.status === 'active'
                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                        : exam.status === 'inactive'
                                            ? 'border-slate-300 bg-slate-100 text-slate-600'
                                            : 'border-[#1447E6]/30 bg-[#1447E6]/10 text-[#1447E6]';

                                    return (
                                        <div key={exam.examId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                                            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-12 w-12.items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6] font-semibold">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-base font-semibold text-[#1D293D]">{exam['exam-ref-no']}</h4>
                                                        <p className="text-xs text-slate-500">Exam #{exam.examId}</p>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses}`}>
                                                    {exam.status}
                                                </span>
                                            </div>

                                            <div className="space-y-4 pt-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-[#1D293D]">{exam.questions?.length || 0} academic questions</p>
                                                        {exam.include_personality_test && (
                                                            <p className="text-xs text-[#1447E6]">{exam.personalityQuestions?.length || 0} personality items</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-[#1D293D]">{exam.time_limit} minutes</p>
                                                        <p className="text-xs text-slate-500">Time limit</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-[#1D293D]">{exam.results?.length || 0} results</p>
                                                        <p className="text-xs text-slate-500">Completed exams</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex flex-wrap gap-3">
                                                <button
                                                    onClick={() => downloadExamPdf(exam.examId, exam['exam-ref-no'])}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-white px-4 py-2 text-sm font-semibold text-[#1447E6] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1447E6]/10"
                                                    title="Download exam PDF"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    PDF
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        router.put(`/guidance/exams/${exam.examId}/toggle-status`, {}, {
                                                            onSuccess: () => window.showAlert('Exam status updated successfully', 'success'),
                                                            onError: () => window.showAlert('Failed to update exam status', 'error')
                                                        });
                                                    }}
                                                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 ${
                                                        exam.status === 'active'
                                                            ? 'border-rose-400/40 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15'
                                                            : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15'
                                                    }`}
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={exam.status === 'active' ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
                                                    </svg>
                                                    {exam.status === 'active' ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                                <div className="flex h-16 w-16.items-center justify-center rounded-full border border-dashed border-slate-300 text-[#1447E6]">
                                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-[#1D293D]">No exams yet</h3>
                                <p className="max-w-md text-sm text-slate-500">Create your first exam to start evaluating applicants. You can switch between manual question selection and smart generation.</p>
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                                    </svg>
                                    Create Exam
                                </button>
                            </div>
                        )}
                    </div>

                {/* Pagination */}
                {(exams?.links || []).length > 0 && (
                    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-medium text-slate-600">
                                Showing <span className="font-semibold text-[#1447E6]">{exams?.from || 0}</span> to{' '}
                                <span className="font-semibold text-[#1447E6]">{exams?.to || 0}</span> of{' '}
                                <span className="font-semibold text-[#1447E6]">{exams?.total || 0}</span> exams
                            </p>
                            <nav className="flex flex-wrap items-center gap-2" aria-label="Pagination">
                                {(exams?.links || []).map((link, index) => (
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
    </Layout>
    );
};

export default ExamManagement; 