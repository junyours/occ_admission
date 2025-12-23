import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const ExamDateSelection = ({ user, settings }) => {
    // Function to get current academic year (current year to next year)
    const getCurrentAcademicYear = () => {
        const currentYear = new Date().getFullYear();
        return `${currentYear}-${currentYear + 1}`;
    };

    // Normalize any backend date value to HTML date input format (YYYY-MM-DD)
    const normalizeDateForInput = (value) => {
        if (!value) return '';
        // If it's already in YYYY-MM-DD format, return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) {
            return '';
        }
        return d.toISOString().split('T')[0];
    };

    // Existing exam dates already stored in exam_schedules for the current window
    // Normalize them to YYYY-MM-DD so they match the calendar date strings
    const existingExamDates = Array.isArray(settings.existing_exam_dates)
        ? settings.existing_exam_dates
            .map((d) => normalizeDateForInput(d))
            .filter((d) => d && typeof d === 'string')
        : [];

    const [formData, setFormData] = useState({
        registration_open: settings.registration_open || false,
        academic_year: settings.academic_year || getCurrentAcademicYear(),
        semester: settings.semester || '1st',
        // Ensure dates coming from the database show correctly in the date pickers
        exam_start_date: normalizeDateForInput(settings.exam_start_date) || '',
        exam_end_date: normalizeDateForInput(settings.exam_end_date) || '',
        // Initialize with normalized existing exam dates so they appear selected by default
        selected_exam_dates: existingExamDates,
        students_per_day: settings.students_per_day || 40,
        registration_message: settings.registration_message || '',
        delete_previous_schedules: false,
        morning_start_time: '08:00',
        morning_end_time: '11:00',
        afternoon_start_time: '13:00',
        afternoon_end_time: '16:00'
    });

    const [isSaving, setIsSaving] = useState(false);

    // Date selection helper functions
    const generateDateRange = (startDate, endDate) => {
        if (!startDate || !endDate || startDate.trim() === '' || endDate.trim() === '') {
            return [];
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Check if dates are valid
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return [];
        }
        
        const dates = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d).toISOString().split('T')[0]);
        }
        return dates;
    };

    const isDateSelected = (date) => {
        const normalizedDate = normalizeDateForInput(date);
        const result = formData.selected_exam_dates.includes(normalizedDate);
        return result;
    };

    // Helper: check if a date already exists in exam_schedules (current/existing date)
    const isExistingExamDate = (date) => {
        const normalizedDate = normalizeDateForInput(date);
        return existingExamDates.includes(normalizedDate);
    };

    const toggleDateSelection = (date) => {
        // Normalize date to ensure consistent format
        const normalizedDate = normalizeDateForInput(date);
        console.log('[ExamDateSelection] toggleDateSelection - date:', date, 'normalized:', normalizedDate);
        
        // Prevent selection of weekend dates
        const dateObj = new Date(normalizedDate);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        if (isWeekend) {
            return; // Do nothing for weekend dates
        }

        // Do not allow removing existing exam dates from the selection
        if (isExistingExamDate(normalizedDate)) {
            console.log('[ExamDateSelection] Existing exam date clicked, not removing:', normalizedDate);
            return;
        }
        
        const currentDates = formData.selected_exam_dates;
        console.log('[ExamDateSelection] Current selected dates:', currentDates);
        console.log('[ExamDateSelection] Is date in current dates?', currentDates.includes(normalizedDate));
        
        if (currentDates.includes(normalizedDate)) {
            setFormData({
                ...formData,
                // Only remove if it's not an existing exam date (checked above)
                selected_exam_dates: currentDates.filter(d => d !== normalizedDate)
            });
        } else {
            setFormData({
                ...formData,
                selected_exam_dates: [...currentDates, normalizedDate]
            });
        }
    };

    const selectAllDates = () => {
        const startDate = formData.exam_start_date || settings.exam_start_date;
        const endDate = formData.exam_end_date || settings.exam_end_date;
        if (!startDate || !endDate) return;
        const allDates = generateDateRange(startDate, endDate);
        // Only select weekdays (exclude weekends)
        const weekdays = allDates.filter(date => {
            const day = new Date(date).getDay();
            return day !== 0 && day !== 6; // Exclude Sunday (0) and Saturday (6)
        });
        // Ensure existing exam dates are always included
        const merged = Array.from(new Set([...existingExamDates, ...weekdays]));
        setFormData({
            ...formData,
            selected_exam_dates: merged
        });
    };

    const clearAllDates = () => {
        // Clear only newly added dates; keep existing exam dates
        setFormData({
            ...formData,
            selected_exam_dates: existingExamDates
        });
    };

    const selectWeekdaysOnly = () => {
        const startDate = formData.exam_start_date || settings.exam_start_date;
        const endDate = formData.exam_end_date || settings.exam_end_date;
        if (!startDate || !endDate) return;
        const allDates = generateDateRange(startDate, endDate);
        const weekdays = allDates.filter(date => {
            const day = new Date(date).getDay();
            return day !== 0 && day !== 6; // Exclude Sunday (0) and Saturday (6)
        });
        // Ensure existing exam dates are always included
        const merged = Array.from(new Set([...existingExamDates, ...weekdays]));
        setFormData({
            ...formData,
            selected_exam_dates: merged
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleSave = () => {
        // Validation
        if (formData.registration_open) {
            if (!formData.exam_start_date || !formData.exam_end_date) {
                window.showAlert('Please set both exam start and end dates', 'error');
                return;
            }

            if (formData.selected_exam_dates.length === 0) {
                window.showAlert('Please select at least one exam date', 'error');
                return;
            }

            // Validate selected dates are within the exam window
            const startDate = new Date(formData.exam_start_date);
            const endDate = new Date(formData.exam_end_date);
            
            const invalidDates = formData.selected_exam_dates.filter(date => {
                const selectedDate = new Date(date);
                return selectedDate < startDate || selectedDate > endDate;
            });

            if (invalidDates.length > 0) {
                window.showAlert(`Selected dates must be within the exam window (${formatDate(formData.exam_start_date)} - ${formatDate(formData.exam_end_date)})`, 'error');
                return;
            }
        }

        setIsSaving(true);
        
        router.put('/guidance/registration-settings', {
            registration_open: formData.registration_open,
            academic_year: formData.academic_year,
            semester: formData.semester,
            exam_start_date: formData.exam_start_date,
            exam_end_date: formData.exam_end_date,
            selected_exam_dates: formData.selected_exam_dates,
            students_per_day: formData.students_per_day,
            registration_message: formData.registration_message,
            delete_previous_schedules: formData.delete_previous_schedules,
            morning_start_time: formData.morning_start_time,
            morning_end_time: formData.morning_end_time,
            afternoon_start_time: formData.afternoon_start_time,
            afternoon_end_time: formData.afternoon_end_time
        }, {
            onSuccess: () => {
                setIsSaving(false);
                window.showAlert('Registration settings updated successfully', 'success');
                router.visit('/guidance/exam-registration-management');
            },
            onError: (errors) => {
                setIsSaving(false);
                console.error('Settings update failed:', errors);
                window.showAlert('Failed to update settings: ' + (errors.error || 'Unknown error'), 'error');
            }
        });
    };

    const availableDates = generateDateRange(
        formData.exam_start_date || settings.exam_start_date, 
        formData.exam_end_date || settings.exam_end_date
    );

    return (
        <Layout user={user}>
            <div className="min-h-screen bg-slate-50 animate-up" style={{ animationDelay: '60ms' }}>
                <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-up" style={{ animationDelay: '120ms' }}>
                    {/* Enhanced Header Section */}
                    <div className="mb-8 rounded-3xl border border-[#1D293D] bg-[#1D293D] text-white shadow-sm animate-up" style={{ animationDelay: '180ms' }}>
                        <div className="p-8 animate-up" style={{ animationDelay: '220ms' }}>
                            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex-1">
                                    <div className="mb-6 flex items-center gap-4 animate-up" style={{ animationDelay: '260ms' }}>
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                                            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Exam Registration Settings</h1>
                                            <p className="mt-2 text-sm text-white/80">Configure exam periods and manage registration settings</p>
                                        </div>
                                    </div>

                                    {/* Status Cards */}
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 animate-up" style={{ animationDelay: '300ms' }}>
                                        <div className={`rounded-2xl border border-slate-200 border-t-[6px] bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md ${formData.registration_open ? 'border-t-[#1447E6]' : 'border-t-orange-500'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`rounded-lg p-2 ${formData.registration_open ? 'bg-[#1447E6]/10 text-[#1447E6]' : 'bg-orange-500/10 text-orange-600'}`}>
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Registration Status</p>
                                                    <p className={`mt-1 text-lg font-semibold ${formData.registration_open ? 'text-[#1447E6]' : 'text-orange-600'}`}>{formData.registration_open ? 'OPEN' : 'CLOSED'}</p>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-xs font-medium text-slate-500">Auto-close {formData.registration_open ? 'enabled' : 'disabled'}</p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-[#1447E6]/10 p-2 text-[#1447E6]">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Exam Period</p>
                                                    <p className="mt-1 text-sm font-semibold text-[#1D293D]">{formatDate(settings.exam_start_date)} — {formatDate(settings.exam_end_date)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-[#1447E6]/10 p-2 text-[#1447E6]">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected Dates</p>
                                                    <p className="mt-1 text-lg font-semibold text-[#1D293D]">{formData.selected_exam_dates.length}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="animate-up text-center lg:text-right" style={{ animationDelay: '340ms' }}>
                                    <div className="rounded-2xl border border-slate-200 border-t-[6px] border-t-[#1447E6] bg-white p-6 shadow-sm">
                                        <div className="text-3xl font-bold text-[#1D293D]">{formData.students_per_day}</div>
                                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Students Per Day</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-up" style={{ animationDelay: '320ms' }}>
                        {/* Left Column - Settings */}
                        <div className="xl:col-span-1 space-y-6">
                            {/* Registration Settings */}
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm min-h-[660px] pb-8 animate-up" style={{ animationDelay: '340ms' }}>
                                <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5 animate-up" style={{ animationDelay: '360ms' }}>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[#1D293D]">Registration Settings</h3>
                                        <p className="text-sm text-slate-500">Basic configuration</p>
                                    </div>
                                </div>
                                <div className="space-y-6 px-6 pt-6 animate-up" style={{ animationDelay: '380ms' }}>
                                    {/* Toggle Switch for Open Registration */}
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-semibold text-[#1D293D]">Registration Status</h4>
                                                <p className="mt-1 text-xs text-slate-500">Allow students to register</p>
                                            </div>
                                            <label className="relative inline-flex cursor-pointer items-center">
                                                <input
                                                    type="checkbox"
                                                    id="registration_open"
                                                    checked={formData.registration_open}
                                                    onChange={(e) => setFormData({ ...formData, registration_open: e.target.checked })}
                                                    className="peer sr-only"
                                                />
                                                <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-300 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:bg-[#1447E6] peer-checked:after:translate-x-full"></span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Academic Year and Semester */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-[#1D293D]">Academic Year</label>
                                            <input
                                                type="text"
                                                value={formData.academic_year}
                                                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                placeholder="e.g., 2025-2026"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-[#1D293D]">Semester</label>
                                            <select
                                                value={formData.semester}
                                                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                required
                                            >
                                                <option value="1st">1st Semester</option>
                                                <option value="2nd">2nd Semester</option>
                                                <option value="Summer">Summer</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Registration Message */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#1D293D]">Registration Message</label>
                                        <textarea
                                            value={formData.registration_message}
                                            onChange={(e) => setFormData({ ...formData, registration_message: e.target.value })}
                                            className="h-[200px] w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                            rows="3"
                                            placeholder="Message for students..."
                                        />
                                    </div>

                                    {/* Close Previous Exam Schedules - Only show when registration is being closed */}
                                    {!formData.registration_open && (
                                        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4">
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="delete_previous_schedules"
                                                    checked={formData.delete_previous_schedules}
                                                    onChange={(e) => setFormData({ ...formData, delete_previous_schedules: e.target.checked })}
                                                    className="mt-1 h-4 w-4 rounded border border-orange-300 text-orange-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-300"
                                                />
                                                <div className="flex-1">
                                                    <label htmlFor="delete_previous_schedules" className="text-sm font-semibold text-orange-700">
                                                        Close Previous Schedules
                                                    </label>
                                                    <p className="mt-1 text-xs text-orange-600">Mark all exam schedules as "closed" and archive completed registrations.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Main Content */}
                        <div className="xl:col-span-3 space-y-6">

                            {/* Exam Window Settings - only visible when registration is open (registration_open = 1) */}
                            {formData.registration_open && (
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm animate-up" style={{ animationDelay: '360ms' }}>
                                    <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5 animate-up" style={{ animationDelay: '380ms' }}>
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[#1D293D]">Exam Window Settings</h3>
                                            <p className="text-sm text-slate-500">Set the exam period and daily capacity</p>
                                        </div>
                                    </div>
                                    <div className="px-6 py-6 animate-up" style={{ animationDelay: '400ms' }}>
                                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-semibold text-[#1D293D]">Exam Start Date</label>
                                                <input
                                                    type="date"
                                                    value={formData.exam_start_date}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => setFormData({ ...formData, exam_start_date: e.target.value })}
                                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-semibold text-[#1D293D]">Exam End Date</label>
                                                <input
                                                    type="date"
                                                    value={formData.exam_end_date}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => setFormData({ ...formData, exam_end_date: e.target.value })}
                                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-semibold text-[#1D293D]">Students Per Day</label>
                                                <input
                                                    type="number"
                                                    value={formData.students_per_day}
                                                    onChange={(e) => setFormData({ ...formData, students_per_day: parseInt(e.target.value) })}
                                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                    min="1"
                                                    max="100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Exam Time Settings */}
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm animate-up" style={{ animationDelay: '380ms' }}>
                                <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5 animate-up" style={{ animationDelay: '400ms' }}>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[#1D293D]">Exam Time Settings</h3>
                                        <p className="text-sm text-slate-500">Configure session times and duration</p>
                                    </div>
                                </div>
                                <div className="px-6 py-6 animate-up" style={{ animationDelay: '420ms' }}>
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                        {/* Morning Session */}
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                                            <div className="mb-4 flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1447E6]/15 text-[#1447E6]">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                </div>
                                                <h4 className="text-lg font-semibold text-[#1447E6]">Morning Session</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-semibold text-[#1D293D]">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.morning_start_time}
                                                        onChange={(e) => setFormData({ ...formData, morning_start_time: e.target.value })}
                                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-semibold text-[#1D293D]">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.morning_end_time}
                                                        onChange={(e) => setFormData({ ...formData, morning_end_time: e.target.value })}
                                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Afternoon Session */}
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                                            <div className="mb-4 flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                                    </svg>
                                                </div>
                                                <h4 className="text-lg font-semibold text-orange-600">Afternoon Session</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-semibold text-[#1D293D]">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.afternoon_start_time}
                                                        onChange={(e) => setFormData({ ...formData, afternoon_start_time: e.target.value })}
                                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-300/40"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-semibold text-[#1D293D]">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.afternoon_end_time}
                                                        onChange={(e) => setFormData({ ...formData, afternoon_end_time: e.target.value })}
                                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#1D293D] shadow-sm transition duration-200 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-300/40"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-medium text-slate-600">
                                                <strong className="text-[#1D293D]">Note:</strong> These times will be applied to all selected exam dates. Each session will have a capacity of {Math.floor(formData.students_per_day / 2)} students.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date Selection Interface */}
                    {((formData.exam_start_date && formData.exam_end_date && formData.registration_open) || (settings.exam_start_date && settings.exam_end_date && settings.registration_open)) && !formData.delete_previous_schedules && (
                        <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm animate-up" style={{ animationDelay: '420ms' }}>
                            <div className="flex flex-col gap-6 border-b border-slate-200 px-6 py-5 animate-up lg:flex-row lg:items-center lg:justify-between" style={{ animationDelay: '440ms' }}>
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1447E6]/10 text-[#1447E6]">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[#1D293D]">Select Available Exam Dates</h3>
                                        <p className="text-sm text-slate-500">Choose specific dates within the exam window when students can take exams</p>
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#1447E6]/30 bg-[#1447E6]/10 px-4 py-2 text-sm font-semibold text-[#1447E6]">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formData.selected_exam_dates.length} dates selected
                                </div>
                            </div>

                            {/* Legend for calendar colors */}
                            <div className="px-6 pt-2 animate-up" style={{ animationDelay: '450ms' }}>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    <span className="font-semibold text-slate-600">Legend:</span>
                                    <div className="inline-flex items-center gap-1 rounded-full bg-[#1447E6]/20 px-2 py-1 text-[11px] font-medium text-[#1447E6] border border-[#1447E6]/40">
                                        <span className="h-3 w-3 rounded-full bg-[#1447E6]/40 border border-[#1447E6]/60" />
                                        Existing exam date
                                    </div>
                                    <div className="inline-flex items-center gap-1 rounded-full bg-[#1447E6] px-2 py-1 text-[11px] font-medium text-white">
                                        <span className="h-3 w-3 rounded-full bg-white/20 border border-white/40" />
                                        Newly added date
                                    </div>
                                    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 border border-slate-200">
                                        <span className="h-3 w-3 rounded-full bg-slate-300 border border-slate-400" />
                                        Weekend / not available
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-6 animate-up" style={{ animationDelay: '460ms' }}>
                                {/* Quick Selection Buttons */}
                                <div className="mb-6 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={selectAllDates}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#1447E6] bg-[#1447E6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-[#1240d0]"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={selectWeekdaysOnly}
                                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-500 bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-emerald-600"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Weekdays Only
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearAllDates}
                                        className="inline-flex items-center gap-2 rounded-xl border border-orange-500 bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 shadow-sm transition-colors duration-200 hover:border-orange-600 hover:text-orange-700"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Clear All
                                    </button>
                                </div>

                                {/* Monthly Calendar Grids */}
                                {availableDates.length > 0 ? (
                                    (() => {
                                        // Group dates by month
                                        const datesByMonth = {};
                                        availableDates.forEach(date => {
                                            const dateObj = new Date(date);
                                            const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth()).padStart(2, '0')}`;
                                            if (!datesByMonth[monthKey]) {
                                                datesByMonth[monthKey] = [];
                                            }
                                            datesByMonth[monthKey].push(date);
                                        });

                                        // Sort months chronologically
                                        const sortedMonthKeys = Object.keys(datesByMonth).sort();

                                        return sortedMonthKeys.map(monthKey => {
                                            const monthDates = datesByMonth[monthKey];
                                            const firstDate = new Date(monthDates[0]);
                                            const monthName = firstDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                            
                                            return (
                                                <div key={monthKey} className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                                    <div className="flex items-center justify-between border-b border-slate-200 bg-[#1D293D] px-6 py-4 text-white">
                                                        <div>
                                                            <h4 className="text-lg font-semibold">{monthName}</h4>
                                                            <p className="text-xs font-medium text-white/70">{monthDates.length} available date{monthDates.length !== 1 ? 's' : ''}</p>
                                                        </div>
                                                        <div className="rounded-lg bg-white/10 p-2">
                                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-7">
                                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                                            <div key={day} className="border-b border-slate-200 bg-slate-50 py-2 text-center text-xs font-semibold text-slate-500">
                                                                {day}
                                                            </div>
                                                        ))}

                                                        {(() => {
                                                            const firstDateOfMonth = new Date(monthDates[0]);
                                                            const calendarDays = [];

                                                            for (let i = 0; i < firstDateOfMonth.getDay(); i++) {
                                                                calendarDays.push(
                                                                    <div key={`empty-${monthKey}-${i}`} className="h-12 border-b border-r border-slate-200 bg-slate-50" />
                                                                );
                                                            }

                                                            monthDates.forEach((date) => {
                                                                const dateObj = new Date(date);
                                                                const isSelected = isDateSelected(date);
                                                                const isExisting = isExistingExamDate(date);
                                                                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                                                                if (isWeekend) {
                                                                    calendarDays.push(
                                                                        <div
                                                                            key={date}
                                                                            className="flex h-12 items-center justify-center border-b border-r border-slate-200 bg-slate-100 text-sm font-medium text-slate-400"
                                                                            title="Weekend dates are not available for exams"
                                                                        >
                                                                            {dateObj.getDate()}
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    calendarDays.push(
                                                                        <button
                                                                            key={date}
                                                                            type="button"
                                                                            onClick={() => toggleDateSelection(date)}
                                                                            className={`flex h-12 items-center justify-center border-b border-r border-slate-200 text-sm font-semibold transition-colors ${
                                                                                isSelected
                                                                                    ? (isExisting
                                                                                        ? 'bg-[#1447E6]/20 text-[#1447E6] border-[#1447E6]/40' // Existing schedule date - blue but greyed out
                                                                                        : 'bg-[#1447E6] text-white' // Newly added date - strong blue
                                                                                      )
                                                                                    : 'bg-white text-slate-600 hover:bg-[#1447E6]/10 hover:text-[#1447E6]'
                                                                            }`}
                                                                        >
                                                                            {dateObj.getDate()}
                                                                             {isSelected && (
                                                                                <svg className="ml-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                </svg>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                }
                                                            });

                                                            return calendarDays;
                                                        })()}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-white text-[#1447E6] shadow-sm">
                                            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-lg font-semibold text-[#1D293D]">No Exam Window Set</h4>
                                        <p className="mt-2 text-sm text-slate-600">Set the exam start and end dates above to view and select available exam dates.</p>
                                    </div>
                                )}

                                {/* Selected Dates Summary */}
                                {formData.selected_exam_dates.length > 0 && (
                                    <div className="mt-6 rounded-2xl border border-[#1447E6]/30 bg-[#1447E6]/5 p-4">
                                        <div className="mb-3 flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1447E6]/10 text-[#1447E6]">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h4 className="text-base font-semibold text-[#1D293D]">Selected Dates ({formData.selected_exam_dates.length})</h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.selected_exam_dates
                                                .sort((a, b) => new Date(a) - new Date(b))
                                                .map((date) => (
                                                    <span
                                                        key={date}
                                                        className="inline-flex items-center gap-2 rounded-full border border-[#1447E6]/30 bg-white px-3 py-1 text-xs font-semibold text-[#1447E6] shadow-sm"
                                                    >
                                                        {formatDate(date)}
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleDateSelection(date)}
                                                            className="text-[#1447E6]/70 transition-colors hover:text-[#1447E6]"
                                                        >
                                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </span>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Message when registration is closed */}
                    {!formData.registration_open && (formData.exam_start_date && formData.exam_end_date || settings.exam_start_date && settings.exam_end_date) && (
                        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="space-y-4 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-[#1D293D]">Registration is Currently Closed</h4>
                                    <p className="mt-2 text-sm text-slate-600">The exam registration is currently closed in the database. Previous exam calendars are hidden to avoid confusion.</p>
                                </div>
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                                    Tip: Toggle “Open Registration” above to enable date selection and allow students to register.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Message when "Close Previous Exam Schedules" is checked */}
                    {formData.delete_previous_schedules && (
                        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                            <div className="space-y-4 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-amber-500">
                                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-[#1D293D]">Calendar Hidden - Closing Previous Schedules</h4>
                                    <p className="mt-2 text-sm text-slate-700">The calendar is hidden because “Close Previous Exam Schedules” is enabled. This will close all existing exam schedules.</p>
                                </div>
                                <p className="text-sm font-medium text-amber-700">Uncheck “Close Previous Exam Schedules” to access the date selection calendar.</p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between animate-up" style={{ animationDelay: '480ms' }}>
                        <button
                            type="button"
                            onClick={() => router.visit('/guidance/exam-registration-management')}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-colors duration-200 hover:border-slate-400 hover:text-slate-700"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Registration Management
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 ${
                                isSaving
                                    ? 'cursor-not-allowed border-slate-300 bg-slate-300'
                                    : 'border-[#1447E6] bg-[#1447E6] hover:bg-[#1240d0]'
                            }`}
                        >
                            {isSaving ? (
                                <>
                                    <svg className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save Settings
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

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
                `}
            </style>
        </Layout>
    );
};

export default ExamDateSelection;
