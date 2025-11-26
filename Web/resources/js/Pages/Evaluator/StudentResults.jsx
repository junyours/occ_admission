import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function StudentResults({ user, evaluator, recommendations, stats, personalityDistribution, filters }) {
    const [searchTerm, setSearchTerm] = useState(filters?.student_name || '');
    const [courseFilter, setCourseFilter] = useState(filters?.course || '');
    const [personalityFilter, setPersonalityFilter] = useState(filters?.personality_type || '');

    // Add safety checks for null/undefined data
    const safeRecommendations = recommendations || { data: [], links: [] };
    const safeStats = stats || {};
    const safePersonalityDistribution = personalityDistribution || [];

    const handleSearch = () => {
        router.get('/evaluator/student-results', {
            student_name: searchTerm,
            course: courseFilter,
            personality_type: personalityFilter
        }, {
            preserveState: true,
            replace: true
        });
    };

    const handleExport = () => {
        const params = new URLSearchParams({
            student_name: searchTerm,
            course: courseFilter,
            personality_type: personalityFilter
        });
        window.open(`/evaluator/student-results/export?${params.toString()}`, '_blank');
    };

    const handleVerify = async (id) => {
        try {
            const response = await fetch(`/evaluator/student-results/${id}/verify`);
            const result = await response.json();
            alert(`Verification Result:\nStudent: ${result.student_name}\nCourse: ${result.recommended_course}\nAcademic Passed: ${result.academic_passed ? 'Yes' : 'No'}\nPersonality Suitable: ${result.personality_suitable ? 'Yes' : 'No'}\nOverall Eligible: ${result.overall_eligible ? 'Yes' : 'No'}`);
        } catch (error) {
            console.error('Error verifying student:', error);
            alert('Error verifying student eligibility');
        }
    };

    return (
        <>
                         <Head title={`${evaluator?.Department || 'Department'} - Passed Students`} />
            
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
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Evaluator · Passed Students</p>
                                            <h1 className="text-3xl font-bold md:text-4xl">
                                                Passed Students
                                            </h1>
                                        </div>
                                    </div>
                                    <p className="text-white/80 text-base md:text-lg max-w-2xl">
                                        View students who passed the academic exam and were recommended for {evaluator?.Department || 'your department'}. Track student performance and course recommendations.
                                    </p>
                                    <div className="flex items-center gap-6">
                                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Total Students</p>
                                            <p className="text-3xl font-semibold">{safeStats.total_recommendations || 0}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Department</p>
                                            <p className="text-3xl font-semibold">{safeStats.department_recommendations || 0}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Average</p>
                                            <p className="text-3xl font-semibold">{safeStats.average_academic_score || 0}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modern Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {/* Total Passed Students Card */}
                        <div className="group relative bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                            <div className="relative p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-600 mb-1">Total Passed Students</p>
                                        <p className="text-3xl font-bold text-gray-900">{safeStats.total_recommendations || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">All successful candidates</p>
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Department Students Card */}
                        <div className="group relative bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                            <div className="relative p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-600 mb-1">{evaluator?.Department || 'Department'} Students</p>
                                        <p className="text-3xl font-bold text-emerald-600">{safeStats.department_recommendations || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">Recommended for department</p>
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
                                        <p className="text-3xl font-bold text-gray-900">{safeStats.average_academic_score || 0}%</p>
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
                    </div>

                    {/* Modern Filters Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-8">
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
                                        <p className="text-gray-600">Filter and search passed students by various criteria</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {safeRecommendations.data?.length || 0} students
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                {/* Student Name Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Student Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300"
                                            placeholder="Search by student name..."
                                        />
                                    </div>
                                </div>
                                
                                {/* Course Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Course</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={courseFilter}
                                            onChange={(e) => setCourseFilter(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300"
                                            placeholder={`Filter by ${evaluator?.Department || 'department'} course...`}
                                        />
                                    </div>
                                </div>
                                
                                {/* Personality Type Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Personality Type</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={personalityFilter}
                                            onChange={(e) => setPersonalityFilter(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300"
                                            placeholder="Filter by personality type..."
                                        />
                                    </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-end gap-3">
                                    <button
                                        onClick={handleSearch}
                                        className="flex-1 bg-slate-700 text-white px-4 py-3 rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all duration-300 font-semibold transform hover:scale-105"
                                    >
                                        Search
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setCourseFilter('');
                                            setPersonalityFilter('');
                                            router.get('/evaluator/student-results', {}, {
                                                preserveState: true,
                                                replace: true
                                            });
                                        }}
                                        className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-300 font-semibold transform hover:scale-105"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modern Results Table */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="p-6 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Passed Students</h3>
                                    <p className="text-gray-600">Students who passed and were recommended for {evaluator?.Department || 'your department'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            {safeRecommendations.data && safeRecommendations.data.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        Student Name
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        Exam Reference
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                        </svg>
                                                        Recommended Course
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                        </svg>
                                                        Score
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Correct Answers
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Date & Time
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {safeRecommendations.data.map((r) => (
                                                <tr key={r.id} className="hover:bg-gray-50 transition-colors duration-200">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center">
                                                                <span className="text-slate-700 font-semibold text-sm">
                                                                    {r.name?.charAt(0)?.toUpperCase() || 'S'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-semibold text-gray-900">{r.name}</div>
                                                                {r.semester && (
                                                                    <div className="text-xs text-gray-500">Semester {r.semester}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                            {r.exam_ref_no}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-wrap gap-2">
                                                            {r.recommended_course && r.recommended_course !== 'N/A' ? (
                                                                r.recommended_course.split(', ').map((course, index) => {
                                                                    const colors = [
                                                                        'bg-slate-100 text-slate-700 border-slate-200',
                                                                        'bg-emerald-50 text-emerald-700 border-emerald-200',
                                                                        'bg-slate-100 text-slate-700 border-slate-200',
                                                                        'bg-slate-100 text-slate-700 border-slate-200',
                                                                        'bg-slate-100 text-slate-700 border-slate-200',
                                                                        'bg-slate-100 text-slate-700 border-slate-200'
                                                                    ];
                                                                    const colorClass = colors[index % colors.length];
                                                                    
                                                                    return (
                                                                        <span
                                                                            key={index}
                                                                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}
                                                                        >
                                                                            {course.trim()}
                                                                        </span>
                                                                    );
                                                                })
                                                            ) : (
                                                                <span className="text-sm text-gray-500">No courses</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-bold text-[#10B981]">{r.score}%</div>
                                                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-gradient-to-r from-[#10B981] to-[#059669] rounded-full"
                                                                    style={{ width: `${Math.min(100, Math.max(0, r.score || 0))}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
                                                                <svg className="w-4 h-4 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </div>
                                                            <span className="text-sm font-semibold text-gray-900">{r.correct}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{r.date}</div>
                                                        <div className="text-xs text-gray-500">{r.time}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Passed Students Found</h3>
                                    <p className="text-gray-600 mb-6">No passed students found for {evaluator?.Department || 'your department'}.</p>
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setCourseFilter('');
                                            setPersonalityFilter('');
                                            router.get('/evaluator/student-results', {}, {
                                                preserveState: true,
                                                replace: true
                                            });
                                        }}
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
                            {safeRecommendations.links && (
                                <div className="mt-8 pt-6 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Showing <span className="text-[#1447E6]">{safeRecommendations.from || 0}</span> to <span className="text-[#1447E6]">{safeRecommendations.to || 0}</span> of{' '}
                                                    <span className="text-[#1447E6]">{safeRecommendations.total || 0}</span> students
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            {safeRecommendations.links.map((link, index) => (
                                                link.url ? (
                                                    <Link
                                                        key={index}
                                                        href={link.url}
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
                                                        className="px-4 py-2 text-sm font-semibold rounded-xl opacity-50 cursor-not-allowed bg-white text-gray-700 border-2 border-slate-200"
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                )
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Personality Distribution Section */}
                    {safePersonalityDistribution && safePersonalityDistribution.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mt-8">
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                        <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personality Distribution</h2>
                                        <p className="text-gray-600">Distribution of personality types among passed students</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {safePersonalityDistribution.map((personality, index) => {
                                        const bgColors = [
                                            'bg-slate-50',
                                            'bg-slate-50',
                                            'bg-slate-50',
                                            'bg-slate-50',
                                            'bg-slate-50',
                                            'bg-slate-50'
                                        ];
                                        const borderColors = [
                                            'border-slate-200',
                                            'border-slate-200',
                                            'border-slate-200',
                                            'border-slate-200',
                                            'border-slate-200',
                                            'border-slate-200'
                                        ];
                                        const textColors = [
                                            'text-slate-700',
                                            'text-slate-700',
                                            'text-slate-700',
                                            'text-slate-700',
                                            'text-slate-700',
                                            'text-slate-700'
                                        ];
                                        
                                        const colorIndex = index % bgColors.length;
                                        
                                        return (
                                            <div key={personality.type || index} className={`group relative ${bgColors[colorIndex]} rounded-2xl p-6 border ${borderColors[colorIndex]} overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-xl`}>
                                                <div className="relative z-10">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        </div>
                                                        <div className={`text-2xl font-bold ${textColors[colorIndex]}`}>
                                                            {personality.count || 0}
                                                        </div>
                                                    </div>
                                                    <h3 className={`text-lg font-semibold ${textColors[colorIndex]} mb-2`}>
                                                        {personality.type || 'Unknown Type'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mb-4">
                                                        {personality.percentage || 0}% of total students
                                                    </p>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className="h-2 bg-slate-600 rounded-full transition-all duration-500"
                                                            style={{ width: `${personality.percentage || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Layout>
        </>
    );
}
