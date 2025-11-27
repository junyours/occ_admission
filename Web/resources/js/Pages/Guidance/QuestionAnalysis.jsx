import React, { useState, useEffect, useMemo } from 'react';
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
    
    // Load saved filters from localStorage
    const loadSavedFilters = () => {
        try {
            const saved = localStorage.getItem('questionAnalysisFilters');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    exam_id: parsed.exam_id || '',
                    date_from: parsed.date_from || '',
                    date_to: parsed.date_to || '',
                    time_threshold: parsed.time_threshold || 60
                };
            }
        } catch (error) {
            console.error('Error loading saved filters:', error);
        }
        return {
            exam_id: '',
            date_from: '',
            date_to: '',
            time_threshold: 60
        };
    };

    // Load saved client-side filters from localStorage
    const loadSavedClientFilters = () => {
        try {
            const saved = localStorage.getItem('questionAnalysisFilters');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    category: parsed.category || '',
                    wrong_percentage_min: parsed.wrong_percentage_min || '',
                    wrong_percentage_max: parsed.wrong_percentage_max || '',
                    status: parsed.status || '',
                    search_query: parsed.search_query || '',
                    difficulty: parsed.difficulty || ''
                };
            }
        } catch (error) {
            console.error('Error loading saved client filters:', error);
        }
        return {
            category: '',
            wrong_percentage_min: '',
            wrong_percentage_max: '',
            status: '',
            search_query: '',
            difficulty: ''
        };
    };

    // Load saved itemsPerPage from localStorage
    const loadSavedItemsPerPage = () => {
        try {
            const saved = localStorage.getItem('questionAnalysisItemsPerPage');
            if (saved) {
                const parsed = parseInt(saved, 10);
                return isNaN(parsed) ? 20 : parsed;
            }
        } catch (error) {
            console.error('Error loading saved itemsPerPage:', error);
        }
        return 20;
    };

    const [filters, setFilters] = useState(loadSavedFilters);
    // Separate client-side filters that don't trigger API calls (live search)
    const [clientFilters, setClientFilters] = useState(loadSavedClientFilters);
    const [itemsPerPage, setItemsPerPage] = useState(loadSavedItemsPerPage);
    const [currentPage, setCurrentPage] = useState(1);
    const [tableLoading, setTableLoading] = useState(false);

    // Fetch data from API (only for server-side filters)
    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.exam_id) params.append('exam_id', filters.exam_id);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (filters.time_threshold) params.append('time_threshold', filters.time_threshold);

            const response = await fetch(`/guidance/question-analysis?${params.toString()}`);
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
            setTableLoading(false);
        }
    };

    // Save server-side filters to localStorage whenever they change
    useEffect(() => {
        try {
            const serverFilters = {
                exam_id: filters.exam_id,
                date_from: filters.date_from,
                date_to: filters.date_to,
                time_threshold: filters.time_threshold
            };
            localStorage.setItem('questionAnalysisFilters', JSON.stringify({ ...serverFilters, ...clientFilters }));
        } catch (error) {
            console.error('Error saving filters to localStorage:', error);
        }
    }, [filters, clientFilters]);

    // Save client-side filters to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('questionAnalysisFilters', JSON.stringify({ ...filters, ...clientFilters }));
        } catch (error) {
            console.error('Error saving client filters to localStorage:', error);
        }
    }, [clientFilters]);

    // Save itemsPerPage to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('questionAnalysisItemsPerPage', itemsPerPage.toString());
        } catch (error) {
            console.error('Error saving itemsPerPage to localStorage:', error);
        }
    }, [itemsPerPage]);

    // Only fetch data when server-side filters change (not client-side filters)
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.exam_id, filters.date_from, filters.date_to, filters.time_threshold]);

    useEffect(() => {
        if (!data) return;
        const timeout = setTimeout(() => setTableLoading(false), 300);
        return () => clearTimeout(timeout);
    }, [itemsPerPage, data]);

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

        // Wrong Answers Chart (Top questions with most wrong answers)
        const wrongAnswersStats = question_stats
            .map(q => ({
                ...q,
                wrong_attempts: q.wrong_attempts || 0,
                wrong_percentage: q.wrong_percentage || 0
            }))
            .sort((a, b) => (b.wrong_percentage || 0) - (a.wrong_percentage || 0))
            .slice(0, 10);

        const wrongAnswersData = {
            labels: wrongAnswersStats.map(q => `Q${q.questionId}`),
            datasets: [{
                label: 'Wrong Answer Percentage (%)',
                data: wrongAnswersStats.map(q => parseFloat(q.wrong_percentage || 0).toFixed(1)),
                backgroundColor: wrongAnswersStats.map((q) => {
                    const wrongPct = parseFloat(q.wrong_percentage || 0);
                    return wrongPct > 70 ? 'rgba(239, 68, 68, 0.8)' : 
                           wrongPct > 50 ? 'rgba(245, 158, 11, 0.8)' : 
                           wrongPct > 30 ? 'rgba(251, 191, 36, 0.8)' : 
                           'rgba(156, 163, 175, 0.8)';
                }),
                borderColor: wrongAnswersStats.map((q) => {
                    const wrongPct = parseFloat(q.wrong_percentage || 0);
                    return wrongPct > 70 ? 'rgba(239, 68, 68, 1)' : 
                           wrongPct > 50 ? 'rgba(245, 158, 11, 1)' : 
                           wrongPct > 30 ? 'rgba(251, 191, 36, 1)' : 
                           'rgba(156, 163, 175, 1)';
                }),
                borderWidth: 2
            }]
        };

        // Wrong Answers Distribution (Doughnut Chart)
        const highWrongQuestions = question_stats.filter(q => parseFloat(q.wrong_percentage || 0) > 50);
        const wrongAnswersDistributionData = {
            labels: ['High Wrong Rate (>50%)', 'Low Wrong Rate (≤50%)'],
            datasets: [{
                data: [
                    highWrongQuestions.length,
                    question_stats.length - highWrongQuestions.length
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

        // Score Distribution (Question Difficulty Distribution)
        // Multi-Tier Classification System for detailed question analysis
        // Categories: Extreme Hard, Hard, Moderate, Easy, Super Easy
        const scoreDistribution = (() => {
            // Calculate correct percentage from wrong percentage
            const extremeHard = question_stats.filter(q => {
                const correctPct = 100 - parseFloat(q.wrong_percentage || 0);
                return correctPct < 30; // <30% correct (>70% wrong) - Needs rewriting
            });
            
            const hard = question_stats.filter(q => {
                const correctPct = 100 - parseFloat(q.wrong_percentage || 0);
                return correctPct >= 30 && correctPct < 50; // 30-50% correct (50-70% wrong) - Needs review
            });
            
            const moderate = question_stats.filter(q => {
                const correctPct = 100 - parseFloat(q.wrong_percentage || 0);
                return correctPct >= 50 && correctPct < 70; // 50-70% correct (30-50% wrong) - Acceptable
            });
            
            const easy = question_stats.filter(q => {
                const correctPct = 100 - parseFloat(q.wrong_percentage || 0);
                return correctPct >= 70 && correctPct < 85; // 70-85% correct (15-30% wrong) - Good
            });
            
            const superEasy = question_stats.filter(q => {
                const correctPct = 100 - parseFloat(q.wrong_percentage || 0);
                return correctPct >= 85; // >85% correct (<15% wrong) - May be too easy
            });

            const totalQuestions = question_stats.length;
            
            return {
                labels: [
                    'Extreme Hard (<30% correct)',
                    'Hard (30-50% correct)',
                    'Moderate (50-70% correct)',
                    'Easy (70-85% correct)',
                    'Super Easy (>85% correct)'
                ],
                datasets: [{
                    label: 'Number of Questions',
                    data: [
                        extremeHard.length,
                        hard.length,
                        moderate.length,
                        easy.length,
                        superEasy.length
                    ],
                    backgroundColor: [
                        'rgba(127, 29, 29, 0.8)',   // Dark red for extreme hard
                        'rgba(239, 68, 68, 0.8)',   // Red for hard
                        'rgba(245, 158, 11, 0.8)',  // Amber for moderate
                        'rgba(34, 197, 94, 0.8)',   // Green for easy
                        'rgba(156, 163, 175, 0.8)'  // Gray for super easy
                    ],
                    borderColor: [
                        'rgba(127, 29, 29, 1)',
                        'rgba(239, 68, 68, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(34, 197, 94, 1)',
                        'rgba(156, 163, 175, 1)'
                    ],
                    borderWidth: 2
                }],
                // Additional metadata for display
                metadata: {
                    extremeHard: {
                        count: extremeHard.length,
                        percentage: totalQuestions > 0 ? ((extremeHard.length / totalQuestions) * 100).toFixed(1) : 0,
                        idealRange: '<5%',
                        description: 'Needs rewriting'
                    },
                    hard: {
                        count: hard.length,
                        percentage: totalQuestions > 0 ? ((hard.length / totalQuestions) * 100).toFixed(1) : 0,
                        idealRange: '10-20%',
                        description: 'Needs review'
                    },
                    moderate: {
                        count: moderate.length,
                        percentage: totalQuestions > 0 ? ((moderate.length / totalQuestions) * 100).toFixed(1) : 0,
                        idealRange: '60-70%',
                        description: 'Acceptable'
                    },
                    easy: {
                        count: easy.length,
                        percentage: totalQuestions > 0 ? ((easy.length / totalQuestions) * 100).toFixed(1) : 0,
                        idealRange: '10-20%',
                        description: 'Good'
                    },
                    superEasy: {
                        count: superEasy.length,
                        percentage: totalQuestions > 0 ? ((superEasy.length / totalQuestions) * 100).toFixed(1) : 0,
                        idealRange: '<5%',
                        description: 'May be too easy'
                    },
                    totalQuestions: totalQuestions
                }
            };
        })();

        return {
            questionDifficulty: questionDifficultyData,
            slowQuestions: slowQuestionsData,
            examTrends: examTrendsData,
            wrongAnswers: wrongAnswersData,
            wrongAnswersDistribution: wrongAnswersDistributionData,
            scoreDistribution: scoreDistribution
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
        // Check if this is a client-side filter (doesn't trigger API call)
        const clientFilterKeys = ['category', 'wrong_percentage_min', 'wrong_percentage_max', 'status', 'search_query', 'difficulty'];
        
        // Reset to page 1 when filters change
        setCurrentPage(1);
        
        if (clientFilterKeys.includes(key)) {
            // Update client-side filters (live search - no API call)
            setClientFilters(prev => ({ ...prev, [key]: value }));
        } else {
            // Update server-side filters (triggers API call)
            setFilters(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleResetFilters = () => {
        setTableLoading(true);
        setFilters({
            exam_id: '',
            date_from: '',
            date_to: '',
            time_threshold: 60
        });
        setClientFilters({
            category: '',
            wrong_percentage_min: '',
            wrong_percentage_max: '',
            status: '',
            search_query: '',
            difficulty: ''
        });
        setItemsPerPage(20);
        setCurrentPage(1);
    };

    const handleItemsPerPageChange = (value) => {
        setTableLoading(true);
        setItemsPerPage(value);
        setCurrentPage(1); // Reset to first page when items per page changes
    };

    // Get unique categories from question stats
    const availableCategories = useMemo(() => {
        if (!data?.question_stats) return [];
        const categories = [...new Set(data.question_stats.map(q => q.category).filter(Boolean))];
        return categories.sort();
    }, [data?.question_stats]);

    // Get filtered questions based on filters and items per page, sorted by wrong percentage (highest to lowest)
    const getFilteredQuestions = useMemo(() => {
        if (!data?.question_stats) return [];
        
        // Apply client-side filters (live search - no API call)
        let filtered = data.question_stats.filter(question => {
            // Filter by category
            if (clientFilters.category && question.category !== clientFilters.category) {
                return false;
            }
            
            // Filter by wrong percentage range
            const wrongPct = parseFloat(question.wrong_percentage || 0);
            if (clientFilters.wrong_percentage_min && wrongPct < parseFloat(clientFilters.wrong_percentage_min)) {
                return false;
            }
            if (clientFilters.wrong_percentage_max && wrongPct > parseFloat(clientFilters.wrong_percentage_max)) {
                return false;
            }
            
            // Filter by status (Normal, Slow, Very Slow)
            if (clientFilters.status) {
                const isSlow = question.avg_time_seconds > filters.time_threshold;
                const isVerySlow = question.avg_time_seconds > filters.time_threshold * 1.5;
                const questionStatus = isVerySlow ? 'very_slow' : isSlow ? 'slow' : 'normal';
                if (questionStatus !== clientFilters.status) {
                    return false;
                }
            }
            
            // Filter by search query (question ID or question text) - LIVE SEARCH
            if (clientFilters.search_query) {
                const searchLower = clientFilters.search_query.toLowerCase();
                const questionIdMatch = question.questionId?.toString().toLowerCase().includes(searchLower);
                const questionTextMatch = question.question?.toLowerCase().includes(searchLower);
                if (!questionIdMatch && !questionTextMatch) {
                    return false;
                }
            }
            
            // Filter by difficulty category (Multi-Tier Classification)
            if (clientFilters.difficulty) {
                const correctPct = 100 - parseFloat(question.wrong_percentage || 0);
                let questionDifficulty = '';
                
                if (correctPct < 30) {
                    questionDifficulty = 'extreme_hard';
                } else if (correctPct >= 30 && correctPct < 50) {
                    questionDifficulty = 'hard';
                } else if (correctPct >= 50 && correctPct < 70) {
                    questionDifficulty = 'moderate';
                } else if (correctPct >= 70 && correctPct < 85) {
                    questionDifficulty = 'easy';
                } else {
                    questionDifficulty = 'super_easy';
                }
                
                if (questionDifficulty !== clientFilters.difficulty) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Sort by wrong percentage (highest to lowest), then by questionId as tiebreaker
        const sortedQuestions = filtered.sort((a, b) => {
            const wrongPctA = parseFloat(a.wrong_percentage || 0);
            const wrongPctB = parseFloat(b.wrong_percentage || 0);
            // Primary sort: wrong percentage (descending)
            if (wrongPctB !== wrongPctA) {
                return wrongPctB - wrongPctA;
            }
            // Secondary sort: questionId (ascending) as tiebreaker
            return (a.questionId || 0) - (b.questionId || 0);
        });
        
        return sortedQuestions;
    }, [data?.question_stats, filters.time_threshold, clientFilters]);

    // Calculate total filtered questions count (before pagination)
    const totalFilteredQuestions = useMemo(() => {
        if (!data?.question_stats) return 0;
        
        // Apply the same filters as getFilteredQuestions but without sorting/pagination
        let filtered = data.question_stats.filter(question => {
            if (clientFilters.category && question.category !== clientFilters.category) return false;
            const wrongPct = parseFloat(question.wrong_percentage || 0);
            if (clientFilters.wrong_percentage_min && wrongPct < parseFloat(clientFilters.wrong_percentage_min)) return false;
            if (clientFilters.wrong_percentage_max && wrongPct > parseFloat(clientFilters.wrong_percentage_max)) return false;
            if (clientFilters.status) {
                const isSlow = question.avg_time_seconds > filters.time_threshold;
                const isVerySlow = question.avg_time_seconds > filters.time_threshold * 1.5;
                const questionStatus = isVerySlow ? 'very_slow' : isSlow ? 'slow' : 'normal';
                if (questionStatus !== clientFilters.status) return false;
            }
            if (clientFilters.search_query) {
                const searchLower = clientFilters.search_query.toLowerCase();
                const questionIdMatch = question.questionId?.toString().toLowerCase().includes(searchLower);
                const questionTextMatch = question.question?.toLowerCase().includes(searchLower);
                if (!questionIdMatch && !questionTextMatch) return false;
            }
            if (clientFilters.difficulty) {
                const correctPct = 100 - parseFloat(question.wrong_percentage || 0);
                let questionDifficulty = '';
                
                if (correctPct < 30) {
                    questionDifficulty = 'extreme_hard';
                } else if (correctPct >= 30 && correctPct < 50) {
                    questionDifficulty = 'hard';
                } else if (correctPct >= 50 && correctPct < 70) {
                    questionDifficulty = 'moderate';
                } else if (correctPct >= 70 && correctPct < 85) {
                    questionDifficulty = 'easy';
                } else {
                    questionDifficulty = 'super_easy';
                }
                
                if (questionDifficulty !== clientFilters.difficulty) return false;
            }
            return true;
        });
        return filtered.length;
    }, [data?.question_stats, filters.time_threshold, clientFilters]);

    // Get paginated questions
    const getPaginatedQuestions = useMemo(() => {
        if (itemsPerPage === -1) return getFilteredQuestions; // Show all
        
        // Apply pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return getFilteredQuestions.slice(startIndex, endIndex);
    }, [getFilteredQuestions, itemsPerPage, currentPage]);

    // Calculate total pages
    const totalPages = useMemo(() => {
        if (itemsPerPage === -1 || totalFilteredQuestions === 0) return 1;
        return Math.ceil(totalFilteredQuestions / itemsPerPage);
    }, [totalFilteredQuestions, itemsPerPage]);

    // Reset to page 1 if current page exceeds total pages after filtering
    useEffect(() => {
        if (itemsPerPage !== -1 && totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [totalPages, itemsPerPage, currentPage]);

    // Get items per page options
    const getItemsPerPageOptions = () => {
        const total = data?.question_stats?.length || 0;
        const options = [20, 30, 40, 50];
        const validOptions = options.filter(opt => opt <= total || total === 0);
        if (validOptions.length === 0 || total > 50) {
            validOptions.push(...options);
        }
        validOptions.push(-1); // Add "Show All" option
        return [...new Set(validOptions)].sort((a, b) => {
            if (a === -1) return 1;
            if (b === -1) return -1;
            return a - b;
        });
    };

    if (loading) {
        return (
            <Layout user={user} routes={[]}>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
                <div className="min-h-screen bg-slate-50">
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        {/* Page Header */}
                        <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm">
                            <div className="px-8 py-8">
                                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Question Difficulty Analysis</h1>
                                        <p className="mt-2 max-w-2xl text-sm text-white/80">
                                            Analyze the questions that slow examinees down and uncover opportunities to refine your exam pools.
                                        </p>
                                        {data?.overall_stats && (
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                                                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Questions</p>
                                                        <p className="text-sm font-semibold">{data.overall_stats.total_questions}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                                                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Examinees</p>
                                                        <p className="text-sm font-semibold">{data.overall_stats.total_examinees}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                                                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Average Time</p>
                                                        <p className="text-sm font-semibold">{Math.round(data.overall_stats.overall_avg_time)}s</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => router.visit('/guidance/question-bank')}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/20"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Back to Question Bank
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 px-6 py-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.5a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-[#1D293D]">Filters</h2>
                                        <p className="text-sm text-slate-500">Adjust the inputs below to refine your analysis.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 px-6 py-6">
                                {/* Primary Filters Row */}
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Exam</label>
                                        <select
                                            value={filters.exam_id}
                                            onChange={(e) => handleFilterChange('exam_id', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        >
                                            <option value="">All Exams</option>
                                            {data?.available_exams && data.available_exams.length > 0 ? (
                                                data.available_exams.map((exam) => (
                                                    <option key={exam.examId} value={exam.examId}>
                                                        {exam.exam_ref_no} {exam.status && exam.status !== 'active' ? `(${exam.status})` : ''}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" disabled>
                                                    No exams available
                                                </option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Date From</label>
                                        <input
                                            type="date"
                                            value={filters.date_from}
                                            onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Date To</label>
                                        <input
                                            type="date"
                                            value={filters.date_to}
                                            onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Time Threshold (seconds)</label>
                                        <input
                                            type="number"
                                            value={filters.time_threshold}
                                            onChange={(e) => handleFilterChange('time_threshold', parseInt(e.target.value, 10) || 60)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                            min="1"
                                        />
                                    </div>
                                </div>

                                {/* Active Filters Summary */}
                                {((filters.category || filters.wrong_percentage_min || filters.wrong_percentage_max || filters.status || filters.search_query)) && (
                                    <div className="border-t border-slate-200 pt-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-600">Active Filters:</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {filters.category && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                                                            Category: {filters.category}
                                                            <button
                                                                onClick={() => handleFilterChange('category', '')}
                                                                className="ml-1 hover:text-blue-900"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    )}
                                                    {filters.wrong_percentage_min && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                                                            Wrong % ≥ {filters.wrong_percentage_min}%
                                                            <button
                                                                onClick={() => handleFilterChange('wrong_percentage_min', '')}
                                                                className="ml-1 hover:text-rose-900"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    )}
                                                    {filters.wrong_percentage_max && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                                                            Wrong % ≤ {filters.wrong_percentage_max}%
                                                            <button
                                                                onClick={() => handleFilterChange('wrong_percentage_max', '')}
                                                                className="ml-1 hover:text-rose-900"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    )}
                                                    {filters.status && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                                            Status: {filters.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                            <button
                                                                onClick={() => handleFilterChange('status', '')}
                                                                className="ml-1 hover:text-amber-900"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    )}
                                                    {filters.search_query && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                                            Search: "{filters.search_query}"
                                                            <button
                                                                onClick={() => handleFilterChange('search_query', '')}
                                                                className="ml-1 hover:text-slate-900"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end border-t border-slate-200 pt-4">
                                    <button
                                        onClick={handleResetFilters}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Reset All Filters
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Charts */}
                        {chartData && (
                            <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                                <ChartCard title="Question Difficulty" subtitle="Top 10 slowest questions">
                                    <div style={{ height: '400px' }}>
                                        <Bar data={chartData.questionDifficulty} options={chartOptions} />
                                    </div>
                                </ChartCard>

                                <ChartCard title="Slow Questions Distribution" subtitle="Questions exceeding time threshold">
                                    <div style={{ height: '400px' }}>
                                        <Doughnut data={chartData.slowQuestions} options={{ ...chartOptions, scales: {} }} />
                                    </div>
                                </ChartCard>
                            </div>
                        )}

                        {chartData && (
                            <div className="mb-8">
                                <ChartCard title="Examinee Performance Trends" subtitle="Average time and slow answers per examinee">
                                    {chartData.examTrends.labels.length > 0 ? (
                                        <div style={{ height: '400px' }}>
                                            <Line data={chartData.examTrends} options={chartOptions} />
                                        </div>
                                    ) : (
                                        <div className="flex h-96 items-center justify-center text-slate-500">
                                            <div className="text-center">
                                                <svg className="mx-auto mb-4 h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                <h3 className="text-lg font-semibold">No Exam Data Available</h3>
                                                <p className="mt-1 text-sm">No question timing data found for the selected filters.</p>
                                                <p className="mt-2 text-xs text-slate-400">Try adjusting your date range or exam selection.</p>
                                            </div>
                                        </div>
                                    )}
                                </ChartCard>
                            </div>
                        )}

                        {/* Score Distribution Section */}
                        {chartData && chartData.scoreDistribution && data?.question_stats && (
                            <div className="mb-8">
                                <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-[#1D293D]">Question Difficulty Distribution</h2>
                                            <p className="text-sm text-slate-600">Based on Item Difficulty (P-Value) - Research-based analysis of question difficulty levels</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                        <ChartCard 
                                            title="Score Distribution" 
                                            subtitle="Distribution of questions by difficulty level (correct answer percentage)"
                                        >
                                            <div style={{ height: '400px' }}>
                                                <Bar data={chartData.scoreDistribution} options={{
                                                    ...chartOptions,
                                                    plugins: {
                                                        ...chartOptions.plugins,
                                                        title: {
                                                            display: true,
                                                            text: 'Multi-Tier: Question Difficulty Distribution'
                                                        },
                                                        tooltip: {
                                                            callbacks: {
                                                                afterLabel: (context) => {
                                                                    const index = context.dataIndex;
                                                                    const metadata = chartData.scoreDistribution.metadata;
                                                                    const keys = ['extremeHard', 'hard', 'moderate', 'easy', 'superEasy'];
                                                                    const data = metadata[keys[index]];
                                                                    return `Count: ${data.count} (${data.percentage}%) | Ideal: ${data.idealRange} | ${data.description}`;
                                                                }
                                                            }
                                                        }
                                                    },
                                                    scales: {
                                                        ...chartOptions.scales,
                                                        y: {
                                                            ...chartOptions.scales.y,
                                                            title: {
                                                                display: true,
                                                                text: 'Number of Questions'
                                                            }
                                                        }
                                                    }
                                                }} />
                                            </div>
                                        </ChartCard>

                                        <div className="space-y-4">
                                            <ChartCard 
                                                title="Distribution Summary" 
                                                subtitle="Current vs Ideal Distribution (Multi-Tier Classification)"
                                            >
                                                <div className="space-y-3 p-4">
                                                    {/* Extreme Hard */}
                                                    <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded bg-red-800"></div>
                                                                <span className="text-xs font-semibold text-slate-700">Extreme Hard (&lt;30% correct)</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-red-800">
                                                                {chartData.scoreDistribution.metadata.extremeHard.count} ({chartData.scoreDistribution.metadata.extremeHard.percentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-600">
                                                            Ideal: {chartData.scoreDistribution.metadata.extremeHard.idealRange} | {chartData.scoreDistribution.metadata.extremeHard.description}
                                                        </div>
                                                    </div>

                                                    {/* Hard */}
                                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded bg-red-600"></div>
                                                                <span className="text-xs font-semibold text-slate-700">Hard (30-50% correct)</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-red-700">
                                                                {chartData.scoreDistribution.metadata.hard.count} ({chartData.scoreDistribution.metadata.hard.percentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-600">
                                                            Ideal: {chartData.scoreDistribution.metadata.hard.idealRange} | {chartData.scoreDistribution.metadata.hard.description}
                                                        </div>
                                                    </div>

                                                    {/* Moderate */}
                                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded bg-amber-500"></div>
                                                                <span className="text-xs font-semibold text-slate-700">Moderate (50-70% correct)</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-amber-700">
                                                                {chartData.scoreDistribution.metadata.moderate.count} ({chartData.scoreDistribution.metadata.moderate.percentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-600">
                                                            Ideal: {chartData.scoreDistribution.metadata.moderate.idealRange} | {chartData.scoreDistribution.metadata.moderate.description}
                                                        </div>
                                                    </div>

                                                    {/* Easy */}
                                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded bg-emerald-600"></div>
                                                                <span className="text-xs font-semibold text-slate-700">Easy (70-85% correct)</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-emerald-700">
                                                                {chartData.scoreDistribution.metadata.easy.count} ({chartData.scoreDistribution.metadata.easy.percentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-600">
                                                            Ideal: {chartData.scoreDistribution.metadata.easy.idealRange} | {chartData.scoreDistribution.metadata.easy.description}
                                                        </div>
                                                    </div>

                                                    {/* Super Easy */}
                                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded bg-slate-400"></div>
                                                                <span className="text-xs font-semibold text-slate-700">Super Easy (&gt;85% correct)</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">
                                                                {chartData.scoreDistribution.metadata.superEasy.count} ({chartData.scoreDistribution.metadata.superEasy.percentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-600">
                                                            Ideal: {chartData.scoreDistribution.metadata.superEasy.idealRange} | {chartData.scoreDistribution.metadata.superEasy.description}
                                                        </div>
                                                    </div>

                                                    {/* Total */}
                                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-700">Total Questions</span>
                                                            <span className="text-sm font-bold text-[#1447E6]">
                                                                {chartData.scoreDistribution.metadata.totalQuestions}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </ChartCard>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Wrong Answers Analysis Section */}
                        {chartData && data?.question_stats && (
                            <div className="mb-8">
                                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-[#1D293D]">Wrong Answer Analysis</h2>
                                            <p className="text-sm text-slate-600">Identify questions that examinees struggle with the most</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-8">
                                        <ChartCard title="Questions with Most Wrong Answers" subtitle="Top 10 questions with highest wrong answer percentage">
                                            <div style={{ height: '400px' }}>
                                                <Bar data={chartData.wrongAnswers} options={{
                                                    ...chartOptions,
                                                    plugins: {
                                                        ...chartOptions.plugins,
                                                        title: {
                                                            display: true,
                                                            text: 'Wrong Answer Percentage by Question'
                                                        }
                                                    },
                                                    scales: {
                                                        ...chartOptions.scales,
                                                        y: {
                                                            ...chartOptions.scales.y,
                                                            max: 100,
                                                            title: {
                                                                display: true,
                                                                text: 'Wrong Answer Percentage (%)'
                                                            }
                                                        }
                                                    }
                                                }} />
                                            </div>
                                        </ChartCard>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        {data?.question_stats && (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6">
                                    {/* Top Row: Title and Pagination */}
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold text-[#1D293D]">Question Analysis Details</h3>
                                                <p className="text-sm text-slate-500">Review the timing profile for each question.</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                Items Per Page
                                            </label>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value, 10))}
                                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                            >
                                                {getItemsPerPageOptions().map((option) => (
                                                    <option key={option} value={option}>
                                                        {option === -1 ? 'Show All' : `${option} per page`}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="text-sm font-medium text-slate-500">
                                                Showing {getPaginatedQuestions.length} of {totalFilteredQuestions} questions
                                                {(() => {
                                                    const total = data?.question_stats?.length || 0;
                                                    if (totalFilteredQuestions < total) {
                                                        return ` (${total - totalFilteredQuestions} hidden by filters)`;
                                                    }
                                                    return '';
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filters Row */}
                                    <div className="border-t border-slate-200 pt-4">
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Search Question</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={clientFilters.search_query}
                                                        onChange={(e) => handleFilterChange('search_query', e.target.value)}
                                                        placeholder="Search by ID or text..."
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pl-10 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                    />
                                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category / Subject</label>
                                                <select
                                                    value={clientFilters.category}
                                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                >
                                                    <option value="">All Categories</option>
                                                    {availableCategories.map((category) => (
                                                        <option key={category} value={category}>
                                                            {category}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Wrong % Min</label>
                                                <input
                                                    type="number"
                                                    value={clientFilters.wrong_percentage_min}
                                                    onChange={(e) => handleFilterChange('wrong_percentage_min', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                    min="0"
                                                    max="100"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Wrong % Max</label>
                                                <input
                                                    type="number"
                                                    value={clientFilters.wrong_percentage_max}
                                                    onChange={(e) => handleFilterChange('wrong_percentage_max', e.target.value)}
                                                    placeholder="100"
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                    min="0"
                                                    max="100"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</label>
                                                <select
                                                    value={clientFilters.status}
                                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                >
                                                    <option value="">All Status</option>
                                                    <option value="normal">Normal</option>
                                                    <option value="slow">Slow</option>
                                                    <option value="very_slow">Very Slow</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Difficulty</label>
                                                <select
                                                    value={clientFilters.difficulty}
                                                    onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                >
                                                    <option value="">All Difficulties</option>
                                                    <option value="extreme_hard">Extreme Hard</option>
                                                    <option value="hard">Hard</option>
                                                    <option value="moderate">Moderate</option>
                                                    <option value="easy">Easy</option>
                                                    <option value="super_easy">Super Easy</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Active Filters Summary */}
                                        {((clientFilters.category || clientFilters.wrong_percentage_min || clientFilters.wrong_percentage_max || clientFilters.status || clientFilters.search_query || clientFilters.difficulty)) && (
                                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-600">Active:</span>
                                                {clientFilters.category && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                        Category: {clientFilters.category}
                                                        <button
                                                            onClick={() => handleFilterChange('category', '')}
                                                            className="ml-1 hover:text-blue-900"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                )}
                                                {clientFilters.wrong_percentage_min && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                                                        Wrong % ≥ {clientFilters.wrong_percentage_min}%
                                                        <button
                                                            onClick={() => handleFilterChange('wrong_percentage_min', '')}
                                                            className="ml-1 hover:text-rose-900"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                )}
                                                {clientFilters.wrong_percentage_max && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                                                        Wrong % ≤ {clientFilters.wrong_percentage_max}%
                                                        <button
                                                            onClick={() => handleFilterChange('wrong_percentage_max', '')}
                                                            className="ml-1 hover:text-rose-900"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                )}
                                                {clientFilters.status && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                        Status: {clientFilters.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                        <button
                                                            onClick={() => handleFilterChange('status', '')}
                                                            className="ml-1 hover:text-amber-900"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                )}
                                                {clientFilters.search_query && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                        Search: "{clientFilters.search_query}"
                                                        <button
                                                            onClick={() => handleFilterChange('search_query', '')}
                                                            className="ml-1 hover:text-slate-900"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                )}
                                                {clientFilters.difficulty && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                                                        Difficulty: {clientFilters.difficulty.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                        <button
                                                            onClick={() => handleFilterChange('difficulty', '')}
                                                            className="ml-1 hover:text-purple-900"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="relative">
                                    {tableLoading && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                                            <div className="flex items-center gap-2 text-[#1447E6]">
                                                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="text-sm font-semibold">Updating table…</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className={tableLoading ? 'pointer-events-none opacity-50' : ''}>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-slate-200">
                                                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 w-16 border-r border-slate-200">
                                                            #
                                                        </th>
                                                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 min-w-[200px] border-r border-slate-200">
                                                            <div className="flex items-center gap-2">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                                </svg>
                                                                Question
                                                            </div>
                                                        </th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 w-32 border-r border-slate-200">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                                </svg>
                                                                Category
                                                            </div>
                                                        </th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 w-28 border-r border-slate-200">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Avg Time
                                                            </div>
                                                        </th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 w-24 border-r border-slate-200">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                                </svg>
                                                                Attempts
                                                            </div>
                                                        </th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 w-28 border-r border-slate-200">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                </svg>
                                                                Slow %
                                                            </div>
                                                        </th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 w-36 border-r border-slate-200">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Wrong %
                                                            </div>
                                                        </th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 w-36 border-r border-slate-200">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                                </svg>
                                                                Difficulty
                                                            </div>
                                                        </th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 w-32">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Status
                                                            </div>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {getPaginatedQuestions.map((question, index) => {
                                                        const isSlow = question.avg_time_seconds > filters.time_threshold;
                                                        const isVerySlow = question.avg_time_seconds > filters.time_threshold * 1.5;
                                                        const wrongPct = parseFloat(question.wrong_percentage || 0);
                                                        const isHighWrong = wrongPct > 70;
                                                        const isMediumWrong = wrongPct > 50 && wrongPct <= 70;
                                                        const isLowWrong = wrongPct > 30 && wrongPct <= 50;
                                                        
                                                        // Calculate difficulty category based on Multi-Tier Classification
                                                        // Extreme Hard: <30% correct (>70% wrong)
                                                        // Hard: 30-50% correct (50-70% wrong)
                                                        // Moderate: 50-70% correct (30-50% wrong)
                                                        // Easy: 70-85% correct (15-30% wrong)
                                                        // Super Easy: >85% correct (<15% wrong)
                                                        const correctPct = 100 - wrongPct;
                                                        let difficultyCategory = '';
                                                        let difficultyColor = '';
                                                        let difficultyBg = '';
                                                        if (correctPct < 30) {
                                                            // Extreme Hard: <30% correct (>70% wrong)
                                                            difficultyCategory = 'Extreme Hard';
                                                            difficultyColor = 'text-red-800';
                                                            difficultyBg = 'bg-red-100 border-red-400';
                                                        } else if (correctPct >= 30 && correctPct < 50) {
                                                            // Hard: 30-50% correct (50-70% wrong)
                                                            difficultyCategory = 'Hard';
                                                            difficultyColor = 'text-rose-700';
                                                            difficultyBg = 'bg-rose-100 border-rose-300';
                                                        } else if (correctPct >= 50 && correctPct < 70) {
                                                            // Moderate: 50-70% correct (30-50% wrong)
                                                            difficultyCategory = 'Moderate';
                                                            difficultyColor = 'text-amber-700';
                                                            difficultyBg = 'bg-amber-100 border-amber-300';
                                                        } else if (correctPct >= 70 && correctPct < 85) {
                                                            // Easy: 70-85% correct (15-30% wrong)
                                                            difficultyCategory = 'Easy';
                                                            difficultyColor = 'text-emerald-700';
                                                            difficultyBg = 'bg-emerald-100 border-emerald-300';
                                                        } else {
                                                            // Super Easy: >85% correct (<15% wrong)
                                                            difficultyCategory = 'Super Easy';
                                                            difficultyColor = 'text-slate-700';
                                                            difficultyBg = 'bg-slate-100 border-slate-300';
                                                        }

                                                        return (
                                                            <tr 
                                                                key={question.questionId} 
                                                                onClick={(e) => {
                                                                    // Don't trigger if clicking on action buttons or links
                                                                    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                                                                        return;
                                                                    }
                                                                    router.visit(`/guidance/question-bank?questionId=${question.questionId}`);
                                                                }}
                                                                className={`cursor-pointer transition-all duration-150 hover:bg-slate-50 hover:shadow-sm ${
                                                                    isHighWrong ? 'bg-rose-50/30' : isMediumWrong ? 'bg-amber-50/30' : ''
                                                                }`}
                                                            >
                                                                <td className="px-4 py-5 text-center text-sm font-bold text-slate-700 border-r border-slate-100">
                                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700">
                                                                        {itemsPerPage === -1 
                                                                            ? index + 1 
                                                                            : (currentPage - 1) * itemsPerPage + index + 1}
                                                                    </span>
                                                                </td>
                                                                <td className="px-5 py-5 border-r border-slate-100">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-base font-bold text-[#1447E6]">Q{question.questionId}</span>
                                                                            {isHighWrong && (
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-100 text-rose-700 border border-rose-300">
                                                                                    High Error
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-sm text-slate-600 leading-relaxed max-w-md line-clamp-2" title={question.question}>
                                                                            {question.question}
                                                                        </p>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-5 text-center border-r border-slate-100">
                                                                    <span className="inline-flex items-center justify-center rounded-lg border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1447E6]">
                                                                        {question.category}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-5 text-center text-sm font-semibold text-slate-700 border-r border-slate-100">
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="text-base font-bold">{Math.round(question.avg_time_seconds)}</span>
                                                                        <span className="text-xs text-slate-500">seconds</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-5 text-center text-sm font-semibold text-slate-700 border-r border-slate-100">
                                                                    <span className="text-base font-bold">{question.total_attempts}</span>
                                                                </td>
                                                                <td className="px-4 py-5 text-center border-r border-slate-100">
                                                                    <div className="flex flex-col items-center">
                                                                        <span className={`text-base font-bold ${
                                                                            parseFloat(question.slow_percentage || 0) > 50 ? 'text-amber-600' : 'text-slate-700'
                                                                        }`}>
                                                                            {question.slow_percentage}%
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-5 text-center border-r border-slate-100">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <span className={`text-lg font-bold ${
                                                                            isHighWrong
                                                                                ? 'text-rose-600'
                                                                                : isMediumWrong
                                                                                ? 'text-amber-600'
                                                                                : isLowWrong
                                                                                ? 'text-yellow-600'
                                                                                : 'text-emerald-600'
                                                                        }`}>
                                                                            {wrongPct.toFixed(1)}%
                                                                        </span>
                                                                        <span className="text-xs font-medium text-slate-500">
                                                                            {question.wrong_attempts || 0} / {question.total_attempts || 0}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-5 text-center border-r border-slate-100">
                                                                    <span
                                                                        className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${difficultyBg} ${difficultyColor}`}
                                                                        title={`Wrong: ${wrongPct.toFixed(1)}% | Correct: ${correctPct.toFixed(1)}% | ${difficultyCategory}${correctPct < 30 ? ' (<30% correct)' : correctPct >= 30 && correctPct < 50 ? ' (30-50% correct)' : correctPct >= 50 && correctPct < 70 ? ' (50-70% correct)' : correctPct >= 70 && correctPct < 85 ? ' (70-85% correct)' : ' (>85% correct)'}`}
                                                                    >
                                                                        {difficultyCategory}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-5 text-center">
                                                                    <span
                                                                        className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                                                                            isVerySlow
                                                                                ? 'border-2 border-rose-500/40 bg-rose-500/15 text-rose-700'
                                                                                : isSlow
                                                                                    ? 'border-2 border-amber-400/40 bg-amber-400/15 text-amber-600'
                                                                                    : 'border-2 border-emerald-400/30 bg-emerald-400/10 text-emerald-700'
                                                                        }`}
                                                                    >
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

                                    {/* Pagination */}
                                    {totalFilteredQuestions > 0 && itemsPerPage !== -1 && totalPages > 1 && (
                                        <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-4">
                                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                <div className="text-sm font-medium text-slate-600">
                                                    Showing{' '}
                                                    <span className="font-semibold text-[#1447E6]">
                                                        {totalFilteredQuestions === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                                                    </span>{' '}
                                                    to{' '}
                                                    <span className="font-semibold text-[#1447E6]">
                                                        {Math.min(currentPage * itemsPerPage, totalFilteredQuestions)}
                                                    </span>{' '}
                                                    of{' '}
                                                    <span className="font-semibold text-[#1447E6]">{totalFilteredQuestions}</span> questions
                                                </div>

                                                <nav className="flex items-center gap-2" aria-label="Pagination">
                                                    {/* Previous Button */}
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        disabled={currentPage === 1}
                                                        className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                                                            currentPage === 1
                                                                ? 'border-slate-300 bg-white text-slate-400 cursor-not-allowed'
                                                                : 'border-slate-300 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6]'
                                                        }`}
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                        </svg>
                                                        Previous
                                                    </button>

                                                    {/* Page Numbers */}
                                                    <div className="flex items-center gap-1">
                                                        {(() => {
                                                            const pages = [];
                                                            const maxVisible = 5;
                                                            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                                            let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                                                            // Adjust if we're near the end
                                                            if (endPage - startPage < maxVisible - 1) {
                                                                startPage = Math.max(1, endPage - maxVisible + 1);
                                                            }

                                                            // First page
                                                            if (startPage > 1) {
                                                                pages.push(
                                                                    <button
                                                                        key={1}
                                                                        onClick={() => setCurrentPage(1)}
                                                                        className="inline-flex items-center justify-center min-w-[40px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6]"
                                                                    >
                                                                        1
                                                                    </button>
                                                                );
                                                                if (startPage > 2) {
                                                                    pages.push(
                                                                        <span key="ellipsis1" className="px-2 text-slate-400">
                                                                            ...
                                                                        </span>
                                                                    );
                                                                }
                                                            }

                                                            // Page range
                                                            for (let i = startPage; i <= endPage; i++) {
                                                                pages.push(
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => setCurrentPage(i)}
                                                                        className={`inline-flex items-center justify-center min-w-[40px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                                                                            i === currentPage
                                                                                ? 'border-[#1447E6] bg-[#1447E6] text-white'
                                                                                : 'border-slate-300 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6]'
                                                                        }`}
                                                                    >
                                                                        {i}
                                                                    </button>
                                                                );
                                                            }

                                                            // Last page
                                                            if (endPage < totalPages) {
                                                                if (endPage < totalPages - 1) {
                                                                    pages.push(
                                                                        <span key="ellipsis2" className="px-2 text-slate-400">
                                                                            ...
                                                                        </span>
                                                                    );
                                                                }
                                                                pages.push(
                                                                    <button
                                                                        key={totalPages}
                                                                        onClick={() => setCurrentPage(totalPages)}
                                                                        className="inline-flex items-center justify-center min-w-[40px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6]"
                                                                    >
                                                                        {totalPages}
                                                                    </button>
                                                                );
                                                            }

                                                            return pages;
                                                        })()}
                                                    </div>

                                                    {/* Next Button */}
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                        disabled={currentPage === totalPages}
                                                        className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                                                            currentPage === totalPages
                                                                ? 'border-slate-300 bg-white text-slate-400 cursor-not-allowed'
                                                                : 'border-slate-300 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6]'
                                                        }`}
                                                    >
                                                        Next
                                                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                </nav>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Layout>
        </>
    );
}
