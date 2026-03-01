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
    const [showZeroScoreModal, setShowZeroScoreModal] = useState(false);
    const [zeroScoreData, setZeroScoreData] = useState(null);
    const [selectedZeroScoreExams, setSelectedZeroScoreExams] = useState([]);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
    const [showCompletedRegistrationsModal, setShowCompletedRegistrationsModal] = useState(false);
    const [completedRegistrationsData, setCompletedRegistrationsData] = useState(null);
    const [registrationSearchQuery, setRegistrationSearchQuery] = useState('');
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [showStatusChangeConfirmation, setShowStatusChangeConfirmation] = useState(false);
    const [statusChangeConfirmationText, setStatusChangeConfirmationText] = useState('');
    const [randomConfirmationString, setRandomConfirmationString] = useState('');
    const [newStatus, setNewStatus] = useState('');

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

    const handleMarkSelectedAsFinished = async () => {
        if (selectedInProgressExams.length === 0) {
            window?.showAlert?.('Please select at least one exam to mark as finished', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/guidance/exam-results/mark-selected-as-finished', {
                exam_ids: selectedInProgressExams
            });
            if (response.data.success) {
                window?.showAlert?.(response.data.message, 'success');
                setSelectedInProgressExams([]);
                setShowAllInProgressModal(false);
                // Refresh the data
                handleCheckAllInProgress();
            } else {
                window?.showAlert?.('Failed to mark exams as finished: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error marking exams as finished:', error);
            window?.showAlert?.('Error marking exams as finished: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelectAllInProgressExams = async () => {
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
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/guidance/exam-results/mark-selected-as-finished', {
                exam_ids: selectedInProgressExams
            });
            if (response.data.success) {
                window?.showAlert?.(response.data.message, 'success');
                setSelectedInProgressExams([]);
                setShowAllInProgressModal(false);
                // Refresh the data
                handleCheckAllInProgressExams();
            } else {
                window?.showAlert?.('Failed to mark exams as finished: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error marking exams as finished:', error);
            window?.showAlert?.('Error marking exams as finished: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelectAllZeroScoreExams = () => {
        if (selectedZeroScoreExams.length === zeroScoreData.exams.length) {
            setSelectedZeroScoreExams([]);
        } else {
            setSelectedZeroScoreExams(zeroScoreData.exams.map(exam => exam.id));
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

    const handleCheckZeroScoreExams = async () => {
        setIsLoading(true);
        setSelectedZeroScoreExams([]);
        try {
            const response = await axios.get('/guidance/exam-results/check-zero-score');
            setZeroScoreData(response.data);
            setShowZeroScoreModal(true);
        } catch (error) {
            console.error('Error checking zero score exams:', error);
            window?.showAlert?.('Error checking zero score exams: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelectZeroScoreExam = (resultId) => {
        setSelectedZeroScoreExams(prev => 
            prev.includes(resultId) 
                ? prev.filter(id => id !== resultId)
                : [...prev, resultId]
        );
    };

    const handleDeleteZeroScoreExams = async () => {
        if (selectedZeroScoreExams.length === 0) {
            window?.showAlert?.('Please select at least one exam to delete', 'error');
            return;
        }

        // Generate random string for confirmation
        const randomString = generateRandomString();
        setRandomConfirmationString(randomString);
        setDeleteConfirmationText('');
        setShowDeleteConfirmation(true);
    };

    const confirmDeleteZeroScoreExams = async () => {
        if (deleteConfirmationText !== randomConfirmationString) {
            window?.showAlert?.('Please type the exact confirmation string to proceed', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/guidance/exam-results/delete-zero-score', {
                exam_ids: selectedZeroScoreExams
            });
            if (response.data.success) {
                window?.showAlert?.(`Successfully deleted ${response.data.deleted_count} zero score exam result(s)!`, 'success');
                setShowDeleteConfirmation(false);
                setShowZeroScoreModal(false);
                setSelectedZeroScoreExams([]);
                setDeleteConfirmationText('');
                // Refresh the data
                handleCheckZeroScoreExams();
            } else {
                window?.showAlert?.('Delete failed: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting zero score exams:', error);
            window?.showAlert?.('Error deleting zero score exams: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
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

    const handleCheckCompletedRegistrations = async () => {
        setIsLoading(true);
        setRegistrationSearchQuery('');
        try {
            const response = await axios.get('/guidance/registrations/check-completed');
            setCompletedRegistrationsData(response.data);
            setShowCompletedRegistrationsModal(true);
        } catch (error) {
            console.error('Error checking completed registrations:', error);
            window?.showAlert?.('Error checking completed registrations: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchCompletedRegistrations = async () => {
        if (!registrationSearchQuery.trim()) {
            window?.showAlert?.('Please enter a search term', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.get('/guidance/registrations/search-completed', {
                params: { query: registrationSearchQuery }
            });
            setCompletedRegistrationsData(response.data);
        } catch (error) {
            console.error('Error searching completed registrations:', error);
            window?.showAlert?.('Error searching completed registrations: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const generateRandomString = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < 7; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleStatusChangeClick = (registration, status) => {
        setSelectedRegistration(registration);
        setNewStatus(status);
        const randomString = generateRandomString();
        setRandomConfirmationString(randomString);
        setStatusChangeConfirmationText('');
        setShowStatusChangeConfirmation(true);
    };

    const confirmStatusChange = async () => {
        if (statusChangeConfirmationText !== randomConfirmationString) {
            window?.showAlert?.('Please type the exact confirmation string to proceed', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/guidance/registrations/change-status', {
                registration_id: selectedRegistration.id,
                new_status: newStatus
            });
            if (response.data.success) {
                window?.showAlert?.(`Successfully changed status to ${newStatus}!`, 'success');
                setShowStatusChangeConfirmation(false);
                setSelectedRegistration(null);
                setStatusChangeConfirmationText('');
                setRandomConfirmationString('');
                setNewStatus('');
                // Refresh the data
                handleCheckCompletedRegistrations();
            } else {
                window?.showAlert?.('Status change failed: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error changing registration status:', error);
            window?.showAlert?.('Error changing registration status: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-10 animate-fadeIn">
                        <div className="flex items-center gap-4 pl-1 border-l-4 border-[#1447E6]">
                            <div className="w-12 h-12 rounded-xl bg-[#1447E6]/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[#1D293D] tracking-tight sm:text-3xl">Settings</h1>
                                <p className="text-slate-500 text-sm mt-0.5">System configuration and exam management</p>
                            </div>
                        </div>
                    </div>

                    {/* Exam Progress Management - 3x2 action cards */}
                    <section className="mb-10 animate-fadeIn" style={{ animationDelay: '80ms' }}>
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Exam Progress</h2>
                            <p className="text-slate-600 text-sm mt-0.5">Auto-clears daily at 6:00 AM</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 p-6">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-4 group-hover:bg-slate-200/80 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-[#1D293D] mb-1">Clear Exam Progress</h3>
                                <p className="text-sm text-slate-500 mb-4">Remove temporary session data. Usually not needed—runs automatically at 6 AM.</p>
                                <button onClick={handleClearExamProgress} disabled={isLoading} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {isLoading ? <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> : null}
                                    Clear Now
                                </button>
                            </div>
                            <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 p-6">
                                <div className="w-10 h-10 rounded-xl bg-[#1447E6]/10 text-[#1447E6] flex items-center justify-center mb-4 group-hover:bg-[#1447E6]/15 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-[#1D293D] mb-1">Check Exam Status</h3>
                                <p className="text-sm text-slate-500 mb-4">Find finished exams still marked &quot;In Progress&quot; and fix status (Pass/Fail).</p>
                                <button onClick={handleCheckExamStatus} disabled={isLoading} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#1447E6] text-white hover:bg-[#1240d0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {isLoading ? <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> : null}
                                    Check Status
                                </button>
                            </div>
                            <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 p-6">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-500/15 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-[#1D293D] mb-1">All In Progress</h3>
                                <p className="text-sm text-slate-500 mb-4">List exams with &quot;In Progress&quot; remarks. Mark as finished or delete selected.</p>
                                <button onClick={handleCheckAllInProgress} disabled={isLoading} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#1447E6] text-white hover:bg-[#1240d0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {isLoading ? <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> : null}
                                    View List
                                </button>
                            </div>
                            <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 p-6">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4 group-hover:bg-rose-500/15 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-[#1D293D] mb-1">Delete Abandoned</h3>
                                <p className="text-sm text-slate-500 mb-4">Permanently remove started-but-never-finished exams (0 answers). Completed exams are safe.</p>
                                <button onClick={handleClearInProgressExams} disabled={isLoading} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {isLoading ? <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> : null}
                                    Delete Abandoned
                                </button>
                            </div>
                            <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 p-6">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-[#1D293D] mb-1">Zero Score (0/150)</h3>
                                <p className="text-sm text-slate-500 mb-4">Find and delete exam results with 0/150 score that may be bugged or failed.</p>
                                <button onClick={handleCheckZeroScoreExams} disabled={isLoading} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {isLoading ? <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> : null}
                                    Check Zero Scores
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Registration Management */}
                    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-fadeIn" style={{ animationDelay: '120ms' }}>
                        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#1447E6]/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[#1D293D]">Registration Management</h2>
                                        <p className="text-sm text-slate-500">Manage incomplete registrations and completed status changes</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="group bg-white rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 p-5">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-500/15 transition-colors">
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-[#1D293D] mb-2">Completed Registrations</h3>
                                    <p className="text-sm text-slate-500 mb-4">Find and change status of completed registrations to assigned or cancelled.</p>
                                    <button onClick={handleCheckCompletedRegistrations} disabled={isLoading} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                        {isLoading ? <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> : null}
                                        Check Completed
                                    </button>
                                </div>
                                <div className="group bg-white rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 p-5">
                                    <div className="w-9 h-9 rounded-xl bg-[#1D293D]/10 text-[#1D293D] flex items-center justify-center mb-3 group-hover:bg-[#1D293D]/15 transition-colors">
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-[#1D293D] mb-2">Incomplete Registrations</h3>
                                    <p className="text-sm text-slate-500 mb-4">Find and fix incomplete student registrations.</p>
                                    <div className="mb-4">
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Find registrations older than</label>
                                        <select value={hours} onChange={(e) => setHours(parseInt(e.target.value))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1447E6]/20 focus:border-[#1447E6] bg-white text-[#1D293D]">
                                            <option value={1}>1 hour</option>
                                            <option value={24}>24 hours</option>
                                            <option value={72}>72 hours</option>
                                            <option value={168}>1 week</option>
                                        </select>
                                    </div>
                                    <button onClick={handleDryRun} disabled={isLoading} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#1D293D] text-white hover:bg-[#2a3245] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                        {isLoading ? <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                        Check Incomplete
                                    </button>
                                </div>
                            </div>

                            {dryRunData && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 mb-6">
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

                            {operationResult && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
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
                    </section>
                </div>
            </div>

            {/* Cleanup Confirmation Modal */}
            {showCleanupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setShowCleanupModal(false)} aria-hidden="true" />
                    <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-md z-50" onClick={e => e.stopPropagation()}>
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
                                            onClick={handleMarkSelectedAsFinished}
                                            disabled={selectedInProgressExams.length === 0 || isLoading}
                                            className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                                            {isLoading ? 'Marking...' : 'Mark as Finished'}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setShowDeleteInProgressModal(false)} aria-hidden="true" />
                    <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-md z-50" onClick={e => e.stopPropagation()}>
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

            {/* Zero Score Exams Modal */}
            {showZeroScoreModal && zeroScoreData && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowZeroScoreModal(false)}></div>
                    <div className="relative min-h-screen flex items-center justify-center p-4 z-50">
                        <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-orange-600">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Zero Score Exams (0/150)</h3>
                                        <p className="text-sm text-white/80">Exam results with 0 correct answers that may be bugged</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowZeroScoreModal(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto">
                                {zeroScoreData.found_count > 0 ? (
                                    <div className="p-6">
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-semibold text-[#1D293D]">Zero Score Exams Found</h4>
                                                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold border border-orange-300">
                                                    {zeroScoreData.exams.length} found
                                                </span>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-slate-200">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedZeroScoreExams.length === zeroScoreData.exams.length}
                                                                    onChange={toggleSelectAllZeroScoreExams}
                                                                    className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-600"
                                                                />
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">ID</th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Examinee</th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Score</th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Status</th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Finished At</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-slate-200">
                                                        {zeroScoreData.exams.map((exam) => (
                                                            <tr key={exam.id} className={`hover:bg-orange-50 ${selectedZeroScoreExams.includes(exam.id) ? 'bg-orange-50' : ''}`}>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedZeroScoreExams.includes(exam.id)}
                                                                        onChange={() => toggleSelectZeroScoreExam(exam.id)}
                                                                        className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-600"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#1D293D]">{exam.id}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{exam.examinee_name || 'N/A'}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full border bg-red-100 text-red-700 border-red-300">
                                                                        {exam.correct || 0}/{exam.total_items || 150}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                                                                        exam.status === 'failed' ? 'bg-red-100 text-red-700 border-red-300' : 
                                                                        exam.status === 'done' ? 'bg-orange-100 text-orange-700 border-orange-300' : 
                                                                        'bg-slate-100 text-slate-700 border-slate-300'
                                                                    }`}>
                                                                        {exam.status || 'Unknown'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                                                                    {exam.finished_at ? new Date(exam.finished_at).toLocaleString() : 'N/A'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-lg font-semibold text-[#1D293D] mb-2">All Good!</h4>
                                        <p className="text-slate-500">No exam results found with 0/150 score.</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            {zeroScoreData.found_count > 0 && (
                                <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
                                    <div className="text-sm text-slate-600">
                                        {selectedZeroScoreExams.length > 0 && (
                                            <span className="font-semibold text-orange-600">
                                                {selectedZeroScoreExams.length} exam(s) selected
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowZeroScoreModal(false)}
                                            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDeleteZeroScoreExams}
                                            disabled={selectedZeroScoreExams.length === 0 || isLoading}
                                            className="px-6 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                                            {isLoading ? 'Deleting...' : `Delete ${selectedZeroScoreExams.length} Selected`}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowDeleteConfirmation(false)} aria-hidden="true" />
                    <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-md z-50" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#1D293D]">Confirm Deletion</h3>
                                    <p className="text-sm text-slate-500">This action cannot be undone</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDeleteConfirmation(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-all duration-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-slate-700 mb-4">
                                You are about to permanently delete <strong>{selectedZeroScoreExams.length}</strong> zero score exam result(s). This action cannot be undone.
                            </p>
                            
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-semibold text-red-800">Warning</h4>
                                        <p className="text-sm text-red-700 mt-1">These exam records will be permanently deleted from the database.</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Type this confirmation string:
                                </label>
                                <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 mb-3 select-none" onCopy={(e) => e.preventDefault()}>
                                    <code className="text-lg font-mono text-slate-800 break-all user-select-none">{randomConfirmationString}</code>
                                </div>
                                <input
                                    type="text"
                                    value={deleteConfirmationText}
                                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                    placeholder="Type the confirmation string above"
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white text-[#1D293D] font-mono"
                                    onPaste={(e) => e.preventDefault()}
                                    onCopy={(e) => e.preventDefault()}
                                    onCut={(e) => e.preventDefault()}
                                    onDragStart={(e) => e.preventDefault()}
                                    onDrop={(e) => e.preventDefault()}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirmation(false);
                                    setDeleteConfirmationText('');
                                }}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteZeroScoreExams}
                                disabled={deleteConfirmationText !== randomConfirmationString || isLoading}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                                {isLoading ? 'Deleting...' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Completed Registrations Modal */}
            {showCompletedRegistrationsModal && completedRegistrationsData && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowCompletedRegistrationsModal(false)}></div>
                    <div className="relative min-h-screen flex items-center justify-center p-4 z-50">
                        <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-blue-600">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Completed Registrations</h3>
                                        <p className="text-sm text-white/80">Examinees with "completed" status that can be changed</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCompletedRegistrationsModal(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-6">
                                    {/* Search Bar */}
                                    <div className="mb-6">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={registrationSearchQuery}
                                                onChange={(e) => setRegistrationSearchQuery(e.target.value)}
                                                placeholder="Search by name, email, or ID..."
                                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-white text-[#1D293D]"
                                            />
                                            <svg className="absolute left-3 top-3 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            {registrationSearchQuery && (
                                                <button
                                                    onClick={() => setRegistrationSearchQuery('')}
                                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleSearchCompletedRegistrations}
                                            disabled={isLoading || !registrationSearchQuery.trim()}
                                            className="mt-3 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? 'Searching...' : 'Search'}
                                        </button>
                                    </div>

                                    {completedRegistrationsData.found_count > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-slate-200">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">ID</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Name</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">School Year</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Semester</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Current Status</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-200">
                                                    {completedRegistrationsData.registrations.map((registration) => (
                                                        <tr key={registration.id} className="hover:bg-blue-50">
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#1D293D]">{registration.id}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{registration.examinee_name}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{registration.school_year || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{registration.semester || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full border bg-green-100 text-green-700 border-green-300">
                                                                    {registration.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleStatusChangeClick(registration, 'assigned')}
                                                                        className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                                                                    >
                                                                        Assign
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusChangeClick(registration, 'cancelled')}
                                                                        className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h4 className="text-lg font-semibold text-[#1D293D] mb-2">No Completed Registrations Found</h4>
                                            <p className="text-slate-500">No examinees with "completed" status found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Change Confirmation Modal */}
            {showStatusChangeConfirmation && selectedRegistration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowStatusChangeConfirmation(false)} aria-hidden="true" />
                    <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-md z-50" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#1D293D]">Confirm Status Change</h3>
                                    <p className="text-sm text-slate-500">This action requires verification</p>
                                </div>
                            </div>
                            <button onClick={() => setShowStatusChangeConfirmation(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-all duration-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-slate-700 mb-4">
                                You are about to change the status of <strong>{selectedRegistration.examinee_name}</strong> from "completed" to <strong>{newStatus}</strong>.
                            </p>
                            
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-semibold text-amber-800">Verification Required</h4>
                                        <p className="text-sm text-amber-700 mt-1">Please type the exact confirmation string below to proceed.</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Type this confirmation string:
                                </label>
                                <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 mb-3">
                                    <code className="text-lg font-mono text-slate-800 break-all">{randomConfirmationString}</code>
                                </div>
                                <input
                                    type="text"
                                    value={statusChangeConfirmationText}
                                    onChange={(e) => setStatusChangeConfirmationText(e.target.value)}
                                    placeholder="Type the confirmation string above"
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white text-[#1D293D] font-mono"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowStatusChangeConfirmation(false);
                                    setStatusChangeConfirmationText('');
                                    setRandomConfirmationString('');
                                    setNewStatus('');
                                }}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmStatusChange}
                                disabled={statusChangeConfirmationText !== randomConfirmationString || isLoading}
                                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                                {isLoading ? 'Changing...' : 'Change Status'}
                            </button>
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
