import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function ExamDetail({ user, evaluator, exam }) {
    const [title, setTitle] = useState(exam?.exam_title || exam?.title || '');
    const [timeLimit, setTimeLimit] = useState(exam?.time_limit || 60);
    const [status, setStatus] = useState(exam?.status ?? 1);
    const [passingScore, setPassingScore] = useState(exam?.passing_score ?? 10);

    const save = (e) => {
        e.preventDefault();
        router.put(`/evaluator/department-exams/${exam.id}`, { exam_title: title, time_limit: timeLimit, status, passing_score: passingScore }, {
            onSuccess: () => window.showAlert('Exam updated', 'success'),
            onError: () => window.showAlert('Failed to update exam', 'error')
        });
    };

    return (
        <Layout user={user}>
            <div className="max-w-5xl mx-auto p-6 animate-up" style={{ animationDelay: '60ms' }}>
                {/* Modern Header */}
                <div className="rounded-3xl border border-slate-800 bg-[#1D293D] text-white shadow-xl mb-8 animate-up" style={{ animationDelay: '120ms' }}>
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Evaluator · Exam Detail</p>
                                <h1 className="text-2xl font-bold md:text-3xl">Exam Detail</h1>
                                <p className="text-white/70 text-sm mt-1">Ref: {exam.exam_ref_no}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={save} className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 space-y-4 animate-up" style={{ animationDelay: '180ms' }}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
                        <input type="number" min={1} value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value || '0'))} className="w-40 border-slate-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
                        <input type="number" min={1} max={100} value={passingScore} onChange={(e) => setPassingScore(Math.max(1, Math.min(100, parseInt(e.target.value || '0'))))} className="w-40 border-slate-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500" required />
                        <p className="text-xs text-gray-500 mt-1">Minimum percentage required to pass (1–100).</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={status} onChange={(e) => setStatus(parseInt(e.target.value))} className="w-40 border-slate-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500">
                            <option value={1}>Active</option>
                            <option value={0}>Inactive</option>
                        </select>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                        <button type="submit" className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition-colors font-medium">Save</button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}


