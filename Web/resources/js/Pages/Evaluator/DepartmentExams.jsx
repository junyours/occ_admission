import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import QRCode from 'qrcode';

export default function DepartmentExams({ user, evaluator, exams, categories = [], questions = [], questionStats = {}, routes }) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        exam_title: '',
        time_limit: 60,
        exam_type: 'manual',
        question_ids: [],
        category_counts: {},
        passing_score: 10
    });
    const [filterCategory, setFilterCategory] = useState('');
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [examSearch, setExamSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [errors, setErrors] = useState({});

    // Group questions by category
    const questionsByCategory = useMemo(() => {
        const grouped = {};
        (questions || []).forEach((q) => {
            if (filterCategory && q.category !== filterCategory) return;
            if (searchText && !(`${q.question}`.toLowerCase().includes(searchText.toLowerCase()))) return;
            if (!grouped[q.category]) grouped[q.category] = [];
            grouped[q.category].push(q);
        });
        return grouped;
    }, [questions, filterCategory, searchText]);

    const questionIdToQuestion = useMemo(() => {
        const map = new Map();
        (questions || []).forEach((q) => {
            map.set(q.questionId, q);
        });
        return map;
    }, [questions]);

    const toggleQuestion = (id) => {
        setFormData((prev) => {
            const exists = prev.question_ids.includes(id);
            const nextIds = exists ? prev.question_ids.filter((x) => x !== id) : [...prev.question_ids, id];
            return { ...prev, question_ids: nextIds };
        });
    };

    const isManual = formData.exam_type === 'manual';
    const isRandom = formData.exam_type === 'random';

    const isFormValid = useMemo(() => {
        const hasTitle = `${formData.exam_title}`.trim().length > 0;
        const validTime = Number(formData.time_limit) >= 1;
        const validPassing = Number(formData.passing_score) >= 1 && Number(formData.passing_score) <= 100;
        const hasQuestions = isManual ? formData.question_ids.length > 0 : Object.values(formData.category_counts || {}).some(v => Number(v) > 0);
        return hasTitle && validTime && validPassing && hasQuestions;
    }, [formData, isManual]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const nextErrors = {};
        if (!`${formData.exam_title}`.trim()) nextErrors.exam_title = 'Title is required';
        if (!(Number(formData.time_limit) >= 1)) nextErrors.time_limit = 'Minimum is 1 minute';
        if (!(Number(formData.passing_score) >= 1 && Number(formData.passing_score) <= 100)) nextErrors.passing_score = 'Enter 1–100';
        if (isManual && formData.question_ids.length === 0) nextErrors.questions = 'Select at least one question';
        if (isRandom && !Object.values(formData.category_counts || {}).some(v => Number(v) > 0)) nextErrors.questions = 'Specify counts per category';
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        console.log('Creating department exam with data:', formData);
        router.post('/evaluator/department-exams', formData, {
            onStart: () => setIsSubmitting(true),
            onSuccess: () => {
                window.showAlert('Department exam created successfully', 'success');
                setShowCreateForm(false);
                setFormData({ exam_title: '', time_limit: 60, exam_type: 'manual', question_ids: [], category_counts: {}, passing_score: 10 });
                setErrors({});
            },
            onError: (errors) => {
                console.error('Create exam errors:', errors);
                window.showAlert('Failed to create exam', 'error');
            },
            onFinish: () => setIsSubmitting(false)
        });
    };

    // Exams filter/search (client-side)
    const filteredExams = useMemo(() => {
        let list = exams || [];
        if (statusFilter !== 'all') {
            const target = statusFilter === 'active' ? 1 : 0;
            list = list.filter((e) => Number(e.status) === target);
        }
        if (examSearch.trim() !== '') {
            const term = examSearch.toLowerCase();
            list = list.filter((e) => `${e.title} ${e.exam_ref_no}`.toLowerCase().includes(term));
        }
        return list;
    }, [exams, statusFilter, examSearch]);

    const selectAllInCategory = (cat) => {
        const ids = (questions || []).filter((q) => q.category === cat).map((q) => q.questionId);
        setFormData((prev) => ({ ...prev, question_ids: Array.from(new Set([ ...prev.question_ids, ...ids ])) }));
    };

    const clearCategorySelection = (cat) => {
        const ids = new Set((questions || []).filter((q) => q.category === cat).map((q) => q.questionId));
        setFormData((prev) => ({ ...prev, question_ids: prev.question_ids.filter((id) => !ids.has(id)) }));
    };

    const copyRef = async (ref) => {
        try {
            await navigator.clipboard.writeText(ref);
            window.showAlert('Reference copied', 'success');
        } catch (e) {
            console.error(e);
            window.showAlert('Copy failed', 'error');
        }
    };

    // Modal state for preview
    const [previewExam, setPreviewExam] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [qrExam, setQrExam] = useState(null); // { exam_ref_no, exam_title }
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [examToDelete, setExamToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [examToEdit, setExamToEdit] = useState(null);
    const [editFormData, setEditFormData] = useState({
        exam_title: '',
        time_limit: 60,
        passing_score: 10
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [editErrors, setEditErrors] = useState({});
    const openPreview = async (id) => {
        try {
            console.log('Loading exam preview for ID:', id);
            const res = await fetch(`/evaluator/department-exams/${id}?as=json`, { headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            console.log('Exam preview data loaded:', data);
            setPreviewExam(data);
            setShowPreview(true);
        } catch (e) {
            console.error('Error loading exam preview:', e);
            window.showAlert('Failed to load exam preview', 'error');
        }
    };

    const downloadQrPng = async (ref, title) => {
        try {
            const canvas = document.querySelector('#qr-canvas');
            if (!canvas) return;
            const link = document.createElement('a');
            link.download = `${ref}-qr.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error(e);
            window.showAlert('Failed to download QR', 'error');
        }
    };

    const openImageModal = (imageData, imageType = 'question') => {
        console.log('Opening image modal:', { imageType, hasData: !!imageData });
        setSelectedImage({ data: imageData, type: imageType });
        setShowImageModal(true);
    };

    const downloadExamPdf = (examId, examTitle) => {
        try {
            console.log('Opening PDF for exam:', examId, examTitle);
            // Use the exact same approach as ExamResults.jsx - direct URL navigation
            window.open(`/evaluator/department-exams/${examId}/pdf`, '_blank');
        } catch (error) {
            console.error('Error opening PDF:', error);
            window.showAlert?.('Failed to open PDF', 'error');
        }
    };

    const openDeleteModal = (exam) => {
        console.log('Opening delete modal for exam:', exam);
        setExamToDelete(exam);
        setShowDeleteModal(true);
    };

    const openEditModal = (exam) => {
        console.log('Opening edit modal for exam:', exam);
        setExamToEdit(exam);
        setEditFormData({
            exam_title: exam.title,
            time_limit: exam.time_limit,
            passing_score: exam.passing_score || 10
        });
        setEditErrors({});
        setShowEditModal(true);
    };

    const handleUpdateExam = () => {
        if (!examToEdit) return;
        
        const nextErrors = {};
        if (!`${editFormData.exam_title}`.trim()) nextErrors.exam_title = 'Title is required';
        if (!(Number(editFormData.time_limit) >= 1)) nextErrors.time_limit = 'Minimum is 1 minute';
        if (!(Number(editFormData.passing_score) >= 1 && Number(editFormData.passing_score) <= 100)) nextErrors.passing_score = 'Enter 1–100';
        setEditErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        
        console.log('Updating exam:', examToEdit.id, editFormData);
        setIsUpdating(true);
        
        router.put(`/evaluator/department-exams/${examToEdit.id}`, editFormData, {
            onSuccess: () => {
                console.log('Exam updated successfully');
                window.showAlert('Exam updated successfully', 'success');
                setShowEditModal(false);
                setExamToEdit(null);
            },
            onError: (errors) => {
                console.error('Update exam errors:', errors);
                window.showAlert('Failed to update exam', 'error');
            },
            onFinish: () => {
                setIsUpdating(false);
            }
        });
    };

    const handleDeleteExam = () => {
        if (!examToDelete) return;
        
        console.log('Deleting exam:', examToDelete);
        setIsDeleting(true);
        
        router.delete(`/evaluator/department-exams/${examToDelete.id}`, {
            onSuccess: () => {
                console.log('Exam deleted successfully');
                window.showAlert('Exam deleted successfully', 'success');
                setShowDeleteModal(false);
                setExamToDelete(null);
            },
            onError: (errors) => {
                console.error('Delete exam errors:', errors);
                window.showAlert('Failed to delete exam', 'error');
            },
            onFinish: () => {
                setIsDeleting(false);
            }
        });
    };

    // Render QR to canvas when modal opens
    useEffect(() => {
        if (!qrExam) return;
        const canvas = document.getElementById('qr-canvas');
        if (!canvas) return;
        const value = qrExam.exam_ref_no;
        (async () => {
            try {
                await QRCode.toCanvas(canvas, value, {
                    width: 256,
                    margin: 2,
                    color: {
                        dark: '#000000ff',
                        light: '#ffffffff'
                    }
                });
            } catch (e) {
                console.error('QR render failed', e);
            }
        })();
    }, [qrExam]);

    // Simple counts for header
    const totalExams = (exams || []).length;
    const activeExams = (exams || []).filter(e => Number(e.status) === 1).length;

    return (
        <>
            <Head title="Department Exams" />
            
            <Layout user={user} routes={routes}>
                <div className="max-w-7xl mx-auto animate-up" style={{ animationDelay: '60ms' }}>
                    {/* Header */}
                    <div className="rounded-3xl border border-slate-800 bg-[#1D293D] text-white shadow-xl mb-8 animate-up" style={{ animationDelay: '120ms' }}>
                        <div className="p-8">
                            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                                            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Evaluator · Department Exams</p>
                                            <h1 className="text-3xl font-bold md:text-4xl">Department Exams</h1>
                                        </div>
                                    </div>
                                    <p className="text-white/80 text-base md:text-lg max-w-3xl">
                                        Manage personalized exams for {evaluator?.Department || 'your department'}. Create, configure, and monitor department-specific assessments with a consistent workflow.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-center">
                                        <p className="text-xs uppercase tracking-[0.25em] text-white/60">Total Exams</p>
                                        <p className="text-3xl font-semibold">{totalExams}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-center">
                                        <p className="text-xs uppercase tracking-[0.25em] text-white/60">Active Exams</p>
                                        <p className="text-3xl font-semibold">{activeExams}</p>
                                    </div>
                                    <button
                                        onClick={() => setShowCreateForm(!showCreateForm)}
                                        className={`group relative overflow-hidden font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center space-x-3 shadow-lg ${
                                            showCreateForm
                                                ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                                                : 'bg-white text-[#1D293D] hover:bg-slate-50 hover:shadow-xl'
                                        }`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCreateForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
                                        </svg>
                                        <span className="relative z-10">{showCreateForm ? 'Close Form' : 'Create New Exam'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8 animate-up" style={{ animationDelay: '180ms' }}>
                        {[
                            {
                                label: 'Total Exams',
                                value: exams?.length || 0,
                                helper: 'Created in department',
                                icon: (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                ),
                            },
                            {
                                label: 'Total Questions',
                                value: exams?.reduce((sum, exam) => sum + exam.total_questions, 0) || 0,
                                helper: 'Across all exams',
                                icon: (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                ),
                            },
                            {
                                label: 'Total Students',
                                value: exams?.reduce((sum, exam) => sum + exam.total_students, 0) || 0,
                                helper: 'Enrolled in exams',
                                icon: (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                ),
                            },
                            {
                                label: 'Department',
                                value: evaluator?.Department || 'N/A',
                                helper: 'Current department',
                                icon: (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                ),
                            },
                            {
                                label: 'Question Bank',
                                value: questionStats?.total || 0,
                                helper: `${questionStats?.active || 0} active · ${questionStats?.archived || 0} archived`,
                                icon: (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                ),
                            },
                        ].map((card, idx) => (
                            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
                                <div className="flex items-start justify-between mb-5">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
                                        <p className={`${idx === 3 ? 'text-2xl' : 'text-3xl'} font-semibold text-slate-900 mt-2 truncate`}>
                                            {card.value}
                                        </p>
                                    </div>
                                    <div className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {card.icon}
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">{card.helper}</p>
                            </div>
                        ))}
                    </div>

                    {/* Create Exam Form */}
                    {showCreateForm && (
                        <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100 mb-8 transform transition-all duration-500 animate-up" style={{ animationDelay: '220ms' }}>
                            <div className="p-8 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl border border-white/20 bg-[#1D293D] text-white flex items-center justify-center shadow-lg">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Create New Exam</h3>
                                        <p className="text-gray-600">Configure basic settings, then select questions or generate randomly from your question bank.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Basic Settings */}
                                <div className="bg-gray-50 rounded-2xl p-6">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Basic Settings
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">Exam Title</label>
                                            <input
                                                aria-invalid={!!errors.exam_title}
                                                value={formData.exam_title}
                                                onChange={(e) => setFormData({ ...formData, exam_title: e.target.value })}
                                                className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-[#1447E6]/15 transition-all duration-300 ${
                                                    errors.exam_title 
                                                        ? 'border-red-300 focus:border-red-500' 
                                                        : 'border-gray-200 focus:border-[#1447E6]'
                                                }`}
                                                placeholder="e.g., BSIT Midterm 2025"
                                            />
                                            {errors.exam_title && (
                                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-sm text-red-600 flex items-center">
                                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        {errors.exam_title}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">Time Limit (minutes)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                aria-invalid={!!errors.time_limit}
                                                value={formData.time_limit}
                                                onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value || '0') })}
                                                className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-[#1447E6]/15 transition-all duration-300 ${
                                                    errors.time_limit 
                                                        ? 'border-red-300 focus:border-red-500' 
                                                        : 'border-gray-200 focus:border-[#1447E6]'
                                                }`}
                                            />
                                            {errors.time_limit && (
                                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-sm text-red-600 flex items-center">
                                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        {errors.time_limit}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">Passing Score (%)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                aria-invalid={!!errors.passing_score}
                                                value={formData.passing_score}
                                                onChange={(e) => setFormData({ ...formData, passing_score: Math.max(1, Math.min(100, parseInt(e.target.value || '0'))) })}
                                                className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-[#1447E6]/15 transition-all duration-300 ${
                                                    errors.passing_score 
                                                        ? 'border-red-300 focus:border-red-500' 
                                                        : 'border-gray-200 focus:border-[#1447E6]'
                                                }`}
                                            />
                                            <p className="text-xs text-gray-500 mt-2">Minimum percentage required to pass (1–100).</p>
                                            {errors.passing_score && (
                                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-sm text-red-600 flex items-center">
                                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        {errors.passing_score}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Exam Type Selection */}
                                <div className="bg-gray-50 rounded-2xl p-6">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Exam Type
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${
                                            formData.exam_type === 'manual' 
                                                ? 'border-[#1447E6] bg-[#1447E6]/5' 
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                value="manual" 
                                                checked={formData.exam_type === 'manual'} 
                                                onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })} 
                                                className="sr-only" 
                                            />
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                    formData.exam_type === 'manual' 
                                                        ? 'border-[#1447E6] bg-[#1447E6]' 
                                                        : 'border-slate-300'
                                                }`}>
                                                    {formData.exam_type === 'manual' && (
                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold text-gray-900">Manual Selection</h5>
                                                    <p className="text-sm text-gray-500">Choose specific questions from your question bank</p>
                                                </div>
                                            </div>
                                        </label>
                                        
                                        <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${
                                            formData.exam_type === 'random' 
                                                ? 'border-[#1447E6] bg-[#1447E6]/5' 
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                value="random" 
                                                checked={formData.exam_type === 'random'} 
                                                onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })} 
                                                className="sr-only" 
                                            />
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                    formData.exam_type === 'random' 
                                                        ? 'border-[#1447E6] bg-[#1447E6]' 
                                                        : 'border-slate-300'
                                                }`}>
                                                    {formData.exam_type === 'random' && (
                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold text-gray-900">Random Generation</h5>
                                                    <p className="text-sm text-gray-500">Automatically generate from categories</p>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Random configuration */}
                                {formData.exam_type === 'random' && (
                                    <div className="mt-2">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Questions per Category</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {categories?.map((c) => (
                                                <div key={c} className="flex items-center gap-2">
                                                    <label className="w-40 text-sm text-gray-700">{c}</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={formData.category_counts[c] || 0}
                                                        onChange={(e) => setFormData({ ...formData, category_counts: { ...formData.category_counts, [c]: parseInt(e.target.value || '0') } })}
                                                        className="w-24 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                    <span className="text-xs text-gray-500">max { (questions || []).filter(q => q.category === c).length }</span>
                                                </div>
                                            ))}
                                        </div>
                                        {errors.questions && <p className="text-xs text-red-600 mt-2">{errors.questions}</p>}
                                    </div>
                                )}

                                {/* Question selection - Manual */}
                                {formData.exam_type === 'manual' && (
                                    <div className="mt-2">
                                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-3">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-sm text-gray-700">Selected: <span className="font-semibold text-blue-600">{formData.question_ids.length}</span></span>
                                                {formData.question_ids.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {formData.question_ids.slice(0, 6).map((id) => (
                                                            <span key={id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                                #{id}
                                                                <button type="button" onClick={() => toggleQuestion(id)} className="text-blue-700 hover:text-blue-900" aria-label="Remove">×</button>
                                                            </span>
                                                        ))}
                                                        {formData.question_ids.length > 6 && (
                                                            <span className="text-xs text-gray-500">+{formData.question_ids.length - 6} more</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border-gray-300 rounded-md text-sm">
                                                    <option value="">All categories</option>
                                                    {categories?.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search question text" className="border-gray-300 rounded-md text-sm w-56" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 rounded-lg bg-white ring-1 ring-gray-200">
                                            {/* Left: Category lists */}
                                            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                                                {Object.entries(questionsByCategory).map(([cat, list]) => (
                                                    <div key={cat} className="rounded-lg ring-1 ring-gray-200">
                                                        <div className="px-3 py-2 bg-gray-50 border-b text-sm font-medium text-gray-700 flex items-center justify-between">
                                                            <span>{cat}</span>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <button type="button" className="text-blue-600 hover:underline" onClick={() => selectAllInCategory(cat)}>Select all</button>
                                                                <button type="button" className="text-gray-600 hover:underline" onClick={() => clearCategorySelection(cat)}>Clear</button>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                                                            {list.map((q) => (
                                                                <label key={q.questionId} className="flex items-start gap-2 text-sm">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.question_ids.includes(q.questionId)}
                                                                        onChange={() => toggleQuestion(q.questionId)}
                                                                        className="mt-1"
                                                                    />
                                                                    <span className="text-gray-800">
                                                                        {q.question?.length > 120 ? `${q.question.slice(0, 120)}...` : q.question}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                                {Object.keys(questionsByCategory).length === 0 && (
                                                    <div className="text-center text-sm text-gray-500 py-6">No questions match the current filters.</div>
                                                )}
                                            </div>

                                            {/* Right: Selected summary */}
                                            <div className="rounded-lg ring-1 ring-gray-200 bg-gray-50 p-3 max-h-[420px] overflow-y-auto">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="text-sm font-semibold text-gray-800">Selected ({formData.question_ids.length})</h5>
                                                    {formData.question_ids.length > 0 && (
                                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, question_ids: [] }))} className="text-xs text-gray-600 hover:text-gray-800 underline">Clear all</button>
                                                    )}
                                                </div>
                                                {formData.question_ids.length === 0 ? (
                                                    <p className="text-xs text-gray-500">No questions selected yet. Choose from the list to the left.</p>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {formData.question_ids.map((id) => {
                                                            const q = questionIdToQuestion.get(id);
                                                            return (
                                                                <li key={id} className="bg-white rounded border border-gray-200 p-2 text-sm flex items-start justify-between gap-2">
                                                                    <span className="text-gray-800 min-w-0">{q?.question?.length > 100 ? `${q.question.slice(0, 100)}...` : (q?.question || `#${id}`)}</span>
                                                                    <button type="button" onClick={() => toggleQuestion(id)} className="text-blue-600 hover:text-blue-800 text-xs shrink-0">Remove</button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                        {errors.questions && <p className="text-xs text-red-600 mt-2">{errors.questions}</p>}
                                    </div>
                                )}

                                {/* Form Actions */}
                                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowCreateForm(false)} 
                                        className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={!isFormValid || isSubmitting} 
                                        className={`group relative overflow-hidden px-8 py-3 text-white rounded-xl font-semibold transition-all duration-300 ${
                                            (!isFormValid || isSubmitting) 
                                                ? 'bg-gray-300 cursor-not-allowed' 
                                                : 'bg-[#1447E6] hover:bg-[#0f2fa4] shadow-lg hover:shadow-xl'
                                        }`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        {isSubmitting ? (
                                            <div className="flex items-center justify-center relative z-10">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creating Exam...
                                            </div>
                                        ) : (
                                            <span className="relative z-10 flex items-center justify-center">
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Create Exam
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </form>
                            </div>
                        </div>
                    )}

                    {/* Search and Filter Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6 animate-up" style={{ animationDelay: '260ms' }}>
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Existing Exams</h3>
                                    <p className="text-gray-600">Manage and monitor your department exams</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900">{(exams||[]).length} Total</p>
                                    <p className="text-xs text-gray-500">{(exams||[]).filter(e => Number(e.status) === 1).length} Active</p>
                                </div>
                            </div>
                            
                            {/* Search and Filter Controls */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={examSearch}
                                            onChange={(e) => setExamSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1447E6] focus:ring-4 focus:ring-[#1447E6]/15 transition-all duration-300"
                                            placeholder="Search exams by title or reference number..."
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <select 
                                        value={statusFilter} 
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1447E6] focus:ring-4 focus:ring-[#1447E6]/15 transition-all duration-300"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active Only</option>
                                        <option value="inactive">Inactive Only</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 animate-up" style={{ animationDelay: '300ms' }}>
                        <div className="p-6 animate-up" style={{ animationDelay: '340ms' }}>
                            
                            {filteredExams && filteredExams.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredExams.map((exam) => (
                                        <div key={exam.id} className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            
                                            {/* Header */}
                                            <div className="relative p-6 border-b border-gray-100">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="text-lg font-bold text-gray-900 truncate">{exam.title}</h4>
                                                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                                                Number(exam.status) === 1 
                                                                    ? 'bg-emerald-100 text-emerald-700' 
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {Number(exam.status) === 1 ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">{exam.exam_ref_no}</span>
                                                            <button 
                                                                onClick={() => copyRef(exam.exam_ref_no)} 
                                                                title="Copy reference" 
                                                                className="text-xs text-violet-600 hover:text-violet-800 hover:underline transition-colors"
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-gray-500">Created {exam.created_at} • by {exam.evaluator_name}</p>
                                                    </div>
                                                    {/* Edit Button - Top Right */}
                                                    <button
                                                        onClick={() => openEditModal(exam)}
                                                        className="flex-shrink-0 w-10 h-10 bg-amber-100 hover:bg-amber-200 text-amber-600 hover:text-amber-700 rounded-xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                                                        title="Edit Exam Settings"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="relative p-6">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                                                        <div className="text-2xl font-bold text-blue-600">{exam.total_questions}</div>
                                                        <div className="text-xs text-blue-600 font-medium">Questions</div>
                                                    </div>
                                                    <div className="text-center p-3 bg-emerald-50 rounded-xl">
                                                        <div className="text-2xl font-bold text-emerald-600">{exam.total_students}</div>
                                                        <div className="text-xs text-emerald-600 font-medium">Students</div>
                                                    </div>
                                                    <div className="text-center p-3 bg-amber-50 rounded-xl">
                                                        <div className="text-2xl font-bold text-amber-600">{exam.time_limit}</div>
                                                        <div className="text-xs text-amber-600 font-medium">Minutes</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="relative p-6 pt-0">
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    <button
                                                        onClick={() => openPreview(exam.id)}
                                                        className="inline-flex items-center justify-center px-3 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
                                                        title="View Exam Details"
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => downloadExamPdf(exam.id, exam.title)}
                                                        className="inline-flex items-center justify-center px-3 py-2 text-sm font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all duration-300 transform hover:scale-105"
                                                        title="Download Exam as PDF"
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        PDF
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(exam)}
                                                        className="inline-flex items-center justify-center px-3 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
                                                        title="Delete Exam Permanently"
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Delete
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <button
                                                        onClick={() => setQrExam({ exam_ref_no: exam.exam_ref_no, exam_title: exam.title })}
                                                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-300 transform hover:scale-105"
                                                        title="Show QR Code"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setTogglingId(exam.id);
                                                            router.put(`/evaluator/department-exams/${exam.id}`, { status: Number(exam.status) === 1 ? 0 : 1 }, {
                                                                onStart: () => setTogglingId(exam.id),
                                                                onSuccess: () => window.showAlert('Exam status updated', 'success'),
                                                                onError: () => window.showAlert('Failed to update exam status', 'error'),
                                                                onFinish: () => setTogglingId(null)
                                                            });
                                                        }}
                                                        className={`flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                                                            Number(exam.status) === 1 
                                                                ? 'border-red-300 text-red-700 hover:bg-red-50' 
                                                                : 'border-green-300 text-green-700 hover:bg-green-50'
                                                        } disabled:opacity-60`}
                                                        disabled={togglingId === exam.id}
                                                    >
                                                        {togglingId === exam.id ? (
                                                            <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={Number(exam.status) === 1 ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                                            </svg>
                                                        )}
                                                        {togglingId === exam.id ? 'Updating...' : (Number(exam.status) === 1 ? 'Deactivate' : 'Activate')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="mt-2 text-gray-600">No exams found. Create your first exam to get started.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modern Preview Modal */}
                {showPreview && previewExam && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-up" style={{ animationDelay: '380ms' }}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300">
                            {/* Modal Header - Blue Background like PDF */}
                            <div className="p-6 border-b border-blue-100 bg-blue-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-2">{previewExam.exam_title}</h2>
                                        <div className="flex items-center gap-4 text-sm text-white/90">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                </svg>
                                                Ref: {previewExam.exam_ref_no}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {previewExam.time_limit} minutes
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowPreview(false)} 
                                        className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                {previewExam.questions && previewExam.questions.length > 0 ? (
                                    <div className="space-y-6">
                                        {previewExam.questions.map((q, idx) => (
                                            <div key={q.questionId} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                                <div className="flex items-start gap-3 mb-4">
                                                    <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-base font-medium text-gray-900 mb-2">
                                                            {q.question}
                                                    </h3>
                                                        {/* Question Image */}
                                                        {q.has_image && q.image && (
                                                            <div className="mb-3">
                                                                <div className="relative inline-block">
                                                                    <img 
                                                                        src={q.image} 
                                                                        alt="Question Image" 
                                                                        className="max-w-full h-auto max-h-48 rounded border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
                                                                        onClick={() => openImageModal(q.image, 'Question Image')}
                                                                    />
                                                                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                                                        Click to enlarge
                                                </div>
                                                    </div>
                                                    </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* 2-Column Options Layout like PDF */}
                                                <div className="grid grid-cols-2 gap-2 ml-10">
                                                    <div className={`relative flex items-start p-3 rounded border ${q.correct_answer === 'A' ? 'bg-green-50 border-green-500 border-2 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                                        {q.correct_answer === 'A' && (
                                                            <span className="absolute top-2 right-2 text-green-600 font-bold text-sm">✓</span>
                                                        )}
                                                        <span className={`text-sm font-bold mr-2 ${q.correct_answer === 'A' ? 'text-green-600' : 'text-gray-600'}`}>A.</span>
                                                        <div className="flex-1">
                                                            <span className={`text-sm ${q.correct_answer === 'A' ? 'text-green-800 font-semibold' : 'text-gray-700'}`}>{q.option1}</span>
                                                            {q.has_option_images?.option1 && q.option1_image && (
                                                                <div className="mt-2">
                                                                    <img 
                                                                        src={q.option1_image} 
                                                                        alt="Option A Image" 
                                                                        className="max-w-full h-auto max-h-32 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                                        onClick={() => openImageModal(q.option1_image, 'Option A Image')}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`relative flex items-start p-3 rounded border ${q.correct_answer === 'B' ? 'bg-green-50 border-green-500 border-2 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                                        {q.correct_answer === 'B' && (
                                                            <span className="absolute top-2 right-2 text-green-600 font-bold text-sm">✓</span>
                                                        )}
                                                        <span className={`text-sm font-bold mr-2 ${q.correct_answer === 'B' ? 'text-green-600' : 'text-gray-600'}`}>B.</span>
                                                        <div className="flex-1">
                                                            <span className={`text-sm ${q.correct_answer === 'B' ? 'text-green-800 font-semibold' : 'text-gray-700'}`}>{q.option2}</span>
                                                            {q.has_option_images?.option2 && q.option2_image && (
                                                                <div className="mt-2">
                                                                    <img 
                                                                        src={q.option2_image} 
                                                                        alt="Option B Image" 
                                                                        className="max-w-full h-auto max-h-32 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                                        onClick={() => openImageModal(q.option2_image, 'Option B Image')}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`relative flex items-start p-3 rounded border ${q.correct_answer === 'C' ? 'bg-green-50 border-green-500 border-2 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                                        {q.correct_answer === 'C' && (
                                                            <span className="absolute top-2 right-2 text-green-600 font-bold text-sm">✓</span>
                                                        )}
                                                        <span className={`text-sm font-bold mr-2 ${q.correct_answer === 'C' ? 'text-green-600' : 'text-gray-600'}`}>C.</span>
                                                        <div className="flex-1">
                                                            <span className={`text-sm ${q.correct_answer === 'C' ? 'text-green-800 font-semibold' : 'text-gray-700'}`}>{q.option3}</span>
                                                            {q.has_option_images?.option3 && q.option3_image && (
                                                                <div className="mt-2">
                                                                    <img 
                                                                        src={q.option3_image} 
                                                                        alt="Option C Image" 
                                                                        className="max-w-full h-auto max-h-32 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                                        onClick={() => openImageModal(q.option3_image, 'Option C Image')}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`relative flex items-start p-3 rounded border ${q.correct_answer === 'D' ? 'bg-green-50 border-green-500 border-2 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                                        {q.correct_answer === 'D' && (
                                                            <span className="absolute top-2 right-2 text-green-600 font-bold text-sm">✓</span>
                                                        )}
                                                        <span className={`text-sm font-bold mr-2 ${q.correct_answer === 'D' ? 'text-green-600' : 'text-gray-600'}`}>D.</span>
                                                        <div className="flex-1">
                                                            <span className={`text-sm ${q.correct_answer === 'D' ? 'text-green-800 font-semibold' : 'text-gray-700'}`}>{q.option4}</span>
                                                            {q.has_option_images?.option4 && q.option4_image && (
                                                                <div className="mt-2">
                                                                    <img 
                                                                        src={q.option4_image} 
                                                                        alt="Option D Image" 
                                                                        className="max-w-full h-auto max-h-32 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                                        onClick={() => openImageModal(q.option4_image, 'Option D Image')}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {q.option5 && (
                                                        <div className={`relative flex items-start p-3 rounded border ${q.correct_answer === 'E' ? 'bg-green-50 border-green-500 border-2 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                                            {q.correct_answer === 'E' && (
                                                                <span className="absolute top-2 right-2 text-green-600 font-bold text-sm">✓</span>
                                                            )}
                                                            <span className={`text-sm font-bold mr-2 ${q.correct_answer === 'E' ? 'text-green-600' : 'text-gray-600'}`}>E.</span>
                                                            <div className="flex-1">
                                                                <span className={`text-sm ${q.correct_answer === 'E' ? 'text-green-800 font-semibold' : 'text-gray-700'}`}>{q.option5}</span>
                                                                {q.has_option_images?.option5 && q.option5_image && (
                                                                    <div className="mt-2">
                                                                        <img 
                                                                            src={q.option5_image} 
                                                                            alt="Option E Image" 
                                                                            className="max-w-full h-auto max-h-32 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                                            onClick={() => openImageModal(q.option5_image, 'Option E Image')}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500">No questions linked to this exam.</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => setShowPreview(false)} 
                                        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                                    >
                                        Close Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modern QR Modal */}
                {qrExam && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-up" style={{ animationDelay: '420ms' }}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-2">Exam QR Code</h2>
                                        <div className="text-sm text-gray-600">
                                            <p className="font-medium">{qrExam.exam_title}</p>
                                            <p className="text-xs">Ref: {qrExam.exam_ref_no}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setQrExam(null)} 
                                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="p-6">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="p-4 bg-white rounded-2xl shadow-lg border-2 border-gray-100">
                                        <canvas id="qr-canvas" className="rounded-lg"></canvas>
                                    </div>
                                    
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600 mb-2">Scan with iAdmit mobile app to load this exam</p>
                                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            Mobile QR Scanner
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 w-full">
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(qrExam.exam_ref_no).then(() => window.showAlert('Reference copied', 'success')).catch(() => window.showAlert('Copy failed', 'error'))} 
                                            className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-all duration-300"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy Reference
                                        </button>
                                        <button 
                                            onClick={() => downloadQrPng(qrExam.exam_ref_no, qrExam.exam_title)} 
                                            className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download PNG
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => setQrExam(null)} 
                                        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Modal */}
                {showImageModal && selectedImage && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-up" style={{ animationDelay: '460ms' }}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-2">Image Preview</h2>
                                        <p className="text-sm text-gray-600">{selectedImage.type}</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowImageModal(false)} 
                                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="p-6 flex items-center justify-center bg-gray-50">
                                <div className="max-w-full max-h-[60vh] overflow-auto">
                                    <img 
                                        src={selectedImage.data} 
                                        alt={selectedImage.type}
                                        className="max-w-full h-auto rounded-lg shadow-lg"
                                    />
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => setShowImageModal(false)} 
                                        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Exam Modal */}
                {showEditModal && examToEdit && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-up" style={{ animationDelay: '500ms' }}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 mb-1">Edit Exam Settings</h2>
                                            <p className="text-sm text-gray-600">Update exam title, time limit, and passing score</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowEditModal(false)} 
                                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="p-6">
                                <div className="space-y-6">
                                    {/* Exam Reference - Read Only */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <div className="flex items-center gap-3">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-semibold text-blue-900">Exam Reference: {examToEdit.exam_ref_no}</p>
                                                <p className="text-xs text-blue-700">This cannot be changed</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Exam Title */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Exam Title</label>
                                        <input
                                            type="text"
                                            value={editFormData.exam_title}
                                            onChange={(e) => setEditFormData({ ...editFormData, exam_title: e.target.value })}
                                            className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-100 transition-all duration-300 ${
                                                editErrors.exam_title 
                                                    ? 'border-red-300 focus:border-red-500' 
                                                    : 'border-gray-200 focus:border-amber-500'
                                            }`}
                                            placeholder="e.g., BSIT Midterm 2025"
                                        />
                                        {editErrors.exam_title && (
                                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-sm text-red-600 flex items-center">
                                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    {editErrors.exam_title}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Time Limit and Passing Score */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">Time Limit (minutes)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={editFormData.time_limit}
                                                onChange={(e) => setEditFormData({ ...editFormData, time_limit: parseInt(e.target.value || '0') })}
                                                className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-100 transition-all duration-300 ${
                                                    editErrors.time_limit 
                                                        ? 'border-red-300 focus:border-red-500' 
                                                        : 'border-gray-200 focus:border-amber-500'
                                                }`}
                                            />
                                            {editErrors.time_limit && (
                                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-sm text-red-600 flex items-center">
                                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        {editErrors.time_limit}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">Passing Score (%)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={editFormData.passing_score}
                                                onChange={(e) => setEditFormData({ ...editFormData, passing_score: Math.max(1, Math.min(100, parseInt(e.target.value || '0'))) })}
                                                className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-100 transition-all duration-300 ${
                                                    editErrors.passing_score 
                                                        ? 'border-red-300 focus:border-red-500' 
                                                        : 'border-gray-200 focus:border-amber-500'
                                                }`}
                                            />
                                            <p className="text-xs text-gray-500 mt-2">Minimum percentage required to pass (1–100).</p>
                                            {editErrors.passing_score && (
                                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-sm text-red-600 flex items-center">
                                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        {editErrors.passing_score}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Info Note */}
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <h5 className="font-semibold text-yellow-800 mb-1">Note</h5>
                                                <p className="text-sm text-yellow-700">
                                                    Changes will apply immediately. Questions cannot be modified here - use the question bank to manage exam questions.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => setShowEditModal(false)} 
                                        className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold"
                                        disabled={isUpdating}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleUpdateExam}
                                        disabled={isUpdating}
                                        className="group relative overflow-hidden px-6 py-3 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        {isUpdating ? (
                                            <div className="flex items-center justify-center relative z-10">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Updating...
                                            </div>
                                        ) : (
                                            <span className="relative z-10 flex items-center justify-center">
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Update Exam
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && examToDelete && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-up" style={{ animationDelay: '500ms' }}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-rose-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 mb-1">Delete Exam</h2>
                                            <p className="text-sm text-gray-600">This action cannot be undone</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowDeleteModal(false)} 
                                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="p-6">
                                <div className="mb-6">
                                    <p className="text-gray-700 mb-4">
                                        Are you sure you want to permanently delete this exam? This will remove:
                                    </p>
                                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{examToDelete.title}</h4>
                                                <p className="text-sm text-gray-600">Ref: {examToDelete.exam_ref_no}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                                            <div className="text-center">
                                                <span className="font-semibold text-blue-600">{examToDelete.total_questions}</span>
                                                <p>Questions</p>
                                            </div>
                                            <div className="text-center">
                                                <span className="font-semibold text-emerald-600">{examToDelete.total_students}</span>
                                                <p>Students</p>
                                            </div>
                                            <div className="text-center">
                                                <span className="font-semibold text-amber-600">{examToDelete.time_limit}</span>
                                                <p>Minutes</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                            <div>
                                                <h5 className="font-semibold text-red-800 mb-1">Warning</h5>
                                                <p className="text-sm text-red-700">
                                                    This will permanently delete the exam and all associated data. Students who have taken this exam will lose their results.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => setShowDeleteModal(false)} 
                                        className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold"
                                        disabled={isDeleting}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleDeleteExam}
                                        disabled={isDeleting}
                                        className="group relative overflow-hidden px-6 py-3 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        {isDeleting ? (
                                            <div className="flex items-center justify-center relative z-10">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Deleting...
                                            </div>
                                        ) : (
                                            <span className="relative z-10 flex items-center justify-center">
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Delete Permanently
                                            </span>
                                        )}
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
