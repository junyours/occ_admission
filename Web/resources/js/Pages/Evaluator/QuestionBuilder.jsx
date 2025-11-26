import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const EvaluatorQuestionBuilder = ({ user, evaluator, categories = [], routes = {} }) => {
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState({
        question: '',
        option1: '', option2: '', option3: '', option4: '', option5: '',
        correct_answer: 'A', category: '', direction: '',
        image: null, option1_image: null, option2_image: null, option3_image: null, option4_image: null, option5_image: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Load saved questions from localStorage on component mount
    useEffect(() => {
        const savedQuestions = localStorage.getItem('evaluator_question_builder_questions');
        if (savedQuestions) {
            try {
                const parsedQuestions = JSON.parse(savedQuestions);
                setQuestions(parsedQuestions);
                setHasUnsavedChanges(true);
                console.log('Loaded saved questions from localStorage:', parsedQuestions.length);
            } catch (error) {
                console.error('Error loading saved questions:', error);
                localStorage.removeItem('evaluator_question_builder_questions');
            }
        }
    }, []);

    // Save questions to localStorage whenever questions change
    useEffect(() => {
        if (questions.length > 0) {
            localStorage.setItem('evaluator_question_builder_questions', JSON.stringify(questions));
            setHasUnsavedChanges(true);
            console.log('Saved questions to localStorage:', questions.length);
        } else {
            localStorage.removeItem('evaluator_question_builder_questions');
            setHasUnsavedChanges(false);
        }
    }, [questions]);

    const onChange = (field, value) => setCurrent(prev => ({ ...prev, [field]: value }));

    // Get available answer options based on filled options
    const getAvailableOptions = () => {
        const options = [];
        for (let i = 1; i <= 5; i++) {
            if (current[`option${i}`] && current[`option${i}`].trim()) {
                options.push(String.fromCharCode(64 + i));
            }
        }
        return options;
    };

    // Get available options for a specific question (for display purposes)
    const getQuestionAvailableOptions = (question) => {
        const options = [];
        for (let i = 1; i <= 5; i++) {
            if (question[`option${i}`] && question[`option${i}`].trim()) {
                options.push(String.fromCharCode(64 + i));
            }
        }
        return options;
    };

    const handleImage = (field, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setCurrent(prev => ({ ...prev, [field]: e.target.result }));
        reader.readAsDataURL(file);
    };

    const removeImage = (field) => setCurrent(prev => ({ ...prev, [field]: null }));

    const addQuestion = () => {
        if (!current.question.trim() || !current.category.trim()) {
            window.showAlert('Please fill in the question text and category', 'warning');
            return;
        }
        
        // Check if at least option A is filled
        if (!current.option1.trim()) {
            window.showAlert('Option A is required', 'warning');
            return;
        }
        
        // Check if correct answer is valid (must be one of the available options)
        const availableOptions = getAvailableOptions();
        if (!availableOptions.includes(current.correct_answer)) {
            window.showAlert('Please select a valid correct answer from the available options', 'warning');
            return;
        }
        
        setQuestions(prev => ([ ...prev, { ...current, id: Date.now() } ]));
        setCurrent({
            question: '', option1: '', option2: '', option3: '', option4: '', option5: '',
            correct_answer: 'A', category: '', direction: '',
            image: null, option1_image: null, option2_image: null, option3_image: null, option4_image: null, option5_image: null,
        });
    };

    const editQuestion = (q) => { removeQuestion(q.id); setCurrent(q); };
    const removeQuestion = (id) => setQuestions(prev => prev.filter(q => q.id !== id));
    const clearAll = () => { 
        if (confirm('Clear all questions? This will also remove them from local storage.')) {
            setQuestions([]);
            localStorage.removeItem('evaluator_question_builder_questions');
            setHasUnsavedChanges(false);
            console.log('Manually cleared all questions and localStorage');
        }
    };

    const submit = () => {
        if (questions.length === 0) { window.showAlert('Add at least one question', 'warning'); return; }
        setIsSubmitting(true);
        const payload = new FormData();
        payload.append('questions', JSON.stringify(questions));
        // Use bulk endpoint for evaluator bank
        router.post(routes.question_bank_bulk_store || '/evaluator/question-bank/bulk', payload, {
            onSuccess: () => {
                setIsSubmitting(false);
                window.showAlert(`${questions.length} question(s) created successfully`, 'success');
                setQuestions([]);
                // Clear localStorage after successful submission
                localStorage.removeItem('evaluator_question_builder_questions');
                setHasUnsavedChanges(false);
                console.log('Cleared localStorage after successful submission');
            },
            onError: (errors) => {
                setIsSubmitting(false);
                console.error('Create errors', errors);
                window.showAlert('Failed to create questions', 'error');
            }
        });
    };

    return (
        <Layout user={user} routes={routes}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-up" style={{ animationDelay: '60ms' }}>
                <div className="mb-6 rounded-3xl border border-slate-800 bg-[#1D293D] text-white shadow-xl p-6 animate-fadeIn">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-1 flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Evaluator · Question Builder</p>
                                    <h1 className="text-2xl font-bold md:text-3xl">Question Builder</h1>
                                </div>
                            </div>
                            <p className="text-white/80 text-base">Create questions directly in your department bank</p>
                            {hasUnsavedChanges && questions.length > 0 && (
                                <div className="flex items-center gap-2 text-white/90 text-sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Questions saved locally ({questions.length} question{questions.length !== 1 ? 's' : ''})</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <a href={routes.question_bank || '/evaluator/question-bank'} className="bg-white text-[#1D293D] px-4 py-2 rounded-xl hover:bg-slate-50 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to Question Bank
                            </a>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h2 className="text-lg font-semibold text-gray-900">Create New Question</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
                                <textarea value={current.question} onChange={e => onChange('question', e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500" rows="4" placeholder="Enter your question..." required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Question Image (Optional)</label>
                                <div className="flex items-center space-x-3">
                                    {current.image && (<img src={current.image} alt="Question" className="w-20 h-20 object-cover rounded border" />)}
                                    <input type="file" accept="image/*" onChange={e => handleImage('image', e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                                    {current.image && (
                                        <button type="button" onClick={() => removeImage('image')} className="text-sm text-slate-700 hover:text-slate-900 px-3 py-1 border border-slate-300 rounded hover:bg-slate-100">Remove</button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Answer Options 
                                    <span className="text-xs text-gray-500 ml-2">(A is required, B-E are optional)</span>
                                </label>
                                <div className="space-y-4">
                                    {[1,2,3,4,5].map((i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-sm font-medium text-gray-600 w-6">{String.fromCharCode(64 + i)}.</span>
                                                <input 
                                                    value={current[`option${i}`]} 
                                                    onChange={e => onChange(`option${i}`, e.target.value)} 
                                                    className="flex-1 border-slate-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500" 
                                                    placeholder={`Option ${String.fromCharCode(64 + i)}${i === 1 ? ' (Required)' : ' (Optional)'}`} 
                                                    required={i === 1} 
                                                />
                                                {i === 1 && <span className="text-xs text-red-600 font-medium">*</span>}
                                            </div>
                                            <div className="flex items-center space-x-3 ml-9">
                                                {current[`option${i}_image`] && (<img src={current[`option${i}_image`]} alt={`Option ${String.fromCharCode(64 + i)}`} className="w-16 h-16 object-cover rounded border" />)}
                                                <input type="file" accept="image/*" onChange={e => handleImage(`option${i}_image`, e.target.files[0])} className="flex-1 text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                                                {current[`option${i}_image`] && (
                                                    <button type="button" onClick={() => removeImage(`option${i}_image`)} className="text-xs text-slate-700 hover:text-slate-900 px-2 py-1 border border-slate-300 rounded hover:bg-slate-100">Remove</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer *</label>
                                    <select value={current.correct_answer} onChange={e => onChange('correct_answer', e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500" required>
                                        {getAvailableOptions().map(a => (<option key={a} value={a}>{a}</option>))}
                                    </select>
                                    {getAvailableOptions().length === 0 && (
                                        <p className="text-xs text-red-600 mt-1">Please add at least one option</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                                    <div className="relative">
                                        <input value={current.category} onChange={e => onChange('category', e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500" placeholder="Enter category" list="evaluator-category-suggestions" required />
                                        {categories.length > 0 && (
                                            <datalist id="evaluator-category-suggestions">
                                                {categories.map((c, idx) => (<option key={idx} value={c} />))}
                                            </datalist>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Direction (Optional)</label>
                                <textarea value={current.direction} onChange={e => onChange('direction', e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500" rows="2" placeholder="Enter any special instructions..." />
                            </div>

                            <div className="pt-4 border-t border-slate-200">
                                <button onClick={addQuestion} className="w-full bg-[#10B981] text-white py-3 px-4 rounded-md hover:bg-[#059669] transition-colors font-medium flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    Add Question
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Created Questions ({questions.length})</h2>
                            {questions.length > 0 && (
                                <button onClick={clearAll} className="text-sm text-slate-700 hover:text-slate-900 px-3 py-1 border border-slate-300 rounded hover:bg-slate-100">Clear All</button>
                            )}
                        </div>
                        <div className="p-6">
                            {questions.length === 0 ? (
                                <div className="text-center py-8">
                                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                    <p className="text-gray-500">No questions created yet</p>
                                    <p className="text-sm text-gray-400">Add your first question using the form on the left</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {questions.map((q, idx) => (
                                        <div key={q.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-sm font-medium text-gray-600">Q{idx + 1}</span>
                                                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{q.category}</span>
                                                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">Answer: {q.correct_answer}</span>
                                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                                            Options: {getQuestionAvailableOptions(q).join(', ')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-900 mb-2 line-clamp-2">{q.question}</p>
                                                    <div className="text-xs text-gray-500">
                                                        {q.image && <span className="mr-3">📷 Has image</span>}
                                                        {[1,2,3,4,5].some(i => q[`option${i}_image`]) && <span>📷 Has option images</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-4">
                                                    <button onClick={() => editQuestion(q)} className="text-slate-700 hover:text-slate-900 text-sm">Edit</button>
                                                    <button onClick={() => removeQuestion(q.id)} className="text-slate-700 hover:text-slate-900 text-sm">Remove</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {questions.length > 0 && (
                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                                <button onClick={submit} disabled={isSubmitting} className="w-full bg-slate-700 text-white py-3 px-4 rounded-md hover:bg-slate-800 disabled:bg-slate-400 transition-colors font-medium flex items-center justify-center gap-2">
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Creating Questions...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Create {questions.length} Question{questions.length !== 1 ? 's' : ''}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <style jsx>{`
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                `}</style>
            </div>
        </Layout>
    );
};

export default EvaluatorQuestionBuilder;


