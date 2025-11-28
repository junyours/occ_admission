import React, { useState } from 'react';
import axios from 'axios';
import Layout from '../../Components/Layout';

const Settings = ({ user }) => {
    const [dryRunData, setDryRunData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCleanupModal, setShowCleanupModal] = useState(false);
    const [hours, setHours] = useState(1);
    const [operationResult, setOperationResult] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showExamStatusModal, setShowExamStatusModal] = useState(false);
    const [examStatusData, setExamStatusData] = useState(null);
    const [selectedExams, setSelectedExams] = useState([]);
    const [showAllInProgressModal, setShowAllInProgressModal] = useState(false);
    const [allInProgressData, setAllInProgressData] = useState(null);
    const [selectedInProgressExams, setSelectedInProgressExams] = useState([]);
    const [showDeleteInProgressModal, setShowDeleteInProgressModal] = useState(false);
    const [inProgressSearchQuery, setInProgressSearchQuery] = useState('');

    const handleDryRun = async () => {
        setIsLoading(true);
        setSelectedUsers([]); // Clear selection when running new check
        try {
            const response = await axios.get('/guidance/registration-management/dry-run', {
                params: { hours }
            });
            setDryRunData(response.data);
            setOperationResult(null);
        } catch (error) {
            console.error('Error running dry run:', error);
            window?.showAlert?.('Error running dry run: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelectUser = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const toggleSelectAll = () => {
        const filteredUsers = dryRunData.incomplete_registrations.filter(reg => 
            reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reg.id.toString().includes(searchQuery)
        );
        
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(reg => reg.id));
        }
    };

    const handleCleanup = async () => {
        if (selectedUsers.length === 0) {
            window?.showAlert?.('Please select at least one user to delete', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/guidance/registration-management/cleanup', { 
                hours,
                user_ids: selectedUsers 
            });
            setOperationResult(response.data);
            setShowCleanupModal(false);
            if (response.data.success) {
                window?.showAlert?.(`Successfully deleted ${response.data.deleted_count} user(s)!`, 'success');
                setSelectedUsers([]);
                // Refresh the data
                handleDryRun();
            } else {
                window?.showAlert?.('Cleanup failed: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error running cleanup:', error);
            window?.showAlert?.('Error running cleanup: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFix = async () => {
        if (selectedUsers.length === 0) {
            window?.showAlert?.('Please select at least one user to fix', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/guidance/registration-management/fix', {
                user_ids: selectedUsers
            });
            setOperationResult(response.data);
            if (response.data.success) {
                window?.showAlert?.(`Successfully fixed ${response.data.fixed_count} incomplete registration(s)!`, 'success');
                setSelectedUsers([]);
                // Refresh the data
                handleDryRun();
            } else {
                window?.showAlert?.('Fix failed: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error fixing registrations:', error);
            window?.showAlert?.('Error fixing registrations: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearExamProgress = async () => {
        if (!window.confirm('Are you sure you want to clear all exam progress records? This action cannot be undone.')) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/guidance/exam-progress/clear');
            if (response.data.success) {
                window?.showAlert?.(`Successfully cleared ${response.data.deleted_count} exam progress record(s)!`, 'success');
            } else {
                window?.showAlert?.('Failed to clear exam progress: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error clearing exam progress:', error);
            window?.showAlert?.('Error clearing exam progress: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearInProgressExams = async () => {
        if (!window.confirm('⚠️ WARNING: This will permanently delete ABANDONED exam results from the database.\n\nOnly deletes exams where:\n• Status: "In Progress"\n• Not finished (finished_at = NULL)\n• No questions answered (total_items = 0)\n• No correct answers (correct = 0)\n\nCompleted exams (with Pass/Fail status) will NOT be deleted.\n\nThis action CANNOT be undone. Are you sure?')) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/guidance/exam-results/clear-in-progress');
            if (response.data.success) {
                window?.showAlert?.(`Successfully deleted ${response.data.deleted_count} abandoned exam(s)!`, 'success');
            } else {
                window?.showAlert?.('Failed to clear abandoned exams: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error clearing abandoned exams:', error);
            window?.showAlert?.('Error clearing abandoned exams: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckExamStatus = async () => {
        setIsLoading(true);
        setSelectedExams([]);
        try {
            const response = await axios.get('/guidance/exam-results/check-in-progress');
            setExamStatusData(response.data);
            setShowExamStatusModal(true);
        } catch (error) {
            console.error('Error checking exam status:', error);
            window?.showAlert?.('Error checking exam status: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckAllInProgress = async () => {
        setIsLoading(true);
        setSelectedInProgressExams([]); // Clear selection when running new check
        setInProgressSearchQuery(''); // Clear search query
        try {
            const response = await axios.get('/guidance/exam-results/check-all-in-progress');
            console.log('All In Progress Exams Response:', response.data);
            setAllInProgressData(response.data);
            setShowAllInProgressModal(true);
        } catch (error) {
            console.error('Error checking all in-progress exams:', error);
            window?.showAlert?.('Error checking all in-progress exams: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelectInProgressExam = (resultId) => {
        setSelectedInProgressExams(prev => 
            prev.includes(resultId) 
                ? prev.filter(id => id !== resultId)
                : [...prev, resultId]
        );
    };

    const toggleSelectAllInProgressExams = () => {
        // Filter exams based on search query
        const filteredExams = allInProgressData.exams.filter(exam => 
            exam.examinee_full_name.toLowerCase().includes(inProgressSearchQuery.toLowerCase()) ||
            exam.resultId.toString().includes(inProgressSearchQuery) ||
            exam.examId.toString().includes(inProgressSearchQuery)
        );
        
        const filteredIds = filteredExams.map(exam => exam.resultId);
        const allFilteredSelected = filteredIds.every(id => selectedInProgressExams.includes(id));
        
        if (allFilteredSelected) {
            // Deselect all filtered exams
            setSelectedInProgressExams(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            // Select all filtered exams
            setSelectedInProgressExams(prev => [...new Set([...prev, ...filteredIds])]);
        }
    };

    const handleDeleteSelectedInProgress = async () => {
        if (selectedInProgressExams.length === 0) {
            window?.showAlert?.('Please select at least one exam to delete', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/guidance/exam-results/delete-selected-in-progress', {
                exam_ids: selectedInProgressExams
            });
            if (response.data.success) {
                window?.showAlert?.(`Successfully deleted ${response.data.deleted_count} exam result(s)!`, 'success');
                setShowDeleteInProgressModal(false);
                setSelectedInProgressExams([]);
                // Refresh the data
                handleCheckAllInProgress();
            } else {
                window?.showAlert?.('Delete failed: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting selected exams:', error);
            window?.showAlert?.('Error deleting exams: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelectExam = (examId) => {
        setSelectedExams(prev => 
            prev.includes(examId) 
                ? prev.filter(id => id !== examId)
                : [...prev, examId]
        );
    };

    const toggleSelectAllExams = () => {
        if (selectedExams.length === examStatusData.exams.length) {
            setSelectedExams([]);
        } else {
            setSelectedExams(examStatusData.exams.map(exam => exam.resultId));
        }
    };

    const handleFixSelectedExams = async () => {
        if (selectedExams.length === 0) {
            window?.showAlert?.('Please select at least one exam to fix', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/guidance/exam-results/fix-in-progress-remarks', {
                exam_ids: selectedExams
            });
            if (response.data.success) {
                window?.showAlert?.(`${response.data.message}`, 'success');
                setShowExamStatusModal(false);
                setSelectedExams([]);
            } else {
                window?.showAlert?.('Failed to fix exam remarks: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error fixing exam remarks:', error);
            window?.showAlert?.('Error fixing exam remarks: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-up" style={{ animationDelay: '60ms' }}>
                    {/* Header Section */}
                    <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm overflow-hidden animate-fadeIn animate-up" style={{ animationDelay: '120ms' }}>
                        <div className="px-8 py-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold md:text-4xl">Settings</h1>
                                    <p className="text-sm text-white/80 mt-1">System configuration and management tools</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 animate-up" style={{ animationDelay: '180ms' }}>
                        {/* Exam Progress Management Section */}
                        <div className="p-8 border-b border-slate-200 animate-up" style={{ animationDelay: '240ms' }}>
                            <div className="mb-6">
                                <h3 className="text-xl font-semibold text-[#1D293D] mb-2">Exam Progress Management</h3>
                                <p className="text-slate-600">Clear exam progress data (automatically clears daily at 6:00 AM)</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleClearExamProgress}
                                    disabled={isLoading}
                                    className="bg-slate-600 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                                >
                                    {isLoading ? (
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    )}
                                    Clear Exam Progress Now
                                </button>

                                <button
                                    onClick={handleCheckExamStatus}
                                    disabled={isLoading}
                                    className="bg-[#1447E6] text-white px-6 py-3 rounded-xl hover:bg-[#1240d0] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                                >
                                    {isLoading ? (
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                    Check Exam Status
                                </button>

                                <button
                                    onClick={handleCheckAllInProgress}
                                    disabled={isLoading}
                                    className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                                >
                                    {isLoading ? (
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    )}
                                    Check All In Progress
                                </button>

                                <button
                                    onClick={handleClearInProgressExams}
                                    disabled={isLoading}
                                    className="bg-slate-600 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                                >
                                    {isLoading ? (
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    )}
                                    Delete Abandoned Exams
                                </button>
                            </div>
                            
                            <div className="mt-4 space-y-3">
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-[#1D293D] mb-1">Clear Exam Progress Now</h4>
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                Manually clear all exam progress records from the database. This action removes temporary exam session data.
                                            </p>
                                            <p className="text-xs text-slate-500 mt-2 font-medium">
                                                Note: The system automatically clears exam progress every day at 6:00 AM, so manual clearing is usually not needed.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-[#1D293D] mb-1">Check Exam Status</h4>
                                            <p className="text-sm text-slate-600 leading-relaxed mb-2">
                                                Find exams that are finished but still marked as &quot;In Progress&quot;. This helps identify exams that need their status updated.
                                            </p>
                                            <ul className="text-xs text-slate-600 space-y-1 ml-4 list-disc">
                                                <li>View all finished exams with incorrect status</li>
                                                <li>Select which exams to fix</li>
                                                <li>System will mark them as &quot;Passed&quot; (≥10% score) or &quot;Failed&quot; (&lt;10% score)</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-[#1D293D] mb-1">Delete Abandoned Exams</h4>
                                            <p className="text-sm text-slate-600 leading-relaxed mb-2">
                                                Permanently remove exams that were started but never completed. Only deletes exams that meet ALL of these conditions:
                                            </p>
                                            <ul className="text-xs text-slate-600 space-y-1 ml-4 list-disc mb-2">
                                                <li>Status is &quot;In Progress&quot;</li>
                                                <li>Not finished (no completion time)</li>
                                                <li>No questions answered (0 total items)</li>
                                                <li>No correct answers (0 correct)</li>
                                            </ul>
                                            <p className="text-xs text-slate-600 font-medium bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                                ✓ Safe: Completed exams with Pass/Fail status will NOT be deleted
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Registration Management Section */}
                        <div className="p-8 animate-up" style={{ animationDelay: '300ms' }}>
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold text-[#1D293D] mb-2">Registration Management</h3>
                                <p className="text-slate-600">Find and fix incomplete student registrations that may be causing issues in the system</p>
                            </div>

                            {/* Hours Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-[#1D293D] mb-2">
                                    Find registrations older than:
                                </label>
                                <select 
                                    value={hours} 
                                    onChange={(e) => setHours(parseInt(e.target.value))}
                                    className="border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] bg-white text-[#1D293D]"
                                >
                                    <option value={1}>1 hour</option>
                                    <option value={24}>24 hours</option>
                                    <option value={72}>72 hours</option>
                                    <option value={168}>1 week</option>
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-4 mb-8">
                                <button
                                    onClick={handleDryRun}
                                    disabled={isLoading}
                                    className="bg-[#1447E6] text-white px-6 py-3 rounded-xl hover:bg-[#1240d0] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                                >
                                    {isLoading ? (
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                    Check Incomplete Registrations
                                </button>

                              
                            </div>

                            {/* Dry Run Results */}
                            {dryRunData && (
                                <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-semibold text-[#1D293D]">Incomplete Registrations Found</h4>
                                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-semibold border border-slate-300">
                                            {dryRunData.incomplete_registrations.filter(reg => 
                                                reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                reg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                reg.id.toString().includes(searchQuery)
                                            ).length} found
                                        </span>
                                    </div>

                                    {dryRunData.found_count > 0 ? (
                                        <div className="space-y-4">
                                            {/* Search Bar */}
                                            <div className="mb-4">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        placeholder="Search by name, email, or ID..."
                                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] transition-all bg-white text-[#1D293D]"
                                                    />
                                                    <svg className="absolute left-3 top-3 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    {searchQuery && (
                                                        <button
                                                            onClick={() => setSearchQuery('')}
                                                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-slate-200">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedUsers.length > 0 && selectedUsers.length === dryRunData.incomplete_registrations.filter(reg => 
                                                                        reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                        reg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                        reg.id.toString().includes(searchQuery)
                                                                    ).length}
                                                                    onChange={toggleSelectAll}
                                                                    className="w-4 h-4 text-[#1447E6] border-slate-300 rounded focus:ring-[#1447E6]"
                                                                />
                                                            </th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">ID</th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Email</th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Name</th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Email Verified</th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Issue Type</th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Created At</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-slate-200">
                                                        {dryRunData.incomplete_registrations
                                                            .filter(reg => 
                                                                reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                reg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                reg.id.toString().includes(searchQuery)
                                                            )
                                                            .map((reg, index) => (
                                                                <tr key={reg.id} className={`hover:bg-[#1447E6]/5 ${selectedUsers.includes(reg.id) ? 'bg-[#1447E6]/10' : ''}`}>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedUsers.includes(reg.id)}
                                                                            onChange={() => toggleSelectUser(reg.id)}
                                                                            className="w-4 h-4 text-[#1447E6] border-slate-300 rounded focus:ring-[#1447E6]"
                                                                        />
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1D293D]">{reg.id}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{reg.email}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{reg.name}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${reg.email_verified === 'Yes' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                                                                            {reg.email_verified}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${reg.issue_type === 'Missing examinee data' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                                                                            {reg.issue_type}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{reg.created_at}</td>
                                                                </tr>
                                                            ))
                                                        }
                                                        {dryRunData.incomplete_registrations.filter(reg => 
                                                            reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                            reg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                            reg.id.toString().includes(searchQuery)
                                                        ).length === 0 && searchQuery && (
                                                            <tr>
                                                                <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                                                                    <div className="flex flex-col items-center gap-2">
                                                                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                        </svg>
                                                                        <p className="text-sm">No results found for "{searchQuery}"</p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="flex items-center justify-between pt-4">
                                                <div className="text-sm text-slate-600">
                                                    {selectedUsers.length > 0 && (
                                                        <span className="font-semibold text-[#1447E6]">
                                                            {selectedUsers.length} user(s) selected
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={handleFix}
                                                        disabled={selectedUsers.length === 0}
                                                        className="bg-[#1447E6] text-white px-4 py-2 rounded-xl hover:bg-[#1240d0] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Fix Selected
                                                    </button>
                                                    <button
                                                        onClick={() => setShowCleanupModal(true)}
                                                        disabled={selectedUsers.length === 0}
                                                        className="bg-slate-600 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Delete Selected
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h4 className="text-lg font-semibold text-[#1D293D] mb-2">All Good!</h4>
                                            <p className="text-slate-500">No incomplete registrations found for the selected time period.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Operation Results */}
                            {operationResult && (
                                <div className="bg-white rounded-xl border border-slate-200 p-6">
                                    <h4 className="text-lg font-semibold text-[#1D293D] mb-4">Operation Result</h4>
                                    <div className={`p-4 rounded-xl border ${operationResult.success ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {operationResult.success ? (
                                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )}
                                            <span className={`font-semibold text-[#1D293D]`}>
                                                {operationResult.message}
                                            </span>
                                        </div>
                                        {operationResult.raw_output && (
                                            <details className="mt-3">
                                                <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800">View Raw Output</summary>
                                                <pre className="mt-2 text-xs bg-slate-100 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap border border-slate-200">{operationResult.raw_output}</pre>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cleanup Confirmation Modal */}
            {showCleanupModal && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCleanupModal(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-md mx-4 z-50">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#1D293D]">Confirm Cleanup</h3>
                                    <p className="text-sm text-slate-500">This will permanently delete incomplete registrations</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCleanupModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-all duration-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-slate-700 mb-4">
                                You are about to delete <strong>{selectedUsers.length}</strong> selected user(s).
                            </p>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-slate-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-semibold text-[#1D293D]">Warning</h4>
                                        <p className="text-sm text-slate-600 mt-1">This action cannot be undone. Make sure you want to proceed.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCleanupModal(false)}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCleanup}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                ) : null}
                                {isLoading ? 'Deleting...' : 'Yes, Delete Them'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* All In Progress Exams Modal */}
            {showAllInProgressModal && allInProgressData && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAllInProgressModal(false)}></div>
                    <div className="relative min-h-screen flex items-center justify-center p-4 z-50">
                        <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-[#1D293D]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">All In Progress Exams</h3>
                                        <p className="text-sm text-white/80">Exams with "In Progress" remarks</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAllInProgressModal(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {allInProgressData.found_count > 0 ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm text-slate-600">
                                                Found <strong className="text-emerald-600">{allInProgressData.found_count}</strong> exam(s) with "In Progress" remarks
                                            </span>
                                        </div>

                                        {/* Search Bar */}
                                        <div className="mb-4">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={inProgressSearchQuery}
                                                    onChange={(e) => setInProgressSearchQuery(e.target.value)}
                                                    placeholder="Search by examinee name, result ID, or exam ID..."
                                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all bg-white text-[#1D293D]"
                                                />
                                                <svg className="absolute left-3 top-3 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                                {inProgressSearchQuery && (
                                                    <button
                                                        onClick={() => setInProgressSearchQuery('')}
                                                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-slate-200">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left">
                                                            <input
                                                                type="checkbox"
                                                                checked={(() => {
                                                                    const filteredExams = allInProgressData.exams.filter(exam => 
                                                                        exam.examinee_full_name.toLowerCase().includes(inProgressSearchQuery.toLowerCase()) ||
                                                                        exam.resultId.toString().includes(inProgressSearchQuery) ||
                                                                        exam.examId.toString().includes(inProgressSearchQuery)
                                                                    );
                                                                    return filteredExams.length > 0 && filteredExams.every(exam => selectedInProgressExams.includes(exam.resultId));
                                                                })()}
                                                                onChange={toggleSelectAllInProgressExams}
                                                                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-600"
                                                            />
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Result ID</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Examinee Full Name</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Exam ID</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Status</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Score</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Started At</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Finished At</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-200">
                                                    {allInProgressData.exams
                                                        .filter(exam => 
                                                            exam.examinee_full_name.toLowerCase().includes(inProgressSearchQuery.toLowerCase()) ||
                                                            exam.resultId.toString().includes(inProgressSearchQuery) ||
                                                            exam.examId.toString().includes(inProgressSearchQuery)
                                                        )
                                                        .map((exam) => (
                                                            <tr key={exam.resultId} className={`hover:bg-emerald-50 ${selectedInProgressExams.includes(exam.resultId) ? 'bg-emerald-100' : ''}`}>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedInProgressExams.includes(exam.resultId)}
                                                                        onChange={() => toggleSelectInProgressExam(exam.resultId)}
                                                                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-600"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#1D293D]">{exam.resultId}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 font-medium">{exam.examinee_full_name}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{exam.examId}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${exam.is_finished ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-yellow-100 text-yellow-700 border-yellow-300'}`}>
                                                                        {exam.is_finished ? 'Finished' : 'Ongoing'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{exam.correct}/{exam.total_items}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{exam.started_at || 'N/A'}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{exam.finished_at || 'N/A'}</td>
                                                            </tr>
                                                        ))
                                                    }
                                                    {allInProgressData.exams.filter(exam => 
                                                        exam.examinee_full_name.toLowerCase().includes(inProgressSearchQuery.toLowerCase()) ||
                                                        exam.resultId.toString().includes(inProgressSearchQuery) ||
                                                        exam.examId.toString().includes(inProgressSearchQuery)
                                                    ).length === 0 && inProgressSearchQuery && (
                                                        <tr>
                                                            <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                    </svg>
                                                                    <p className="text-sm">No results found for "{inProgressSearchQuery}"</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-lg font-semibold text-[#1D293D] mb-2">All Good!</h4>
                                        <p className="text-slate-500">No exams found with "In Progress" remarks.</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            {allInProgressData.found_count > 0 && (
                                <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
                                    <div className="text-sm text-slate-600">
                                        {inProgressSearchQuery && (
                                            <span className="text-slate-500 mr-3">
                                                Showing {allInProgressData.exams.filter(exam => 
                                                    exam.examinee_full_name.toLowerCase().includes(inProgressSearchQuery.toLowerCase()) ||
                                                    exam.resultId.toString().includes(inProgressSearchQuery) ||
                                                    exam.examId.toString().includes(inProgressSearchQuery)
                                                ).length} of {allInProgressData.found_count} exam(s)
                                            </span>
                                        )}
                                        {selectedInProgressExams.length > 0 && (
                                            <span className="font-semibold text-emerald-600">
                                                {selectedInProgressExams.length} exam(s) selected
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowAllInProgressModal(false)}
                                            className="px-6 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteInProgressModal(true)}
                                            disabled={selectedInProgressExams.length === 0}
                                            className="px-6 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Delete Selected
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete In Progress Confirmation Modal */}
            {showDeleteInProgressModal && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDeleteInProgressModal(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-md mx-4 z-50">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#1D293D]">Confirm Deletion</h3>
                                    <p className="text-sm text-slate-500">This will permanently delete exam results</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDeleteInProgressModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-all duration-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-slate-700 mb-4">
                                You are about to delete <strong>{selectedInProgressExams.length}</strong> selected exam result(s).
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-semibold text-[#1D293D]">Warning</h4>
                                        <p className="text-sm text-slate-600 mt-1">This action cannot be undone. Make sure you want to proceed.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteInProgressModal(false)}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteSelectedInProgress}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                ) : null}
                                {isLoading ? 'Deleting...' : 'Yes, Delete Them'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exam Status Modal */}
            {showExamStatusModal && examStatusData && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowExamStatusModal(false)}></div>
                    <div className="relative min-h-screen flex items-center justify-center p-4">
                        <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-[#1D293D]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Exam Status Check</h3>
                                        <p className="text-sm text-white/80">Finished exams marked as "In Progress"</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowExamStatusModal(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {examStatusData.found_count > 0 ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm text-slate-600">
                                                Found <strong className="text-[#1447E6]">{examStatusData.found_count}</strong> exam(s) that need status update
                                            </span>
                                            {selectedExams.length > 0 && (
                                                <span className="text-sm font-semibold text-[#1447E6]">
                                                    {selectedExams.length} selected
                                                </span>
                                            )}
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-slate-200">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedExams.length > 0 && selectedExams.length === examStatusData.exams.length}
                                                                onChange={toggleSelectAllExams}
                                                                className="w-4 h-4 text-[#1447E6] border-slate-300 rounded focus:ring-[#1447E6]"
                                                            />
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">ID</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Examinee</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Score</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Percentage</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Will Be</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Finished At</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-200">
                                                    {examStatusData.exams.map((exam) => {
                                                        const willPass = exam.percentage >= 10;
                                                        return (
                                                            <tr key={exam.resultId} className={`hover:bg-[#1447E6]/5 ${selectedExams.includes(exam.resultId) ? 'bg-[#1447E6]/10' : ''}`}>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedExams.includes(exam.resultId)}
                                                                        onChange={() => toggleSelectExam(exam.resultId)}
                                                                        className="w-4 h-4 text-[#1447E6] border-slate-300 rounded focus:ring-[#1447E6]"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#1D293D]">{exam.resultId}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{exam.examinee_name}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{exam.correct}/{exam.total_items}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#1D293D]">{exam.percentage.toFixed(1)}%</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${willPass ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                                                                        {willPass ? 'Passed' : 'Failed'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{new Date(exam.finished_at).toLocaleString()}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-lg font-semibold text-[#1D293D] mb-2">All Good!</h4>
                                        <p className="text-slate-500">No finished exams found with "In Progress" status.</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            {examStatusData.found_count > 0 && (
                                <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
                                    <button
                                        onClick={() => setShowExamStatusModal(false)}
                                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleFixSelectedExams}
                                        disabled={selectedExams.length === 0 || isLoading}
                                        className="px-6 py-2 text-sm font-semibold text-white bg-[#1447E6] hover:bg-[#1240d0] rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isLoading ? (
                                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                        {isLoading ? 'Fixing...' : `Fix ${selectedExams.length} Selected`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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

export default Settings;
