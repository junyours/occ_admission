import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import QRCode from 'qrcode';

const ExamRegistrationManagement = ({ user, settings, registrations, schedules, flash }) => {
    // Detect lightweight embed mode (registrations-only)
    const isEmbedRegistrations = (() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('embed') === 'registrations';
        } catch (_) { return false; }
    })();

    // Handle flash messages
    React.useEffect(() => {
        if (flash?.success) {
            window.showAlert(flash.success, 'success');
        }
        if (flash?.error) {
            window.showAlert(flash.error, 'error');
        }
    }, [flash]);

    // Toggle: registrations UI is now on its own page
    const registrationsSectionEnabled = false;

    // Function to get current academic year (current year to next year)
    const getCurrentAcademicYear = () => {
        const currentYear = new Date().getFullYear();
        return `${currentYear}-${currentYear + 1}`;
    };

    // Check if registration should be automatically closed based on exam end date
    const shouldAutoCloseRegistration = () => {
        if (!settings.registration_open || !settings.exam_end_date) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(settings.exam_end_date);
        endDate.setHours(23, 59, 59, 999);

        return today > endDate;
    };

    // Auto-close registration if exam period has ended
    React.useEffect(() => {
        if (shouldAutoCloseRegistration()) {
            console.log('[ExamRegistration] Auto-closing registration - exam period ended');
            router.put('/guidance/registration-settings', {
                ...settings,
                registration_open: false
            }, {
                onSuccess: () => {
                    console.log('[ExamRegistration] Registration auto-closed successfully');
                    window.showAlert('Registration automatically closed - exam period has ended', 'info');
                },
                onError: (errors) => {
                    console.warn('[ExamRegistration] Failed to auto-close registration', errors);
                }
            });
        }
    }, [settings.registration_open, settings.exam_end_date]);

    // Auto-cancel no-show registrations - REMOVED (moved to another location)

    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showInfoPopover, setShowInfoPopover] = useState(false);
    const infoRef = useRef(null);
    const [editingRegistration, setEditingRegistration] = useState(null);
    const [editingRegistrationData, setEditingRegistrationData] = useState(null);
    const [showEditRegistrationModal, setShowEditRegistrationModal] = useState(false);
    const [modalDateValue, setModalDateValue] = useState('');
    const [modalSessionValue, setModalSessionValue] = useState('');
    const [modalStatusValue, setModalStatusValue] = useState('');
    const [modalSaving, setModalSaving] = useState(false);
    const [showWindowList, setShowWindowList] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [scheduleFormData, setScheduleFormData] = useState({});
    const [registrationFilter, setRegistrationFilter] = useState('all');
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [tempDateValue, setTempDateValue] = useState('');
    const [tempSessionValue, setTempSessionValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [autoAssigningIds, setAutoAssigningIds] = useState([]);
    const [expandedDates, setExpandedDates] = useState(() => {
        // Load from localStorage, default to empty object if not found
        const saved = localStorage.getItem('examRegistration_expandedDates');
        return saved !== null ? JSON.parse(saved) : {};
    });

    // Performance optimization: Use requestAnimationFrame for smooth updates
    const rafRef = useRef(null);
    const updateExpandedDates = useCallback((newExpandedDates) => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
            setExpandedDates(newExpandedDates);
            localStorage.setItem('examRegistration_expandedDates', JSON.stringify(newExpandedDates));
        });
    }, []);

    // Handle state changes and save to localStorage
    const handleSchedulesCollapsedChange = (isCollapsed) => {
        setSchedulesCollapsed(isCollapsed);
        localStorage.setItem('examRegistration_schedulesCollapsed', JSON.stringify(isCollapsed));
    };

    const handleRegistrationsContainerCollapsedChange = (isCollapsed) => {
        setRegistrationsContainerCollapsed(isCollapsed);
        localStorage.setItem('examRegistration_registrationsContainerCollapsed', JSON.stringify(isCollapsed));
    };

    const handleInfoCollapsedChange = (isCollapsed) => {
        setInfoCollapsed(isCollapsed);
        localStorage.setItem('examRegistration_infoCollapsed', JSON.stringify(isCollapsed));
    };

    // Performance optimization: Intersection Observer for lazy loading
    const observerRef = useRef(null);
    useEffect(() => {
        const onDocClick = (e) => {
            if (infoRef.current && !infoRef.current.contains(e.target)) {
                setShowInfoPopover(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Load content when visible
                        entry.target.classList.add('loaded');
                    }
                });
            },
            { threshold: 0.1 }
        );

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
            document.removeEventListener('mousedown', onDocClick);
        };
    }, []);
    // Already declared earlier; keep a single source of truth
    const [showClosedSchedules, setShowClosedSchedules] = useState(false);
    const [lastNoShowCheck, setLastNoShowCheck] = useState(null);
    // Date editing modal state
    const [showDateEditModal, setShowDateEditModal] = useState(false);
    const [editingDate, setEditingDate] = useState(null);
    const [dateFormData, setDateFormData] = useState({
        morning: { start_time: '', end_time: '', max_capacity: '', status: 'open' },
        afternoon: { start_time: '', end_time: '', max_capacity: '', status: 'open' }
    });
    const [dateModalSaving, setDateModalSaving] = useState(false);
    // Bulk code generation modal state
    const [showBulkCodeModal, setShowBulkCodeModal] = useState(false);
    const [examSummaries, setExamSummaries] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [loadingExams, setLoadingExams] = useState(false);
    const [submittingBulk, setSubmittingBulk] = useState(false);
    // Single date code generation modal state
    const [showSingleDateCodeModal, setShowSingleDateCodeModal] = useState(false);
    const [singleDateForCode, setSingleDateForCode] = useState('');
    const [singleDateExamId, setSingleDateExamId] = useState('');
    const [submittingSingleDate, setSubmittingSingleDate] = useState(false);
    // Confirmation modal for closing schedules
    const [showCloseConfirmationModal, setShowCloseConfirmationModal] = useState(false);
    const [pendingFormData, setPendingFormData] = useState(null);
    // QR Code states
    const [qrCodeData, setQrCodeData] = useState({});
    const [showQrModal, setShowQrModal] = useState(false);
    const [selectedQrCode, setSelectedQrCode] = useState('');
    // Reschedule modal states
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleData, setRescheduleData] = useState({
        examDate: null,
        examineeCount: 0,
        newDate: '',
        newSession: 'morning'
    });
    const [rescheduleSaving, setRescheduleSaving] = useState(false);
    // Local copies for optimistic UI updates
    const [localSchedules, setLocalSchedules] = useState(schedules);
    const [localRegistrations, setLocalRegistrations] = useState(registrations);
    // Auto-refresh state
    const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
    const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
    const [itemsPerPage, setItemsPerPage] = useState(100); // Optimized with backend fixes
    const [schedulesCollapsed, setSchedulesCollapsed] = useState(() => {
        // Load from localStorage, default to true if not found
        const saved = localStorage.getItem('examRegistration_schedulesCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [registrationsContainerCollapsed, setRegistrationsContainerCollapsed] = useState(() => {
        // Load from localStorage, default to true if not found
        const saved = localStorage.getItem('examRegistration_registrationsContainerCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [infoCollapsed, setInfoCollapsed] = useState(() => {
        // Load from localStorage, default to true if not found
        const saved = localStorage.getItem('examRegistration_infoCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [registrationsExpanded, setRegistrationsExpanded] = useState({});
    // Per-date pagination state: { 'dateString': { page: 1, perPage: 5 } } - Reduced for performance
    const [datePageState, setDatePageState] = useState({});
    // Client-side pagination for Exam Schedules dates
    const [scheduleDatePage, setScheduleDatePage] = useState(1);
    const [scheduleDatesPerPage, setScheduleDatesPerPage] = useState(5); // Optimized for performance with backend fixes
    const [formData, setFormData] = useState({
        registration_open: settings.registration_open,
        academic_year: settings.academic_year || getCurrentAcademicYear(),
        semester: settings.semester || '1st',
        exam_start_date: settings.exam_start_date,
        exam_end_date: settings.exam_end_date,
        students_per_day: settings.students_per_day,
        registration_message: settings.registration_message || '',
        delete_previous_schedules: false,
        selected_exam_dates: settings.selected_exam_dates || []
    });

    // Aggressively optimized debounce search input
    const debounceRef = useRef(null);
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            const trimmed = searchInput.trim().toLowerCase();
            if (trimmed !== debouncedSearch) {
                setDebouncedSearch(trimmed);
            }
        }, 500); // Increased to 500ms for super smooth performance
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchInput, debouncedSearch]);

    // Keep local copies in sync with server-provided props
    React.useEffect(() => {
        setLocalSchedules(schedules);
        setLocalRegistrations(registrations);
    }, [schedules, registrations]);

    // Auto-refresh data every 30 seconds to keep data in sync
    React.useEffect(() => {
        const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

        const refreshData = () => {
            console.log('[ExamRegistration] Auto-refreshing data...');
            setIsAutoRefreshing(true);
            router.reload({
                only: ['schedules', 'registrations'],
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    console.log('[ExamRegistration] Auto-refresh successful');
                    setIsAutoRefreshing(false);
                    setLastRefreshTime(new Date());
                },
                onError: (errors) => {
                    console.warn('[ExamRegistration] Auto-refresh failed:', errors);
                    setIsAutoRefreshing(false);
                }
            });
        };

        const intervalId = setInterval(refreshData, AUTO_REFRESH_INTERVAL);

        // Cleanup on unmount
        return () => {
            clearInterval(intervalId);
        };
    }, []); // Empty dependency array - runs once on mount

    // Manual refresh function
    const handleManualRefresh = () => {
        console.log('[ExamRegistration] Manual refresh triggered');
        setIsAutoRefreshing(true);
        router.reload({
            only: ['schedules', 'registrations'],
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                console.log('[ExamRegistration] Manual refresh successful');
                setIsAutoRefreshing(false);
                setLastRefreshTime(new Date());
                window.showAlert('✅ Data refreshed successfully', 'success');
            },
            onError: (errors) => {
                console.warn('[ExamRegistration] Manual refresh failed:', errors);
                setIsAutoRefreshing(false);
                window.showAlert('❌ Failed to refresh data', 'error');
            }
        });
    };

    // Note: removed auto-append of ?per_page to keep URL clean and avoid extra reloads

    const reloadPageWithParams = (newParams = {}) => {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        Object.entries(newParams).forEach(([k, v]) => {
            if (v === undefined || v === null || v === '') params.delete(k); else params.set(k, v);
        });
        router.get(`${url.pathname}?${params.toString()}`, {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    // Generate QR code for exam codes
    const generateQRCode = async (examCode) => {
        try {
            if (qrCodeData[examCode]) {
                return qrCodeData[examCode];
            }
            const qrDataURL = await QRCode.toDataURL(examCode, {
                width: 120,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            setQrCodeData(prev => ({ ...prev, [examCode]: qrDataURL }));
            return qrDataURL;
        } catch (error) {
            console.error('Error generating QR code:', error);
            return null;
        }
    };

    // Show QR code modal
    const showQRCodeModal = async (examCode) => {
        const qrDataURL = await generateQRCode(examCode);
        if (qrDataURL) {
            setSelectedQrCode(qrDataURL);
            setShowQrModal(true);
        }
    };

    // Update form data when settings change (e.g., after auto-close)
    React.useEffect(() => {
        setFormData({
            registration_open: settings.registration_open,
            academic_year: settings.academic_year || getCurrentAcademicYear(),
            semester: settings.semester || '1st',
            exam_start_date: settings.exam_start_date,
            exam_end_date: settings.exam_end_date,
            students_per_day: settings.students_per_day,
            registration_message: settings.registration_message || '',
            delete_previous_schedules: false,
            selected_exam_dates: settings.selected_exam_dates || []
        });
    }, [settings]);

    const handleSettingsSubmit = (e) => {
        e.preventDefault();

        // Additional validation for date logic (only when opening registration)
        if (formData.registration_open && formData.exam_start_date && formData.exam_end_date) {
            const startDate = new Date(formData.exam_start_date);
            const endDate = new Date(formData.exam_end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDate < today) {
                window.showAlert('Exam start date cannot be in the past', 'error');
                return;
            }

            if (endDate < startDate) {
                window.showAlert('Exam end date must be on or after the start date', 'error');
                return;
            }

            // Validate selected dates are within the exam window
            if (formData.selected_exam_dates && formData.selected_exam_dates.length > 0) {
                const invalidDates = formData.selected_exam_dates.filter(date => {
                    const selectedDate = new Date(date);
                    return selectedDate < startDate || selectedDate > endDate;
                });

                if (invalidDates.length > 0) {
                    window.showAlert(`Selected dates must be within the exam window (${formatDate(formData.exam_start_date)} - ${formatDate(formData.exam_end_date)})`, 'error');
                    return;
                }

                // Check if at least one date is selected
                if (formData.selected_exam_dates.length === 0) {
                    window.showAlert('Please select at least one exam date', 'error');
                    return;
                }
            }
        }

        // Ensure all required fields are present
        const submitData = {
            registration_open: formData.registration_open,
            academic_year: formData.academic_year,
            semester: formData.semester,
            exam_start_date: formData.exam_start_date,
            exam_end_date: formData.exam_end_date,
            students_per_day: formData.students_per_day,
            registration_message: formData.registration_message,
            delete_previous_schedules: formData.delete_previous_schedules || false,
            selected_exam_dates: formData.selected_exam_dates || []
        };

        // Show confirmation modal if closing schedules
        if (formData.delete_previous_schedules) {
            setPendingFormData(submitData);
            setShowCloseConfirmationModal(true);
            return;
        }

        // Proceed with normal submission
        submitSettingsData(submitData);
    };

    const submitSettingsData = (submitData) => {
        router.put('/guidance/registration-settings', submitData, {
            onSuccess: (page) => {
                setShowSettingsModal(false);
                setShowCloseConfirmationModal(false);
                setPendingFormData(null);
                window.showAlert('Registration settings updated successfully', 'success');

                // If schedules were closed, reload the page to show updated data
                if (submitData.delete_previous_schedules) {
                    console.log('[ExamRegistration] Schedules were closed, reloading page to show updated data');
                    console.log('[ExamRegistration] Current localSchedules before reload:', localSchedules);
                    // Use a small delay to ensure the success message is shown before reload
                    setTimeout(() => {
                        router.reload();
                    }, 1000);
                }
            },
            onError: (errors) => {
                console.error('[ExamRegistration] Settings update failed:', errors);
                window.showAlert('Failed to update settings: ' + (errors.error || 'Unknown error'), 'error');
            }
        });
    };



    const handleDateChange = (registrationId, newDate, newSession) => {
        console.log('[ExamRegistration] handleDateChange', { registrationId, newDate, newSession });

        if (!newSession) {
            window.showAlert('Please select a session (Morning or Afternoon)', 'error');
            return;
        }

        // Frontend validation: ensure date is within configured window
        if (settings.exam_start_date && settings.exam_end_date) {
            const withinWindow = isWithinRegistrationWindow(newDate);
            if (!withinWindow) {
                window.showAlert('Selected date is outside the registration window.', 'error');
                return;
            }
        }

        // Prevent assigning a past date
        const today = getTodayStart();
        const picked = new Date(newDate);
        picked.setHours(0, 0, 0, 0);
        if (picked < today) {
            window.showAlert('Cannot assign a date in the past.', 'error');
            return;
        }

        // Validate against schedule closure if a schedule exists for that date and session
        const scheduleForDateAndSession = getScheduleForDateAndSession(newDate, newSession);
        if (scheduleForDateAndSession) {
            if (scheduleForDateAndSession.status === 'closed') {
                window.showAlert('Selected session is closed for scheduling.', 'error');
                return;
            }
            // Note: Capacity validation removed - guidance counselors can now assign to full sessions
        }

        setIsSaving(true);
        const prevRegistration = localRegistrations?.data?.find((r) => r.id === registrationId);
        const previousDate = prevRegistration?.assigned_exam_date || null;
        const previousSession = prevRegistration?.assigned_session || null;
        router.put(`/guidance/update-exam-date/${registrationId}`, {
            assigned_exam_date: newDate,
            assigned_session: newSession
        }, {
            onSuccess: () => {
                setEditingRegistration(null);
                setTempDateValue('');
                setTempSessionValue('');
                setIsSaving(false);
                console.log('[ExamRegistration] handleDateChange success');
                window.showAlert('Exam date updated successfully', 'success');

                // Optimistically update local registrations list
                setLocalRegistrations((prev) => {
                    if (!prev || !prev.data) return prev;
                    const updatedData = prev.data.map((reg) => {
                        if (reg.id === registrationId) {
                            return { ...reg, assigned_exam_date: newDate, assigned_session: newSession, status: 'assigned' };
                        }
                        return reg;
                    });
                    return { ...prev, data: updatedData };
                });

                // Optimistically adjust schedule counts
                if ((previousDate && previousDate !== newDate) || (previousSession && previousSession !== newSession)) {
                    setLocalSchedules((prev) => {
                        if (!prev || typeof prev !== 'object') return prev;

                        // Handle grouped schedules (object with date keys)
                        if (!Array.isArray(prev)) {
                            const newSchedules = { ...prev };

                            // Decrement old date/session
                            if (previousDate && previousSession && newSchedules[previousDate]) {
                                newSchedules[previousDate] = newSchedules[previousDate].map(s => {
                                    if (s.session === previousSession) {
                                        const dec = Math.max(0, (s.current_registrations || 0) - 1);
                                        return { ...s, current_registrations: dec, status: dec >= s.max_capacity ? 'full' : (s.status === 'closed' ? 'closed' : 'open') };
                                    }
                                    return s;
                                });
                            }

                            // Increment new date/session
                            if (newSchedules[newDate]) {
                                newSchedules[newDate] = newSchedules[newDate].map(s => {
                                    if (s.session === newSession) {
                                        const inc = (s.current_registrations || 0) + 1;
                                        const status = inc >= s.max_capacity ? 'full' : (s.status === 'closed' ? 'closed' : 'open');
                                        return { ...s, current_registrations: inc, status };
                                    }
                                    return s;
                                });
                            }

                            return newSchedules;
                        }

                        // Handle flat array of schedules (legacy)
                        return prev.map((s) => {
                            // Decrement old date/session
                            if (s.exam_date === previousDate && s.session === previousSession) {
                                const dec = Math.max(0, (s.current_registrations || 0) - 1);
                                return { ...s, current_registrations: dec, status: dec >= s.max_capacity ? 'full' : (s.status === 'closed' ? 'closed' : 'open') };
                            }
                            // Increment new date/session
                            if (s.exam_date === newDate && s.session === newSession) {
                                const inc = (s.current_registrations || 0) + 1;
                                const status = inc >= s.max_capacity ? 'full' : (s.status === 'closed' ? 'closed' : 'open');
                                return { ...s, current_registrations: inc, status };
                            }
                            return s;
                        });
                    });
                }
            },
            onError: (errors) => {
                const errorMessage = errors.error || 'Failed to update exam date';
                setIsSaving(false);
                console.warn('[ExamRegistration] handleDateChange error', errors);
                window.showAlert(errorMessage, 'error');
            }
        });
    };

    const handleSaveDate = (registrationId) => {
        if (!tempDateValue) {
            window.showAlert('Please select a valid date', 'error');
            return;
        }
        if (!tempSessionValue) {
            window.showAlert('Please select a session', 'error');
            return;
        }
        handleDateChange(registrationId, tempDateValue, tempSessionValue);
    };

    // Modal variant
    const handleSaveDateFromModal = (registrationId) => {
        if (!modalDateValue) {
            window.showAlert('Please select a valid date', 'error');
            return;
        }
        if (!modalSessionValue) {
            window.showAlert('Please select a session', 'error');
            return;
        }
        if (!modalStatusValue) {
            window.showAlert('Please select a status', 'error');
            return;
        }
        setModalSaving(true);

        // Update both date/session and status
        router.put(`/guidance/update-exam-date/${registrationId}`, {
            assigned_exam_date: modalDateValue,
            assigned_session: modalSessionValue,
            status: modalStatusValue
        }, {
            onSuccess: () => {
                setModalSaving(false);
                setShowEditRegistrationModal(false);
                console.log('[ExamRegistration] Modal save success');
                window.showAlert('Exam registration updated successfully', 'success');

                // Optimistically update local registrations list
                setLocalRegistrations((prev) => {
                    if (!prev || !prev.data) return prev;
                    const updatedData = prev.data.map((reg) => {
                        if (reg.id === registrationId) {
                            return {
                                ...reg,
                                assigned_exam_date: modalDateValue,
                                assigned_session: modalSessionValue,
                                status: modalStatusValue
                            };
                        }
                        return reg;
                    });
                    return { ...prev, data: updatedData };
                });
            },
            onError: (errors) => {
                const errorMessage = errors.error || 'Failed to update exam registration';
                setModalSaving(false);
                console.warn('[ExamRegistration] Modal save error', errors);
                window.showAlert(errorMessage, 'error');
            }
        });
    };

    const handleCancelEdit = () => {
        setEditingRegistration(null);
        setTempDateValue('');
        setTempSessionValue('');
        setIsSaving(false);
    };

    const handleStartEdit = (registration) => {
        setEditingRegistration(registration.id);
        setEditingRegistrationData(registration);
        setTempDateValue(registration.assigned_exam_date || '');
        setTempSessionValue(registration.assigned_session || '');
        setModalDateValue(registration.assigned_exam_date || '');
        setModalSessionValue(registration.assigned_session || '');
        setModalStatusValue(registration.status || 'registered');
        setShowEditRegistrationModal(true);
    };

    const handleScheduleEdit = (schedule) => {
        setEditingSchedule(schedule.id);
        setScheduleFormData({
            exam_date: schedule.exam_date,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            max_capacity: schedule.max_capacity,
            status: schedule.status
        });
    };

    const handleScheduleUpdate = (scheduleId) => {
        router.put(`/guidance/update-exam-schedule/${scheduleId}`, scheduleFormData, {
            onSuccess: () => {
                setEditingSchedule(null);
                setScheduleFormData({});
                window.showAlert('Exam schedule updated successfully', 'success');
            },
            onError: (errors) => {
                window.showAlert('Failed to update exam schedule', 'error');
            }
        });
    };

    // Handle opening the date edit modal
    const handleEditDate = (examDate) => {
        const dateSchedules = getScheduleForDate(examDate);
        const morningSchedule = dateSchedules.find(s => s.session === 'morning');
        const afternoonSchedule = dateSchedules.find(s => s.session === 'afternoon');

        setEditingDate(examDate);
        setDateFormData({
            morning: {
                start_time: morningSchedule?.start_time || '08:00',
                end_time: morningSchedule?.end_time || '11:00',
                max_capacity: morningSchedule?.max_capacity || '',
                status: morningSchedule?.status || 'open'
            },
            afternoon: {
                start_time: afternoonSchedule?.start_time || '13:00',
                end_time: afternoonSchedule?.end_time || '16:00',
                max_capacity: afternoonSchedule?.max_capacity || '',
                status: afternoonSchedule?.status || 'open'
            }
        });
        setShowDateEditModal(true);
    };

    // Handle saving the date edit modal
    const handleSaveDateEdit = () => {
        setDateModalSaving(true);

        // Update both morning and afternoon schedules
        const promises = [];

        // Update morning schedule
        const morningSchedule = getScheduleForDate(editingDate).find(s => s.session === 'morning');
        if (morningSchedule) {
            promises.push(
                router.put(`/guidance/update-exam-schedule/${morningSchedule.id}`, {
                    exam_date: editingDate,
                    start_time: dateFormData.morning.start_time,
                    end_time: dateFormData.morning.end_time,
                    max_capacity: parseInt(dateFormData.morning.max_capacity),
                    status: dateFormData.morning.status
                })
            );
        }

        // Update afternoon schedule
        const afternoonSchedule = getScheduleForDate(editingDate).find(s => s.session === 'afternoon');
        if (afternoonSchedule) {
            promises.push(
                router.put(`/guidance/update-exam-schedule/${afternoonSchedule.id}`, {
                    exam_date: editingDate,
                    start_time: dateFormData.afternoon.start_time,
                    end_time: dateFormData.afternoon.end_time,
                    max_capacity: parseInt(dateFormData.afternoon.max_capacity),
                    status: dateFormData.afternoon.status
                })
            );
        }

        Promise.all(promises)
            .then(() => {
                setDateModalSaving(false);
                setShowDateEditModal(false);
                setEditingDate(null);
                window.showAlert('Exam schedules updated successfully', 'success');
            })
            .catch((errors) => {
                setDateModalSaving(false);
                window.showAlert('Failed to update exam schedules', 'error');
            });
    };

    // Handle force closing a schedule
    const handleForceCloseSchedule = (examDate) => {
        console.log('[ExamRegistration] Force closing schedule for date:', examDate);

        // Normalize the date to YYYY-MM-DD format for comparison
        // Handle both formats: "2025-11-04 00:00:00" and "2025-11-04T00:00:00.000000Z"
        const normalizedDate = examDate.split('T')[0].split(' ')[0];

        // Count examinees assigned to this date (include ALL statuses except cancelled/archived/completed)
        const examineeCount = localRegistrations?.data?.filter(reg => {
            if (!reg.assigned_exam_date) return false;

            // Normalize registration date (handle ISO format)
            const regDate = reg.assigned_exam_date.split('T')[0].split(' ')[0];
            const isDateMatch = regDate === normalizedDate;
            const isActiveStatus = !['cancelled', 'archived', 'completed', 'finished'].includes(reg.status);

            return isDateMatch && isActiveStatus;
        }).length || 0;

        console.log('[ExamRegistration] Normalized date:', normalizedDate);
        console.log('[ExamRegistration] Examinee count for date:', examineeCount);

        // If there are examinees assigned, show reschedule modal
        if (examineeCount > 0) {
            console.log('[ExamRegistration] Setting reschedule modal to show');
            const modalData = {
                examDate: examDate,
                examineeCount: examineeCount,
                newDate: null,  // Start with null to show the "Yes, Reschedule" button
                newSession: 'morning'
            };
            console.log('[ExamRegistration] Modal data:', modalData);
            setRescheduleData(modalData);
            setShowRescheduleModal(true);
            console.log('[ExamRegistration] showRescheduleModal set to true');
            return;
        }

        console.log('[ExamRegistration] No examinees found, proceeding with direct closure');
        // If no examinees, proceed with direct closure
        proceedWithScheduleClosure(examDate);
    };

    // Proceed with schedule closure (with or without rescheduling)
    const proceedWithScheduleClosure = (examDate, rescheduleToDate = null, rescheduleToSession = null) => {
        console.log('[ExamRegistration] Proceeding with schedule closure for date:', examDate);

        // Normalize dates for backend API (handle both formats)
        const normalizedExamDate = examDate.split('T')[0].split(' ')[0];
        const normalizedRescheduleDate = rescheduleToDate ? rescheduleToDate.split('T')[0].split(' ')[0] : null;

        const dateSchedules = getScheduleForDate(examDate);
        const promises = [];

        // Close both morning and afternoon schedules
        dateSchedules.forEach(schedule => {
            promises.push(
                router.put(`/guidance/update-exam-schedule/${schedule.id}`, {
                    exam_date: examDate,
                    start_time: schedule.start_time,
                    end_time: schedule.end_time,
                    max_capacity: schedule.max_capacity,
                    status: 'closed'
                })
            );
        });

        // If rescheduling is requested, add reschedule API call
        if (rescheduleToDate && rescheduleToSession) {
            promises.push(
                router.post('/guidance/reschedule-examinees', {
                    from_date: normalizedExamDate,
                    to_date: normalizedRescheduleDate,
                    to_session: rescheduleToSession
                })
            );
        }

        Promise.all(promises)
            .then(() => {
                console.log('[ExamRegistration] Force close successful for date:', examDate);

                // Only show alert for direct closure (reschedule success is handled by backend flash message)
                if (!rescheduleToDate) {
                    window.showAlert(`✅ Schedule for ${formatDate(examDate)} has been force closed successfully.`, 'success');
                }

                // Optimistically update local schedules
                setLocalSchedules((prev) => {
                    if (!prev || typeof prev !== 'object') return prev;
                    const newSchedules = { ...prev };
                    if (newSchedules[examDate]) {
                        newSchedules[examDate] = newSchedules[examDate].map(s => ({
                            ...s,
                            status: 'closed'
                        }));
                    }
                    return newSchedules;
                });

                // If rescheduled, update local registrations (optimistic update)
                if (rescheduleToDate && rescheduleToSession) {
                    setLocalRegistrations((prev) => {
                        if (!prev || !prev.data) return prev;
                        const updatedData = prev.data.map(reg => {
                            if (!reg.assigned_exam_date) return reg;

                            // Normalize registration date (handle ISO format)
                            const regDate = reg.assigned_exam_date.split('T')[0].split(' ')[0];
                            const isActiveStatus = !['cancelled', 'archived', 'completed', 'finished'].includes(reg.status);

                            if (regDate === normalizedExamDate && isActiveStatus) {
                                return {
                                    ...reg,
                                    assigned_exam_date: normalizedRescheduleDate,
                                    assigned_session: rescheduleToSession
                                };
                            }
                            return reg;
                        });
                        return { ...prev, data: updatedData };
                    });
                }
            })
            .catch((errors) => {
                console.error('[ExamRegistration] Force close failed:', errors);
                // Error messages are now handled by backend flash messages
            });
    };

    // Handle reschedule confirmation
    const handleRescheduleConfirm = () => {
        console.log('[ExamRegistration] handleRescheduleConfirm called with:', rescheduleData);

        if (!rescheduleData.newDate || rescheduleData.newDate === '' || !rescheduleData.newSession) {
            window.showAlert('Please select a new date and session for rescheduling', 'error');
            return;
        }

        setRescheduleSaving(true);

        // Check if target schedule can accommodate all examinees
        const targetSchedule = getScheduleForDateAndSession(rescheduleData.newDate, rescheduleData.newSession);
        const availableSlots = targetSchedule ? targetSchedule.max_capacity - targetSchedule.current_registrations : 0;

        if (availableSlots < rescheduleData.examineeCount) {
            setRescheduleSaving(false);
            window.showAlert(`Cannot reschedule: Target session only has ${availableSlots} available slots, but ${rescheduleData.examineeCount} examinees need to be moved.`, 'error');
            return;
        }

        proceedWithScheduleClosure(rescheduleData.examDate, rescheduleData.newDate, rescheduleData.newSession);
        setShowRescheduleModal(false);
        setRescheduleSaving(false);
    };

    // Handle reschedule cancel (close without rescheduling)
    const handleRescheduleCancel = () => {
        proceedWithScheduleClosure(rescheduleData.examDate);
        setShowRescheduleModal(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'registered': return 'bg-blue-100 text-blue-800';
            case 'assigned': return 'bg-yellow-100 text-yellow-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getScheduleStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-green-100 text-green-800';
            case 'full': return 'bg-red-100 text-red-800';
            case 'closed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not assigned';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';

        // Handle HH:MM:SS format
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

    const isWeekend = (dateString) => {
        const date = new Date(dateString);
        return date.getDay() === 0 || date.getDay() === 6; // Sunday = 0, Saturday = 6
    };

    const isScheduleFull = (schedule) => {
        return schedule.current_registrations >= schedule.max_capacity;
    };

    // Validation helpers and auto-assign computation
    const isWithinRegistrationWindow = (dateString) => {
        if (!settings.exam_start_date || !settings.exam_end_date) return true;
        const candidate = new Date(dateString);
        const start = new Date(settings.exam_start_date);
        const end = new Date(settings.exam_end_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return candidate >= start && candidate <= end;
    };

    const getScheduleForDate = (dateString) => {
        // Handle grouped schedules
        if (localSchedules && !Array.isArray(localSchedules)) {
            return localSchedules[dateString] || [];
        }
        // Handle flat array (legacy)
        return localSchedules?.filter((s) => s.exam_date === dateString) || [];
    };

    const getScheduleForDateAndSession = (dateString, session) => {
        // Handle grouped schedules
        if (localSchedules && !Array.isArray(localSchedules)) {
            const dateSchedules = localSchedules[dateString] || [];
            return dateSchedules.find((s) => s.session === session);
        }
        // Handle flat array (legacy)
        return localSchedules?.find((s) => s.exam_date === dateString && s.session === session);
    };

    const formatYYYYMMDD = (date) => {
        const d = new Date(date);
        const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
        return iso.split('T')[0];
    };

    const getTodayStart = () => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    };

    const getMinAssignableDateYMD = () => {
        const today = getTodayStart();
        let min = today;
        if (settings.exam_start_date) {
            const start = new Date(settings.exam_start_date);
            start.setHours(0, 0, 0, 0);
            if (start > min) min = start;
        }
        return formatYYYYMMDD(min);
    };

    const getNextBusinessDay = (date) => {
        const d = new Date(date);
        while (d.getDay() === 0 || d.getDay() === 6) {
            d.setDate(d.getDate() + 1);
        }
        return d;
    };


    const clampToStartWindow = (date) => {
        const today = getTodayStart();
        let clamped = date;
        if (settings.exam_start_date) {
            const start = new Date(settings.exam_start_date);
            if (clamped < start) clamped = start;
        }
        if (clamped < today) clamped = today;
        return clamped;
    };

    const computeAutoAssignDate = (registration) => {
        console.log('[ExamRegistration] computeAutoAssignDate -> registrationId:', registration.id);

        // Get all available exam dates from the schedules (only selected dates are in the table)
        const availableDates = [];
        if (localSchedules && typeof localSchedules === 'object') {
            Object.keys(localSchedules).forEach(date => {
                const dateSchedules = localSchedules[date] || [];
                const hasAvailableSession = dateSchedules.some(schedule =>
                    schedule.status === 'open' && schedule.current_registrations < schedule.max_capacity
                );
                if (hasAvailableSession) {
                    availableDates.push(date);
                }
            });
        }

        // Sort dates to find the closest one to registration date
        availableDates.sort((a, b) => new Date(a) - new Date(b));

        // Find the closest available date that is on or after the registration date
        const registrationDate = new Date(registration.registration_date);
        registrationDate.setHours(0, 0, 0, 0);

        for (const date of availableDates) {
            const examDate = new Date(date);
            examDate.setHours(0, 0, 0, 0);

            // Skip dates before registration date
            if (examDate < registrationDate) continue;

            // Check if this date has available capacity
            const dateSchedules = getScheduleForDate(date);
            const hasAvailableSession = dateSchedules.some(schedule =>
                schedule.status === 'open' && schedule.current_registrations < schedule.max_capacity
            );

            if (hasAvailableSession) {
                console.log('[ExamRegistration] computeAutoAssignDate -> chosen:', date);
                return date;
            }
        }

        console.warn('[ExamRegistration] computeAutoAssignDate -> no valid date found');
        return null;
    };

    const handleAutoAssign = async (registration) => {
        console.log('[ExamRegistration] handleAutoAssign clicked', registration.id);
        setAutoAssigningIds((prev) => [...prev, registration.id]);
        try {
            const autoDate = computeAutoAssignDate(registration);
            if (!autoDate) {
                window.showAlert('No available dates within the registration window or schedules are full/closed.', 'error');
                return;
            }
            console.log('[ExamRegistration] auto computed date', autoDate);
            handleDateChange(registration.id, autoDate);
        } finally {
            setAutoAssigningIds((prev) => prev.filter((id) => id !== registration.id));
        }
    };

    // Aggressively optimized filtered registrations with maximum memoization
    const filteredRegistrations = useMemo(() => {
        if (!localRegistrations?.data?.length) return [];

        const data = localRegistrations.data;
        const result = [];

        // Pre-compute values to avoid repeated calculations
        const startDate = settings.exam_start_date ? new Date(settings.exam_start_date) : null;
        const endDate = settings.exam_end_date ? new Date(settings.exam_end_date) : null;

        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        // Single pass filtering for maximum performance
        for (let i = 0; i < data.length; i++) {
            const registration = data[i];

            // Skip archived
            if (registration.status === 'archived') continue;

            // Date window check
            if (startDate && endDate && registration.assigned_exam_date) {
                if (!['assigned', 'completed', 'finished'].includes(registration.status)) {
                    const assigned = new Date(registration.assigned_exam_date);
                    assigned.setHours(12, 0, 0, 0);
                    if (assigned < startDate || assigned > endDate) continue;
                }
            }

            // Status filter
            if (registrationFilter === 'assigned' && registration.status !== 'assigned') continue;
            if (registrationFilter === 'not_assigned' && registration.status !== 'registered') continue;

            // Search filter
            if (debouncedSearch) {
                const q = debouncedSearch.toLowerCase();
                const name = (registration.examinee?.user?.username || '').toLowerCase();
                const school = (registration.examinee?.school_name || '').toLowerCase();
                const session = (registration.assigned_session || '').toLowerCase();
                const status = (registration.status || '').toLowerCase();

                if (!name.includes(q) && !school.includes(q) && !session.includes(q) && !status.includes(q)) {
                    continue;
                }
            }

            result.push(registration);
        }

        return result;
    }, [localRegistrations?.data, settings.exam_start_date, settings.exam_end_date, settings.registration_open, registrationFilter, debouncedSearch]);

    // Aggressively optimized group and sort registrations
    const groupedRegistrationsMemo = useMemo(() => {
        if (!filteredRegistrations.length) {
            return { grouped: {}, sortedDates: [] };
        }

        const grouped = {};

        // Single pass grouping
        for (let i = 0; i < filteredRegistrations.length; i++) {
            const registration = filteredRegistrations[i];
            const assignedDate = registration.assigned_exam_date || 'unassigned';
            if (!grouped[assignedDate]) grouped[assignedDate] = [];
            grouped[assignedDate].push(registration);
        }

        const sortedDates = Object.keys(grouped).sort((a, b) => {
            if (a === 'unassigned') return -1;
            if (b === 'unassigned') return 1;
            return new Date(a) - new Date(b);
        });

        // Sort each group efficiently
        for (let i = 0; i < sortedDates.length; i++) {
            const date = sortedDates[i];
            grouped[date].sort((a, b) => {
                const nameA = a.examinee?.user?.username || '';
                const nameB = b.examinee?.user?.username || '';
                return nameA.localeCompare(nameB);
            });
        }

        return { grouped, sortedDates };
    }, [filteredRegistrations]);

    // Compute the total count of active registrations (non-archived)
    const visibleRegistrationsTotal = useMemo(() => {
        if (!localRegistrations || !localRegistrations.data) return 0;
        // Simply count all registrations that are not archived
        return localRegistrations.data.filter((r) => r.status !== 'archived').length;
    }, [localRegistrations]);

    // Get available exam windows (dates and sessions) for the edit modal
    const getAvailableExamWindows = () => {
        if (!localSchedules || typeof localSchedules !== 'object') return [];

        const availableWindows = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        Object.keys(localSchedules).forEach(date => {
            const dateSchedules = localSchedules[date] || [];
            const examDate = new Date(date);
            examDate.setHours(0, 0, 0, 0);

            // Only include future dates or today
            if (examDate >= today) {
                dateSchedules.forEach(schedule => {
                    // Only include open or full schedules (not closed)
                    if (schedule.status !== 'closed') {
                        availableWindows.push({
                            date: date,
                            session: schedule.session,
                            displayDate: formatDate(date),
                            displaySession: schedule.session === 'morning' ? 'Morning (8:00 AM - 11:00 AM)' : 'Afternoon (1:00 PM - 4:00 PM)',
                            capacity: schedule.max_capacity,
                            registered: schedule.current_registrations,
                            status: schedule.status,
                            isFull: schedule.current_registrations >= schedule.max_capacity
                        });
                    }
                });
            }
        });

        // Sort by date, then by session (morning first)
        return availableWindows.sort((a, b) => {
            if (a.date !== b.date) {
                return new Date(a.date) - new Date(b.date);
            }
            return a.session === 'morning' ? -1 : 1;
        });
    };

    // Group available windows by date for organized dropdown rendering
    const getAvailableWindowsGrouped = () => {
        const windows = getAvailableExamWindows();
        const grouped = {};
        windows.forEach((w) => {
            if (!grouped[w.date]) grouped[w.date] = [];
            grouped[w.date].push(w);
        });
        // Ensure morning appears before afternoon within each date
        Object.keys(grouped).forEach((date) => {
            grouped[date] = grouped[date].sort((a, b) => (a.session === 'morning' ? -1 : 1));
        });
        // Return entries sorted by date ascending
        return Object.entries(grouped).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    };

    // Helper functions for per-date pagination
    const getDatePageState = useCallback((date) => {
        return datePageState[date] || { page: 1, perPage: 10 };
    }, [datePageState]);

    const setDatePage = useCallback((date, page) => {
        setDatePageState(prev => ({
            ...prev,
            [date]: { ...getDatePageState(date), page }
        }));
    }, [getDatePageState]);

    const setDatePerPage = useCallback((date, perPage) => {
        setDatePageState(prev => ({
            ...prev,
            [date]: { page: 1, perPage } // Reset to page 1 when changing items per page
        }));
    }, []);

    const toggleDateExpanded = useCallback((date) => {
        setRegistrationsExpanded(prev => {
            const willOpen = !prev[date];
            // Accordion behavior: only one date expanded at a time
            if (willOpen) {
                return { [date]: true };
            }
            return {};
        });
    }, []);

    // Get paginated registrations for a specific date
    const getPaginatedRegistrationsForDate = useCallback((registrations, date) => {
        const { page, perPage } = getDatePageState(date);
        const start = (page - 1) * perPage;
        const end = start + perPage;
        return {
            data: registrations.slice(start, end),
            total: registrations.length,
            currentPage: page,
            perPage: perPage,
            totalPages: Math.ceil(registrations.length / perPage),
            from: registrations.length > 0 ? start + 1 : 0,
            to: Math.min(end, registrations.length)
        };
    }, [getDatePageState]);

    // Aggressively optimized separate active and closed schedules
    const activeAndClosed = useMemo(() => {
        if (schedulesCollapsed && !showClosedSchedules && !showBulkCodeModal) {
            return { active: {}, closed: {} };
        }
        if (!localSchedules || typeof localSchedules !== 'object') return { active: {}, closed: {} };

        const active = {};
        const closed = {};
        const scheduleKeys = Object.keys(localSchedules);

        // Process schedules with maximum efficiency
        for (let i = 0; i < scheduleKeys.length; i++) {
            const date = scheduleKeys[i];
            const dateSchedules = localSchedules[date];
            if (!dateSchedules?.length) continue;

            const activeSchedules = [];
            const closedSchedules = [];

            // Single pass through schedules
            for (let j = 0; j < dateSchedules.length; j++) {
                const schedule = dateSchedules[j];
                if (schedule.status === 'closed') {
                    closedSchedules.push(schedule);
                } else {
                    activeSchedules.push(schedule);
                }
            }

            if (activeSchedules.length > 0) active[date] = activeSchedules;
            if (closedSchedules.length > 0) closed[date] = closedSchedules;
        }

        return { active, closed };
    }, [localSchedules, schedulesCollapsed, showClosedSchedules, showBulkCodeModal]);


    return (
        <Layout user={user}>
            <React.Fragment>
            <div className="min-h-screen bg-slate-50 animate-up" style={{ animationDelay: '60ms' }}>
                <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8 animate-up" style={{ animationDelay: '120ms' }}>
                    {/* Enhanced Header Section */}
                    <div className="mb-8 animate-up" style={{ animationDelay: '180ms' }}>
                        <div className="rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm animate-fadeIn animate-up" style={{ animationDelay: '220ms' }}>
                            <div className="px-8 py-8 animate-up" style={{ animationDelay: '260ms' }}>
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex-1 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                                                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Exam Registration Management</h1>
                                                <p className="mt-1 text-sm text-white/80">Comprehensive scheduling and registration controls for guidance counselors.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className={`rounded-2xl border border-slate-200 border-t-[6px] bg-white p-5 shadow-sm ${settings.registration_open ? 'border-t-[#1447E6]' : 'border-t-orange-500'}`}>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Registration Status</p>
                                                <p className="mt-3 text-2xl font-semibold text-[#1D293D]">{settings.registration_open ? 'Open' : 'Closed'}</p>
                                                <p className={`mt-1 text-xs font-medium ${settings.registration_open ? 'text-[#1447E6]' : 'text-orange-600'}`}>Auto-close {settings.registration_open ? 'enabled' : 'disabled'}</p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-5 shadow-sm">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Daily Capacity</p>
                                                <p className="mt-3 text-2xl font-semibold text-[#1D293D]">{settings.students_per_day}</p>
                                                <p className="mt-1 text-xs font-medium text-[#1447E6]">Per exam day</p>
                                            </div>
                                        </div>

                                        {shouldAutoCloseRegistration() && (
                                            <div className="rounded-2xl border border-amber-400/40 bg-amber-400/15 px-5 py-4 shadow-sm">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <svg className="h-5 w-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.502 1.732 2.5z" />
                                                        </svg>
                                                        <div>
                                                            <p className="text-sm font-semibold text-amber-100">Exam period ended</p>
                                                            <p className="text-xs text-amber-200/80">Registration auto-close will run soon • ended {formatDate(settings.exam_end_date)}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            router.post('/guidance/trigger-auto-close', {}, {
                                                                onSuccess: () => window.showAlert('Auto-close check completed successfully', 'success'),
                                                                onError: () => window.showAlert('Failed to trigger auto-close', 'error'),
                                                            });
                                                        }}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200/60 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/15"
                                                    >
                                                        Force close now
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex w-full flex-col gap-3 lg:max-w-xs" ref={infoRef}>
                                        <button
                                            onClick={() => router.visit('/guidance/exam-date-selection')}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Manage settings
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => router.visit('/guidance/examinee-registrations')}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/15"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            View registrations
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowInfoPopover(s => !s)}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/20"
                                            title="System information"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                                            </svg>
                                            System info
                                        </button>
                                        {showInfoPopover && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-[9998] bg-black/10 backdrop-blur-sm"
                                                    onClick={() => setShowInfoPopover(false)}
                                                />
                                                <div className="fixed right-4 top-24 z-[9999] w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-fadeIn">
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">i</div>
                                                            <span className="text-sm font-semibold text-[#1D293D]">System information</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setShowInfoPopover(false)}
                                                            className="text-slate-400 hover:text-slate-600"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                                                        <div className="flex gap-2">
                                                            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                                                            <span>Automatic assignment & no-show detection.</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                                                            <span>Weekends are skipped automatically when assigning schedules.</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-purple-500"></span>
                                                            <span>Manual date adjustments are available for edge cases.</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid (top controls and info) */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8 animate-up" style={{ animationDelay: '420ms' }}>
                        {/* Left Column - Info & Settings (info moved to header popover) */}
                        <div className="xl:col-span-1 space-y-6">

                            {/* Registration Status card removed as redundant per request */}
                        </div>

                        {/* Right Column - Main Content placeholder (kept for layout balance) */}
                        <div className="xl:col-span-2"></div>
                    </div>

                    {/* Exam Schedules Section - moved below as a full-width section */}
                    {!isEmbedRegistrations && (
                        <div className="animate-up" style={{ animationDelay: '460ms' }}>
                            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-200 bg-[#1D293D] px-8 py-6 text-white">
                                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                                                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Scheduling</p>
                                                <h3 className="mt-1 text-2xl font-semibold tracking-tight">Exam Schedules</h3>
                                                <p className="mt-1 text-sm text-white/80">Manage exam dates, capacity, and QR codes across the current registration window.</p>
                                            </div>
                                        </div>
                                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                                            <div className="inline-flex.items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                                                {isAutoRefreshing ? (
                                                    <>
                                                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        Refreshing data
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                                        Auto-sync 30s
                                                    </>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleManualRefresh}
                                                disabled={isAutoRefreshing}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <svg className={`h-4 w-4 ${isAutoRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Refresh now
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSchedulesCollapsedChange(!schedulesCollapsed)}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/15"
                                            >
                                                <svg className={`h-4 w-4 transition-transform ${schedulesCollapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                                {schedulesCollapsed ? 'Expand' : 'Collapse'}
                                            </button>
                                            {(() => {
                                                const { active, closed } = activeAndClosed;
                                                const closedCount = Object.keys(closed).length;
                                                if (closedCount > 0) {
                                                    return (
                                                        <button
                                                            onClick={() => setShowClosedSchedules(!showClosedSchedules)}
                                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/15"
                                                        >
                                                            <svg className={`h-4 w-4 transition-transform ${showClosedSchedules ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                            {showClosedSchedules ? 'Hide' : 'View'} Closed ({closedCount})
                                                        </button>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        {settings.exam_start_date && settings.exam_end_date && (
                                            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                                                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white">
                                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {formatDate(settings.exam_start_date)} – {formatDate(settings.exam_end_date)}
                                                </span>
                                                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#1447E6]/30 px-3 py-1 text-white">
                                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                    {Object.keys(activeAndClosed.active || {}).length} active dates
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!schedulesCollapsed && (
                                    <div className="px-8 py-6 animate-up" style={{ animationDelay: '500ms' }}>
                                        {/* Action Bar */}
                                        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-up" style={{ animationDelay: '520ms' }}>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        router.post('/guidance/sync-schedule-counts', {}, {
                                                            onSuccess: () => {
                                                                window.showAlert('Schedule counts synchronized successfully', 'success');
                                                                router.reload();
                                                            },
                                                            onError: (errors) => {
                                                                window.showAlert('Failed to sync schedule counts', 'error');
                                                            }
                                                        });
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                                    title="Sync schedule counts with database"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Sync Counts
                                                </button>

                                                {(() => {
                                                    const { active } = activeAndClosed;
                                                    const hasActiveSchedules = Object.keys(active).length > 0;

                                                    return (
                                                        <button
                                                            onClick={async () => {
                                                                if (!hasActiveSchedules) {
                                                                    window.showAlert('No active schedules available for code generation.', 'error');
                                                                    return;
                                                                }
                                                                if (!settings.exam_start_date || !settings.exam_end_date) {
                                                                    window.showAlert('Please set exam period first.', 'error');
                                                                    return;
                                                                }
                                                                try {
                                                                    setShowBulkCodeModal(true);
                                                                    setLoadingExams(true);
                                                                    setSelectedExamId('');
                                                                    const res = await fetch('/guidance/exams/summaries', { headers: { 'Accept': 'application/json' } });
                                                                    if (!res.ok) throw new Error('Failed to load exams');
                                                                    const json = await res.json();
                                                                    setExamSummaries(Array.isArray(json.data) ? json.data : []);
                                                                } catch (e) {
                                                                    console.warn('[ExamRegistration] load exams failed', e);
                                                                    window.showAlert('Failed to load exams. Please try again.', 'error');
                                                                    setShowBulkCodeModal(false);
                                                                } finally {
                                                                    setLoadingExams(false);
                                                                }
                                                            }}
                                                            disabled={!hasActiveSchedules}
                                                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-transform duration-200 ${hasActiveSchedules
                                                                ? 'border-emerald-500 bg-emerald-500 text-white hover:-translate-y-0.5 hover:bg-emerald-600'
                                                                : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                }`}
                                                            title={hasActiveSchedules
                                                                ? "Generate exam codes for all dates in the period"
                                                                : "No active schedules available"
                                                            }
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                                            </svg>
                                                            Generate All Codes
                                                        </button>
                                                    );
                                                })()}
                                            </div>

                                            {(() => {
                                                const { active } = activeAndClosed;
                                                const hasActiveSchedules = Object.keys(active).length > 0;

                                                if (settings.exam_start_date && settings.exam_end_date && hasActiveSchedules) {
                                                    return (
                                                        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                                                            <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span>Exam window:</span>
                                                            <span className="font-semibold text-[#1D293D]">{formatDate(settings.exam_start_date)} — {formatDate(settings.exam_end_date)}</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        {/* Schedules Table - Super optimized rendering */}
                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white table-container animate-up" style={{ animationDelay: '540ms' }}>
                                            <table className="min-w-full divide-y divide-slate-200 performance-optimized">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Date</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Session</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Time</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Capacity</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Registered</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-100">
                                                    {(() => {
                                                        const { active, closed } = activeAndClosed;
                                                        const allActiveDates = Object.keys(active);
                                                        if (allActiveDates.length === 0) {
                                                            const closedDates = Object.keys(closed);
                                                            return (
                                                                <tr>
                                                                    <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                                                                        <div className="flex flex-col items-center gap-3">
                                                                            <svg className="h-12 w-12 text-[#1447E6]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                            </svg>
                                                                            <p className="text-lg font-semibold text-[#1D293D]">No active exam schedules</p>
                                                                             {closedDates.length > 0 ? (
                                                                                <p className="text-sm text-slate-500">Closed schedules are stored separately. Use <span className="font-semibold text-[#1447E6]">View Closed</span> to review archived dates.</p>
                                                                             ) : (
                                                                                <p className="text-sm text-slate-500">Open registration and select exam dates to generate schedule slots automatically.</p>
                                                                             )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }
                                                        const totalPages = Math.max(1, Math.ceil(allActiveDates.length / scheduleDatesPerPage));
                                                        const currentPage = Math.min(scheduleDatePage, totalPages);
                                                        const start = (currentPage - 1) * scheduleDatesPerPage;
                                                        const end = start + scheduleDatesPerPage;
                                                        const activeDates = allActiveDates.slice(start, end);

                                                        return activeDates.map((examDate, index) => {
                                                            const dateSchedules = active[examDate] || [];
                                                            const isExpandedDate = expandedDates[examDate];

                                                            // Pre-calculate totals efficiently
                                                            let totalRegistered = 0;
                                                            let totalCapacity = 0;

                                                            for (let i = 0; i < dateSchedules.length; i++) {
                                                                const schedule = dateSchedules[i];
                                                                totalRegistered += schedule.current_registrations || 0;
                                                                totalCapacity += schedule.max_capacity || 0;
                                                            }

                                                            return [
                                                                // Date header row (expandable)
                                                                <tr key={`date-${examDate}`} className={`cursor-pointer transition-colors duration-150 hover:bg-slate-50 ${isWeekend(examDate) ? 'bg-rose-50/60' : ''}`}
                                                                    onClick={() => updateExpandedDates({ ...expandedDates, [examDate]: !expandedDates[examDate] })}>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1D293D]">
                                                                        <div className="flex items-center gap-3">
                                                                            <svg className={`h-4 w-4 text-[#1447E6] transition-transform ${isExpandedDate ? 'rotate-90' : ''}`}
                                                                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                                             </svg>
                                                                             {formatDate(examDate)}
                                                                             {/* Date-level exam code display (from first session) */}
                                                                             {(() => {
                                                                                 const code = (dateSchedules[0]?.exam_code) || '';
                                                                                 return (
                                                                                     <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                                                                         <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A2 2 0 012 15.382V6.618a2 2 0 011.553-1.894L9 2m0 18l6-3m-6 3V2m6 15l5.447 2.724A2 2 0 0022 18.618V9.382a2 2 0 00-1.553-1.894L15 6m0 11V6m0 0L9 3" />
                                                                                         </svg>
                                                                                         {code ? code : 'No code'}
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={async (e) => {
                                                                                                e.stopPropagation();
                                                                                                setSingleDateForCode(examDate);
                                                                                                setSingleDateExamId('');
                                                                                                setShowSingleDateCodeModal(true);
                                                                                                // Load exams for the modal
                                                                                                if (examSummaries.length === 0) {
                                                                                                    setLoadingExams(true);
                                                                                                    try {
                                                                                                        const res = await fetch('/guidance/exams/summaries', { headers: { 'Accept': 'application/json' } });
                                                                                                        if (!res.ok) throw new Error('Failed to load exams');
                                                                                                        const json = await res.json();
                                                                                                        setExamSummaries(Array.isArray(json.data) ? json.data : []);
                                                                                                    } catch (e) {
                                                                                                        console.warn('[ExamRegistration] load exams failed', e);
                                                                                                        window.showAlert('Failed to load exams. Please try again.', 'error');
                                                                                                        setShowSingleDateCodeModal(false);
                                                                                                    } finally {
                                                                                                        setLoadingExams(false);
                                                                                                    }
                                                                                                }
                                                                                            }}
                                                                                            className="ml-2 text-emerald-700 hover:text-emerald-900"
                                                                                            title={code ? 'Regenerate code' : 'Generate code'}
                                                                                        >
                                                                                            {code ? 'Regenerate' : 'Generate'}
                                                                                        </button>
                                                                                         {code && (
                                                                                             <>
                                                                                                 <button
                                                                                                     type="button"
                                                                                                     onClick={(e) => {
                                                                                                         e.stopPropagation();
                                                                                                         navigator.clipboard.writeText(code);
                                                                                                         window.showAlert('Code copied to clipboard', 'success');
                                                                                                     }}
                                                                                                     className="text-emerald-700 hover:text-emerald-900"
                                                                                                     title="Copy code"
                                                                                                 >
                                                                                                     Copy
                                                                                                 </button>
                                                                                                 <button
                                                                                                     type="button"
                                                                                                     onClick={(e) => {
                                                                                                         e.stopPropagation();
                                                                                                         showQRCodeModal(code);
                                                                                                     }}
                                                                                                     className="inline-flex items-center gap-1 rounded-lg border border-emerald-500 bg-emerald-500 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-emerald-600"
                                                                                                     title="Show QR Code"
                                                                                                 >
                                                                                                     <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                                                                                     </svg>
                                                                                                     QR
                                                                                                 </button>
                                                                                             </>
                                                                                         )}
                                                                                     </span>
                                                                                 );
                                                                             })()}
                                                                             {isWeekend(examDate) && (
                                                                                 <span className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">Weekend</span>
                                                                             )}
                                                                         </div>
                                                                     </td>
                                                                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                                                                         {dateSchedules.length} sessions
                                                                     </td>
                                                                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                                                                         Full Day
                                                                     </td>
                                                                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                                                                         {totalCapacity}
                                                                     </td>
                                                                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                                                                         <span className={totalRegistered >= totalCapacity ? 'text-rose-600 font-semibold' : 'text-[#1D293D]'}>
                                                                             {totalRegistered}
                                                                         </span>
                                                                         {totalRegistered >= totalCapacity && (
                                                                             <span className="ml-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">Full</span>
                                                                         )}
                                                                     </td>
                                                                     <td className="px-6 py-4 whitespace-nowrap">
                                                                         <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Click to expand</span>
                                                                     </td>
                                                                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                                                                         <div className="flex flex-wrap items-center gap-2">
                                                                             <button
                                                                                 onClick={(e) => {
                                                                                     e.stopPropagation();
                                                                                     handleEditDate(examDate);
                                                                                 }}
                                                                                 className="inline-flex items-center gap-2 rounded-lg border border-[#1447E6] bg-[#1447E6] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                                                                 title="Edit both morning and afternoon sessions"
                                                                             >
                                                                                 <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                                 </svg>
                                                                                 Edit
                                                                             </button>
                                                                             <button
                                                                                 onClick={(e) => {
                                                                                     e.stopPropagation();
                                                                                     handleForceCloseSchedule(examDate);
                                                                                 }}
                                                                                 className="inline-flex items-center gap-2 rounded-lg border border-rose-500 bg-rose-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-rose-600"
                                                                                 title="Force close this schedule (both sessions)"
                                                                             >
                                                                                 <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                                 </svg>
                                                                                 Force Close
                                                                             </button>
                                                                         </div>
                                                                     </td>
                                                                 </tr>,
                                                                 // Session rows (shown when expanded)
                                                                 ...(isExpandedDate ? dateSchedules.map((schedule) => (
                                                                     <tr key={`session-${schedule.id}`} className="bg-gray-25 border-l-4 border-blue-200">
                                                                         <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 pl-12">
                                                                             {editingSchedule === schedule.id ? (
                                                                                 <input
                                                                                     type="date"
                                                                                     value={scheduleFormData.exam_date}
                                                                                     min={new Date().toISOString().split('T')[0]}
                                                                                     onChange={(e) => setScheduleFormData({ ...scheduleFormData, exam_date: e.target.value })}
                                                                                     className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                                                                                 />
                                                                             ) : (
                                                                                 <span className="text-gray-600">└ {formatDate(schedule.exam_date)}</span>
                                                                             )}
                                                                         </td>
                                                                         <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                                                                             <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${schedule.session === 'morning'
                                                                                 ? 'bg-yellow-100 text-yellow-800'
                                                                                 : 'bg-orange-100 text-orange-800'
                                                                                 }`}>
                                                                                 {schedule.session === 'morning' ? '🌅 Morning' : '🌅 Afternoon'}
                                                                             </span>
                                                                         </td>
                                                                         <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                             {editingSchedule === schedule.id ? (
                                                                                 <div className="space-y-1">
                                                                                     <input
                                                                                         type="time"
                                                                                         value={scheduleFormData.start_time}
                                                                                         onChange={(e) => setScheduleFormData({ ...scheduleFormData, start_time: e.target.value })}
                                                                                         className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
                                                                                     />
                                                                                     <span className="text-xs text-gray-400">to</span>
                                                                                     <input
                                                                                         type="time"
                                                                                         value={scheduleFormData.end_time}
                                                                                         onChange={(e) => setScheduleFormData({ ...scheduleFormData, end_time: e.target.value })}
                                                                                         className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
                                                                                     />
                                                                                 </div>
                                                                             ) : (
                                                                                 formatTime(schedule.start_time) + ' - ' + formatTime(schedule.end_time)
                                                                             )}
                                                                         </td>
                                                                         <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                             {editingSchedule === schedule.id ? (
                                                                                 <input
                                                                                     type="number"
                                                                                     value={scheduleFormData.max_capacity}
                                                                                     onChange={(e) => setScheduleFormData({ ...scheduleFormData, max_capacity: parseInt(e.target.value) })}
                                                                                     className="border border-gray-300 rounded px-2 py-1 text-sm w-16"
                                                                                     min="1"
                                                                                     max="100"
                                                                                 />
                                                                             ) : (
                                                                                 schedule.max_capacity
                                                                             )}
                                                                         </td>
                                                                         <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                             <span className={isScheduleFull(schedule) ? 'text-red-600 font-semibold' : ''}>
                                                                                 {schedule.current_registrations}
                                                                             </span>
                                                                             {isScheduleFull(schedule) && (
                                                                                 <span className="ml-1 text-xs text-red-500">(FULL)</span>
                                                                             )}
                                                                         </td>
                                                                         <td className="px-6 py-3 whitespace-nowrap">
                                                                             {editingSchedule === schedule.id ? (
                                                                                 <select
                                                                                     value={scheduleFormData.status}
                                                                                     onChange={(e) => setScheduleFormData({ ...scheduleFormData, status: e.target.value })}
                                                                                     className="border border-gray-300 rounded px-2 py-1 text-xs"
                                                                                 >
                                                                                     <option value="open">Open</option>
                                                                                     <option value="full">Full</option>
                                                                                     <option value="closed">Closed</option>
                                                                                 </select>
                                                                             ) : (
                                                                                 <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScheduleStatusColor(schedule.status)}`}>
                                                                                     {schedule.status}
                                                                                 </span>
                                                                             )}
                                                                         </td>
                                                                         <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                             {editingSchedule === schedule.id ? (
                                                                                 <div className="space-x-1">
                                                                                     <button
                                                                                         onClick={() => handleScheduleUpdate(schedule.id)}
                                                                                         className="text-green-600 hover:text-green-800 text-xs font-medium"
                                                                                     >
                                                                                         Save
                                                                                     </button>
                                                                                     <button
                                                                                         onClick={() => {
                                                                                             setEditingSchedule(null);
                                                                                             setScheduleFormData({});
                                                                                         }}
                                                                                         className="text-red-600 hover:text-red-800 text-xs font-medium"
                                                                                     >
                                                                                         Cancel
                                                                                     </button>
                                                                                 </div>
                                                                             ) : (
                                                                                 <button
                                                                                     onClick={() => handleScheduleEdit(schedule)}
                                                                                     className="text-blue-600 hover:text-blue-800 text-xs"
                                                                                 >
                                                                                     Edit
                                                                                 </button>
                                                                             )}
                                                                         </td>
                                                                     </tr>
                                                                 )) : [])
                                                             ];
                                                         }).flat();
                                                     })()}
                                                 </tbody>
                                             </table>
                                         </div>

                                         {/* Pagination */}
                                         {(() => {
                                             const totalDates = Object.keys(activeAndClosed.active || {}).length;
                                             if (totalDates === 0) return null;
                                             const totalPages = Math.max(1, Math.ceil(totalDates / scheduleDatesPerPage));
                                             const cur = Math.min(scheduleDatePage, totalPages);
                                             return (
                                                 <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                                                     <div className="flex items-center gap-3">
                                                         <span className="font-semibold text-[#1D293D]">Dates per page</span>
                                                         <select
                                                             value={scheduleDatesPerPage}
                                                             onChange={(e) => { const n = Math.max(3, Math.min(10, parseInt(e.target.value) || 5)); setScheduleDatesPerPage(n); setScheduleDatePage(1); }}
                                                             className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
                                                         >
                                                             {[3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                                                         </select>
                                                         <span>Showing {(cur - 1) * scheduleDatesPerPage + 1} - {Math.min(cur * scheduleDatesPerPage, totalDates)} of {totalDates} dates</span>
                                                     </div>
                                                     <div className="flex items-center gap-2">
                                                         <button onClick={() => setScheduleDatePage(p => Math.max(1, p - 1))} disabled={cur <= 1} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6] disabled:cursor-not-allowed disabled:opacity-50">Prev</button>
                                                         {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                                                             let p;
                                                             if (totalPages <= 3) p = i + 1;
                                                             else if (cur <= 2) p = i + 1;
                                                             else if (cur >= totalPages - 1) p = totalPages - 2 + i;
                                                             else p = cur - 1 + i;
                                                             return (
                                                                 <button key={p} onClick={() => setScheduleDatePage(p)} className={`inline-flex items-center justify-center rounded-xl border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-150 ${p === cur ? 'border-[#1447E6] bg-[#1447E6] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#1447E6] hover:text-[#1447E6]'}`}>{p}</button>
                                                             );
                                                         })}
                                                         <button onClick={() => setScheduleDatePage(p => Math.min(totalPages, p + 1))} disabled={cur >= totalPages} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors duration-150 hover:border-[#1447E6] hover:text-[#1447E6] disabled:cursor-not-allowed disabled:opacity-50">Next</button>
                                                     </div>
                                                </div>
                                            );
                                        })()}

                                    {/* Closed Schedules Section */}
                                     {showClosedSchedules && (() => {
                                         const { closed } = activeAndClosed;
                                         const totalClosedDates = Object.keys(closed).length;

                                         if (totalClosedDates === 0) {
                                             return null;
                                         }

                                         return (
                                             <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60">
                                                 <div className="flex flex-col gap-4 border-b border-amber-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
                                                     <div className="space-y-2">
                                                         <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                                                             <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                             </svg>
                                                             Closed Exam Schedules
                                                         </div>
                                                         <p className="text-xs font-medium text-amber-700/80">{totalClosedDates} closed schedule{totalClosedDates !== 1 ? 's' : ''} archived. View the dedicated page for permanent management options.</p>
                                                     </div>
                                                     <div className="flex flex-wrap items-center gap-3">
                                                         <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">
                                                             {totalClosedDates} total
                                                         </span>
                                                         <button
                                                             onClick={() => router.visit('/guidance/closed-exam-schedules')}
                                                             className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-amber-100"
                                                         >
                                                             <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                             </svg>
                                                             Manage closed schedules
                                                         </button>
                                                     </div>
                                                 </div>
                                             </div>
                                         );
                                    })()}
                                </div>
                            )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Settings Modal - Only render when needed */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-clear bg-opacity-20 backdrop-blur-sm">
                    <div className="pointer-events-auto">
                        <div className="mx-auto my-12 w-11/12 max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-slate-200 bg-[#1D293D] px-8 py-6 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Registration Controls</p>
                                        <h3 className="text-xl font-semibold">Update Exam Registration Settings</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowSettingsModal(false);
                                        setFormData({
                                            registration_open: settings.registration_open,
                                            academic_year: settings.academic_year || getCurrentAcademicYear(),
                                            semester: settings.semester || '1st',
                                            exam_start_date: settings.exam_start_date,
                                            exam_end_date: settings.exam_end_date,
                                            students_per_day: settings.students_per_day,
                                            registration_message: settings.registration_message || '',
                                            delete_previous_schedules: false,
                                            selected_exam_dates: settings.selected_exam_dates || []
                                        });
                                    }}
                                    className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition-opacity duration-150 hover:bg-white/15"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSettingsSubmit} className="space-y-6 px-8 py-6">
                                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                                    <div>
                                        <label htmlFor="registration_open" className="text-sm font-semibold text-[#1D293D]">Open Registration</label>
                                        <p className="mt-1 text-xs text-slate-500">Allow students to sign up while the exam window is active.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="registration_open"
                                            checked={formData.registration_open}
                                            onChange={(e) => setFormData({ ...formData, registration_open: e.target.checked })}
                                            className="peer sr-only"
                                        />
                                        <div className="h-6 w-11 rounded-full border border-slate-300 bg-slate-200 transition-colors peer-checked:border-emerald-500 peer-checked:bg-emerald-500">
                                            <span className="absolute left-[2px] top-[2px] block h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                                        </div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#1D293D]">Academic Year</label>
                                        <input
                                            type="text"
                                            value={formData.academic_year}
                                            onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#1D293D] shadow-sm focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
                                            placeholder="e.g., 2025-2026"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#1D293D]">Semester</label>
                                        <select
                                            value={formData.semester}
                                            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#1D293D] shadow-sm focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
                                            required
                                        >
                                            <option value="1st">1st Semester</option>
                                            <option value="2nd">2nd Semester</option>
                                            <option value="Summer">Summer</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.registration_open && (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#1D293D]">Exam Start Date</label>
                                            <input
                                                type="date"
                                                value={formData.exam_start_date}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setFormData({ ...formData, exam_start_date: e.target.value })}
                                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#1D293D] shadow-sm focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#1D293D]">Exam End Date</label>
                                            <input
                                                type="date"
                                                value={formData.exam_end_date}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setFormData({ ...formData, exam_end_date: e.target.value })}
                                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#1D293D] shadow-sm focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.registration_open && formData.exam_start_date && formData.exam_end_date && (
                                    <div className="rounded-2xl border border-[#1447E6]/20 bg-[#1447E6]/5 px-6 py-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <h4 className="flex items-center gap-2 text-sm font-semibold text-[#1D293D]">
                                                    <svg className="h-4 w-4 text-[#1447E6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    Select available exam dates
                                                </h4>
                                                <p className="mt-1 text-xs font-medium text-slate-500">Choose the exact schedule days students can select during registration.</p>
                                                {formData.selected_exam_dates.length > 0 && (
                                                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1447E6]">
                                                        {formData.selected_exam_dates.length} dates currently selected
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => router.visit('/guidance/exam-date-selection')}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1240d0]"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Manage exam dates
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#1D293D]">Examinees per day</label>
                                        <input
                                            type="number"
                                            value={formData.students_per_day}
                                            onChange={(e) => setFormData({ ...formData, students_per_day: parseInt(e.target.value) })}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#1D293D] shadow-sm focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
                                            min="1"
                                            max="100"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#1D293D]">Registration message (optional)</label>
                                        <textarea
                                            value={formData.registration_message}
                                            onChange={(e) => setFormData({ ...formData, registration_message: e.target.value })}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition-colors duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
                                            rows="3"
                                            placeholder="Show a custom note during the registration form."
                                        />
                                    </div>
                                </div>

                                {!formData.registration_open && (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                                        <div className="flex items-start gap-3">
                                            <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="space-y-2 text-xs text-amber-800">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        id="delete_previous_schedules"
                                                        type="checkbox"
                                                        checked={formData.delete_previous_schedules}
                                                        onChange={(e) => setFormData({ ...formData, delete_previous_schedules: e.target.checked })}
                                                        className="h-4 w-4 rounded border border-amber-300 text-amber-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                                                    />
                                                    <label htmlFor="delete_previous_schedules" className="text-sm font-semibold text-amber-700">Close previous exam schedules</label>
                                                </div>
                                                <p>Closes all schedules within {formData.exam_start_date ? formatDate(formData.exam_start_date) : '…'} – {formData.exam_end_date ? formatDate(formData.exam_end_date) : '…'} and archives completed/no-show registrations.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 text-sm font-semibold text-[#1D293D] sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowSettingsModal(false);
                                            setFormData({
                                                registration_open: settings.registration_open,
                                                academic_year: settings.academic_year || getCurrentAcademicYear(),
                                                semester: settings.semester || '1st',
                                                exam_start_date: settings.exam_start_date,
                                                exam_end_date: settings.exam_end_date,
                                                students_per_day: settings.students_per_day,
                                                registration_message: settings.registration_message || '',
                                                delete_previous_schedules: false,
                                                selected_exam_dates: settings.selected_exam_dates || []
                                            });
                                        }}
                                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#1447E6] hover:text-[#1447E6]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 ${formData.registration_open ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                                    >
                                        Update settings
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Registration Modal */}
            {showEditRegistrationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-clear bg-opacity-20 backdrop-blur-sm">
                    <div className="pointer-events-auto w-11/12 max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-[#1D293D] px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold uppercase">
                                    {(editingRegistrationData?.examinee?.user?.username || 'NA').slice(0, 1)}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Edit registration</p>
                                    <h3 className="text-lg font-semibold">{editingRegistrationData?.examinee?.user?.username || 'Unknown'} • {editingRegistrationData?.examinee?.school_name || 'No school specified'}</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowEditRegistrationModal(false)}
                                className="rounded-full border border-white/15 bg.white/10 p-2 text-white transition-all duration-150 hover:bg-white/20"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-5 px-6 py-6">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#1D293D]">Available exam windows</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowWindowList(!showWindowList)}
                                        className="flex w-full items-center justify-between rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#1D293D] shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#1447E6] focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
                                    >
                                        <span className="truncate">
                                            {modalDateValue && modalSessionValue
                                                ? `${formatDate(modalDateValue)} • ${modalSessionValue === 'morning' ? 'Morning (8:00 AM - 11:00 AM)' : 'Afternoon (1:00 PM - 4:00 PM)'}`
                                                : 'Select an exam window'}
                                        </span>
                                        <svg className={`h-4 w-4 text-[#1447E6] transition-transform ${showWindowList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {showWindowList && (
                                        <div className="absolute z-50 mt-2 w-full max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                                            {getAvailableWindowsGrouped().map(([date, sessions]) => (
                                                <div key={date}>
                                                    <div className="sticky top-0 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{formatDate(date)}</div>
                                                    {sessions.map((window, idx) => (
                                                        <button
                                                            key={`${window.date}-${window.session}`}
                                                            type="button"
                                                            disabled={window.isFull}
                                                            onClick={() => {
                                                                setModalDateValue(window.date);
                                                                setModalSessionValue(window.session);
                                                                setShowWindowList(false);
                                                            }}
                                                            className={`flex w-full items-center justify-between px-4 py-3 text-sm ${window.isFull ? 'cursor-not-allowed text-slate-400' : 'text-[#1D293D] hover:bg-[#1447E6]/5'} ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                                        >
                                                            <span>{window.displaySession}</span>
                                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${window.isFull ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                {window.isFull ? 'Full' : `${window.registered}/${window.capacity}`}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                            {getAvailableExamWindows().length === 0 && (
                                                <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">No available exam windows found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm.font-semibold text-[#1D293D]">Registration status</label>
                                <select
                                    value={modalStatusValue}
                                    onChange={(e) => setModalStatusValue(e.target.value)}
                                    className="w-full rounded-xl border.border-slate-300 px-4 py-3 text-sm font-semibold text-[#1D293D] shadow-sm focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
                                >
                                    <option value="assigned">Assigned (ready for exam)</option>
                                    <option value="cancelled">No show (failed to attend)</option>
                                </select>
                                <div className="mt-2 text-xs text-slate-500">
                                    <div><span className="font-semibold text-emerald-600">Assigned</span> • Student has a confirmed slot.</div>
                                    <div><span className="font-semibold text-rose-600">No show</span> • Student failed to attend or withdrew.</div>
                                </div>
                            </div>
                        </div>

                        {settings.exam_start_date && settings.exam_end_date && (
                            <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
                                Allowed window: <span className="font-semibold text-[#1D293D]">{formatDate(settings.exam_start_date)} — {formatDate(settings.exam_end_date)}</span>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
                            <button
                                onClick={() => setShowEditRegistrationModal(false)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#1447E6] hover:text-[#1447E6]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSaveDateFromModal(editingRegistration)}
                                disabled={modalSaving}
                                className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-200 ${modalSaving ? 'cursor-not-allowed bg-slate-300' : 'bg-[#1447E6] hover:-translate-y-0.5 hover:bg-[#1240d0]'}`}
                            >
                                {modalSaving ? 'Updating…' : 'Update registration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Generate Codes Modal */}
            {showBulkCodeModal && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
                    <div className="mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-lg bg-white pointer-events-auto animate-fadeIn">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">EC</div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Generate Codes For All Dates</h3>
                                    <p className="text-xs text-gray-500">Select an exam to shuffle its ref code across all dates.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowBulkCodeModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Exam</label>
                                <select
                                    disabled={loadingExams}
                                    value={selectedExamId}
                                    onChange={(e) => setSelectedExamId(e.target.value)}
                                    className="w-full border-2 border-gray-300 rounded-lg shadow-sm focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200"
                                >
                                    <option value="">{loadingExams ? 'Loading exams…' : 'Select an exam'}</option>
                                    {examSummaries.map((ex) => (
                                        <option key={ex.examId} value={ex.examId}>
                                            {`${ex.ref} ${ex.time_limit ? `• ${ex.time_limit} mins` : ''} • ${ex.questions_count} items${ex.include_personality_test ? ` • PT ${ex.personality_questions_count}` : ''}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedExamId && (() => {
                                const ex = examSummaries.find(e => String(e.examId) === String(selectedExamId));
                                if (!ex) return null;
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="p-3 rounded border bg-gray-50">
                                            <div className="text-xs text-gray-500">Exam Ref</div>
                                            <div className="text-sm font-semibold text-gray-900 break-all">{ex.ref}</div>
                                        </div>
                                        <div className="p-3 rounded border bg-gray-50">
                                            <div className="text-xs text-gray-500">Questions</div>
                                            <div className="text-sm font-semibold text-gray-900">{ex.questions_count}</div>
                                        </div>
                                        <div className="p-3 rounded border bg-gray-50">
                                            <div className="text-xs text-gray-500">Personality</div>
                                            <div className="text-sm font-semibold text-gray-900">{ex.include_personality_test ? `${ex.personality_questions_count} items` : 'None'}</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {(() => {
                                const { active } = activeAndClosed;
                                const hasActiveSchedules = Object.keys(active).length > 0;

                                if (hasActiveSchedules) {
                                    return (
                                        <div className="text-xs text-gray-600">
                                            Exam period: <span className="font-semibold">{formatDate(settings.exam_start_date)} — {formatDate(settings.exam_end_date)}</span>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="text-xs text-gray-600">
                                            <span className="text-orange-600 font-semibold">All exam schedules are closed</span>
                                        </div>
                                    );
                                }
                            })()}
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowBulkCodeModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={!selectedExamId || submittingBulk}
                                onClick={() => {
                                    if (!selectedExamId) return;
                                    setSubmittingBulk(true);
                                    router.post('/guidance/bulk-generate-schedule-codes', {
                                        start_date: settings.exam_start_date,
                                        end_date: settings.exam_end_date,
                                        exam_id: selectedExamId
                                    }, {
                                        onSuccess: () => {
                                            setSubmittingBulk(false);
                                            setShowBulkCodeModal(false);
                                            window.showAlert('Generated exam codes for all dates.', 'success');
                                        },
                                        onError: () => {
                                            setSubmittingBulk(false);
                                            window.showAlert('Failed to bulk-generate exam codes.', 'error');
                                        }
                                    });
                                }}
                                className={`px-4 py-2 text-white rounded-md transition-colors duration-200 ${(!selectedExamId || submittingBulk) ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                                {submittingBulk ? 'Generating…' : 'Generate Codes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Single Date Code Generation Modal */}
            {showSingleDateCodeModal && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
                    <div className="mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-lg bg-white pointer-events-auto animate-fadeIn">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">EC</div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Generate Code For {formatDate(singleDateForCode)}</h3>
                                    <p className="text-xs text-gray-500">Select an exam to assign its code to this date.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSingleDateCodeModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Exam</label>
                                <select
                                    disabled={loadingExams}
                                    value={singleDateExamId}
                                    onChange={(e) => setSingleDateExamId(e.target.value)}
                                    className="w-full border-2 border-gray-300 rounded-lg shadow-sm focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200"
                                >
                                    <option value="">{loadingExams ? 'Loading exams…' : 'Select an exam'}</option>
                                    {examSummaries.map((ex) => (
                                        <option key={ex.examId} value={ex.examId}>
                                            {`${ex.ref} ${ex.time_limit ? `• ${ex.time_limit} mins` : ''} • ${ex.questions_count} items${ex.include_personality_test ? ` • PT ${ex.personality_questions_count}` : ''}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {singleDateExamId && (() => {
                                const ex = examSummaries.find(e => String(e.examId) === String(singleDateExamId));
                                if (!ex) return null;
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="p-3 rounded border bg-gray-50">
                                            <div className="text-xs text-gray-500">Exam Ref</div>
                                            <div className="text-sm font-semibold text-gray-900 break-all">{ex.ref}</div>
                                        </div>
                                        <div className="p-3 rounded border bg-gray-50">
                                            <div className="text-xs text-gray-500">Questions</div>
                                            <div className="text-sm font-semibold text-gray-900">{ex.questions_count}</div>
                                        </div>
                                        <div className="p-3 rounded border bg-gray-50">
                                            <div className="text-xs text-gray-500">Personality</div>
                                            <div className="text-sm font-semibold text-gray-900">{ex.include_personality_test ? `${ex.personality_questions_count} items` : 'None'}</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="text-xs text-gray-600">
                                This exam code will be assigned to <span className="font-semibold">{formatDate(singleDateForCode)}</span> (both morning and afternoon sessions).
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowSingleDateCodeModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={!singleDateExamId || submittingSingleDate}
                                onClick={() => {
                                    if (!singleDateExamId) return;
                                    setSubmittingSingleDate(true);
                                    router.post('/guidance/generate-schedule-code', {
                                        exam_date: singleDateForCode,
                                        exam_id: singleDateExamId
                                    }, {
                                        onSuccess: () => {
                                            setSubmittingSingleDate(false);
                                            setShowSingleDateCodeModal(false);
                                            window.showAlert(`Exam code generated for ${formatDate(singleDateForCode)}.`, 'success');
                                        },
                                        onError: () => {
                                            setSubmittingSingleDate(false);
                                            window.showAlert('Failed to generate exam code.', 'error');
                                        }
                                    });
                                }}
                                className={`px-4 py-2 text-white rounded-md transition-colors duration-200 ${(!singleDateExamId || submittingSingleDate) ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                                {submittingSingleDate ? 'Generating…' : 'Generate Code'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQrModal && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-fadeIn border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                                Exam Code QR Code
                            </h3>
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="text-center">
                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 mb-6 border border-emerald-200">
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <img
                                        src={selectedQrCode}
                                        alt="QR Code"
                                        className="mx-auto rounded-lg shadow-md"
                                    />
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm text-emerald-700 font-semibold">
                                        Mobile App Ready
                                    </p>
                                </div>
                                <p className="text-xs text-emerald-600">
                                    Scan this QR code with the mobile app to access the exam
                                </p>
                            </div>

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.download = 'exam-qr-code.png';
                                        link.href = selectedQrCode;
                                        link.click();
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download QR Code
                                </button>
                                <button
                                    onClick={() => setShowQrModal(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Schedules Confirmation Modal */}
            {showCloseConfirmationModal && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-fadeIn border border-black">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.502 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Confirm Schedule Closure</h3>
                                    <p className="text-sm text-gray-500">This action will close exam schedules and archive registrations</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <h4 className="text-sm font-semibold text-orange-800 mb-2">What will happen:</h4>
                                    <ul className="text-xs text-orange-700 space-y-1">
                                        <li>• All exam schedules from the current period will be closed</li>
                                        <li>• Schedules where all examinees completed their exams will be closed</li>
                                        <li>• Schedules where all examinees were cancelled (no-shows) will be closed</li>
                                        <li>• All completed and cancelled examinee registrations will be archived</li>
                                        <li>• Closed schedules and archived registrations will be moved to "Closed Schedules" section</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.502 1.732 2.5z" />
                                </svg>
                                <div>
                                    <h4 className="text-sm font-semibold text-red-800 mb-1">Warning:</h4>
                                    <p className="text-xs text-red-700">This action cannot be undone. Closed schedules and archived registrations will be hidden from the main view.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowCloseConfirmationModal(false);
                                    setPendingFormData(null);
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (pendingFormData) {
                                        submitSettingsData(pendingFormData);
                                    }
                                }}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 text-sm font-medium"
                            >
                                Confirm & Close Schedules
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reschedule Modal */}
            {showRescheduleModal && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
                    <div className="mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-lg bg-white pointer-events-auto animate-fadeIn">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Force Close Schedule</h3>
                                    <p className="text-sm text-gray-500">Close schedule for {formatDate(rescheduleData.examDate)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <h4 className="text-sm font-semibold text-orange-800 mb-2">Examinees Found</h4>
                                    <p className="text-xs text-orange-700">
                                        <strong>{rescheduleData.examineeCount} examinee{rescheduleData.examineeCount !== 1 ? 's' : ''}</strong> are currently assigned to this date.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Would you like to reschedule?</h4>
                            <p className="text-sm text-gray-600">Choose to reschedule examinees to another date or close without rescheduling.</p>
                        </div>

                        {rescheduleData.newDate === '' && (
                            <div className="space-y-4 mb-6">
                                {/* Current Date Being Closed Indicator */}
                                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Current Date (Being Closed)</div>
                                            <div className="text-lg font-bold text-red-800">{formatDate(rescheduleData.examDate)}</div>
                                            <div className="text-xs text-red-600 mt-1">
                                                {rescheduleData.examineeCount} examinee{rescheduleData.examineeCount !== 1 ? 's' : ''} will be moved from this date
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <span className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                            Select New Date to Reschedule
                                        </span>
                                    </label>
                                    <select
                                        value={rescheduleData.newDate}
                                        onChange={(e) => setRescheduleData(prev => ({ ...prev, newDate: e.target.value }))}
                                        className="w-full border-2 border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 reschedule-select"
                                        size="8"
                                    >
                                        <option value="" className="bg-gray-50 font-semibold text-gray-700">Select a new date...</option>
                                        {getAvailableExamWindows().map((window, index) => {
                                            // Normalize dates for comparison
                                            const windowDateNormalized = window.date.split('T')[0].split(' ')[0];
                                            const currentDateNormalized = rescheduleData.examDate ? rescheduleData.examDate.split('T')[0].split(' ')[0] : '';
                                            const isCurrentDate = windowDateNormalized === currentDateNormalized;

                                            return (
                                                <option
                                                    key={`${window.date}-${window.session}`}
                                                    value={window.date}
                                                    disabled={isCurrentDate}
                                                    className={index % 2 === 0 ? 'bg-white hover:bg-orange-50' : 'bg-orange-50 hover:bg-orange-100'}
                                                    style={{
                                                        backgroundColor: isCurrentDate ? '#fee2e2' : (index % 2 === 0 ? '#ffffff' : '#fff7ed'),
                                                        padding: '8px 12px',
                                                        color: isCurrentDate ? '#991b1b' : 'inherit',
                                                        fontWeight: isCurrentDate ? 'bold' : 'normal'
                                                    }}
                                                >
                                                    {isCurrentDate ? '🚫 ' : ''}{window.displayDate} - {window.displaySession} ({window.registered}/{window.capacity}){isCurrentDate ? ' (Current - Being Closed)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Session</label>
                                    <select
                                        value={rescheduleData.newSession}
                                        onChange={(e) => setRescheduleData(prev => ({ ...prev, newSession: e.target.value }))}
                                        className="w-full border-2 border-gray-300 rounded-lg shadow-sm px-3 py-2 focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200"
                                    >
                                        <option value="morning" className="bg-yellow-50">Morning Session (8:00 AM - 11:00 AM)</option>
                                        <option value="afternoon" className="bg-orange-50">Afternoon Session (1:00 PM - 4:00 PM)</option>
                                    </select>
                                </div>

                                {rescheduleData.newDate && rescheduleData.newSession && (() => {
                                    const targetSchedule = getScheduleForDateAndSession(rescheduleData.newDate, rescheduleData.newSession);
                                    const availableSlots = targetSchedule ? targetSchedule.max_capacity - targetSchedule.current_registrations : 0;
                                    const canAccommodate = availableSlots >= rescheduleData.examineeCount;

                                    return (
                                        <div className={`p-3 rounded-lg border ${canAccommodate ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <div className="flex items-center gap-2">
                                                <svg className={`w-4 h-4 ${canAccommodate ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={canAccommodate ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                                                </svg>
                                                <span className={`text-sm font-medium ${canAccommodate ? 'text-green-800' : 'text-red-800'}`}>
                                                    {canAccommodate
                                                        ? `✓ Can accommodate all ${rescheduleData.examineeCount} examinee${rescheduleData.examineeCount !== 1 ? 's' : ''} (${availableSlots} slots available)`
                                                        : `⚠ Cannot accommodate all examinees (only ${availableSlots} slots available, need ${rescheduleData.examineeCount})`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => {
                                    setShowRescheduleModal(false);
                                    setRescheduleData({
                                        examDate: null,
                                        examineeCount: 0,
                                        newDate: '',
                                        newSession: 'morning'
                                    });
                                }}
                                disabled={rescheduleSaving}
                                className="px-6 py-2 border-2 border-gray-400 text-gray-700 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 text-sm font-medium shadow-sm"
                            >
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </span>
                            </button>
                            <button
                                onClick={handleRescheduleCancel}
                                disabled={rescheduleSaving}
                                className="px-6 py-2 border border-red-300 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200 text-sm font-medium"
                            >
                                No, Just Close
                            </button>
                            <button
                                onClick={() => {
                                    if (!rescheduleData.newDate) {
                                        // Show date selection - set to empty string to show the form
                                        setRescheduleData(prev => ({ ...prev, newDate: '' }));
                                    } else if (rescheduleData.newDate === '') {
                                        // Reset to initial state
                                        setRescheduleData(prev => ({ ...prev, newDate: null }));
                                    } else {
                                        // Proceed with rescheduling
                                        handleRescheduleConfirm();
                                    }
                                }}
                                disabled={rescheduleSaving}
                                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 text-sm font-medium shadow-md"
                            >
                                {rescheduleSaving ? 'Processing...' :
                                    rescheduleData.newDate === '' ? 'Cancel Selection' :
                                        rescheduleData.newDate ? 'Reschedule & Close' : 'Yes, Reschedule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Date Edit Modal */}
            {showDateEditModal && (
                <div className="fixed inset-0 bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
                    <div className="mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-2xl rounded-lg bg-white pointer-events-auto animate-fadeIn">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Edit Exam Schedules</h3>
                                    <p className="text-xs text-gray-500">{editingDate ? formatDate(editingDate) : ''} • Morning & Afternoon Sessions</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDateEditModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Morning Session */}
                            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <h4 className="text-lg font-semibold text-yellow-800">🌅 Morning Session</h4>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                            <input
                                                type="time"
                                                value={dateFormData.morning.start_time}
                                                onChange={(e) => setDateFormData(prev => ({
                                                    ...prev,
                                                    morning: { ...prev.morning, start_time: e.target.value }
                                                }))}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                            <input
                                                type="time"
                                                value={dateFormData.morning.end_time}
                                                onChange={(e) => setDateFormData(prev => ({
                                                    ...prev,
                                                    morning: { ...prev.morning, end_time: e.target.value }
                                                }))}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                                        <input
                                            type="number"
                                            value={dateFormData.morning.max_capacity}
                                            onChange={(e) => {
                                                const newCapacity = e.target.value;
                                                setDateFormData(prev => ({
                                                    ...prev,
                                                    morning: {
                                                        ...prev.morning,
                                                        max_capacity: newCapacity,
                                                        // Auto-change status to 'open' when capacity is increased
                                                        status: newCapacity > 0 ? 'open' : prev.morning.status
                                                    }
                                                }));
                                            }}
                                            min="1"
                                            max="100"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            value={dateFormData.morning.status}
                                            onChange={(e) => setDateFormData(prev => ({
                                                ...prev,
                                                morning: { ...prev.morning, status: e.target.value }
                                            }))}
                                            className={`w-full border-2 rounded-md px-3 py-2 text-sm transition-colors duration-200 ${dateFormData.morning.status === 'open'
                                                ? 'border-green-500 focus:ring-2 focus:ring-green-500 focus:border-green-500'
                                                : 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                                                }`}
                                        >
                                            <option value="open">Open</option>
                                            <option value="full">Full</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Afternoon Session */}
                            <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <h4 className="text-lg font-semibold text-orange-800">🌅 Afternoon Session</h4>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                            <input
                                                type="time"
                                                value={dateFormData.afternoon.start_time}
                                                onChange={(e) => setDateFormData(prev => ({
                                                    ...prev,
                                                    afternoon: { ...prev.afternoon, start_time: e.target.value }
                                                }))}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                            <input
                                                type="time"
                                                value={dateFormData.afternoon.end_time}
                                                onChange={(e) => setDateFormData(prev => ({
                                                    ...prev,
                                                    afternoon: { ...prev.afternoon, end_time: e.target.value }
                                                }))}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                                        <input
                                            type="number"
                                            value={dateFormData.afternoon.max_capacity}
                                            onChange={(e) => {
                                                const newCapacity = e.target.value;
                                                setDateFormData(prev => ({
                                                    ...prev,
                                                    afternoon: {
                                                        ...prev.afternoon,
                                                        max_capacity: newCapacity,
                                                        // Auto-change status to 'open' when capacity is increased
                                                        status: newCapacity > 0 ? 'open' : prev.afternoon.status
                                                    }
                                                }));
                                            }}
                                            min="1"
                                            max="100"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            value={dateFormData.afternoon.status}
                                            onChange={(e) => setDateFormData(prev => ({
                                                ...prev,
                                                afternoon: { ...prev.afternoon, status: e.target.value }
                                            }))}
                                            className={`w-full border-2 rounded-md px-3 py-2 text-sm transition-colors duration-200 ${dateFormData.afternoon.status === 'open'
                                                ? 'border-green-500 focus:ring-2 focus:ring-green-500 focus:border-green-500'
                                                : 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                                                }`}
                                        >
                                            <option value="open">Open</option>
                                            <option value="full">Full</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                            <button
                                onClick={() => setShowDateEditModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveDateEdit}
                                disabled={dateModalSaving}
                                className={`px-4 py-2 text-white rounded-md transition-colors duration-200 ${dateModalSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {dateModalSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideDown { animation: slideDown 150ms ease-out; }
                
                /* Performance optimizations */
                .performance-optimized {
                    contain: layout style paint;
                    will-change: transform;
                }
                .table-container {
                    contain: layout style;
                    transform: translateZ(0);
                }
                .modal-container {
                    contain: layout style paint;
                    transform: translateZ(0);
                }
                
                /* Reschedule select dropdown styling */
                .reschedule-select {
                    overflow-y: auto;
                    max-height: 300px;
                }
                .reschedule-select option {
                    padding: 10px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #f3f4f6;
                }
                .reschedule-select option:hover {
                    background-color: #fed7aa !important;
                }
                .reschedule-select option:checked {
                    background: linear-gradient(to right, #fb923c, #f97316);
                    color: white;
                    font-weight: 600;
                }
                `}
            </style>
            </React.Fragment>
        </Layout>
    );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(ExamRegistrationManagement);
