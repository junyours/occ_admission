import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function ClosedExamSchedules({ user, guidanceCounselor, closedSchedules, archivedRegistrations, settings, flash }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sessionFilter, setSessionFilter] = useState('all');
    const [archivedSearchQuery, setArchivedSearchQuery] = useState('');
    const [expandedMonths, setExpandedMonths] = useState({});
    const [expandedYears, setExpandedYears] = useState({});
    const [expandedArchivedYears, setExpandedArchivedYears] = useState({});
    const [expandedArchivedMonths, setExpandedArchivedMonths] = useState({});
    const [expandedArchivedSessions, setExpandedArchivedSessions] = useState({});
    // Selection state for bulk operations
    const [selectedRegistrations, setSelectedRegistrations] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [monthSelectAll, setMonthSelectAll] = useState({}); // Track select all per month
    const [sessionSelectAll, setSessionSelectAll] = useState({}); // Track select all per session
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Tab state for switching between views
    const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' or 'archived'
    
    // Initialize pagination from URL params
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const page = parseInt(urlParams.get('page')) || 1;
        const perPage = parseInt(urlParams.get('per_page')) || 10;
        setCurrentPage(page);
        setItemsPerPage(perPage);
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        
        if (typeof timeString === 'string' && timeString.includes(':')) {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours);
            const minute = parseInt(minutes);
            
            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                const time = new Date();
                time.setHours(hour, minute, 0);
                return time.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            }
        }
        
        return 'Invalid Time';
    };

    const formatDateTime = (dateString, timeString) => {
        const date = formatDate(dateString);
        const time = formatTime(timeString);
        return `${date} at ${time}`;
    };

    const getFilteredClosedSchedules = () => {
        if (!closedSchedules?.data) return {};

        let filtered = closedSchedules.data;

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(schedule => {
                const date = formatDate(schedule.exam_date).toLowerCase();
                const session = schedule.session?.toLowerCase() || '';
                const time = formatTime(schedule.start_time).toLowerCase();
                return date.includes(query) || session.includes(query) || time.includes(query);
            });
        }

        // Apply session filter
        if (sessionFilter !== 'all') {
            filtered = filtered.filter(schedule => schedule.session === sessionFilter);
        }

        // Group by month
        const groupedByMonth = {};
        filtered.forEach(schedule => {
            const date = new Date(schedule.exam_date);
            const monthKey = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long' 
            });
            
            if (!groupedByMonth[monthKey]) {
                groupedByMonth[monthKey] = {
                    month: monthKey,
                    schedules: []
                };
            }
            
            groupedByMonth[monthKey].schedules.push(schedule);
        });

        // Sort months chronologically
        const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
            const dateA = new Date(a + ' 1');
            const dateB = new Date(b + ' 1');
            return dateB - dateA; // Most recent first
        });

        const result = {};
        sortedMonths.forEach(month => {
            result[month] = groupedByMonth[month];
        });

        return result;
    };

    // Group by year, then by month inside each year
    const getYearGroupedClosedSchedules = () => {
        const byMonth = getFilteredClosedSchedules();
        const byYear = {};
        Object.keys(byMonth).forEach((monthKey) => {
            const date = new Date(monthKey + ' 1');
            const yearKey = String(date.getFullYear());
            if (!byYear[yearKey]) {
                byYear[yearKey] = { year: yearKey, months: {} };
            }
            byYear[yearKey].months[monthKey] = byMonth[monthKey];
        });

        // Sort years desc
        const sortedYears = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
        const result = {};
        sortedYears.forEach((y) => {
            // Sort months within each year desc by chronological value
            const months = byYear[y].months;
            const sortedMonths = Object.keys(months).sort((a, b) => {
                const da = new Date(a + ' 1');
                const db = new Date(b + ' 1');
                return db - da;
            });
            const ordered = {};
            sortedMonths.forEach((m) => (ordered[m] = months[m]));
            result[y] = { year: y, months: ordered };
        });
        return result;
    };

    // Group archived registrations by year, then by month, then by session
    const getYearGroupedArchivedRegistrations = () => {
        if (!archivedRegistrations?.data) return {};

        let filteredRegistrations = archivedRegistrations.data;

        // Apply search filter for archived registrations
        if (archivedSearchQuery.trim()) {
            const query = archivedSearchQuery.trim().toLowerCase();
            filteredRegistrations = filteredRegistrations.filter(reg => {
                const name = (reg.examinee_name || '').toLowerCase();
                const school = (reg.school_name || '').toLowerCase();
                const assignedDate = reg.assigned_exam_date ? formatDate(reg.assigned_exam_date).toLowerCase() : '';
                const session = (reg.assigned_session || '').toLowerCase();
                const status = (reg.status || '').toLowerCase();
                
                return name.includes(query) || 
                       school.includes(query) || 
                       assignedDate.includes(query) || 
                       session.includes(query) || 
                       status.includes(query);
            });
        }

        const byYear = {};
        filteredRegistrations.forEach((reg) => {
            const date = new Date(reg.assigned_exam_date || reg.registration_date);
            const yearKey = String(date.getFullYear());
            const monthKey = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long' 
            });
            const sessionKey = reg.assigned_session || 'no_session';
            
            if (!byYear[yearKey]) {
                byYear[yearKey] = { year: yearKey, months: {} };
            }
            if (!byYear[yearKey].months[monthKey]) {
                byYear[yearKey].months[monthKey] = { month: monthKey, sessions: {} };
            }
            if (!byYear[yearKey].months[monthKey].sessions[sessionKey]) {
                byYear[yearKey].months[monthKey].sessions[sessionKey] = { 
                    session: sessionKey, 
                    registrations: [] 
                };
            }
            byYear[yearKey].months[monthKey].sessions[sessionKey].registrations.push(reg);
        });

        // Sort years desc
        const sortedYears = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
        const result = {};
        sortedYears.forEach((y) => {
            // Sort months within each year desc by chronological value
            const months = byYear[y].months;
            const sortedMonths = Object.keys(months).sort((a, b) => {
                const da = new Date(a + ' 1');
                const db = new Date(b + ' 1');
                return db - da;
            });
            const orderedMonths = {};
            sortedMonths.forEach((m) => {
                // Sort sessions within each month (morning first, then afternoon, then no_session)
                const sessions = months[m].sessions;
                const sortedSessions = Object.keys(sessions).sort((a, b) => {
                    const sessionOrder = { 'morning': 0, 'afternoon': 1, 'no_session': 2 };
                    return (sessionOrder[a] || 2) - (sessionOrder[b] || 2);
                });
                const orderedSessions = {};
                sortedSessions.forEach((s) => (orderedSessions[s] = sessions[s]));
                orderedMonths[m] = { month: months[m].month, sessions: orderedSessions };
            });
            result[y] = { year: y, months: orderedMonths };
        });
        return result;
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSessionFilter('all');
    };

    // Pagination helper functions
    const updateURL = (page, perPage) => {
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        url.searchParams.set('per_page', perPage);
        window.history.replaceState({}, '', url);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        updateURL(page, itemsPerPage);
    };

    const handlePerPageChange = (perPage) => {
        setItemsPerPage(perPage);
        setCurrentPage(1);
        updateURL(1, perPage);
    };

    // Get paginated registrations for a specific month
    const getPaginatedRegistrations = (registrations) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return {
            data: registrations.slice(startIndex, endIndex),
            total: registrations.length,
            currentPage,
            totalPages: Math.ceil(registrations.length / itemsPerPage),
            from: registrations.length > 0 ? startIndex + 1 : 0,
            to: Math.min(endIndex, registrations.length)
        };
    };

    // Selection helper functions
    const handleSelectRegistration = (registrationId) => {
        setSelectedRegistrations(prev => {
            if (prev.includes(registrationId)) {
                return prev.filter(id => id !== registrationId);
            } else {
                return [...prev, registrationId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedRegistrations([]);
            setSelectAll(false);
            setMonthSelectAll({}); // Clear all month selections
        } else {
            // Get all registration IDs from archived registrations
            const allIds = archivedRegistrations?.data?.map(reg => reg.id) || [];
            setSelectedRegistrations(allIds);
            setSelectAll(true);
            // Mark all months as selected
            const allMonths = {};
            Object.keys(getYearGroupedArchivedRegistrations()).forEach(yearKey => {
                Object.keys(getYearGroupedArchivedRegistrations()[yearKey].months).forEach(monthKey => {
                    allMonths[monthKey] = true;
                });
            });
            setMonthSelectAll(allMonths);
        }
    };

    // Month-specific select all (works with session structure)
    const handleMonthSelectAll = (monthKey, monthData) => {
        // Get all registrations from all sessions in this month
        const allRegistrations = [];
        Object.values(monthData.sessions).forEach(session => {
            allRegistrations.push(...session.registrations);
        });
        const monthIds = allRegistrations.map(reg => reg.id);
        const isMonthSelected = monthSelectAll[monthKey];
        
        setSelectedRegistrations(prev => {
            if (isMonthSelected) {
                // Remove all registrations from this month
                return prev.filter(id => !monthIds.includes(id));
            } else {
                // Add all registrations from this month
                const newSelection = [...prev];
                monthIds.forEach(id => {
                    if (!newSelection.includes(id)) {
                        newSelection.push(id);
                    }
                });
                return newSelection;
            }
        });
        
        setMonthSelectAll(prev => ({
            ...prev,
            [monthKey]: !isMonthSelected
        }));

        // Also update session selections
        setSessionSelectAll(prev => {
            const newSessionState = { ...prev };
            Object.keys(monthData.sessions).forEach(sessionKey => {
                newSessionState[sessionKey] = !isMonthSelected;
            });
            return newSessionState;
        });
    };

    // Check if all registrations in a month are selected (works with session structure)
    const isMonthFullySelected = (monthKey, monthData) => {
        const allRegistrations = [];
        Object.values(monthData.sessions).forEach(session => {
            allRegistrations.push(...session.registrations);
        });
        const monthIds = allRegistrations.map(reg => reg.id);
        return monthIds.every(id => selectedRegistrations.includes(id));
    };

    // Session-specific select all
    const handleSessionSelectAll = (sessionKey, registrations) => {
        const sessionIds = registrations.map(reg => reg.id);
        const isSessionSelected = sessionSelectAll[sessionKey];
        
        setSelectedRegistrations(prev => {
            if (isSessionSelected) {
                // Remove all registrations from this session
                return prev.filter(id => !sessionIds.includes(id));
            } else {
                // Add all registrations from this session
                const newSelection = [...prev];
                sessionIds.forEach(id => {
                    if (!newSelection.includes(id)) {
                        newSelection.push(id);
                    }
                });
                return newSelection;
            }
        });
        
        setSessionSelectAll(prev => ({
            ...prev,
            [sessionKey]: !isSessionSelected
        }));
    };

    // Check if all registrations in a session are selected
    const isSessionFullySelected = (sessionKey, registrations) => {
        const sessionIds = registrations.map(reg => reg.id);
        return sessionIds.every(id => selectedRegistrations.includes(id));
    };

    const handleBulkRestore = () => {
        if (selectedRegistrations.length === 0) {
            window.showAlert('Please select at least one registration to restore.', 'error');
            return;
        }

        if (window.confirm(`Are you sure you want to restore ${selectedRegistrations.length} archived registration(s)? They will appear in the main registration list as "cancelled".`)) {
            router.post('/guidance/bulk-unarchive-registrations', {
                registration_ids: selectedRegistrations
            }, {
                onSuccess: () => {
                    window.showAlert(`Successfully restored ${selectedRegistrations.length} archived registrations`, 'success');
                    setSelectedRegistrations([]);
                    setSelectAll(false);
                    router.reload();
                },
                onError: (errors) => {
                    window.showAlert('Failed to restore selected registrations: ' + (errors.error || 'Unknown error'), 'error');
                }
            });
        }
    };


    const filteredData = getFilteredClosedSchedules();
    const filteredTotalDates = Object.values(filteredData).reduce((sum, month) => sum + month.schedules.length, 0);

    return (
        <Layout user={user}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-up" style={{ animationDelay: '60ms' }}>
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-green-800">{flash.success}</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {flash?.error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.502 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-red-800">{flash.error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Header */}
                <div className="bg-white rounded-3xl border border-[#1D293D] overflow-hidden mb-6 animate-up shadow-sm" style={{ animationDelay: '120ms' }}>
                    <div className="bg-[#1D293D] px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">Closed Exam Schedules & Archives</h1>
                                    <p className="text-white/80 text-sm">View closed schedules and archived examinee registrations</p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.visit('/guidance/exam-registration-management')}
                                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-white/10 border border-white/15 rounded-xl hover:bg-white/15 transition-colors duration-150"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back
                            </button>
                        </div>
                    </div>
                    
                    {/* Tab Navigation */}
                    <div className="border-b border-slate-200 bg-slate-50">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('schedules')}
                                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors duration-150 ${
                                    activeTab === 'schedules'
                                        ? 'text-[#1447E6] border-b-2 border-[#1447E6] bg-white'
                                        : 'text-slate-600 hover:text-[#1447E6] hover:bg-slate-100'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Closed Schedules
                                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#1447E6]/10 text-[#1447E6]">
                                        {filteredTotalDates}
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('archived')}
                                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors duration-150 ${
                                    activeTab === 'archived'
                                        ? 'text-[#1447E6] border-b-2 border-[#1447E6] bg-white'
                                        : 'text-slate-600 hover:text-[#1447E6] hover:bg-slate-100'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                    Archived Registrations
                                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#1447E6]/10 text-[#1447E6]">
                                        {archivedRegistrations?.total || 0}
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Closed Schedules Tab Content */}
                {activeTab === 'schedules' && (
                    <>
                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 animate-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#1447E6]/10 rounded-lg">
                            <svg className="w-5 h-5 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#1D293D]">Search & Filter</h3>
                            <p className="text-sm text-slate-600">Find specific closed schedules</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Search</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by date, session, or time..."
                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-sm text-[#1D293D] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] transition-all duration-200"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Session</label>
                            <select
                                value={sessionFilter}
                                onChange={(e) => setSessionFilter(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-[#1D293D] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] transition-all duration-200"
                            >
                                <option value="all">All Sessions</option>
                                <option value="morning">Morning</option>
                                <option value="afternoon">Afternoon</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="w-full px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:border-[#1447E6] hover:text-[#1447E6] transition-colors duration-150"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
                {/* Schedules by Year > Month */}
                <div className="space-y-6 animate-up" style={{ animationDelay: '240ms' }}>
                    {Object.keys(getYearGroupedClosedSchedules()).length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                    <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-[#1D293D] mb-3">No Closed Schedules Found</h3>
                            <p className="text-slate-600 mb-6 max-w-md mx-auto">
                                {searchQuery || sessionFilter !== 'all' 
                                    ? 'No schedules match your current filters. Try adjusting your search criteria.'
                                    : 'There are no closed exam schedules to display.'
                                }
                            </p>
                        </div>
                            ) : (
                                Object.entries(getYearGroupedClosedSchedules()).map(([yearKey, yearData]) => {
                                    const yearMonths = yearData.months;
                                    const yearCount = Object.values(yearMonths).reduce((sum, m) => sum + m.schedules.length, 0);
                                    const isYearExpanded = expandedYears[yearKey];

                                    return (
                                        <div key={yearKey} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-up" style={{ animationDelay: '260ms' }}>
                                            <div
                                                className="px-6 py-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-[#1447E6]/10 transition-colors duration-150"
                                                onClick={() => setExpandedYears(prev => ({ ...prev, [yearKey]: !prev[yearKey] }))}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <svg className={`w-5 h-5 text-[#1447E6] transition-transform ${isYearExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                        </svg>
                                                        <h3 className="text-lg font-bold text-[#1D293D]">{yearKey}</h3>
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#1447E6]/10 text-[#1447E6] border border-[#1447E6]/20">
                                                            {yearCount} schedule{yearCount !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-slate-600">{isYearExpanded ? 'Click to collapse' : 'Click to expand'}</span>
                                                </div>
                                            </div>

                                            {isYearExpanded && (
                                                <div className="divide-y divide-slate-200">
                                                    {Object.entries(yearMonths).map(([monthKey, monthData]) => {
                                                        const isExpanded = expandedMonths[monthKey];
                                                        const scheduleCount = monthData.schedules.length;
                                                        return (
                                                            <div key={monthKey} className="">
                                                                <div
                                                                    className="px-6 py-4 bg-white cursor-pointer hover:bg-[#1447E6]/10 transition-colors duration-150"
                                                                    onClick={() => setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }))}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <svg className={`w-4 h-4 text-[#1447E6] transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                                            </svg>
                                                                            <h4 className="text-md font-bold text-[#1D293D]">{monthKey}</h4>
                                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">{scheduleCount} schedule{scheduleCount !== 1 ? 's' : ''}</span>
                                                                        </div>
                                                                        <span className="text-xs text-slate-500">{isExpanded ? 'Click to collapse' : 'Click to expand'}</span>
                                                                    </div>
                                                                </div>

                                                                {isExpanded && (
                                                                    <div className="overflow-x-auto">
                                                                        <table className="min-w-full divide-y divide-slate-200">
                                                                            <thead className="bg-slate-50">
                                                                                <tr>
                                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Session</th>
                                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Capacity</th>
                                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Registered</th>
                                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="bg-white divide-y divide-slate-200">
                                                                                {monthData.schedules.map((schedule) => (
                                                                                    <tr key={schedule.id} className="hover:bg-slate-50">
                                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1D293D]">{formatDate(schedule.exam_date)}</td>
                                                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
                                                                                                {schedule.session === 'morning' ? '🌅 Morning' : '🌇 Afternoon'}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</td>
                                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{schedule.max_capacity}</td>
                                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{schedule.current_registrations}</td>
                                                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
                                                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                                                </svg>
                                                                                                Closed
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}

                {/* Archived Registrations Tab Content */}
                {activeTab === 'archived' && (
                    <>
                        {/* Search and Bulk Actions */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 animate-up" style={{ animationDelay: '200ms' }}>
                            {/* Search Bar */}
                            <div className="mb-4">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Search Archived Registrations</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={archivedSearchQuery}
                                            onChange={(e) => setArchivedSearchQuery(e.target.value)}
                                            placeholder="Search by name, school, date, session, or status..."
                                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-sm text-[#1D293D] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 focus:border-[#1447E6] transition-all duration-200"
                                        />
                                </div>
                                {archivedSearchQuery && (
                                        <button
                                            onClick={() => setArchivedSearchQuery('')}
                                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:border-[#1447E6] hover:text-[#1447E6] transition-colors duration-150"
                                        >
                                            Clear
                                        </button>
                                )}
                            </div>
                        </div>

                            {/* Bulk Actions */}
                            {selectedRegistrations.length > 0 && (
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
                                    <span className="text-sm font-medium text-slate-700">
                                        {selectedRegistrations.length} registration{selectedRegistrations.length !== 1 ? 's' : ''} selected
                                    </span>
                                    <button
                                        onClick={handleBulkRestore}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1447E6] text-white text-sm font-semibold rounded-xl hover:bg-[#1240d0] transition-colors duration-150"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Restore Selected ({selectedRegistrations.length})
                                    </button>
                                </div>
                            )}
                    </div>

                        {/* Archived Registrations List */}
                        <div className="space-y-6 animate-up" style={{ animationDelay: '240ms' }}>
                    {Object.keys(getYearGroupedArchivedRegistrations()).length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                    <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M5 8h14M5 8a2 2 0 110-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-[#1D293D] mb-3">No Archived Registrations Found</h3>
                            <p className="text-slate-600 mb-6 max-w-md mx-auto">There are no archived registrations to display.</p>
                        </div>
                    ) : (
                        Object.entries(getYearGroupedArchivedRegistrations()).map(([yearKey, yearData]) => {
                            const yearMonths = yearData.months;
                            const yearCount = Object.values(yearMonths).reduce((sum, m) => {
                                return sum + Object.values(m.sessions).reduce((sessionSum, session) => sessionSum + session.registrations.length, 0);
                            }, 0);
                            const isYearExpanded = expandedArchivedYears[yearKey];

                            return (
                                <div key={yearKey} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div
                                        className="px-6 py-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-[#1447E6]/10 transition-colors duration-150"
                                        onClick={() => setExpandedArchivedYears(prev => ({ ...prev, [yearKey]: !prev[yearKey] }))}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <svg className={`w-5 h-5 text-[#1447E6] transition-transform ${isYearExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                                <h3 className="text-lg font-bold text-[#1D293D]">{yearKey}</h3>
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#1447E6]/10 text-[#1447E6] border border-[#1447E6]/20">
                                                    {yearCount} registration{yearCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <span className="text-sm text-slate-600">{isYearExpanded ? 'Click to collapse' : 'Click to expand'}</span>
                                        </div>
                                    </div>

                                    {isYearExpanded && (
                                        <div className="divide-y divide-slate-200">
                                            {Object.entries(yearMonths).map(([monthKey, monthData]) => {
                                                const isExpanded = expandedArchivedMonths[monthKey];
                                                const totalRegistrations = Object.values(monthData.sessions).reduce((sum, session) => sum + session.registrations.length, 0);
                                                return (
                                                    <div key={monthKey} className="">
                                                        <div
                                                            className="px-6 py-4 bg-white cursor-pointer hover:bg-[#1447E6]/10 transition-colors duration-150"
                                                            onClick={() => setExpandedArchivedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }))}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <svg className={`w-4 h-4 text-[#1447E6] transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                    <h4 className="text-md font-bold text-[#1D293D]">{monthKey}</h4>
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">{totalRegistrations} registration{totalRegistrations !== 1 ? 's' : ''}</span>
                                                                </div>
                                                                <span className="text-xs text-slate-500">{isExpanded ? 'Click to collapse' : 'Click to expand'}</span>
                                                            </div>
                                                        </div>

                                                        {isExpanded && (
                                                            <div>
                                                                {/* Month-specific controls */}
                                                                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isMonthFullySelected(monthKey, monthData)}
                                                                                onChange={() => handleMonthSelectAll(monthKey, monthData)}
                                                                                className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                                                                                title={`Select all registrations in ${monthKey}`}
                                                                            />
                                                                            <label className="text-sm font-medium text-slate-700">
                                                                                Select all in {monthKey} ({totalRegistrations} registrations)
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <label className="text-sm text-slate-600">Show:</label>
                                                                        <select
                                                                            value={itemsPerPage}
                                                                            onChange={(e) => handlePerPageChange(parseInt(e.target.value))}
                                                                            className="border border-slate-300 rounded-md px-2 py-1 text-sm text-[#1D293D] focus:ring-[#1447E6] focus:border-[#1447E6]"
                                                                        >
                                                                            <option value="5">5</option>
                                                                            <option value="10">10</option>
                                                                            <option value="20">20</option>
                                                                            <option value="50">50</option>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Sessions within the month */}
                                                                <div className="divide-y divide-slate-200">
                                                                    {Object.entries(monthData.sessions).map(([sessionKey, sessionData]) => {
                                                                        const isSessionExpanded = expandedArchivedSessions[sessionKey];
                                                                        const sessionRegistrations = sessionData.registrations;
                                                                        const sessionDisplayName = sessionKey === 'no_session' ? 'No Session' : sessionKey.charAt(0).toUpperCase() + sessionKey.slice(1);
                                                                        
                                                                        return (
                                                                            <div key={sessionKey} className="">
                                                                                <div
                                                                                    className="px-8 py-3 bg-slate-50 cursor-pointer hover:bg-[#1447E6]/10 transition-colors duration-150 border-l-4 border-[#1447E6]"
                                                                                    onClick={() => setExpandedArchivedSessions(prev => ({ ...prev, [sessionKey]: !prev[sessionKey] }))}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <svg className={`w-3 h-3 text-[#1447E6] transition-transform ${isSessionExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                                                            </svg>
                                                                                            <h5 className="text-sm font-bold text-[#1D293D]">{sessionDisplayName} Session</h5>
                                                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
                                                                                                {sessionRegistrations.length} registration{sessionRegistrations.length !== 1 ? 's' : ''}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={isSessionFullySelected(sessionKey, sessionRegistrations)}
                                                                                                    onChange={() => handleSessionSelectAll(sessionKey, sessionRegistrations)}
                                                                                                                className="w-3 h-3 text-[#1447E6] bg-white border-slate-300 rounded focus:ring-[#1447E6] focus:ring-2"
                                                                                                    title={`Select all registrations in ${sessionDisplayName} session`}
                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                />
                                                                                                <label className="text-xs text-slate-600" onClick={(e) => e.stopPropagation()}>
                                                                                                    Select all in {sessionDisplayName}
                                                                                                </label>
                                                                                            </div>
                                                                                            <span className="text-xs text-slate-500">{isSessionExpanded ? 'Click to collapse' : 'Click to expand'}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {isSessionExpanded && (
                                                                                    <div>
                                                                                        {/* Paginated table for this session */}
                                                                                        <div className="overflow-x-auto">
                                                                                            <table className="min-w-full divide-y divide-slate-200">
                                                                                                <thead className="bg-slate-50">
                                                                                                    <tr>
                                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                                                                            <input
                                                                                                                type="checkbox"
                                                                                                                checked={selectAll}
                                                                                                                onChange={handleSelectAll}
                                                                                                                className="w-4 h-4 text-[#1447E6] bg-white border-slate-300 rounded focus:ring-[#1447E6] focus:ring-2"
                                                                                                                title="Select all registrations"
                                                                                                            />
                                                                                                        </th>
                                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">School</th>
                                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Registration Date</th>
                                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned</th>
                                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                                                                                    </tr>
                                                                                                </thead>
                                                                                                <tbody className="bg-white divide-y divide-slate-200">
                                                                                                    {(() => {
                                                                                                        const paginated = getPaginatedRegistrations(sessionRegistrations);
                                                                                                        return paginated.data.map((reg) => (
                                                                                                            <tr key={reg.id}>
                                                                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                                                                    <input
                                                                                                                        type="checkbox"
                                                                                                                        checked={selectedRegistrations.includes(reg.id)}
                                                                                                                        onChange={() => handleSelectRegistration(reg.id)}
                                                                                                                        className="w-4 h-4 text-[#1447E6] bg-white border-slate-300 rounded focus:ring-[#1447E6] focus:ring-2"
                                                                                                                        title="Select this registration"
                                                                                                                    />
                                                                                                                </td>
                                                                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1D293D]">{reg.examinee_name || 'N/A'}</td>
                                                                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{reg.school_name || 'N/A'}</td>
                                                                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDate(reg.registration_date)}</td>
                                                                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                                                                                    {reg.assigned_exam_date ? (
                                                                                                                        <span className="inline-flex items-center gap-2">
                                                                                                                            <span>{formatDate(reg.assigned_exam_date)}</span>
                                                                                                                            {reg.assigned_session && (
                                                                                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
                                                                                                                                    {reg.assigned_session}
                                                                                                                                </span>
                                                                                                                            )}
                                                                                                                        </span>
                                                                                                                    ) : (
                                                                                                                        <span className="text-slate-400">Not assigned</span>
                                                                                                                    )}
                                                                                                                </td>
                                                                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">archived</span>
                                                                                                                </td>
                                                                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                                                                    <button
                                                                                                                        onClick={() => {
                                                                                                                            if (window.confirm('Are you sure you want to unarchive this registration? It will appear in the main registration list as "cancelled".')) {
                                                                                                                                router.post(`/guidance/unarchive-registration/${reg.id}`, {}, {
                                                                                                                                    onSuccess: () => {
                                                                                                                                        window.showAlert('Registration unarchived successfully', 'success');
                                                                                                                                        router.reload();
                                                                                                                                    },
                                                                                                                                    onError: (errors) => {
                                                                                                                                        window.showAlert('Failed to unarchive registration: ' + (errors.error || 'Unknown error'), 'error');
                                                                                                                                    }
                                                                                                                                });
                                                                                                                            }
                                                                                                                        }}
                                                                                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#1447E6] bg-[#1447E6]/10 border border-[#1447E6]/20 rounded-lg hover:bg-[#1447E6]/20 transition-colors duration-150"
                                                                                                                        title="Unarchive this registration"
                                                                                                                    >
                                                                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                                                                        </svg>
                                                                                                                        Unarchive
                                                                                                                    </button>
                                                                                                                </td>
                                                                                                            </tr>
                                                                                                        ));
                                                                                                    })()}
                                                                                                </tbody>
                                                                                            </table>
                                                                                        </div>

                                                                                        {/* Pagination controls for this session */}
                                                                                        {(() => {
                                                                                            const paginated = getPaginatedRegistrations(sessionRegistrations);
                                                                                            if (paginated.totalPages > 1) {
                                                                                                return (
                                                                                                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
                                                                                                        <div className="flex items-center justify-between">
                                                                                                            <div className="text-sm text-slate-600">
                                                                                                                Showing {paginated.from} to {paginated.to} of {paginated.total} registrations in {sessionDisplayName} session
                                                                                                            </div>
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                <button
                                                                                                                    onClick={() => handlePageChange(paginated.currentPage - 1)}
                                                                                                                    disabled={paginated.currentPage <= 1}
                                                                                                                    className="px-3 py-1 text-sm bg-white border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                                                                                                                >
                                                                                                                    Previous
                                                                                                                </button>
                                                                                                                {Array.from({ length: Math.min(5, paginated.totalPages) }, (_, i) => {
                                                                                                                    let pageNum;
                                                                                                                    if (paginated.totalPages <= 5) {
                                                                                                                        pageNum = i + 1;
                                                                                                                    } else if (paginated.currentPage <= 3) {
                                                                                                                        pageNum = i + 1;
                                                                                                                    } else if (paginated.currentPage >= paginated.totalPages - 2) {
                                                                                                                        pageNum = paginated.totalPages - 4 + i;
                                                                                                                    } else {
                                                                                                                        pageNum = paginated.currentPage - 2 + i;
                                                                                                                    }
                                                                                                                    return (
                                                                                                                        <button
                                                                                                                            key={pageNum}
                                                                                                                            onClick={() => handlePageChange(pageNum)}
                                                                                                                            className={`px-3 py-1 text-sm rounded border transition-colors duration-150 ${
                                                                                                                                pageNum === paginated.currentPage
                                                                                                                                    ? 'bg-[#1447E6] text-white border-[#1447E6]'
                                                                                                                                    : 'bg-white border-slate-300 hover:bg-slate-50'
                                                                                                                            }`}
                                                                                                                        >
                                                                                                                            {pageNum}
                                                                                                                        </button>
                                                                                                                    );
                                                                                                                })}
                                                                                                                <button
                                                                                                                    onClick={() => handlePageChange(paginated.currentPage + 1)}
                                                                                                                    disabled={paginated.currentPage >= paginated.totalPages}
                                                                                                                    className="px-3 py-1 text-sm bg-white border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                                                                                                                >
                                                                                                                    Next
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                            return null;
                                                                                        })()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
                    </>
                )}

            </div>
        </Layout>
    );
}