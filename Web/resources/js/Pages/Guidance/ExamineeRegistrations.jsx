import React from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

// Memoized components for better performance
const DateHeaderRow = React.memo(({ date, dateIdx, isDateExpanded, totalStudentsInDate, onToggle }) => (
    <tr 
        key={`date-${date}`} 
        className={`${dateIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-t border-slate-200 cursor-pointer transition-colors duration-200 hover:bg-[#1447E6]/10`} 
        onClick={onToggle}
    >
        <td colSpan="6" className="px-6 py-3">
            <div className="flex items-center gap-3">
                <svg className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isDateExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                <div className="text-sm font-semibold text-gray-900">
                    {date === 'unassigned' ? 'Unassigned Registrations' : new Date(date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}
                </div>
                <div className="text-xs text-gray-500">{totalStudentsInDate} students</div>
            </div>
        </td>
    </tr>
));

const SessionHeaderRow = React.memo(({ sessionKey, session, sessionRegs, isSessionExpanded, paginated, perPage, onToggle, onPerPageChange }) => (
    <tr key={`session-${sessionKey}`} className="bg-slate-50 border-l-4 border-[#1447E6]/30 cursor-pointer transition-colors duration-200 hover:bg-[#1447E6]/10">
        <td colSpan="6" className="px-6 py-2 pl-12" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <svg className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isSessionExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="text-xs font-medium text-gray-700">
                        {session === 'no_session' ? 'No Session' : session.charAt(0).toUpperCase() + session.slice(1)} Session
                    </div>
                    <div className="text-xs text-gray-500">{sessionRegs.length} students{isSessionExpanded && ` • Showing ${paginated.from}-${paginated.to}`}</div>
                </div>
                {isSessionExpanded && sessionRegs.length > 10 && (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <label className="text-xs text-gray-600">Show:</label>
                        <select value={perPage} onChange={onPerPageChange} className="border border-gray-300 rounded px-2 py-1 text-xs">
                            <option value="10">10</option>
                            <option value="20">20</option>
                        </select>
                    </div>
                )}
            </div>
        </td>
    </tr>
));

const StudentRow = React.memo(({ student, idx, onScheduleChange, selectedId, onSelect, selectedIds, onMultiSelect }) => (
    <tr key={student.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} transition-colors duration-200 hover:bg-[#1447E6]/10`}>
        <td className="px-4 py-3 whitespace-nowrap">
            <input
                type="checkbox"
                checked={selectedIds ? selectedIds.includes(student.id) : selectedId === student.id}
                onChange={() => {
                    if (selectedIds && onMultiSelect) {
                        onMultiSelect(student.id);
                    } else if (onSelect) {
                        onSelect(student.id);
                    }
                }}
                className="h-4 w-4 text-[#1447E6] focus:ring-[#1447E6] border-gray-300 rounded"
            />
        </td>
        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 pl-16">{student.examinee?.user?.username || 'N/A'}</td>
        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{student.examinee?.school_name || 'N/A'}</td>
        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(student.registration_date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}</td>
        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{student.assigned_exam_date ? `${new Date(student.assigned_exam_date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}${student.assigned_session ? ` • ${student.assigned_session}` : ''}` : 'Not assigned'}</td>
        <td className="px-6 py-3 whitespace-nowrap text-sm">
            <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    student.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                    student.status === 'assigned' ? 'bg-slate-100 text-slate-700' :
                    student.status === 'cancelled' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'
                }`}>{student.status === 'cancelled' ? 'No Show' : student.status}</span>
                {student.status === 'assigned' && student.assigned_exam_date && (
                    <button 
                        onClick={() => onScheduleChange(student)} 
                        className="inline-flex items-center gap-1 rounded-lg border border-[#1447E6] bg-[#1447E6] px-3 py-1 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]"
                    >
                         <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                         </svg>
                         Change
                     </button>
                )}
            </div>
        </td>
    </tr>
));

const ExamineeRegistrations = ({ user, settings, registrations, schedules, unassigned, flash }) => {
    const goBack = () => router.visit('/guidance/exam-registration-management');

    const [searchInput, setSearchInput] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [registrationFilter, setRegistrationFilter] = React.useState('all');
    const [registrationsExpanded, setRegistrationsExpanded] = React.useState({});
    const [datePageState, setDatePageState] = React.useState({});
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedMainRegistrationId, setSelectedMainRegistrationId] = React.useState(null);
    const [selectedMainRegistrations, setSelectedMainRegistrations] = React.useState([]);

    // Pagination and search for cancelled examinees
    const [cancelledSearch, setCancelledSearch] = React.useState('');
    const [cancelledPage, setCancelledPage] = React.useState(1);
    const [cancelledPerPage, setCancelledPerPage] = React.useState(10);

    // Initialize loading state
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 100);
        return () => clearTimeout(timer);
    }, []);

    // Debounced search with better performance
    React.useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Optimized toggle function
    const toggleDateExpanded = React.useCallback((date) => {
        setRegistrationsExpanded(prev => {
            const willOpen = !prev[date];
            if (willOpen) {
                return { ...prev, [date]: true };
            } else {
                const newState = { ...prev };
                delete newState[date];
                // Remove session keys that start with this date
                Object.keys(newState).forEach(key => {
                    if (key.startsWith(date + '_')) {
                        delete newState[key];
                    }
                });
                return newState;
            }
        });
    }, []);

    // Memoized page state functions
    const getDatePageState = React.useCallback((date) => {
        return datePageState[date] || { page: 1, perPage: 10 };
    }, [datePageState]);

    const setDatePage = React.useCallback((date, page) => {
        setDatePageState(prev => ({ ...prev, [date]: { ...getDatePageState(date), page } }));
    }, [getDatePageState]);

    const setDatePerPage = React.useCallback((date, perPage) => {
        setDatePageState(prev => ({ ...prev, [date]: { page: 1, perPage } }));
    }, []);

    // Memoized date formatting
    const formatDate = React.useCallback((dateString) => 
        new Date(dateString).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }), 
        []
    );

    const localRegistrations = registrations;

    // Optimized filtering with early returns and better performance
    const filteredRegistrations = React.useMemo(() => {
        if (!localRegistrations?.data?.length) return [];
        
        let data = localRegistrations.data;
        
        // Apply status filter first (most selective)
        if (registrationFilter === 'assigned') {
            data = data.filter(r => r.status === 'assigned');
        } else if (registrationFilter === 'not_assigned') {
            data = data.filter(r => r.status === 'registered');
        } else {
            data = data.filter(r => r.status !== 'archived');
        }
        
        // Apply search filter if needed
        if (debouncedSearch) {
            const q = debouncedSearch;
            data = data.filter((r) => {
                const name = (r.examinee?.user?.username || '').toLowerCase();
                const school = (r.examinee?.school_name || '').toLowerCase();
                const session = (r.assigned_session || '').toLowerCase();
                const status = (r.status || '').toLowerCase();
                return name.includes(q) || school.includes(q) || session.includes(q) || status.includes(q);
            });
        }
        
        return data;
    }, [localRegistrations?.data, debouncedSearch, registrationFilter]);

    // Optimized grouping with better performance
    const grouped = React.useMemo(() => {
        if (!filteredRegistrations.length) return { grouped: {}, sortedDates: [] };
        
        const g = {};
        
        // Single pass grouping
        for (const r of filteredRegistrations) {
            const date = r.assigned_exam_date || 'unassigned';
            const session = r.assigned_session || 'no_session';
            
            if (!g[date]) g[date] = {};
            if (!g[date][session]) g[date][session] = [];
            g[date][session].push(r);
        }
        
        // Sort dates (unassigned first, then chronologically)
        const sortedDates = Object.keys(g).sort((a, b) => {
            if (a === 'unassigned') return -1;
            if (b === 'unassigned') return 1;
            return new Date(a) - new Date(b);
        });
        
        // Sort sessions and students within each date
        for (const date of sortedDates) {
            const sessions = Object.keys(g[date]).sort((a, b) => {
                const sessionOrder = { 'morning': 0, 'afternoon': 1, 'no_session': 2 };
                return (sessionOrder[a] || 2) - (sessionOrder[b] || 2);
            });
            
            for (const session of sessions) {
                g[date][session].sort((a, b) => 
                    (a.examinee?.user?.username || '').localeCompare(b.examinee?.user?.username || '')
                );
            }
        }
        
        return { grouped: g, sortedDates };
    }, [filteredRegistrations]);

    const findRegistrationById = React.useCallback((id) => {
        if (!id) return null;
        return (localRegistrations?.data || []).find(r => r.id === id) || null;
    }, [localRegistrations?.data]);

    const isTodayYMD = (ymd) => {
        if (!ymd) return false;
        const d = new Date();
        // Build LOCAL date string YYYY-MM-DD (avoid UTC shift from toISOString)
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;
        return ymd === today;
    };

    const forceAllowToday = React.useCallback((registrationId) => {
        const reg = findRegistrationById(registrationId);
        if (!reg) return;
        const today = new Date().toISOString().split('T')[0];
        if (reg.assigned_exam_date !== today) {
            console.warn('[ExamineeRegistrations] Force allow denied: not today', { assigned: reg.assigned_exam_date, today });
        }
        console.log('[ExamineeRegistrations] Force allowing exam today for registration:', registrationId);
        router.post('/guidance/force-allow-exam-today', {
            registration_id: registrationId,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                console.log('[ExamineeRegistrations] Force allow success');
            },
            onError: (e) => {
                console.error('[ExamineeRegistrations] Force allow failed', e);
            }
        });
    }, [findRegistrationById]);

    // Registered but not yet assigned
    // Use dedicated unassigned dataset from server if provided; else fall back to filtered
    const unassignedRegistrations = React.useMemo(() => {
        if (Array.isArray(unassigned) && unassigned.length > 0) return unassigned;
        return filteredRegistrations.filter(r => (r.status === 'registered') && !r.assigned_exam_date);
    }, [unassigned, filteredRegistrations]);

    // Calculate stats from available data
    const stats = React.useMemo(() => {
        const data = localRegistrations?.data || [];
        return {
            total: data.length,
            assigned: data.filter(r => r.status === 'assigned').length,
            unassigned: data.filter(r => r.status === 'registered' && !r.assigned_exam_date).length,
            cancelled: data.filter(r => r.status === 'cancelled').length,
            completed: data.filter(r => r.status === 'completed').length,
            archived: data.filter(r => r.status === 'archived').length
        };
    }, [localRegistrations?.data]);

    // Get cancelled examinees for the cancelled table
    const cancelledExaminees = React.useMemo(() => {
        const data = localRegistrations?.data || [];
        return data.filter(r => r.status === 'cancelled');
    }, [localRegistrations?.data]);

    // Filter and paginate cancelled examinees
    const filteredCancelledExaminees = React.useMemo(() => {
        if (!cancelledSearch.trim()) {
            return cancelledExaminees;
        }
        
        const search = cancelledSearch.toLowerCase();
        return cancelledExaminees.filter(r => {
            const name = (r.examinee?.user?.username || '').toLowerCase();
            const school = (r.examinee?.school_name || '').toLowerCase();
            const assignedDate = r.assigned_exam_date ? formatDate(r.assigned_exam_date).toLowerCase() : '';
            const session = (r.assigned_session || '').toLowerCase();
            const regDate = formatDate(r.registration_date).toLowerCase();
            
            return name.includes(search) || 
                   school.includes(search) || 
                   assignedDate.includes(search) || 
                   session.includes(search) || 
                   regDate.includes(search);
        });
    }, [cancelledExaminees, cancelledSearch]);

    const paginatedCancelledExaminees = React.useMemo(() => {
        const start = (cancelledPage - 1) * cancelledPerPage;
        const end = start + cancelledPerPage;
        return {
            data: filteredCancelledExaminees.slice(start, end),
            total: filteredCancelledExaminees.length,
            currentPage: cancelledPage,
            perPage: cancelledPerPage,
            totalPages: Math.ceil(filteredCancelledExaminees.length / cancelledPerPage),
            from: filteredCancelledExaminees.length > 0 ? start + 1 : 0,
            to: Math.min(end, filteredCancelledExaminees.length)
        };
    }, [filteredCancelledExaminees, cancelledPage, cancelledPerPage]);

    // Optimized pagination function
    const getPaginatedRegistrationsForDate = React.useCallback((regs, date) => {
        if (!regs?.length) return { data: [], total: 0, currentPage: 1, perPage: 10, totalPages: 0, from: 0, to: 0 };
        
        const { page, perPage } = getDatePageState(date);
        const start = (page - 1) * perPage;
        const end = start + perPage;
        
        return {
            data: regs.slice(start, end),
            total: regs.length,
            currentPage: page,
            perPage,
            totalPages: Math.ceil(regs.length / perPage),
            from: regs.length > 0 ? start + 1 : 0,
            to: Math.min(end, regs.length)
        };
    }, [getDatePageState]);

    // Loading skeleton component
    const LoadingSkeleton = React.memo(() => (
        <div className="animate-pulse">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
                <div className="h-16 bg-slate-200"></div>
                <div className="p-6 space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-200 rounded-xl h-20"></div>
                <div className="bg-gray-200 rounded-xl h-20"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gray-200 h-12"></div>
                <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        </div>
    ));

    // Modal state for assignment
    const [assignModalOpen, setAssignModalOpen] = React.useState(false);
    const [assignTarget, setAssignTarget] = React.useState(null);
    const [assignDate, setAssignDate] = React.useState('');
    const [assignSession, setAssignSession] = React.useState('morning');

    // Modal state for schedule change
    const [changeScheduleModalOpen, setChangeScheduleModalOpen] = React.useState(false);
    const [changeScheduleTarget, setChangeScheduleTarget] = React.useState(null);
    const [changeScheduleDate, setChangeScheduleDate] = React.useState('');
    const [changeScheduleSession, setChangeScheduleSession] = React.useState('morning');

    // derive allowed dates and sessions from schedules prop
    const allowedDates = React.useMemo(() => {
        if (!schedules) return [];
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        const dates = Object.keys(schedules);
        return dates.filter((date) => {
            // Filter out past dates
            if (date < today) return false;
            
            const sessions = schedules[date] || [];
            return sessions.some((s) => (s.status !== 'closed') && (s.current_registrations < s.max_capacity));
        }).sort((a,b) => new Date(a) - new Date(b));
    }, [schedules]);

    // Build organized date options with month group and capacity summary
    const dateOptions = React.useMemo(() => {
        return allowedDates.map((d) => {
            const jsDate = new Date(d);
            const group = jsDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const day = jsDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const sessions = (schedules && schedules[d]) ? schedules[d] : [];
            const parts = sessions.map((s) => {
                const left = Math.max(s.max_capacity - s.current_registrations, 0);
                const tag = s.session === 'morning' ? 'AM' : 'PM';
                const status = (s.status === 'closed' || left === 0) ? 'full' : `${left} left`;
                return `${tag} ${s.current_registrations}/${s.max_capacity} • ${status}`;
            });
            const label = `${day} • ${parts.join(' | ')}`;
            return { value: d, label, group };
        });
    }, [allowedDates, schedules]);

    const getSessionsForDate = React.useCallback((date) => {
        const sessions = (schedules && schedules[date]) ? schedules[date] : [];
        return sessions.map(s => ({
            value: s.session,
            label: `${s.session} (${s.current_registrations}/${s.max_capacity})${s.status === 'closed' ? ' • closed' : ''}`,
            disabled: (s.status === 'closed') || (s.current_registrations >= s.max_capacity)
        }));
    }, [schedules]);

    const [availableSessions, setAvailableSessions] = React.useState([]);
    const [dateMenuOpen, setDateMenuOpen] = React.useState(false);
    const dateMenuRef = React.useRef(null);

    // Bulk actions state for cancelled examinees
    const [selectedCancelled, setSelectedCancelled] = React.useState([]);
    const [bulkAction, setBulkAction] = React.useState('');
    const [bulkDate, setBulkDate] = React.useState('');
    const [bulkSession, setBulkSession] = React.useState('morning');
    const [showBulkModal, setShowBulkModal] = React.useState(false);
    const [showSelectedModal, setShowSelectedModal] = React.useState(false);

    // Bulk assignment state for unassigned examinees
    const [selectedUnassigned, setSelectedUnassigned] = React.useState([]);
    const [bulkAssignDate, setBulkAssignDate] = React.useState('');
    const [bulkAssignSession, setBulkAssignSession] = React.useState('morning');
    const [showBulkAssignModal, setShowBulkAssignModal] = React.useState(false);
    const [showUnassignedSelectedModal, setShowUnassignedSelectedModal] = React.useState(false);

    // Toast notification state
    const [showToast, setShowToast] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState('');
    const [toastType, setToastType] = React.useState('success'); // 'success' or 'error'

    // Bulk reschedule state for main registrations
    const [bulkMainDate, setBulkMainDate] = React.useState('');
    const [bulkMainSession, setBulkMainSession] = React.useState('morning');
    const [showBulkMainModal, setShowBulkMainModal] = React.useState(false);

    // Collapsible containers state with localStorage persistence
    const [containersExpanded, setContainersExpanded] = React.useState(() => {
        // Load from localStorage on component mount
        const saved = localStorage.getItem('examineeRegistrations_containersExpanded');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse saved container states:', e);
            }
        }
        // Default state if no saved data
        return {
            mainRegistrations: true,
            unassignedRegistrations: true,
            cancelledExaminees: true
        };
    });

    // Toggle container function with localStorage persistence
    const toggleContainer = React.useCallback((containerName) => {
        setContainersExpanded(prev => {
            const newState = {
                ...prev,
                [containerName]: !prev[containerName]
            };
            // Save to localStorage
            try {
                localStorage.setItem('examineeRegistrations_containersExpanded', JSON.stringify(newState));
            } catch (e) {
                console.warn('Failed to save container states to localStorage:', e);
            }
            return newState;
        });
    }, []);

    // Multi-select functions for main registrations
    const handleSelectMainRegistration = React.useCallback((id) => {
        setSelectedMainRegistrations(prev => 
            prev.includes(id) 
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    }, []);

    const handleSelectAllMainRegistrations = React.useCallback(() => {
        const allIds = filteredRegistrations.map(r => r.id);
        const allSelected = allIds.every(id => selectedMainRegistrations.includes(id));
        
        if (allSelected) {
            setSelectedMainRegistrations([]);
        } else {
            setSelectedMainRegistrations(allIds);
        }
    }, [filteredRegistrations, selectedMainRegistrations]);

    // Save container states to localStorage whenever they change
    React.useEffect(() => {
        try {
            localStorage.setItem('examineeRegistrations_containersExpanded', JSON.stringify(containersExpanded));
        } catch (e) {
            console.warn('Failed to save container states to localStorage:', e);
        }
    }, [containersExpanded]);

    React.useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') setDateMenuOpen(false); };
        const onClick = (e) => { if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) setDateMenuOpen(false); };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClick);
        return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
    }, []);

    // Toast notification effect - show toast when flash messages appear
    React.useEffect(() => {
        if (flash?.success) {
            setToastMessage(flash.success);
            setToastType('success');
            setShowToast(true);
            
            // Auto-dismiss after 5 seconds
            const timer = setTimeout(() => {
                setShowToast(false);
            }, 5000);
            
            return () => clearTimeout(timer);
        } else if (flash?.error) {
            setToastMessage(flash.error);
            setToastType('error');
            setShowToast(true);
            
            // Auto-dismiss after 5 seconds
            const timer = setTimeout(() => {
                setShowToast(false);
            }, 5000);
            
            return () => clearTimeout(timer);
        }
    }, [flash?.success, flash?.error]);

    const openAssign = (reg) => {
        setAssignTarget(reg);
        const firstDate = allowedDates[0] || '';
        setAssignDate(firstDate);
        const sess = firstDate ? getSessionsForDate(firstDate) : [];
        setAvailableSessions(sess);
        const firstEnabled = sess.find(s => !s.disabled)?.value || 'morning';
        setAssignSession(firstEnabled);
        setAssignModalOpen(true);
    };

    const submitAssign = (e) => {
        e.preventDefault();
        if (!assignTarget || !assignDate || !assignSession) return;
        router.post('/guidance/assign-registration', {
            registration_id: assignTarget.id,
            assigned_exam_date: assignDate,
            assigned_session: assignSession,
        }, { preserveScroll: true, preserveState: true });
        setAssignModalOpen(false);
    };

    const openChangeSchedule = (reg) => {
        console.log('Opening schedule change modal for:', reg);
        setChangeScheduleTarget(reg);
        
        // Set current values as defaults, but only if the current date is not in the past
        const today = new Date().toISOString().split('T')[0];
        const currentDate = reg.assigned_exam_date;
        
        // If current date is in the past or not available, use the first available future date
        if (!currentDate || currentDate < today) {
            setChangeScheduleDate(allowedDates[0] || '');
        } else {
            setChangeScheduleDate(currentDate);
        }
        
        setChangeScheduleSession(reg.assigned_session || 'morning');
        setChangeScheduleModalOpen(true);
    };

    const submitChangeSchedule = (e) => {
        e.preventDefault();
        if (!changeScheduleTarget || !changeScheduleDate || !changeScheduleSession) return;
        
        console.log('Submitting schedule change:', {
            registrationId: changeScheduleTarget.id,
            newDate: changeScheduleDate,
            newSession: changeScheduleSession,
            currentDate: changeScheduleTarget.assigned_exam_date,
            currentSession: changeScheduleTarget.assigned_session
        });
        
        router.put(`/guidance/update-exam-date/${changeScheduleTarget.id}`, {
            assigned_exam_date: changeScheduleDate,
            assigned_session: changeScheduleSession,
            status: 'assigned'
        }, { 
            preserveScroll: true, 
            preserveState: true,
            onSuccess: () => {
                console.log('Schedule change successful');
                setChangeScheduleModalOpen(false);
                setChangeScheduleTarget(null);
            },
            onError: (errors) => {
                console.error('Schedule change failed:', errors);
            }
        });
    };

    // Bulk action functions for cancelled examinees
    const handleSelectCancelled = (id) => {
        setSelectedCancelled(prev => 
            prev.includes(id) 
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const handleSelectAllCancelled = () => {
        const currentPageIds = paginatedCancelledExaminees.data.map(r => r.id);
        const allCurrentPageSelected = currentPageIds.every(id => selectedCancelled.includes(id));
        
        if (allCurrentPageSelected) {
            // Deselect all from current page
            setSelectedCancelled(prev => prev.filter(id => !currentPageIds.includes(id)));
        } else {
            // Select all from current page
            setSelectedCancelled(prev => [...new Set([...prev, ...currentPageIds])]);
        }
    };

    const handleBulkAction = () => {
        if (selectedCancelled.length === 0) return;
        setBulkDate(allowedDates[0] || '');
        setBulkSession('morning');
        setShowBulkModal(true);
    };

    // Get selected examinees data for display
    const selectedExamineesData = React.useMemo(() => {
        return cancelledExaminees.filter(r => selectedCancelled.includes(r.id));
    }, [cancelledExaminees, selectedCancelled]);

    const submitBulkAction = (e) => {
        e.preventDefault();
        if (selectedCancelled.length === 0 || !bulkAction) return;
        
        // For reschedule action, require date and session
        if (bulkAction === 'reschedule' && (!bulkDate || !bulkSession)) return;
        
        console.log('[ExamineeRegistrations] Submitting bulk action:', {
            action: bulkAction,
            count: selectedCancelled.length,
            registration_ids: selectedCancelled
        });
        
        router.post('/guidance/bulk-update-cancelled', {
            registration_ids: selectedCancelled,
            action: bulkAction,
            assigned_exam_date: bulkAction === 'reschedule' ? bulkDate : null,
            assigned_session: bulkAction === 'reschedule' ? bulkSession : null,
        }, { 
            preserveScroll: true, 
            preserveState: true,
            onSuccess: () => {
                console.log('[ExamineeRegistrations] Bulk action successful:', bulkAction);
                setSelectedCancelled([]);
                setShowBulkModal(false);
                setBulkAction('');
            },
            onError: (errors) => {
                console.error('[ExamineeRegistrations] Bulk action error:', errors);
            }
        });
    };

    // Bulk assignment functions for unassigned examinees
    const handleSelectUnassigned = (id) => {
        setSelectedUnassigned(prev => 
            prev.includes(id) 
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const handleSelectAllUnassigned = () => {
        const currentPageIds = unassignedRegistrations.map(r => r.id);
        const allCurrentPageSelected = currentPageIds.every(id => selectedUnassigned.includes(id));
        
        if (allCurrentPageSelected) {
            // Deselect all from current page
            setSelectedUnassigned(prev => prev.filter(id => !currentPageIds.includes(id)));
        } else {
            // Select all from current page
            setSelectedUnassigned(prev => [...new Set([...prev, ...currentPageIds])]);
        }
    };

    const handleBulkAssign = () => {
        if (selectedUnassigned.length === 0) return;
        setBulkAssignDate(allowedDates[0] || '');
        setBulkAssignSession('morning');
        setShowBulkAssignModal(true);
    };

    // Get selected unassigned examinees data for display
    const selectedUnassignedData = React.useMemo(() => {
        return unassignedRegistrations.filter(r => selectedUnassigned.includes(r.id));
    }, [unassignedRegistrations, selectedUnassigned]);

    const submitBulkAssign = (e) => {
        e.preventDefault();
        if (selectedUnassigned.length === 0 || !bulkAssignDate || !bulkAssignSession) return;
        
        router.post('/guidance/bulk-assign-registrations', {
            registration_ids: selectedUnassigned,
            assigned_exam_date: bulkAssignDate,
            assigned_session: bulkAssignSession,
        }, { 
            preserveScroll: true, 
            preserveState: true,
            onSuccess: () => {
                setSelectedUnassigned([]);
                setShowBulkAssignModal(false);
                setBulkAssignDate('');
                setBulkAssignSession('morning');
            }
        });
    };

    const submitBulkMainReschedule = (e) => {
        e.preventDefault();
        if (selectedMainRegistrations.length === 0 || !bulkMainDate || !bulkMainSession) return;
        
        router.post('/guidance/bulk-reschedule-registrations', {
            registration_ids: selectedMainRegistrations,
            assigned_exam_date: bulkMainDate,
            assigned_session: bulkMainSession,
        }, { 
            preserveScroll: true, 
            preserveState: true,
            onSuccess: () => {
                setSelectedMainRegistrations([]);
                setShowBulkMainModal(false);
                setBulkMainDate('');
                setBulkMainSession('morning');
            }
        });
    };

    // Show loading skeleton while initializing
    if (isLoading) {
        return (
            <Layout user={user}>
                <div className="min-h-screen bg-slate-50">
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        <LoadingSkeleton />
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-slate-50 animate-up" style={{ animationDelay: '60ms' }}>
                <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 animate-up" style={{ animationDelay: '120ms' }}>
                    <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm animate-up" style={{ animationDelay: '180ms' }}>
                        <div className="px-8 py-8">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                                        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Examinee Registrations</h1>
                                        <p className="mt-2 text-sm text-white/80">Manage assignment workflow, filters, reschedules, and no-shows</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {stats.total} total
                                    </div>
                                    <button
                                        onClick={goBack}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/15"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Back to management
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Toast Notification */}
                    {showToast && (
                        <div className="fixed top-4 right-4 z-[100] animate-slideInRight">
                            <div className={`min-w-[320px] max-w-md rounded-xl shadow-2xl ${toastType === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                                <div className="flex items-start gap-3 px-5 py-4 text-white">
                                    <div className="flex-shrink-0">
                                        {toastType === 'success' ? (
                                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold leading-5">{toastMessage}</p>
                                    </div>
                                    <button
                                        onClick={() => setShowToast(false)}
                                        className="ml-2 text-white/80 transition-colors duration-150 hover:text-white"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enhanced Stats Cards */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-8 animate-up" style={{ animationDelay: '300ms' }}>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total</p>
                                    <p className="mt-3 text-2xl font-bold text-[#1D293D]">{stats.total}</p>
                                    <p className="mt-1 text-xs text-slate-500">All registrations</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Unassigned</p>
                                    <p className="mt-3 text-2xl font-bold text-[#1D293D]">{stats.unassigned}</p>
                                    <p className="mt-1 text-xs text-slate-500">Awaiting schedule</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Assigned</p>
                                    <p className="mt-3 text-2xl font-bold text-[#1D293D]">{stats.assigned}</p>
                                    <p className="mt-1 text-xs text-slate-500">Scheduled</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cancelled</p>
                                    <p className="mt-3 text-2xl font-bold text-[#1D293D]">{stats.cancelled}</p>
                                    <p className="mt-1 text-xs text-slate-500">No-show / expired</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Search and Controls */}
                    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-up" style={{ animationDelay: '320ms' }}>
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="relative w-full sm:w-80">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search by name, school, session, or status..."
                                    className="block w-full rounded-xl border border-slate-300 bg-white px-10 py-3 text-sm text-[#1D293D] placeholder-slate-400 shadow-sm transition duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-semibold text-slate-600">Filter</label>
                                <select
                                    value={registrationFilter}
                                    onChange={(e) => setRegistrationFilter(e.target.value)}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                >
                                    <option value="all">All registrations</option>
                                    <option value="assigned">Assigned only</option>
                                    <option value="not_assigned">Unassigned only</option>
                                </select>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { const next = {}; grouped.sortedDates.forEach(d => next[d] = true); setRegistrationsExpanded(next); }}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6]"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                    Expand all
                                </button>
                                <button
                                    onClick={() => setRegistrationsExpanded({})}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6]"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                    Collapse all
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.visit('/guidance/closed-exam-schedules')}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6]"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                    View archived
                                </button>
                                <button
                                    onClick={() => router.post('/guidance/archive-completed-registrations')}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6]"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                    Archive all
                                </button>
                                <button
                                    onClick={() => router.post('/guidance/auto-mark-no-shows')}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6]"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    Auto-mark no-shows
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('Fixing registration status issues...');
                                        router.post('/guidance/fix-registration-statuses');
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6]"
                                    title="Fix status issues">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Fix status issues
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Registrations Table Container */}
                    <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-up" style={{ animationDelay: '340ms' }}>
                        <div
                            className="cursor-pointer border-b border-slate-200 bg-[#1D293D] px-8 py-6 text-white animate-up"
                            style={{ animationDelay: '360ms' }}
                            onClick={() => toggleContainer('mainRegistrations')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Examinee Registrations</h3>
                                        <p className="text-sm text-white/80">Hierarchical view with date and session grouping</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Archive ${filteredRegistrations.length} examinee registration${filteredRegistrations.length !== 1 ? 's' : ''}? They will be moved to archived registrations.`)) {
                                                const ids = filteredRegistrations.map(r => r.id);
                                                router.post('/guidance/bulk-archive-registrations', {
                                                    registration_ids: ids,
                                                }, {
                                                    preserveScroll: true,
                                                    preserveState: true,
                                                    onSuccess: () => {
                                                        console.log('Archive successful');
                                                        setSelectedMainRegistrations([]);
                                                    },
                                                    onError: (errors) => {
                                                        console.error('Archive failed:', errors);
                                                    }
                                                });
                                            }
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/20"
                                        title="Archive all registrations in this view"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                        </svg>
                                        Archive all
                                    </button>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-white">{filteredRegistrations.length}</div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Total records</div>
                                    </div>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                                        <svg
                                            className={`h-5 w-5 transition-transform duration-200 ${containersExpanded.mainRegistrations ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {containersExpanded.mainRegistrations && (
                            <>
                            {/* Bulk Actions Bar for Main Registrations */}
                            {selectedMainRegistrations.length > 0 && (
                                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-medium text-gray-700">
                                                {selectedMainRegistrations.length} examinee{selectedMainRegistrations.length !== 1 ? 's' : ''} selected
                                            </span>
                                            <button
                                                onClick={() => setSelectedMainRegistrations([])}
                                                className="text-sm text-gray-500 hover:text-gray-700"
                                            >
                                                Clear selection
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    router.post('/guidance/bulk-force-allow-exam-today', {
                                                        registration_ids: selectedMainRegistrations,
                                                    }, { 
                                                        preserveScroll: true, 
                                                        preserveState: true,
                                                        onSuccess: () => {
                                                            console.log('Bulk allow exam today successful');
                                                            setSelectedMainRegistrations([]);
                                                        },
                                                        onError: (errors) => {
                                                            console.error('Bulk allow exam today failed:', errors);
                                                        }
                                                    });
                                                }}
                                                className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Allow exam today (selected)
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (selectedMainRegistrations.length > 0) {
                                                        setBulkMainDate(allowedDates[0] || '');
                                                        setBulkMainSession('morning');
                                                        setShowBulkMainModal(true);
                                                    }
                                                }}
                                                className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Bulk reschedule
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Archive ${selectedMainRegistrations.length} selected examinee registration${selectedMainRegistrations.length !== 1 ? 's' : ''}? They will be moved to archived registrations.`)) {
                                                        router.post('/guidance/bulk-archive-registrations', {
                                                            registration_ids: selectedMainRegistrations,
                                                        }, {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                            onSuccess: () => {
                                                                console.log('Archive successful');
                                                                setSelectedMainRegistrations([]);
                                                            },
                                                            onError: (errors) => {
                                                                console.error('Archive failed:', errors);
                                                            }
                                                        });
                                                    }
                                                }}
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-slate-400 hover:text-slate-700"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                </svg>
                                                Archive selected
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedMainRegistrationId && (
                                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                                    <div className="text-sm text-gray-700">Selected ID: {selectedMainRegistrationId}</div>
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const reg = findRegistrationById(selectedMainRegistrationId);
                                            const allowed = reg && isTodayYMD(reg.assigned_exam_date);
                                            return (
                                                <button
                                                    onClick={() => forceAllowToday(selectedMainRegistrationId)}
                                                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors duration-150 ${allowed ? 'border border-[#1447E6] bg-[#1447E6] text-white hover:bg-[#1240d0]' : 'border border-slate-300 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6]'}`}
                                                    title={allowed ? 'Allow the selected examinee to take the exam today even after the session' : 'Not assigned for today — you can still attempt to force allow; the system will validate.'}
                                                >
                                                    Allow exam today
                                                </button>
                                            );
                                        })()}
                                        <button
                                            onClick={() => {
                                                const reg = findRegistrationById(selectedMainRegistrationId);
                                                if (reg) openChangeSchedule(reg);
                                            }}
                                            className="inline-flex items-center rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]"
                                        >
                                            Reschedule selected
                                        </button>
                                        <button onClick={() => setSelectedMainRegistrationId(null)} className="px-3 py-2 text-sm bg-gray-200 rounded">Clear</button>
                                    </div>
                                </div>
                            )}
                            <div className="overflow-x-auto animate-up" style={{ animationDelay: '380ms' }}>
                            <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-4 py-4 text-left">
                                        <input
                                            type="checkbox"
                                            checked={filteredRegistrations.length > 0 && filteredRegistrations.every(r => selectedMainRegistrations.includes(r.id))}
                                            onChange={handleSelectAllMainRegistrations}
                                            className="h-4 w-4 text-[#1447E6] focus:ring-[#1447E6] border-gray-300 rounded"
                                        />
                                    </th>
                                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Student Name
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            School
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Registration Date
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Assigned Schedule
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Status
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {(() => {
                                    const { grouped: G, sortedDates } = grouped;
                                    if (sortedDates.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No registrations found.</td>
                                            </tr>
                                        );
                                    }
                                    
                                    const rows = [];
                                    for (let dateIdx = 0; dateIdx < sortedDates.length; dateIdx++) {
                                        const date = sortedDates[dateIdx];
                                        const dateSessions = G[date];
                                        const isDateExpanded = registrationsExpanded[date];
                                        const totalStudentsInDate = Object.values(dateSessions).flat().length;
                                        
                                        // Add date header row
                                        rows.push(
                                            <DateHeaderRow
                                                key={`date-${date}`}
                                                date={date}
                                                dateIdx={dateIdx}
                                                isDateExpanded={isDateExpanded}
                                                totalStudentsInDate={totalStudentsInDate}
                                                onToggle={() => toggleDateExpanded(date)}
                                            />
                                        );
                                        
                                        // Add session rows if date is expanded
                                        if (isDateExpanded) {
                                            const sessions = Object.keys(dateSessions);
                                            for (const session of sessions) {
                                                const sessionRegs = dateSessions[session];
                                                const sessionKey = `${date}_${session}`;
                                                const isSessionExpanded = registrationsExpanded[sessionKey];
                                                const paginated = getPaginatedRegistrationsForDate(sessionRegs, sessionKey);
                                                const { page, perPage } = getDatePageState(sessionKey);
                                                
                                                // Add session header row
                                                rows.push(
                                                    <SessionHeaderRow
                                                        key={`session-${sessionKey}`}
                                                        sessionKey={sessionKey}
                                                        session={session}
                                                        sessionRegs={sessionRegs}
                                                        isSessionExpanded={isSessionExpanded}
                                                        paginated={paginated}
                                                        perPage={perPage}
                                                        onToggle={() => toggleDateExpanded(sessionKey)}
                                                        onPerPageChange={(e) => setDatePerPage(sessionKey, parseInt(e.target.value))}
                                                    />
                                                );
                                                
                                                // Add student rows if session is expanded
                                                if (isSessionExpanded) {
                                                    paginated.data.forEach((student, idx) => {
                                                        rows.push(
                                                            <StudentRow
                                                                key={student.id}
                                                                student={student}
                                                                idx={idx}
                                                                onScheduleChange={openChangeSchedule}
                                                                selectedId={selectedMainRegistrationId}
                                                                onSelect={(id) => setSelectedMainRegistrationId(prev => prev === id ? null : id)}
                                                                selectedIds={selectedMainRegistrations}
                                                                onMultiSelect={handleSelectMainRegistration}
                                                            />
                                                        );
                                                    });
                                                    
                                                    // Add pagination if needed
                                                    if (paginated.totalPages > 1) {
                                                        rows.push(
                                                            <tr key={`p-${sessionKey}`} className="bg-gray-50 border-t border-gray-200">
                                                                <td colSpan="6" className="px-6 py-3 pl-20">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="text-xs text-gray-600">Page {paginated.currentPage} of {paginated.totalPages}</div>
                                                                        <div className="flex items-center gap-2">
                                                                            <button onClick={(e) => { e.stopPropagation(); setDatePage(sessionKey, Math.max(1, page - 1)); }} disabled={page <= 1} className="px-3 py-1 text-sm bg-white border border-gray-300 rounded disabled:opacity-50">Prev</button>
                                                                            {Array.from({ length: Math.min(5, paginated.totalPages) }, (_, i) => {
                                                                                let p;
                                                                                if (paginated.totalPages <= 5) p = i + 1; else if (page <= 3) p = i + 1; else if (page >= paginated.totalPages - 2) p = paginated.totalPages - 4 + i; else p = page - 2 + i;
                                                                                return <button key={p} onClick={(e) => { e.stopPropagation(); setDatePage(sessionKey, p); }} className={`px-3 py-1 text-sm rounded border ${p === page ? 'bg-[#1447E6] text-white border-[#1447E6]' : 'bg-white border-gray-300 hover:border-[#1447E6] hover:text-[#1447E6]'}`}>{p}</button>;
                                                                            })}
                                                                            <button onClick={(e) => { e.stopPropagation(); setDatePage(sessionKey, Math.min(paginated.totalPages, page + 1)); }} disabled={page >= paginated.totalPages} className="px-3 py-1 text-sm bg-white border border-gray-300 rounded disabled:opacity-50">Next</button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    
                                    return rows;
                                })()}
                            </tbody>
                        </table>
                            </div>
                            </>
                        )}
                    </div>

                    {/* Enhanced Unassigned Registrations Section */}
                    {unassignedRegistrations.length > 0 && (
                        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-up" style={{ animationDelay: '400ms' }}>
                            <div
                                className="cursor-pointer border-b border-slate-200 bg-[#1D293D] px-8 py-6 text-white animate-up"
                                style={{ animationDelay: '420ms' }}
                                onClick={() => toggleContainer('unassignedRegistrations')}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Unassigned Registrations</h3>
                                            <p className="text-sm text-white/80">Examinees awaiting exam schedule assignment</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Archive ${unassignedRegistrations.length} unassigned registration${unassignedRegistrations.length !== 1 ? 's' : ''}? They will be moved to archived registrations.`)) {
                                                    const ids = unassignedRegistrations.map(r => r.id);
                                                    router.post('/guidance/bulk-archive-registrations', {
                                                        registration_ids: ids,
                                                    }, {
                                                        preserveScroll: true,
                                                        preserveState: true,
                                                        onSuccess: () => {
                                                            console.log('Archive successful');
                                                            setSelectedUnassigned([]);
                                                        },
                                                        onError: (errors) => {
                                                            console.error('Archive failed:', errors);
                                                        }
                                                    });
                                                }
                                            }}
                                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/20"
                                            title="Archive all unassigned registrations"
                                        >
                                            <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                            </svg>
                                            Archive all
                                        </button>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-white">{unassignedRegistrations.length}</div>
                                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Awaiting schedule</div>
                                        </div>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                                            <svg
                                                className={`h-5 w-5 transition-transform duration-200 ${containersExpanded.unassignedRegistrations ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bulk Actions Bar for Unassigned Registrations */}
                            {selectedUnassigned.length > 0 && containersExpanded.unassignedRegistrations && (
                                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-medium text-gray-700">
                                                {selectedUnassigned.length} examinee{selectedUnassigned.length !== 1 ? 's' : ''} selected
                                            </span>
                                            <button
                                                onClick={() => setSelectedUnassigned([])}
                                                className="text-sm text-gray-500 hover:text-gray-700"
                                            >
                                                Clear selection
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setShowUnassignedSelectedModal(true)}
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-slate-400 hover:text-slate-700"
                                            >
                                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View Selected ({selectedUnassigned.length})
                                            </button>
                                            <button
                                                onClick={handleBulkAssign}
                                                className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]"
                                            >
                                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                                Bulk Assign Schedule
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Archive ${selectedUnassigned.length} selected unassigned registration${selectedUnassigned.length !== 1 ? 's' : ''}? They will be moved to archived registrations.`)) {
                                                        router.post('/guidance/bulk-archive-registrations', {
                                                            registration_ids: selectedUnassigned,
                                                        }, {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                            onSuccess: () => {
                                                                console.log('Archive successful');
                                                                setSelectedUnassigned([]);
                                                            },
                                                            onError: (errors) => {
                                                                console.error('Archive failed:', errors);
                                                            }
                                                        });
                                                    }
                                                }}
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-slate-400 hover:text-slate-700"
                                            >
                                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                </svg>
                                                Archive Selected
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {containersExpanded.unassignedRegistrations && (
                                <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={unassignedRegistrations.length > 0 && unassignedRegistrations.every(r => selectedUnassigned.includes(r.id))}
                                                    onChange={handleSelectAllUnassigned}
                                                    className="h-4 w-4 text-[#1447E6] focus:ring-[#1447E6] border-gray-300 rounded"
                                                />
                                            </th>
                                            <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    Student Name
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    School
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    Registration Date
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Actions
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {unassignedRegistrations.map((r, idx) => (
                                            <tr key={`ua-${r.id}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} transition-colors duration-200 hover:bg-[#1447E6]/10`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUnassigned.includes(r.id)}
                                                        onChange={() => handleSelectUnassigned(r.id)}
                                                        className="h-4 w-4 text-[#1447E6] focus:ring-[#1447E6] border-gray-300 rounded"
                                                    />
                                                </td>
                                                <td className="px-8 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                                                            <span className="text-xs font-semibold">
                                                                {(r.examinee?.user?.username || 'N/A').charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{r.examinee?.user?.username || 'N/A'}</div>
                                                            <div className="text-xs text-gray-500">ID: {r.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.examinee?.school_name || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(r.registration_date)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                            </svg>
                                                            Awaiting Schedule
                                                        </span>
                                                        <button 
                                                            onClick={() => openAssign(r)} 
                                                            className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]"
                                                        >
                                                             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                             </svg>
                                                             Assign Schedule
                                                     </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cancelled Examinees Table */}
                    {cancelledExaminees.length > 0 && (
                        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-up" style={{ animationDelay: '440ms' }}>
                            <div
                                className="cursor-pointer border-b border-slate-200 bg-[#1D293D] px-8 py-6 text-white animate-up"
                                style={{ animationDelay: '460ms' }}
                                onClick={() => toggleContainer('cancelledExaminees')}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Cancelled Examinees</h3>
                                            <p className="text-sm text-white/80">Manage no-shows and allow retakes</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-white">{cancelledExaminees.length}</div>
                                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">No-show / expired</div>
                                        </div>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                                            <svg
                                                className={`h-5 w-5 transition-transform duration-200 ${containersExpanded.cancelledExaminees ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {containersExpanded.cancelledExaminees && (
                                <>
                                {/* Search and Pagination Controls */}
                                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                value={cancelledSearch}
                                                onChange={(e) => {
                                                    setCancelledSearch(e.target.value);
                                                    setCancelledPage(1); // Reset to first page when searching
                                                }}
                                                placeholder="Search cancelled examinees..."
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {paginatedCancelledExaminees.total} total • Showing {paginatedCancelledExaminees.from}-{paginatedCancelledExaminees.to}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm text-gray-600">Show:</label>
                                        <select
                                            value={cancelledPerPage}
                                            onChange={(e) => {
                                                setCancelledPerPage(parseInt(e.target.value));
                                                setCancelledPage(1);
                                            }}
                                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                                        >
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bulk Actions Bar */}
                            {selectedCancelled.length > 0 && (
                                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-medium text-gray-700">
                                                {selectedCancelled.length} examinee{selectedCancelled.length !== 1 ? 's' : ''} selected
                                            </span>
                                            <button
                                                onClick={() => setSelectedCancelled([])}
                                                className="text-sm text-gray-500 hover:text-gray-700"
                                            >
                                                Clear selection
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setShowSelectedModal(true)}
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-slate-400 hover:text-slate-700"
                                            >
                                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View Selected ({selectedCancelled.length})
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBulkAction('retake');
                                                    handleBulkAction();
                                                }}
                                                className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]"
                                            >
                                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Allow Retake
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBulkAction('reschedule');
                                                    handleBulkAction();
                                                }}
                                                className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]"
                                            >
                                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Reschedule
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBulkAction('archive');
                                                    handleBulkAction();
                                                }}
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-slate-400 hover:text-slate-700"
                                            >
                                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                </svg>
                                                Archive Selected
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBulkAction('delete');
                                                    setShowBulkModal(true);
                                                }}
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6]"
                                            >
                                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Delete Selected
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto">   
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={paginatedCancelledExaminees.data.length > 0 && paginatedCancelledExaminees.data.every(r => selectedCancelled.includes(r.id))}
                                                    onChange={handleSelectAllCancelled}
                                                    className="h-4 w-4 text-[#1447E6] focus:ring-[#1447E6] border-gray-300 rounded"
                                                />
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    Student Name
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    School
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    Original Schedule
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Registration Date
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Actions
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedCancelledExaminees.data.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                    {cancelledSearch ? 'No cancelled examinees found matching your search.' : 'No cancelled examinees found.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedCancelledExaminees.data.map((r, idx) => (
                                            <tr key={`cancelled-${r.id}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} transition-colors duration-200 hover:bg-[#1447E6]/10`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCancelled.includes(r.id)}
                                                        onChange={() => handleSelectCancelled(r.id)}
                                                        className="h-4 w-4 text-[#1447E6] focus:ring-[#1447E6] border-gray-300 rounded"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                                                            <span className="text-xs font-semibold">
                                                                {(r.examinee?.user?.username || 'N/A').charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{r.examinee?.user?.username || 'N/A'}</div>
                                                            <div className="text-xs text-gray-500">ID: {r.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.examinee?.school_name || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {r.assigned_exam_date ? (
                                                        <div>
                                                            <div>{formatDate(r.assigned_exam_date)}</div>
                                                            <div className="text-xs text-gray-500">{r.assigned_session || 'No session'}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">Not scheduled</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(r.registration_date)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M6 18L18 6M6 6l12 12" clipRule="evenodd" />
                                                            </svg>
                                                            No Show
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination Controls */}
                            {paginatedCancelledExaminees.totalPages > 1 && (
                                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-600">
                                            Page {paginatedCancelledExaminees.currentPage} of {paginatedCancelledExaminees.totalPages}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCancelledPage(Math.max(1, cancelledPage - 1))}
                                                disabled={cancelledPage <= 1}
                                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                            >
                                                Previous
                                            </button>
                                            {Array.from({ length: Math.min(5, paginatedCancelledExaminees.totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (paginatedCancelledExaminees.totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (cancelledPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (cancelledPage >= paginatedCancelledExaminees.totalPages - 2) {
                                                    pageNum = paginatedCancelledExaminees.totalPages - 4 + i;
                                                } else {
                                                    pageNum = cancelledPage - 2 + i;
                                                }
                                                
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCancelledPage(pageNum)}
                                                        className={`px-3 py-1 text-sm rounded border ${
                                                            pageNum === cancelledPage
                                                                ? 'bg-[#1447E6] text-white border-[#1447E6]'
                                                                : 'bg-white border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                            <button
                                                onClick={() => setCancelledPage(Math.min(paginatedCancelledExaminees.totalPages, cancelledPage + 1))}
                                                disabled={cancelledPage >= paginatedCancelledExaminees.totalPages}
                                                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Selected Examinees Modal */}
                    {showSelectedModal && (
                        <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm z-50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] my-auto overflow-hidden" style={{ margin: 'auto' }}>
                                <div className="flex items-center justify-between bg-[#1D293D] px-6 py-4 text-white">
                                    <h3 className="text-white font-semibold">
                                        Selected Examinees ({selectedCancelled.length})
                                    </h3>
                                    <button 
                                        onClick={() => setShowSelectedModal(false)} 
                                        className="text-xl text-white/80 transition-colors duration-150 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="mb-4 text-sm text-gray-600">
                                        Review the selected examinees before performing bulk actions.
                                    </div>
                                    <div className="overflow-x-auto max-h-96">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Student
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        School
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Original Date
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Session
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Registration Date
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {selectedExamineesData.map((r, idx) => (
                                                    <tr key={`selected-${r.id}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="flex-shrink-0 h-8 w-8">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                                                                        <span className="text-xs font-semibold">
                                                                            {(r.examinee?.user?.username || 'N/A').charAt(0).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="ml-3">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {r.examinee?.user?.username || 'N/A'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                            {r.examinee?.school_name || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                            {r.assigned_exam_date ? formatDate(r.assigned_exam_date) : 'Not scheduled'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                            {r.assigned_session || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                            {formatDate(r.registration_date)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowSelectedModal(false)}
                                            className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowSelectedModal(false);
                                                setBulkAction('retake');
                                                handleBulkAction();
                                            }}
                                            className="px-4 py-2 text-sm bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors"
                                        >
                                            Allow Retake
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowSelectedModal(false);
                                                setBulkAction('reschedule');
                                                handleBulkAction();
                                            }}
                                            className="px-4 py-2 text-sm bg-[#1447E6] text-white rounded-lg hover:bg-[#7C3AED] transition-colors"
                                        >
                                            Reschedule
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowSelectedModal(false);
                                                setBulkAction('archive');
                                                handleBulkAction();
                                            }}
                                            className="px-4 py-2 text-sm bg-[#6B7280] text-white rounded-lg hover:bg-[#4B5563] transition-colors"
                                        >
                                            Archive Selected
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Assign Modal */}
                    {assignModalOpen && (
                        <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm z-50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ margin: 'auto' }}>
                                <div className="flex items-center justify-between rounded-t-2xl bg-[#1447E6] px-6 py-4 text-white">
                                    <h3 className="text-white font-semibold">Assign Examinee</h3>
                                    <button onClick={() => setAssignModalOpen(false)} className="text-white/80 transition-colors duration-150 hover:text-white">✕</button>
                                </div>
                                <form onSubmit={submitAssign} className="p-6 space-y-4">
                                    <div className="text-sm text-gray-700">{assignTarget?.examinee?.user?.username} • {assignTarget?.examinee?.school_name}</div>
                                    <div ref={dateMenuRef}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <div className="relative">
                                            <button type="button" onClick={()=>setDateMenuOpen(v=>!v)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-left text-sm text-[#1D293D] focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30">
                                                {dateOptions.find(o=>o.value===assignDate)?.label || 'Select a date'}
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                </span>
                                            </button>
                                            {dateMenuOpen && (
                                                <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                                    {(() => {
                                                        const groups = {};
                                                        dateOptions.forEach(opt => { (groups[opt.group] ||= []).push(opt); });
                                                        return Object.entries(groups).map(([g, opts]) => (
                                                            <div key={g} className="py-1">
                                                                <div className="bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{g}</div>
                                                                {opts.map((o, idx2) => (
                                                                    <button
                                                                        key={o.value}
                                                                        type="button"
                                                                        onClick={()=>{
                                                                            setAssignDate(o.value);
                                                                            setAvailableSessions(getSessionsForDate(o.value));
                                                                            const en = getSessionsForDate(o.value).find(s=>!s.disabled)?.value || 'morning';
                                                                            setAssignSession(en);
                                                                            setDateMenuOpen(false);
                                                                        }}
                                                                        className={`w-full px-3 py-2 text-left text-sm transition-colors duration-150 ${assignDate === o.value ? 'bg-[#1447E6]/10 text-[#1447E6]' : 'hover:bg-[#1447E6]/10'}`}
                                                                    >
                                                                         {o.label}
                                                                     </button>
                                                                ))}
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Dates show AM/PM capacities and availability. Full/closed sessions are indicated.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                                        <select value={assignSession} onChange={(e)=>setAssignSession(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-[#1D293D] focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30">
                                            {availableSessions.map(s => (
                                                <option key={s.value} value={s.value} disabled={s.disabled}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button type="button" onClick={()=>setAssignModalOpen(false)} className="px-4 py-2 text-sm border rounded">Cancel</button>
                                        <button type="submit" className="rounded-lg bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]">Assign</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Bulk Action Modal */}
                    {showBulkModal && (
                        <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm z-50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ margin: 'auto' }}>
                                <div className="flex items-center justify-between rounded-t-2xl bg-[#1D293D] px-6 py-4 text-white">
                                    <h3 className="text-white font-semibold">
                                        {bulkAction === 'retake' ? 'Allow Retake' : 
                                         bulkAction === 'archive' ? 'Archive Examinees' : 
                                         bulkAction === 'delete' ? 'Delete Examinees' :
                                         'Reschedule Examinees'}
                                    </h3>
                                    <button onClick={() => setShowBulkModal(false)} className="text-white/80 transition-colors duration-150 hover:text-white">✕</button>
                                </div>
                                <form onSubmit={submitBulkAction} className="p-6 space-y-4">
                                    {bulkAction === 'delete' ? (
                                        <div className="space-y-3">
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                <div className="flex items-start">
                                                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-red-800 mb-1">Warning: This action cannot be undone!</h4>
                                                        <p className="text-sm text-red-700">
                                                            You are about to permanently delete <strong>{selectedCancelled.length}</strong> examinee registration{selectedCancelled.length !== 1 ? 's' : ''} from the database. This will remove all associated data and cannot be recovered.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-700">
                                                Are you sure you want to proceed with deleting these records?
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-700">
                                            {bulkAction === 'retake' 
                                                ? `Allow ${selectedCancelled.length} examinee${selectedCancelled.length !== 1 ? 's' : ''} to retake the exam?`
                                                : bulkAction === 'archive'
                                                ? `Archive ${selectedCancelled.length} examinee${selectedCancelled.length !== 1 ? 's' : ''}? They will be moved to archived registrations.`
                                                : `Reschedule ${selectedCancelled.length} examinee${selectedCancelled.length !== 1 ? 's' : ''} to a new date?`
                                            }
                                        </div>
                                    )}
                                    
                                    {bulkAction === 'reschedule' && (
                                        <>
                                            {/* Summary Card */}
                                            <div className="mb-4 rounded-xl border border-[#1447E6]/20 bg-[#1447E6]/5 p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-[#1447E6] rounded-lg flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-semibold text-gray-900 mb-1">Rescheduling {selectedCancelled.length} Examinee{selectedCancelled.length !== 1 ? 's' : ''}</h4>
                                                        <p className="text-xs text-gray-600">All selected examinees will be assigned to the same new schedule date and session.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Date Selection */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                    <svg className="w-4 h-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    New Exam Date
                                                </label>
                                                <div className="relative">
                                                    <button 
                                                        type="button" 
                                                        onClick={()=>setDateMenuOpen(v=>!v)} 
                                                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm text-left bg-white hover:border-[#1447E6]/50 focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] transition-all duration-200 flex items-center justify-between group"
                                                    >
                                                        <span className={`${bulkDate ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                                                            {dateOptions.find(o=>o.value===bulkDate)?.label || 'Select a date'}
                                                        </span>
                                                        <svg className={`w-5 h-5 text-gray-400 group-hover:text-[#1447E6] transition-transform duration-200 ${dateMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    {dateMenuOpen && (
                                                        <div className="absolute left-0 top-full mt-2 z-50 w-full bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                                                            {(() => {
                                                                const groups = {};
                                                                dateOptions.forEach(opt => { (groups[opt.group] ||= []).push(opt); });
                                                                return Object.entries(groups).map(([g, opts]) => (
                                                                    <div key={g} className="py-2">
                                                                        <div className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-50 uppercase tracking-wider sticky top-0">{g}</div>
                                                                        {opts.map((o, idx2) => (
                                                                            <button 
                                                                                key={o.value} 
                                                                                type="button" 
                                                                                onClick={()=>{ 
                                                                                    setBulkDate(o.value); 
                                                                                    setAvailableSessions(getSessionsForDate(o.value)); 
                                                                                    const en = getSessionsForDate(o.value).find(s=>!s.disabled)?.value || 'morning'; 
                                                                                    setBulkSession(en); 
                                                                                    setDateMenuOpen(false); 
                                                                                }} 
                                                                                className={`w-full text-left px-4 py-3 text-sm hover:bg-[#1447E6]/10 transition-colors duration-150 flex items-center justify-between ${
                                                                                    bulkDate===o.value 
                                                                                        ? 'bg-[#1447E6]/10 text-[#1447E6] font-medium' 
                                                                                        : (idx2 % 2 === 0 ? 'bg-white' : 'bg-slate-50')
                                                                                }`}
                                                                            >
                                                                                <span>{o.label}</span>
                                                                                {bulkDate===o.value && (
                                                                                    <svg className="w-5 h-5 text-[#1447E6]" fill="currentColor" viewBox="0 0 20 20">
                                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                                    </svg>
                                                                                )}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                                {bulkDate && (
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Dates show AM/PM capacities and availability. Full/closed sessions are indicated.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Session Selection */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                    <svg className="w-4 h-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Exam Session
                                                </label>
                                                <div className="relative">
                                                    <select 
                                                        value={bulkSession} 
                                                        onChange={(e)=>setBulkSession(e.target.value)} 
                                                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm bg-white hover:border-[#1447E6]/50 focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] transition-all duration-200 appearance-none cursor-pointer"
                                                    >
                                                        {availableSessions.map(s => (
                                                            <option key={s.value} value={s.value} disabled={s.disabled}>{s.label}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                {bulkSession && (
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Selected session will be applied to all examinees.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Preview Section */}
                                            {bulkDate && bulkSession && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
                                                    <div className="flex items-start gap-3">
                                                        <svg className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <div className="flex-1">
                                                            <h4 className="text-sm font-semibold text-slate-900 mb-1">Ready to Reschedule</h4>
                                                            <p className="text-xs text-slate-700">
                                                                All {selectedCancelled.length} examinee{selectedCancelled.length !== 1 ? 's' : ''} will be rescheduled to <strong>{dateOptions.find(o=>o.value===bulkDate)?.label.split(' • ')[0]}</strong> for the <strong>{bulkSession === 'morning' ? 'Morning' : 'Afternoon'}</strong> session.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button 
                                            type="button" 
                                            onClick={()=>setShowBulkModal(false)} 
                                            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:border-slate-400 hover:text-slate-700"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={bulkAction === 'reschedule' && (!bulkDate || !bulkSession)}
                                            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                                                bulkAction === 'delete'
                                                    ? 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-700'
                                                    : 'bg-[#1447E6] text-white hover:bg-[#1240d0]'
                                            }`}
                                        >
                                            {bulkAction === 'reschedule' && (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                            {bulkAction === 'retake' ? 'Allow Retake' : 
                                             bulkAction === 'archive' ? 'Archive Selected' : 
                                             bulkAction === 'delete' ? 'Delete Permanently' :
                                             'Reschedule Examinees'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Selected Unassigned Examinees Modal */}
                    {showUnassignedSelectedModal && (
                        <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm z-50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] my-auto overflow-hidden" style={{ margin: 'auto' }}>
                                <div className="flex items-center justify-between bg-[#1D293D] px-6 py-4 text-white">
                                    <h3 className="text-white font-semibold">
                                        Selected Unassigned Examinees ({selectedUnassigned.length})
                                    </h3>
                                    <button 
                                        onClick={() => setShowUnassignedSelectedModal(false)} 
                                        className="text-xl text-white/80 transition-colors duration-150 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="mb-4 text-sm text-gray-600">
                                        Review the selected unassigned examinees before assigning them to a schedule.
                                    </div>
                                    <div className="overflow-x-auto max-h-96">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Student
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        School
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Registration Date
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {selectedUnassignedData.map((r, idx) => (
                                                    <tr key={`selected-unassigned-${r.id}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="flex-shrink-0 h-8 w-8">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                                                                        <span className="text-xs font-semibold">
                                                                            {(r.examinee?.user?.username || 'N/A').charAt(0).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="ml-3">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {r.examinee?.user?.username || 'N/A'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                            {r.examinee?.school_name || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                            {formatDate(r.registration_date)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowUnassignedSelectedModal(false)}
                                            className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowUnassignedSelectedModal(false);
                                                handleBulkAssign();
                                            }}
                                            className="px-4 py-2 text-sm bg-[#1447E6] text-white rounded-lg hover:bg-[#7C3AED] transition-colors"
                                        >
                                            Assign Schedule
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bulk Assignment Modal */}
                    {showBulkAssignModal && (
                        <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm z-50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ margin: 'auto' }}>
                                <div className="flex items-center justify-between rounded-t-2xl bg-[#1447E6] px-6 py-4 text-white">
                                    <h3 className="text-white font-semibold">Bulk Assign Schedule</h3>
                                    <button onClick={() => setShowBulkAssignModal(false)} className="text-white/80 transition-colors duration-150 hover:text-white">✕</button>
                                </div>
                                <form onSubmit={submitBulkAssign} className="p-6 space-y-4">
                                    <div className="text-sm text-gray-700">
                                        Assign {selectedUnassigned.length} examinee{selectedUnassigned.length !== 1 ? 's' : ''} to the same schedule?
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <div className="relative">
                                            <button type="button" onClick={()=>setDateMenuOpen(v=>!v)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-left text-sm text-[#1D293D] focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30">
                                                {dateOptions.find(o=>o.value===bulkAssignDate)?.label || 'Select a date'}
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                </span>
                                            </button>
                                            {dateMenuOpen && (
                                                <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                                    {(() => {
                                                        const groups = {};
                                                        dateOptions.forEach(opt => { (groups[opt.group] ||= []).push(opt); });
                                                        return Object.entries(groups).map(([g, opts]) => (
                                                            <div key={g} className="py-1">
                                                                <div className="bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{g}</div>
                                                                {opts.map((o, idx2) => (
                                                                    <button
                                                                        key={o.value}
                                                                        type="button"
                                                                        onClick={()=>{
                                                                            setBulkAssignDate(o.value);
                                                                            setAvailableSessions(getSessionsForDate(o.value));
                                                                            const en = getSessionsForDate(o.value).find(s=>!s.disabled)?.value || 'morning';
                                                                            setBulkAssignSession(en);
                                                                            setDateMenuOpen(false);
                                                                        }}
                                                                        className={`w-full px-3 py-2 text-left text-sm transition-colors duration-150 ${bulkAssignDate === o.value ? 'bg-[#1447E6]/10 text-[#1447E6]' : 'hover:bg-[#1447E6]/10'}`}
                                                                    >
                                                                         {o.label}
                                                                     </button>
                                                                ))}
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Dates show AM/PM capacities and availability. Full/closed sessions are indicated.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                                        <select value={bulkAssignSession} onChange={(e)=>setBulkAssignSession(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-[#1D293D] focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30">
                                            {availableSessions.map(s => (
                                                <option key={s.value} value={s.value} disabled={s.disabled}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button type="button" onClick={()=>setShowBulkAssignModal(false)} className="px-4 py-2 text-sm border rounded">Cancel</button>
                                        <button type="submit" className="rounded-lg bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]">Assign all</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Change Schedule Modal */}
                    {changeScheduleModalOpen && (
                        <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm z-50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ margin: 'auto' }}>
                                <div className="flex items-center justify-between rounded-t-2xl bg-[#1D293D] px-6 py-4 text-white">
                                    <h3 className="text-white font-semibold">Change Schedule</h3>
                                    <button onClick={() => setChangeScheduleModalOpen(false)} className="text-white/80 transition-colors duration-150 hover:text-white">✕</button>
                                </div>
                                <form onSubmit={submitChangeSchedule} className="p-6 space-y-4">
                                    <div className="text-sm text-gray-700">
                                        <div className="font-medium">{changeScheduleTarget?.examinee?.user?.username}</div>
                                        <div className="text-gray-500">{changeScheduleTarget?.examinee?.school_name}</div>
                                        <div className="text-xs mt-1">
                                            {changeScheduleTarget?.assigned_exam_date ? (
                                                (() => {
                                                    const today = new Date().toISOString().split('T')[0];
                                                    const currentDate = changeScheduleTarget.assigned_exam_date;
                                                    const isPast = currentDate < today;
                                                    return (
                                                        <div>
                                                            {isPast ? 'Past' : 'Future'} date: {formatDate(currentDate)}
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <div>No assigned date</div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                                        <input
                                            type="date"
                                            value={changeScheduleDate}
                                            onChange={(e) => setChangeScheduleDate(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-[#1D293D] focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                                        <select value={changeScheduleSession} onChange={(e) => setChangeScheduleSession(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-[#1D293D] focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30" disabled={allowedDates.length === 0}>
                                            {availableSessions.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button type="button" onClick={() => setChangeScheduleModalOpen(false)} className="px-4 py-2 text-sm border rounded">Cancel</button>
                                        <button type="submit" className="rounded-lg bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1240d0]">Save changes</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ExamineeRegistrations;