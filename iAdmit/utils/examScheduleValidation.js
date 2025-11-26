/**

* Exam Schedule Validation Utilities
 * Provides functions to validate exam access based on assigned schedule dates
 */

/**
 * Check if a student can take an exam based on their assigned exam date and time
 * @param {Object} examSchedule - The exam schedule object from examinee data
 * @param {string} examSchedule.assigned_exam_date - The assigned exam date (ISO string)
 * @param {string} examSchedule.assigned_session - The assigned session (morning/afternoon)
 * @param {string} examSchedule.status - The registration status
 * @param {Object} detailedSchedule - Detailed schedule info with start/end times
 * @param {string} examType - The type of exam ('regular', 'departmental', etc.)
 * @param {boolean} forceAllowToday - If true, bypass time restrictions for today
 * @returns {Object} - Validation result with isValid boolean and message
 */
export const validateExamAccess = (examSchedule, examType = 'regular', detailedSchedule = null, forceAllowToday = false) => {
  // Date restrictions only apply to regular (guidance) exams
  // Departmental exams can be taken anytime regardless of assigned schedule
  if (examType === 'departmental') {
    return {
      isValid: true,
      message: null,
      reason: 'Departmental exams are not subject to schedule restrictions'
    };
  }

  // If no exam schedule is assigned, allow access (for backward compatibility)
  if (!examSchedule || !examSchedule.assigned_exam_date) {
    return {
      isValid: true,
      message: null
    };
  }

  const examDate = new Date(examSchedule.assigned_exam_date);
  const now = new Date();
  
  // Set time to start of day for date comparison
  const examDateOnly = new Date(examDate);
  examDateOnly.setHours(0, 0, 0, 0);
  const todayOnly = new Date(now);
  todayOnly.setHours(0, 0, 0, 0);
  
  // Check if today is before the assigned exam date
  if (todayOnly < examDateOnly) {
    const examDateStr = examDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let sessionInfo = '';
    if (detailedSchedule) {
      const sessionStr = detailedSchedule.session_display || examSchedule.assigned_session;
      const timeStr = detailedSchedule.start_time_formatted + ' - ' + detailedSchedule.end_time_formatted;
      sessionInfo = ` (${sessionStr} Session: ${timeStr})`;
    }
    
    return {
      isValid: false,
      message: `Your exam is scheduled for ${examDateStr}${sessionInfo}. You cannot take the exam before your assigned date.`,
      examDate: examDateStr
    };
  }

  // Check if today is after the assigned exam date
  if (todayOnly > examDateOnly) {
    const examDateStr = examDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let sessionInfo = '';
    if (detailedSchedule) {
      const sessionStr = detailedSchedule.session_display || examSchedule.assigned_session;
      const timeStr = detailedSchedule.start_time_formatted + ' - ' + detailedSchedule.end_time_formatted;
      sessionInfo = ` (${sessionStr} Session: ${timeStr})`;
    }
    
    return {
      isValid: false,
      message: `Your exam was scheduled for ${examDateStr}${sessionInfo}. The exam period has passed.`,
      examDate: examDateStr
    };
  }

  // If we have detailed schedule info, check time restrictions
  // BUT skip if forceAllowToday is enabled (guidance override)
  if (detailedSchedule && detailedSchedule.start_time && detailedSchedule.end_time && !forceAllowToday) {
    const startTime = new Date(examDate);
    const endTime = new Date(examDate);
    
    // Parse start and end times
    const [startHour, startMin] = detailedSchedule.start_time.split(':');
    const [endHour, endMin] = detailedSchedule.end_time.split(':');
    
    startTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
    endTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
    
    // Check if current time is before exam start time
    if (now < startTime) {
      return {
        isValid: false,
        message: `Your exam session starts at ${detailedSchedule.start_time_formatted}. Please wait until the scheduled time.`,
        examDate: examDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };
    }
    
    // Check if current time is after exam end time
    if (now > endTime) {
      return {
        isValid: false,
        message: `Your exam session ended at ${detailedSchedule.end_time_formatted}. The exam period has passed.`,
        examDate: examDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };
    }
  }

  // Check if the registration status allows exam access
  if (examSchedule.status === 'cancelled') {
    return {
      isValid: false,
      message: 'Your exam registration has been cancelled. Please contact the administrator.',
      examDate: null
    };
  }

  // All checks passed
  return {
    isValid: true,
    message: null
  };
};

/**
 * Get a formatted exam date string
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
export const formatExamDate = (dateString) => {
  if (!dateString) return 'Not assigned';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Check if exam date is today
 * @param {string} dateString - ISO date string
 * @returns {boolean} - True if exam date is today
 */
export const isExamToday = (dateString) => {
  if (!dateString) return false;
  
  const examDate = new Date(dateString);
  const today = new Date();
  
  examDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return examDate.getTime() === today.getTime();
};

/**
 * Get days until exam
 * @param {string} dateString - ISO date string
 * @returns {number} - Number of days until exam (negative if past)
 */
export const getDaysUntilExam = (dateString) => {
  if (!dateString) return null;
  
  const examDate = new Date(dateString);
  const today = new Date();
  
  examDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = examDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};
