import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import ChartCard from '../../Components/ChartCard';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export default function QuestionAnalysis({ user }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [filters, setFilters] = useState({
        exam_id: '',
        date_from: '',
        date_to: '',
        time_threshold: 60
    });
    const fetchDebounceRef = useRef(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch data from API
    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.exam_id) params.append('exam_id', filters.exam_id);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (filters.time_threshold) params.append('time_threshold', filters.time_threshold);

            const response = await fetch(`/evaluator/question-analysis?${params.toString()}`);
            const result = await response.json();
            
            if (result.success) {
                console.log('Question Analysis Data:', result.data);
                console.log('Available Exams:', result.data.available_exams);
                console.log('Available Exams Length:', result.data.available_exams?.length);
                console.log('Available Exams Type:', typeof result.data.available_exams);
                console.log('Question Stats:', result.data.question_stats);
                console.log('Question Stats Length:', result.data.question_stats?.length);
                setData(result.data);
            } else {
                console.error('Error fetching data:', result.message);
            }
        } catch (error) {
            console.error('Error fetching question analysis data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => { fetchData(); }, []);

    // Explicit refresh when user clicks Search
    useEffect(() => {
        if (refreshKey === 0) return; // skip first render
        fetchData();
    }, [refreshKey]);

    // Chart data preparation
    const chartData = useMemo(() => {
        if (!data) return null;

        const { question_stats, overall_stats, daily_trends } = data;

        // Question Difficulty Bar Chart (Top 10 slowest questions)
        const topSlowQuestions = question_stats.slice(0, 10);
        const questionDifficultyData = {
            labels: topSlowQuestions.map(q => `Q${q.questionId}`),
            datasets: [{
                label: 'Average Time (seconds)',
                data: topSlowQuestions.map(q => Math.round(q.avg_time_seconds)),
                backgroundColor: topSlowQuestions.map((q, index) => {
                    const colors = [
                        'rgba(239, 68, 68, 0.8)',   // Red for very slow
                        'rgba(245, 158, 11, 0.8)',  // Amber for slow
                        'rgba(34, 197, 94, 0.8)',   // Green for moderate
                        'rgba(59, 130, 246, 0.8)',  // Blue for fast
                    ];
                    return q.avg_time_seconds > 120 ? colors[0] : 
                           q.avg_time_seconds > 90 ? colors[1] : 
                           q.avg_time_seconds > 60 ? colors[2] : colors[3];
                }),
                borderColor: topSlowQuestions.map((q, index) => {
                    const colors = [
                        'rgba(239, 68, 68, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(34, 197, 94, 1)',
                        'rgba(59, 130, 246, 1)',
                    ];
                    return q.avg_time_seconds > 120 ? colors[0] : 
                           q.avg_time_seconds > 90 ? colors[1] : 
                           q.avg_time_seconds > 60 ? colors[2] : colors[3];
                }),
                borderWidth: 2
            }]
        };

        // Slow Questions Distribution (Doughnut Chart)
        const slowQuestions = question_stats.filter(q => q.slow_percentage > 0);
        const slowQuestionsData = {
            labels: ['Questions > 1min', 'Questions ≤ 1min'],
            datasets: [{
                data: [
                    slowQuestions.length,
                    question_stats.length - slowQuestions.length
                ],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(34, 197, 94, 1)'
                ],
                borderWidth: 2
            }]
        };

        // Exam Trends (Line Chart) - Trends across all exams in the selected window
        // Show trends by individual examinee attempts
        const examTrendsData = (() => {
            if (!daily_trends || daily_trends.length === 0) {
                return {
                    labels: [],
                    datasets: []
                };
            }

            // Use daily_trends data which now represents individual examinee attempts
            return {
                labels: daily_trends.map(d => d.examinee_name || `Examinee ${d.examineeId}`),
                datasets: [{
                    label: 'Average Time (seconds)',
                    data: daily_trends.map(d => Math.round(d.avg_time)),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Slow Answers Count',
                    data: daily_trends.map(d => d.slow_answers),
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            };
        })();

        return {
            questionDifficulty: questionDifficultyData,
            slowQuestions: slowQuestionsData,
            examTrends: examTrendsData
        };
    }, [data]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Question Difficulty Analysis'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Time (seconds)'
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Count'
                },
                grid: {
                    drawOnChartArea: false,
                },
            }
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleResetFilters = () => {
        setFilters({
            exam_id: '',
            date_from: '',
            date_to: '',
            time_threshold: 60
        });
    };

    if (loading) {
        return (
            <Layout user={user} routes={[]}>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading question analysis...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <>
            <Head title="Question Difficulty Analysis" />
            
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
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Evaluator · Question Analysis</p>
                                            <h1 className="text-3xl font-bold md:text-4xl">
                                                Question Difficulty Analysis
                                            </h1>
                                        </div>
                                    </div>
                                    <p className="text-white/80 text-base md:text-lg max-w-2xl">
                                        Analyze which questions take too long to answer and identify areas for improvement in exam design.
                                    </p>
                                    {data?.overall_stats && (
                                        <div className="flex items-center gap-6">
                                            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                                <p className="text-xs uppercase tracking-[0.25em] text-white/60">Questions</p>
                                                <p className="text-3xl font-semibold">{data.overall_stats.total_questions}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                                <p className="text-xs uppercase tracking-[0.25em] text-white/60">Examinees</p>
                                                <p className="text-3xl font-semibold">{data.overall_stats.total_examinees}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                                                <p className="text-xs uppercase tracking-[0.25em] text-white/60">Avg Time</p>
                                                <p className="text-3xl font-semibold">{Math.round(data.overall_stats.overall_avg_time)}s</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-8">
                        <div className="p-6 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.5a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Filters</h2>
                                    <p className="text-gray-600">Filter analysis by exam, date range, and time threshold</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                {/* Exam Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Exam</label>
                                    <select
                                        value={filters.exam_id}
                                        onChange={(e) => handleFilterChange('exam_id', e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setRefreshKey(k => k + 1); } }}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300"
                                    >
                                        <option value="">All Exams</option>
                                        {data?.available_exams && data.available_exams.length > 0 ? (
                                            data.available_exams.map((exam) => (
                                                <option key={exam.examId} value={exam.examId}>
                                                    {exam.exam_title}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="" disabled>No exams available</option>
                                        )}
                                    </select>
                                </div>
                                
                                {/* Date From */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Date From</label>
                                    <input
                                        type="date"
                                        value={filters.date_from}
                                        onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setRefreshKey(k => k + 1); } }}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300"
                                    />
                                </div>
                                
                                {/* Date To */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Date To</label>
                                    <input
                                        type="date"
                                        value={filters.date_to}
                                        onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setRefreshKey(k => k + 1); } }}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300"
                                    />
                                </div>
                                
                                {/* Time Threshold */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Time Threshold (seconds)</label>
                                    <input
                                        type="number"
                                        value={filters.time_threshold}
                                        onChange={(e) => handleFilterChange('time_threshold', parseInt(e.target.value) || 60)}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-300"
                                        min="1"
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setRefreshKey(k => k + 1); } }}
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setRefreshKey(k => k + 1)}
                                    className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all duration-300 font-semibold"
                                >
                                    Search
                                </button>
                                <button
                                    onClick={handleResetFilters}
                                    className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-300 font-semibold"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    {chartData && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Question Difficulty Chart */}
                            <ChartCard title="Question Difficulty" subtitle="Top 10 slowest questions">
                                <div style={{ height: '400px' }}>
                                    <Bar data={chartData.questionDifficulty} options={chartOptions} />
                                </div>
                            </ChartCard>

                            {/* Slow Questions Distribution */}
                            <ChartCard title="Slow Questions Distribution" subtitle="Questions exceeding time threshold">
                                <div style={{ height: '400px' }}>
                                    <Doughnut data={chartData.slowQuestions} options={{ ...chartOptions, scales: {} }} />
                                </div>
                            </ChartCard>
                        </div>
                    )}

                    {/* Exam Trends Chart */}
                    {chartData && (
                        <div className="mb-8">
                            <ChartCard title="Examinee Performance Trends" subtitle="Average time and slow answers for each examinee">
                                {chartData.examTrends.labels.length > 0 ? (
                                    <div style={{ height: '400px' }}>
                                        <Line data={chartData.examTrends} options={chartOptions} />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-96 text-gray-500">
                                        <div className="text-center">
                                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            <h3 className="text-lg font-semibold mb-2">No Exam Data Available</h3>
                                            <p className="text-sm">No question timing data found for the selected filters.</p>
                                            <p className="text-xs mt-2">Try adjusting your date range or exam selection.</p>
                                        </div>
                                    </div>
                                )}
                            </ChartCard>
                        </div>
                    )}

                    {/* Question Details Table */}
                    {data?.question_stats && (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Question Analysis Details</h3>
                                        <p className="text-gray-600">Detailed breakdown of question timing statistics</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slow %</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {data.question_stats.map((question, index) => {
                                            const isSlow = question.avg_time_seconds > filters.time_threshold;
                                            const isVerySlow = question.avg_time_seconds > (filters.time_threshold * 1.5);
                                            
                                            return (
                                                <tr key={`${question.questionId}-${index}`} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            Q{question.questionId}
                                                        </div>
                                                        <div className="text-xs text-gray-500 max-w-xs truncate">
                                                            {question.question}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                            {question.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {Math.round(question.avg_time_seconds)}s
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {question.total_attempts}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {question.slow_percentage}%
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            isVerySlow 
                                                                ? 'bg-red-100 text-red-800' 
                                                                : isSlow 
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {isVerySlow ? 'Very Slow' : isSlow ? 'Slow' : 'Normal'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </Layout>
        </>
    );
}
