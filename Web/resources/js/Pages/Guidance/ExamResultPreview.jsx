import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../../Components/Layout';

// Local chevron icons to avoid external dependency
const ChevronDownIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);
const ChevronUpIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
);

export default function ExamResultPreview({ user, result }) {
    const [personalityInfo, setPersonalityInfo] = useState(null);
    const [isCategoryBreakdownCollapsed, setIsCategoryBreakdownCollapsed] = useState(() => {
        const saved = localStorage.getItem('examResult_categoryBreakdown_collapsed');
        return saved ? JSON.parse(saved) : false;
    });
    const [isRecommendedCoursesCollapsed, setIsRecommendedCoursesCollapsed] = useState(() => {
        const saved = localStorage.getItem('examResult_recommendedCourses_collapsed');
        return saved ? JSON.parse(saved) : false;
    });
    const [profileImageFailed, setProfileImageFailed] = useState(false);

    const examineeName = result?.examinee?.name || 'Unknown Examinee';
    const examineeId = result?.examinee?.id;
    const profileImageUrl = examineeId ? `/guidance/examinee/${examineeId}/profile-image` : null;

    const formatTime = (secs) => {
        if (!secs && secs !== 0) return 'N/A';
        const m = Math.floor(secs / 60);
        const s = String(secs % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    useEffect(() => {
        const loadPersonality = async () => {
            try {
                const type = result?.personality_type;
                if (!type) return;
                const { data } = await axios.get(`/guidance/personality-types/${encodeURIComponent(type)}`);
                setPersonalityInfo(data?.data || null);
            } catch (_) { }
        };
        loadPersonality();
    }, [result?.personality_type]);

    // Save collapse state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('examResult_categoryBreakdown_collapsed', JSON.stringify(isCategoryBreakdownCollapsed));
    }, [isCategoryBreakdownCollapsed]);

    useEffect(() => {
        localStorage.setItem('examResult_recommendedCourses_collapsed', JSON.stringify(isRecommendedCoursesCollapsed));
    }, [isRecommendedCoursesCollapsed]);

    let breakdown = [];
    try {
        if (Array.isArray(result.category_breakdown)) breakdown = result.category_breakdown;
        else if (typeof result.category_breakdown === 'string') breakdown = JSON.parse(result.category_breakdown);
    } catch (_) { }

    // Get personality display name (name if available, otherwise code)
    const personalityDisplayName = personalityInfo?.title || personalityInfo?.type || result.personality_type || '—';

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm overflow-hidden">
                        <div className="px-6 py-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0">
                                        {profileImageUrl && !profileImageFailed ? (
                                            <img
                                                src={profileImageUrl}
                                                alt={examineeName}
                                                className="w-32 h-32 rounded-full object-cover border-2 border-white/70 shadow-md"
                                                onError={() => setProfileImageFailed(true)}
                                            />
                                        ) : (
                                            <div className="w-32 h-32 rounded-full bg-white/10 border-2 border-white/40 flex items-center justify-center shadow-md">
                                                <span className="text-3xl font-semibold text-white">
                                                    {examineeName ? examineeName.charAt(0).toUpperCase() : '?'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-white">Exam Result Preview</h1>
                                        <p className="text-white/90 text-sm mt-1 font-medium">{examineeName}</p>
                                        <p className="text-white/60 text-xs mt-0.5">Exam Ref: {result.exam_ref_no}</p>
                                    </div>
                                </div>
                                <a href="/guidance/exam-results" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/15">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to results
                                </a>
                            </div>
                        </div>

                        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Score</div>
                                <div className="text-lg font-bold text-[#1D293D] mt-2">{result.correct_answers}/{result.total_questions} ({Math.round(result.score)}%)</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Time</div>
                                <div className="text-lg font-bold text-[#1D293D] mt-2">{formatTime(result.time_taken_seconds)}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Semester • Academic Year</div>
                                <div className="text-lg font-bold text-[#1D293D] mt-2">{result.semester || '—'} • {result.school_year || '—'}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-4 shadow-sm">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Personality Type</div>
                                <div className="text-lg font-bold text-[#1D293D] mt-2">
                                    {personalityDisplayName}
                                    {result.personality_type && personalityInfo?.title && (
                                        <span className="text-sm font-normal text-slate-500 ml-2">({result.personality_type})</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {personalityInfo && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-[#1447E6]/10 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-semibold text-[#1D293D]">Personality Details</div>
                                    <div className="text-sm text-slate-500">{personalityInfo.title || personalityInfo.type || result.personality_type}</div>
                                </div>
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-200">
                                {personalityInfo.description || 'No description available.'}
                            </div>
                        </div>
                    )} 

                    {breakdown && breakdown.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                            <div 
                                className="flex items-center justify-between cursor-pointer mb-4 hover:bg-slate-50 -mx-2 px-2 py-2 rounded-lg transition-colors duration-150"
                                onClick={() => setIsCategoryBreakdownCollapsed(!isCategoryBreakdownCollapsed)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#1447E6]/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div className="font-semibold text-[#1D293D]">Category Breakdown</div>
                                </div>
                                {isCategoryBreakdownCollapsed ? (
                                    <ChevronDownIcon className="w-5 h-5 text-slate-500" />
                                ) : (
                                    <ChevronUpIcon className="w-5 h-5 text-slate-500" />
                                )}
                            </div>
                            {!isCategoryBreakdownCollapsed && (
                                <div className="space-y-3">
                                    {breakdown.map((c, idx) => {
                                        const pct = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0;
                                        return (
                                            <div key={`${c.category || 'cat'}-${idx}`}>
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="font-medium text-[#1D293D]">{c.category || 'Uncategorized'}</div>
                                                    <div className="text-slate-600">{c.correct}/{c.total} ({pct}%)</div>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full mt-2">
                                                    <div className="h-2 bg-[#1447E6] rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {(Array.isArray(result.recommended_courses) && result.recommended_courses.length > 0) && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                            <div 
                                className="flex items-center justify-between cursor-pointer mb-4 hover:bg-slate-50 -mx-2 px-2 py-2 rounded-lg transition-colors duration-150"
                                onClick={() => setIsRecommendedCoursesCollapsed(!isRecommendedCoursesCollapsed)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#1447E6]/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <div className="font-semibold text-[#1D293D]">Recommended Courses</div>
                                </div>
                                {isRecommendedCoursesCollapsed ? (
                                    <ChevronDownIcon className="w-5 h-5 text-slate-500" />
                                ) : (
                                    <ChevronUpIcon className="w-5 h-5 text-slate-500" />
                                )}
                            </div>
                            {!isRecommendedCoursesCollapsed && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {result.recommended_courses.map((c, idx) => (
                                        <div key={c.course_id || idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                            <div className="text-sm font-semibold text-[#1D293D]">{c.course_code || ''} {c.course_name || ''}</div>
                                            {c.description && (
                                                <div className="text-xs text-slate-600 mt-1">{c.description}</div>
                                            )}
                                            {typeof c.passing_rate !== 'undefined' && (
                                                <div className="text-[11px] text-slate-500 mt-2">Passing Rate: {c.passing_rate}%</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#1447E6]/10 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="font-semibold text-[#1D293D]">Answers</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {result.answers.map((a, idx) => (
                                <div key={a.question_id || idx} className={`border-2 rounded-xl p-4 ${a.is_correct ? 'border-[#1447E6]/30 bg-[#1447E6]/5' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200">Question {a.no}</div>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${a.is_correct ? 'bg-[#1447E6]' : 'bg-slate-500'}`}>
                                            {a.is_correct ? (
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-[#1D293D] mb-3">{a.question}</div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="bg-white rounded-lg p-2 border border-slate-200">
                                            <div className="text-xs text-slate-500 mb-1">Your Answer</div>
                                            <div className={`font-semibold ${a.is_correct ? 'text-[#1447E6]' : 'text-slate-700'}`}>{a.student_answer || '—'}</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 border border-slate-200">
                                            <div className="text-xs text-slate-500 mb-1">Correct Answer</div>
                                            <div className="font-semibold text-[#1D293D]">{a.correct_answer}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>


                </div>
            </div>
        </Layout>
    );
}


