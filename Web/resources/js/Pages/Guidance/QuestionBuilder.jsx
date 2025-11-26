import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const QuestionBuilder = ({ user, categories = [] }) => {
    // Load questions from localStorage on component mount
    const loadQuestionsFromStorage = () => {
        try {
            const savedQuestions = localStorage.getItem('questionBuilder_questions');
            return savedQuestions ? JSON.parse(savedQuestions) : [];
        } catch (error) {
            console.error('Error loading questions from localStorage:', error);
            return [];
        }
    };

    const [questions, setQuestions] = useState(loadQuestionsFromStorage);
    const [currentQuestion, setCurrentQuestion] = useState({
        question: '',
        option1: '',
        option2: '',
        option3: '',
        option4: '',
        option5: '',
        correct_answer: 'A',
        category: '',
        direction: '',
        image: null,
        option1_image: null,
        option2_image: null,
        option3_image: null,
        option4_image: null,
        option5_image: null
    });
    const [showPreview, setShowPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasRestoredQuestions, setHasRestoredQuestions] = useState(false);

    // Save questions to localStorage whenever questions state changes
    useEffect(() => {
        try {
            localStorage.setItem('questionBuilder_questions', JSON.stringify(questions));
        } catch (error) {
            console.error('Error saving questions to localStorage:', error);
        }
    }, [questions]);

    // Show restoration notification on component mount if questions were restored
    useEffect(() => {
        const savedQuestions = loadQuestionsFromStorage();
        if (savedQuestions.length > 0) {
            setHasRestoredQuestions(true);
            // Show notification after component mounts
            setTimeout(() => {
                window.showAlert(`Restored ${savedQuestions.length} questions from your previous session`, 'info');
                setHasRestoredQuestions(false);
            }, 1000);
        }
    }, []); // Empty dependency array means this runs only on mount

    const handleInputChange = (field, value) => {
        setCurrentQuestion(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleImageUpload = (field, file) => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setCurrentQuestion(prev => ({
                    ...prev,
                    [field]: e.target.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (field) => {
        setCurrentQuestion(prev => ({
            ...prev,
            [field]: null
        }));
    };

    const addQuestion = () => {
        if (!currentQuestion.question.trim() || !currentQuestion.category.trim()) {
            alert('Please fill in the question text and category');
            return;
        }

        const newQuestion = {
            ...currentQuestion,
            id: Date.now() // Temporary ID for local management
        };

        setQuestions(prev => [...prev, newQuestion]);
        setCurrentQuestion({
            question: '',
            option1: '',
            option2: '',
            option3: '',
            option4: '',
            option5: '',
            correct_answer: 'A',
            category: '',
            direction: '',
            image: null,
            option1_image: null,
            option2_image: null,
            option3_image: null,
            option4_image: null,
            option5_image: null
        });
    };

    const removeQuestion = (questionId) => {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
    };

    const editQuestion = (question) => {
        setCurrentQuestion(question);
        removeQuestion(question.id);
    };

    const submitQuestions = async () => {
        if (questions.length === 0) {
            alert('Please add at least one question');
            return;
        }

        setIsSubmitting(true);
        
        try {
            const formData = new FormData();
            formData.append('questions', JSON.stringify(questions));

            router.post('/guidance/questions/bulk-create', formData, {
                onSuccess: () => {
                    window.showAlert(`${questions.length} questions created successfully`, 'success');
                    // Clear localStorage after successful submission
                    localStorage.removeItem('questionBuilder_questions');
                    setQuestions([]);
                    setCurrentQuestion({
                        question: '',
                        option1: '',
                        option2: '',
                        option3: '',
                        option4: '',
                        option5: '',
                        correct_answer: 'A',
                        category: '',
                        direction: '',
                        image: null,
                        option1_image: null,
                        option2_image: null,
                        option3_image: null,
                        option4_image: null,
                        option5_image: null
                    });
                },
                onError: (errors) => {
                    window.showAlert('Failed to create questions', 'error');
                    console.error('Errors:', errors);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                }
            });
        } catch (error) {
            console.error('Error submitting questions:', error);
            setIsSubmitting(false);
        }
    };

    const clearAll = () => {
        if (confirm('Are you sure you want to clear all questions? This will also clear any saved progress.')) {
            // Clear localStorage
            localStorage.removeItem('questionBuilder_questions');
            setQuestions([]);
            setCurrentQuestion({
                question: '',
                option1: '',
                option2: '',
                option3: '',
                option4: '',
                option5: '',
                correct_answer: 'A',
                category: '',
                direction: '',
                image: null,
                option1_image: null,
                option2_image: null,
                option3_image: null,
                option4_image: null,
                option5_image: null
            });
        }
    };

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-slate-50 animate-up" style={{ animationDelay: '60ms' }}>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-up" style={{ animationDelay: '120ms' }}>
                    {/* Header Section */}
                    <div className="mb-8 animate-up" style={{ animationDelay: '180ms' }}>
                        <div className="rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm">
                            <div className="px-8 py-8">
                                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                                            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-bold tracking-tight">Question Builder</h1>
                                            <p className="mt-2 text-sm text-white/80">
                                                Create and manage multiple admission exam questions with auto-save and quick publishing.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                                            {questions.length} questions created
                                        </span>
                                        {questions.length > 0 && (
                                            <span className="inline-flex items-center gap-2 rounded-full border border-[#1447E6]/30 bg-[#1447E6]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                                                Auto-saved locally
                                            </span>
                                        )}
                                        <a
                                            href="/guidance/question-bank"
                                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/20"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                            </svg>
                                            Back to Question Bank
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-up" style={{ animationDelay: '220ms' }}>
                    {/* Question Form */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-up" style={{ animationDelay: '260ms' }}>
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1D293D]">
                                <svg className="h-5 w-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Create New Question
                            </h2>
                        </div>

                        <div className="space-y-6 p-6">
                            {/* Question Text */}
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#1D293D]">
                                    Question Text *
                                </label>
                                <textarea
                                    value={currentQuestion.question}
                                    onChange={(e) => handleInputChange('question', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                    rows="4"
                                    placeholder="Enter your question here..."
                                    required
                                />
                            </div>

                            {/* Question Image */}
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#1D293D]">
                                    Question Image (Optional)
                                </label>
                                <div className="flex items-center gap-3">
                                    {currentQuestion.image && (
                                        <img 
                                            src={currentQuestion.image} 
                                            alt="Question" 
                                            className="w-20 h-20 object-cover rounded border"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload('image', e.target.files[0])}
                                            className="w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-[#1447E6]/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#1447E6] hover:file:bg-[#1447E6]/15"
                                        />
                                    </div>
                                    {currentQuestion.image && (
                                        <button
                                            type="button"
                                            onClick={() => removeImage('image')}
                                            className="rounded border border-rose-200 px-3 py-1 text-sm font-semibold text-rose-600 transition-colors duration-200 hover:bg-rose-50"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Answer Options */}
                            <div>
                                <label className="mb-3 block text-sm font-semibold text-[#1D293D]">
                                    Answer Options *
                                </label>
                                <div className="space-y-4">
                                    {['option1', 'option2', 'option3', 'option4', 'option5'].map((optionKey, index) => (
                                        <div key={optionKey} className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 text-sm font-medium text-[#1D293D]">
                                                    {String.fromCharCode(65 + index)}.
                                                </span>
                                                <input
                                                    value={currentQuestion[optionKey]}
                                                    onChange={(e) => handleInputChange(optionKey, e.target.value)}
                                                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                    placeholder={`Option ${String.fromCharCode(65 + index)}${index === 0 ? ' (required)' : ' (optional)'}`}
                                                    required={index === 0}
                                                />
                                            </div>
                                            
                                            {/* Option Image */}
                                            <div className="ml-9 flex items-center gap-3">
                                                {currentQuestion[`${optionKey}_image`] && (
                                                    <img 
                                                        src={currentQuestion[`${optionKey}_image`]} 
                                                        alt={`Option ${String.fromCharCode(65 + index)}`} 
                                                        className="w-16 h-16 object-cover rounded border"
                                                    />
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(`${optionKey}_image`, e.target.files[0])}
                                                    className="flex-1 text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-[#1447E6]/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#1447E6] hover:file:bg-[#1447E6]/15"
                                                />
                                                {currentQuestion[`${optionKey}_image`] && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(`${optionKey}_image`)}
                                                        className="rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 transition-colors duration-200 hover:bg-rose-50"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Correct Answer */}
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#1D293D]">
                                    Correct Answer *
                                </label>
                                <select
                                    value={currentQuestion.correct_answer}
                                    onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                    required
                                >
                                    <option value="A">A</option> 
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                    <option value="E">E</option>
                                </select>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#1D293D]">
                                    Category *
                                </label>
                                <div className="relative">
                                    <input
                                        value={currentQuestion.category}
                                        onChange={(e) => handleInputChange('category', e.target.value)}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        placeholder="Enter category (e.g., Mathematics, Science, etc.)"
                                        list="category-suggestions"
                                        required
                                    />
                                    {categories.length > 0 && (
                                        <datalist id="category-suggestions">
                                            {categories.map((category, index) => (
                                                <option key={index} value={category} />
                                            ))}
                                        </datalist>
                                    )}
                                </div>
                                {categories.length > 0 && (
                                    <div className="mt-2">
                                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Existing categories</p>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.slice(0, 5).map((category, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => handleInputChange('category', category)}
                                                    className="rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1447E6]/15 hover:shadow-sm cursor-pointer"
                                                >
                                                    {category}
                                                </button>
                                            ))}
                                            {categories.length > 5 && (
                                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">+{categories.length - 5} more</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Direction */}
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#1D293D]">
                                    Direction (Optional)
                                </label>
                                <textarea
                                    value={currentQuestion.direction}
                                    onChange={(e) => handleInputChange('direction', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                    rows="2"
                                    placeholder="Enter any special instructions for this question..."
                                />
                            </div>

                            {/* Add Question Button */}
                            <div className="border-t border-slate-200 pt-4">
                                <button
                                    onClick={addQuestion}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add Question
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Questions List */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-up" style={{ animationDelay: '300ms' }}>
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1D293D]">
                                    <svg className="h-5 w-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    Created Questions ({questions.length})
                                </h2>
                                {questions.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="inline-flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 transition-colors duration-200 hover:bg-rose-500/15"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-6">
                            {questions.length === 0 ? (
                                <div className="text-center py-8">
                                    <svg className="mx-auto mb-4 h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    <p className="text-sm font-semibold text-[#1D293D]">No questions created yet</p>
                                    <p className="text-xs text-slate-500">Add your first question using the form on the left</p>
                                </div>
                            ) : (
                                <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
                                    {questions.map((question, index) => (
                                        <div key={question.id} className="rounded-xl border border-slate-200 p-4 transition-all duration-200 hover:border-[#1447E6]/30 hover:bg-[#1447E6]/5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Q{index + 1}</span>
                                                        <span className="inline-flex items-center rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                            {question.category}
                                                        </span>
                                                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                                                            Answer: {question.correct_answer}
                                                        </span>
                                                    </div>
                                                    <p className="mb-2 overflow-hidden text-sm font-medium text-[#1D293D]" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                                                        {question.question}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                        {question.image && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <svg className="h-3.5 w-3.5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h2l.4 2M7 13h10l3-8H5.4M7 13l-1.35 2.7A1 1 0 006.6 17H19m-2 2a1 1 0 11-2 0 1 1 0 012 0zm-8 1a1 1 0 100-2 1 1 0 000 2z" />
                                                                </svg>
                                                                Has question image
                                                            </span>
                                                        )}
                                                        {[1,2,3,4,5].some(i => question[`option${i}_image`]) && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <svg className="h-3.5 w-3.5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618V15a2 2 0 01-2 2h-4m0-6H8m7 0V6a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2h7a2 2 0 002-2v-5z" />
                                                                </svg>
                                                                Has option images
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => editQuestion(question)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-[#1447E6]/30 bg-[#1447E6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6] transition-colors duration-200 hover:bg-[#1447E6]/15"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => removeQuestion(question.id)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 transition-colors duration-200 hover:bg-rose-500/15"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        {questions.length > 0 && (
                            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                                <button
                                    onClick={submitQuestions}
                                    disabled={isSubmitting}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0] disabled:cursor-not-allowed disabled:border-[#1447E6]/40 disabled:bg-[#1447E6]/40"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Creating Questions...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Create {questions.length} Question{questions.length !== 1 ? 's' : ''}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </Layout>
    );
};

export default QuestionBuilder;
