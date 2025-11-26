import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const CourseManagement = ({ user, courses }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [isTableMinimized, setIsTableMinimized] = useState(false);
    const [formData, setFormData] = useState({
        course_code: '',
        course_name: '',
        description: '',
        passing_rate: ''
    });
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [showPreferenceSaved, setShowPreferenceSaved] = useState(false);

    // Load table minimization state from localStorage on component mount
    useEffect(() => {
        const savedTableState = localStorage.getItem('courseManagement_tableMinimized');
        if (savedTableState !== null) {
            setIsTableMinimized(JSON.parse(savedTableState));
        }
    }, []);

    // Save table minimization state to localStorage whenever it changes
    const handleTableMinimizationToggle = () => {
        const newState = !isTableMinimized;
        setIsTableMinimized(newState);
        localStorage.setItem('courseManagement_tableMinimized', JSON.stringify(newState));
        
        // Show brief "saved" notification
        setShowPreferenceSaved(true);
        setTimeout(() => setShowPreferenceSaved(false), 2000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // Create the course using Inertia router
            router.post('/guidance/courses', formData, {
                onSuccess: () => {
                    // If course creation is successful and there's a description, store it
                    if (formData.description && formData.description.trim()) {
                        fetch('/guidance/course-descriptions/store', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                            },
                            body: JSON.stringify({
                                course_name: formData.course_name,
                                description: formData.description,
                                is_manual: true
                            })
                        });
                    }

                    setShowCreateModal(false);
                    setFormData({
                        course_code: '',
                        course_name: '',
                        description: '',
                        passing_rate: ''
                    });
                    window.showAlert('Course created successfully', 'success');
                },
                onError: (errors) => {
                    console.error('Error creating course:', errors);
                    window.showAlert('Failed to create course', 'error');
                }
            });
        } catch (error) {
            console.error('Error creating course:', error);
            window.showAlert('Failed to create course', 'error');
        }
    };

    const handleEdit = (course) => {
        setEditingCourse(course);
        setFormData({
            course_code: course.course_code,
            course_name: course.course_name,
            description: course.description || '',
            passing_rate: course.passing_rate || 80
        });
    };

    const handleUpdate = async (courseId) => {
        try {
            // Update the course using Inertia router
            router.put(`/guidance/courses/${courseId}`, formData, {
                onSuccess: () => {
                    // If course update is successful and there's a description, store it
                    if (formData.description && formData.description.trim()) {
                        fetch('/guidance/course-descriptions/store', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                            },
                            body: JSON.stringify({
                                course_name: formData.course_name,
                                description: formData.description,
                                is_manual: true
                            })
                        });
                    }

                    setEditingCourse(null);
                    setFormData({
                        course_code: '',
                        course_name: '',
                        description: '',
                        passing_rate: 80
                    });
                    window.showAlert('Course updated successfully', 'success');
                },
                onError: (errors) => {
                    console.error('Error updating course:', errors);
                    window.showAlert('Failed to update course', 'error');
                }
            });
        } catch (error) {
            console.error('Error updating course:', error);
            window.showAlert('Failed to update course', 'error');
        }
    };

    const handleDelete = (courseId) => {
        if (confirm('Are you sure you want to delete this course?')) {
            router.delete(`/guidance/courses/${courseId}`, {
                onSuccess: () => {
                    window.showAlert('Course deleted successfully', 'success');
                },
                onError: (errors) => {
                    window.showAlert('Failed to delete course', 'error');
                }
            });
        }
    };

    const getPassingRateColor = (rate) => {
        if (rate >= 85) return 'bg-green-100 text-green-800';
        if (rate >= 75) return 'bg-blue-100 text-blue-800';
        if (rate >= 65) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    const openCreateModal = () => {
        setFormData({
            course_code: '',
            course_name: '',
            description: '',
            passing_rate: ''
        });
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setFormData({
            course_code: '',
            course_name: '',
            description: '',
            passing_rate: ''
        });
    };

    const generateDescription = async () => {
        if (!formData.course_name.trim()) {
            window.showAlert('Please enter a course name first', 'error');
            return;
        }

        setIsGeneratingDescription(true);
        try {
            const response = await fetch('/guidance/course-descriptions/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({
                    course_name: formData.course_name
                })
            });

            const data = await response.json();
            
            if (data.success) {
                setFormData(prev => ({
                    ...prev,
                    description: data.description
                }));
                
                window.showAlert('New description generated! Click again for more variations.', 'success');
            } else {
                window.showAlert('Failed to generate description', 'error');
            }
        } catch (error) {
            console.error('Error generating description:', error);
            window.showAlert('Error generating description', 'error');
        } finally {
            setIsGeneratingDescription(false);
        }
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
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Course Management</h1>
                                        <p className="mt-2 text-sm text-white/80">
                                            Manage the courses available for student recommendations and admissions review.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={openCreateModal}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/20"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                                    </svg>
                                    Add Course
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Courses</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">{courses.length}</p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">In catalog</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">High Standards</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">
                                        {courses.filter(c => c.passing_rate >= 85).length}
                                    </p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">≥85% passing rate</p>
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
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">With Descriptions</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">
                                        {courses.filter(c => c.description && c.description.trim()).length}
                                    </p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">Ready for AI</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Average Passing Rate</p>
                                    <p className="mt-3 text-3xl font-semibold text-[#1D293D]">
                                        {courses.length
                                            ? Math.round(courses.reduce((acc, c) => acc + (c.passing_rate || 80), 0) / courses.length)
                                            : 0}%
                                    </p>
                                    <p className="mt-2 text-xs font-medium text-[#1447E6]">All courses combined</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-[#1D293D]">Course Actions</h2>
                                <p className="text-sm text-slate-500">Manage your catalog and table preferences.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={openCreateModal}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                                    </svg>
                                    Add Course
                                </button>
                                <button
                                    onClick={handleTableMinimizationToggle}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#1447E6] hover:text-[#1447E6]"
                                    title="Toggle table view (preference will be saved)"
                                >
                                    {isTableMinimized ? (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                    )}
                                    {isTableMinimized ? 'Expand Table' : 'Minimize Table'}
                                    {showPreferenceSaved && (
                                        <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {showPreferenceSaved && (
                        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-600 shadow-sm">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Table view preference saved.
                        </div>
                    )}

                    {/* Table */}
                    {!isTableMinimized && (
                        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-6 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-[#1D293D]">Available Courses</h2>
                                        <p className="text-sm text-slate-500">Full catalog with descriptions and passing rates.</p>
                                    </div>
                                </div>
                                {courses.length > 0 && (
                                    <span className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6]/30 bg-[#1447E6]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                        {courses.length} Total
                                    </span>
                                )}
                            </div>

                            {courses.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 w-16">#</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Course Code</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Course Name</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Description</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Passing Rate</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Created</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {courses.map((course, index) => (
                                                <tr key={course.id} className="transition-colors duration-150 hover:bg-[#1447E6]/5">
                                                    <td className="px-6 py-4 text-sm font-semibold text-[#1D293D]">{index + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                            {course.course_code}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-[#1D293D]">{course.course_name}</td>
                                                    <td className="px-6 py-4">
                                                        <p className="max-w-xs truncate text-sm text-slate-600" title={course.description || 'No description'}>
                                                            {course.description || <span className="text-slate-400 italic">No description</span>}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getPassingRateColor(course.passing_rate || 80)}`}>
                                                            {course.passing_rate || 80}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {new Date(course.created_at).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleEdit(course)}
                                                                className="inline-flex items-center gap-2 rounded-lg border border-[#1447E6]/30 bg-[#1447E6]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6] transition-colors duration-200 hover:bg-[#1447E6]/15"
                                                            >
                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(course.id)}
                                                                className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 transition-colors duration-200 hover:bg-rose-500/15"
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
                            ) : (
                                <div className="px-8 py-16 text-center">
                                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#1447E6]/10 text-[#1447E6]">
                                        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-[#1D293D]">No Courses Available</h3>
                                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                        Get started by creating your first course to populate the recommendation catalog.
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500 text-white">
                                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" />
                                                </svg>
                                            </div>
                                            <h4 className="mb-2 text-sm font-semibold text-emerald-700">AI-Powered Descriptions</h4>
                                            <p className="text-xs text-emerald-700/80">Generate intelligent course descriptions automatically.</p>
                                        </div>
                                        
                                        <div className="rounded-2xl border border-[#1447E6]/30 bg-[#1447E6]/10 p-4">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#1447E6] text-white">
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            </div>
                                            <h4 className="mb-2 text-sm font-semibold text-[#1447E6]">Smart Recommendations</h4>
                                            <p className="text-xs text-[#1447E6]/80">Help students find the perfect course match.</p>
                                        </div>
                                        
                                        <div className="rounded-2xl border border-[#1447E6]/30 bg-[#1447E6]/10 p-4">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#1447E6] text-white">
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h4 className="mb-2 text-sm font-semibold text-[#1447E6]">Flexible Standards</h4>
                                            <p className="text-xs text-[#1447E6]/80">Set custom passing rates for each course.</p>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={openCreateModal}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Create First Course
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Minimized Table View */}
                    {isTableMinimized && courses.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 px-6 py-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-[#1D293D]">Course Summary</h2>
                                            <p className="text-sm text-slate-500">Compact view of all courses.</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setIsTableMinimized(false)}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#1447E6] hover:text-[#1447E6]"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        Expand to see full details
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {courses.map((course) => (
                                        <div key={course.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                                            <div className="mb-4 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                        {course.course_code}
                                                    </span>
                                                    <span className={`inline-flex rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getPassingRateColor(course.passing_rate || 80)}`}>
                                                        {course.passing_rate || 80}%
                                                    </span>
                                                </div>
                                            </div>
                                            <h4 className="mb-3 text-lg font-semibold text-[#1D293D]">{course.course_name}</h4>
                                            <p className="mb-5 line-clamp-3 text-sm text-slate-600 leading-relaxed">
                                                {course.description || <span className="text-slate-400 italic">No description available</span>}
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(course)}
                                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#1447E6]/30 bg-[#1447E6]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6] transition-colors duration-200 hover:bg-[#1447E6]/15"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(course.id)}
                                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 transition-colors duration-200 hover:bg-rose-500/15"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
            </div>

            {/* Create Course Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-[#1D293D] px-8 py-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Add New Course</h2>
                                        <p className="text-sm text-white/70">Create a new course for student recommendations.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeCreateModal}
                                    className="p-2 rounded-lg text-white/70 transition-colors hover:bg-white/10"
                                >
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3">
                                Course Code *
                            </label>
                            <input
                                type="text"
                                value={formData.course_code}
                                onChange={(e) => setFormData({...formData, course_code: e.target.value})}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                placeholder="e.g., BSIT"
                                required
                            />
                        </div>
                        <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3">
                                Course Name *
                            </label>
                            <input
                                type="text"
                                value={formData.course_name}
                                onChange={(e) => setFormData({...formData, course_name: e.target.value})}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                placeholder="e.g., Bachelor of Science in Information Technology"
                                required
                            />
                        </div>
                    </div>
                            
                    <div>
                        <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-bold text-gray-700">
                                Description
                            </label>
                            <div className="flex items-center gap-2">
                                {!formData.course_name.trim() && (
                                    <span className="text-xs text-gray-400 italic">Enter course name to enable AI generation</span>
                                )}
                                {formData.course_name.trim() && (
                                            <button
                                                type="button"
                                        onClick={generateDescription}
                                        disabled={isGeneratingDescription}
                                                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 transition-colors duration-200 hover:bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Generate AI-powered course description"
                                    >
                                        {isGeneratingDescription ? (
                                            <>
                                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                        <span className="text-xs font-semibold uppercase tracking-[0.18em]">Generating…</span>
                                            </>
                                        ) : (
                                            <>
                                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" />
                                                </svg>
                                                        <span className="text-xs font-semibold uppercase tracking-[0.18em]">AI Generate</span>
                                            </>
                                        )}
                                            </button>
                                )}
                            </div>
                        </div>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                            rows="4"
                            placeholder="Describe the course content, career opportunities, and key features..."
                        />
                        <div className="mt-3 flex items-start gap-3 rounded-lg border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-3">
                            <svg className="h-5 w-5 flex-shrink-0 text-[#1447E6]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" />
                            </svg>
                            <p className="text-sm text-[#1447E6]">
                                Detailed descriptions help the AI recommendation system provide better matches. Use AI Generate to draft content quickly.
                            </p>
                        </div>
                    </div>
                            
                    <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">
                            Passing Rate (%) *
                        </label>
                        <input
                            type="number"
                            value={formData.passing_rate}
                            onChange={(e) => setFormData({...formData, passing_rate: parseInt(e.target.value)})}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                            min="10"
                            max="100"
                            required
                        />
                        <p className="text-sm text-gray-500 mt-2">Passing rate range: 10% - 100%</p>
                    </div>
                            
                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
                                <button
                                    type="button"
                            onClick={closeCreateModal}
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
                            Add Course
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {editingCourse && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-[#1D293D] px-8 py-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Edit Course: {editingCourse.course_code}</h2>
                                        <p className="text-sm text-white/70">Update course information and settings.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                    setEditingCourse(null);
                    setFormData({
                        course_code: '',
                        course_name: '',
                        description: '',
                        passing_rate: ''
                    });
                }}
                                    className="p-2 rounded-lg text-white/70 transition-colors hover:bg-white/10"
                                >
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <form onSubmit={(e) => { e.preventDefault(); handleUpdate(editingCourse.id); }} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3">
                                Course Code *
                            </label>
                            <input
                                type="text"
                                value={formData.course_code}
                                onChange={(e) => setFormData({...formData, course_code: e.target.value})}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                required
                            />
                        </div>
                        <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3">
                                Course Name *
                            </label>
                            <input
                                type="text"
                                value={formData.course_name}
                                onChange={(e) => setFormData({...formData, course_name: e.target.value})}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                required
                            />
                        </div>
                    </div>
                            
                    <div>
                        <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-bold text-gray-700">
                                Description
                            </label>
                            <div className="flex items-center gap-2">
                                {!formData.course_name.trim() && (
                                    <span className="text-xs text-gray-400 italic">Enter course name to enable AI generation</span>
                                )}
                                {formData.course_name.trim() && (
                                            <button
                                                type="button"
                                        onClick={generateDescription}
                                        disabled={isGeneratingDescription}
                                                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 transition-colors duration-200 hover:bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Generate AI-powered course description"
                                    >
                                        {isGeneratingDescription ? (
                                            <>
                                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Generating…</span>
                                            </>
                                        ) : (
                                            <>
                                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" />
                                                </svg>
                                                <span className="text-xs font-semibold uppercase tracking-[0.18em]">AI Generate</span>
                                            </>
                                        )}
                                            </button>
                                )}
                            </div>
                        </div>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                            rows="4"
                        />
                        <div className="mt-3 flex items-start gap-3 rounded-lg border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-3">
                            <svg className="h-5 w-5 flex-shrink-0 text-[#1447E6]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" />
                            </svg>
                            <p className="text-sm text-[#1447E6]">
                                Click AI Generate to produce suggestions based on the course name for better recommendations.
                            </p>
                        </div>
                    </div>
                            
                    <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">
                            Passing Rate (%) *
                        </label>
                        <input
                            type="number"
                            value={formData.passing_rate}
                            onChange={(e) => setFormData({...formData, passing_rate: parseInt(e.target.value)})}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                            min="10"
                            max="100"
                            required
                        />
                        <p className="text-sm text-gray-500 mt-2">Passing rate range: 10% - 100%</p>
                    </div>
                            
                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
                                <button
                                    type="button"
                            onClick={() => {
                                setEditingCourse(null);
                                setFormData({
                                    course_code: '',
                                    course_name: '',
                                    description: '',
                                    passing_rate: ''
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
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Update Course
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </Layout>
    );
};

export default CourseManagement; 