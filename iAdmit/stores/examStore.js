import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../API/client';

// Storage keys for exam state persistence
const TIMER_STORAGE_KEY = 'exam_timer_data';
const EXAM_PROGRESS_KEY = 'exam_progress_data'; // Full exam state for resume

export const useExamStore = create((set, get) => ({
  // Initial State
  currentExam: null,
  questions: [],
  currentQuestionIndex: 0,
  answers: new Map(),
  categories: [], // Track exam categories
  
  isExamStarted: false,
  isExamCompleted: false,
  examStartTime: null,
  timeRemaining: 0,
  timeLimitSeconds: 0,
  penaltiesApplied: 0,
  
  securityViolations: [],
  isAirplaneModeEnabled: false,
  isScreenPinned: false,
  
  examResults: [],
  currentResult: null,
  
  // Actions
  setCurrentExam: (exam) => set({ currentExam: exam }),
  
  setQuestions: (questions) => {
    // Extract unique categories from questions
    const categories = [...new Set(questions.map(q => q.category).filter(Boolean))];
    set({ questions, categories });
  },
  
  setCurrentQuestionIndex: (index) => {
    set({ currentQuestionIndex: index });
    // Auto-save progress when navigating between questions
    get().saveExamProgress();
  },
  
  setAnswer: (questionId, answer) => {
    const { answers } = get();
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, answer);
    set({ answers: newAnswers });
    
    // Auto-save progress after answer change
    get().saveExamProgress();
  },
  
  // Timer persistence functions
  saveTimerToStorage: async () => {
    try {
      const { examStartTime, timeLimitSeconds, penaltiesApplied, isExamStarted } = get();
      if (isExamStarted && examStartTime) {
        const timerData = {
          examStartTime,
          timeLimitSeconds,
          penaltiesApplied,
          isExamStarted,
          lastSaved: Date.now()
        };
        await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerData));
        console.log('[ExamStore] Timer data saved to storage:', timerData);
      }
    } catch (error) {
      console.log('[ExamStore] Error saving timer to storage:', error);
    }
  },

  loadTimerFromStorage: async () => {
    try {
      const timerData = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
      if (timerData) {
        const parsed = JSON.parse(timerData);
        console.log('[ExamStore] Timer data loaded from storage:', parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.log('[ExamStore] Error loading timer from storage:', error);
      return null;
    }
  },

  clearTimerFromStorage: async () => {
    try {
      await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
      console.log('[ExamStore] Timer data cleared from storage');
    } catch (error) {
      console.log('[ExamStore] Error clearing timer from storage:', error);
    }
  },

  // ============================================
  // FULL EXAM PROGRESS PERSISTENCE (for resume)
  // ============================================
  
  /**
   * Save complete exam progress to AsyncStorage
   * Includes: exam info, questions, answers, timer, current position
   */
  saveExamProgress: async () => {
    try {
      const state = get();
      
      console.log('[ExamStore] saveExamProgress called - isExamStarted:', state.isExamStarted, 'hasExam:', !!state.currentExam);
      
      if (!state.isExamStarted || !state.currentExam) {
        console.log('[ExamStore] Not saving - exam not started or no exam loaded');
        return;
      }

      // Convert Map to array for JSON serialization
      const answersArray = Array.from(state.answers.entries());

      const progressData = {
        // Exam identification
        examId: state.currentExam?.examId || state.currentExam?.id,
        examRefNo: state.currentExam?.exam_ref_no || state.currentExam?.refNo,
        examTitle: state.currentExam?.exam_title || state.currentExam?.title,
        examType: state.currentExam?.exam_type || 'regular',
        
        // Questions (store IDs to avoid huge storage, will re-fetch if needed)
        questionCount: state.questions.length,
        questionIds: state.questions.map(q => q.questionId || q.id),
        
        // Progress state
        currentQuestionIndex: state.currentQuestionIndex,
        answers: answersArray,
        answeredCount: state.answers.size,
        
        // Timer state
        examStartTime: state.examStartTime,
        timeLimitSeconds: state.timeLimitSeconds,
        penaltiesApplied: state.penaltiesApplied,
        timeRemaining: state.calculateRemainingTime(),
        
        // Metadata
        isExamStarted: state.isExamStarted,
        isExamCompleted: state.isExamCompleted,
        lastSaved: Date.now(),
        savedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      };

      await AsyncStorage.setItem(EXAM_PROGRESS_KEY, JSON.stringify(progressData));
      console.log('[ExamStore] Exam progress saved:', {
        examId: progressData.examId,
        questionIndex: progressData.currentQuestionIndex,
        answered: progressData.answeredCount,
        timeRemaining: Math.floor(progressData.timeRemaining / 60) + ' min'
      });
    } catch (error) {
      console.error('[ExamStore] Error saving exam progress:', error);
    }
  },

  /**
   * Load saved exam progress from AsyncStorage
   * Returns saved state or null if none exists
   */
  loadExamProgress: async () => {
    try {
      const progressData = await AsyncStorage.getItem(EXAM_PROGRESS_KEY);
      if (!progressData) {
        console.log('[ExamStore] No saved exam progress found');
        return null;
      }

      const parsed = JSON.parse(progressData);
      console.log('[ExamStore] Exam progress loaded from storage:', {
        examId: parsed.examId,
        questionIndex: parsed.currentQuestionIndex,
        answered: parsed.answeredCount,
        timeRemaining: Math.floor(parsed.timeRemaining / 60) + ' min',
        savedDate: parsed.savedDate
      });

      return parsed;
    } catch (error) {
      console.error('[ExamStore] Error loading exam progress:', error);
      return null;
    }
  },

  /**
   * Check if a saved exam session is valid for resuming
   */
  canResumeExam: async (currentExamId, currentExamRefNo = null) => {
    const savedProgress = await get().loadExamProgress();
    if (!savedProgress) return { canResume: false };

    // Check if it's the same exam (compare as strings to handle type differences)
    const savedId = String(savedProgress.examId);
    const currentId = String(currentExamId);
    const savedRef = savedProgress.examRefNo || null;
    const currentRef = currentExamRefNo || null;
    
    console.log('[ExamStore] Resume check - Saved ID:', savedId, 'Current ID:', currentId, 'Saved Ref:', savedRef, 'Current Ref:', currentRef);
    
    if (savedId !== 'undefined' && currentId !== 'undefined') {
      if (savedId !== currentId) {
        // Allow fallback to ref comparison if IDs differ or are unstable
        if (!savedRef || !currentRef || savedRef !== currentRef) {
          console.log('[ExamStore] Cannot resume - different exam (ID/ref mismatch)');
          return { canResume: false, reason: 'different_exam' };
        }
      }
    } else {
      // If IDs are missing, rely on refNo comparison
      if (!savedRef || !currentRef || savedRef !== currentRef) {
        console.log('[ExamStore] Cannot resume - missing IDs and ref mismatch');
        return { canResume: false, reason: 'different_exam' };
      }
    }

    // Check if already completed
    if (savedProgress.isExamCompleted) {
      console.log('[ExamStore] Cannot resume - exam already completed');
      return { canResume: false, reason: 'already_completed' };
    }

    // Check if time expired
    if (savedProgress.timeRemaining <= 0) {
      console.log('[ExamStore] Cannot resume - time expired');
      return { canResume: false, reason: 'time_expired' };
    }

    // Check if saved date is today
    const today = new Date().toISOString().split('T')[0];
    if (savedProgress.savedDate !== today) {
      console.log('[ExamStore] Cannot resume - saved on different day');
      return { canResume: false, reason: 'different_day', savedDate: savedProgress.savedDate };
    }

    console.log('[ExamStore] Exam can be resumed');
    return {
      canResume: true,
      progress: savedProgress
    };
  },

  /**
   * Restore exam state from saved progress
   */
  restoreExamProgress: async (savedProgress, questions) => {
    try {
      // Restore answers (convert array back to Map)
      const answersMap = new Map(savedProgress.answers);

      // Restore full state
      set({
        currentQuestionIndex: savedProgress.currentQuestionIndex,
        answers: answersMap,
        examStartTime: savedProgress.examStartTime,
        timeLimitSeconds: savedProgress.timeLimitSeconds,
        penaltiesApplied: savedProgress.penaltiesApplied,
        isExamStarted: true,
        isExamCompleted: false,
        questions: questions // Use provided questions array
      });

      // Recalculate current time remaining
      const remainingTime = get().calculateRemainingTime();
      set({ timeRemaining: remainingTime });

      console.log('[ExamStore] Exam state restored:', {
        questionIndex: savedProgress.currentQuestionIndex,
        answersRestored: answersMap.size,
        timeRemaining: Math.floor(remainingTime / 60) + ' min'
      });

      return true;
    } catch (error) {
      console.error('[ExamStore] Error restoring exam progress:', error);
      return false;
    }
  },

  /**
   * Clear saved exam progress from storage
   */
  clearExamProgress: async () => {
    try {
      await AsyncStorage.removeItem(EXAM_PROGRESS_KEY);
      console.log('[ExamStore] Exam progress cleared from storage');
    } catch (error) {
      console.error('[ExamStore] Error clearing exam progress:', error);
    }
  },

  calculateRemainingTime: () => {
    const { examStartTime, timeLimitSeconds, penaltiesApplied } = get();
    if (!examStartTime || !timeLimitSeconds) {
      console.log('[ExamStore] Missing timer data:', { examStartTime, timeLimitSeconds });
      return 0;
    }
    
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - examStartTime) / 1000);
    const penaltySeconds = penaltiesApplied * 300; // 5 minutes per penalty
    const remainingTime = Math.max(0, timeLimitSeconds - elapsedSeconds - penaltySeconds);
    
    // Failsafe: if calculation seems wrong, log detailed info
    if (remainingTime > timeLimitSeconds || elapsedSeconds < 0) {
      console.warn('[ExamStore] Timer calculation anomaly detected:', {
        currentTime,
        examStartTime,
        elapsedSeconds,
        timeLimitSeconds,
        penaltiesApplied,
        penaltySeconds,
        remainingTime,
        timeDiff: currentTime - examStartTime
      });
    }
    
    return remainingTime;
  },

  updateTimeRemaining: () => {
    const remainingTime = get().calculateRemainingTime();
    set({ timeRemaining: remainingTime });
    return remainingTime;
  },

  restoreTimerFromServerProgress: (remainingSeconds, timeLimitSeconds) => {
    if (typeof remainingSeconds !== 'number' || remainingSeconds <= 0) return;
    
    const now = Date.now();
    const elapsedSeconds = timeLimitSeconds - remainingSeconds;
    const newExamStartTime = now - (elapsedSeconds * 1000);
    
    set({
      examStartTime: newExamStartTime,
      timeLimitSeconds: timeLimitSeconds,
      timeRemaining: remainingSeconds
    });
    
    console.log('[ExamStore] Timer restored from server progress:', { 
      remainingSeconds, 
      timeLimitSeconds, 
      elapsedSeconds,
      newExamStartTime: new Date(newExamStartTime).toLocaleTimeString()
    });
  },

  startExam: async (timeLimitMinutes, examId = null, examType = 'regular', phase = 'academic') => {
    const timeLimitSeconds = timeLimitMinutes * 60;
    const examStartTime = Date.now();

    // Determine the correct starting index:
    // - If a resume progress exists (answers present), jump to first unanswered
    // - If all are answered, stay at last question
    // - Otherwise default to 0
    const { questions, answers, currentQuestionIndex } = get();
    let targetIndex = typeof currentQuestionIndex === 'number' ? currentQuestionIndex : 0;
    if (Array.isArray(questions) && questions.length > 0 && answers instanceof Map && answers.size > 0) {
      const firstUnanswered = questions.findIndex(q => !answers.has(q.questionId));
      if (firstUnanswered >= 0) {
        targetIndex = firstUnanswered;
      } else {
        // All answered, go to last
        targetIndex = questions.length - 1;
      }
    }

    // Preserve existing timeRemaining if it was restored from server progress
    const currentState = get();
    const preservedTimeRemaining = (currentState.timeRemaining && currentState.timeRemaining < timeLimitSeconds) 
      ? currentState.timeRemaining 
      : timeLimitSeconds;

    console.log('[ExamStore] startExam timer preservation:', {
      currentTimeRemaining: currentState.timeRemaining,
      timeLimitSeconds,
      preservedTimeRemaining,
      preservedMinutes: Math.floor(preservedTimeRemaining / 60)
    });

    set({ 
      isExamStarted: true, 
      examStartTime,
      timeLimitSeconds,
      timeRemaining: preservedTimeRemaining,
      currentQuestionIndex: targetIndex 
    });

    // Save to storage immediately
    await get().saveTimerToStorage();
    console.log('[ExamStore] Exam started with timer:', { examStartTime, timeLimitSeconds, phase });

    // Call API to mark exam as started for monitoring
    if (examId) {
      try {
        console.log('[ExamStore] Notifying server that exam has started:', { examId, examType, phase });
        const response = await client.post('/mobile/exam/exam-started', {
          examId: examId,
          examType: examType,
          phase: phase  // 'personality' or 'academic'
        });

        if (response.data.success) {
          console.log('[ExamStore] Exam start successfully marked on server:', response.data.data);
        } else {
          console.log('[ExamStore] Failed to mark exam start on server:', response.data.message);
        }
      } catch (error) {
        console.log('[ExamStore] Error marking exam start on server:', error.message);
        // Don't fail the exam start if the API call fails
      }
    }
  },

  restoreExamTimer: async () => {
    try {
      const timerData = await get().loadTimerFromStorage();
      if (timerData && timerData.isExamStarted) {
        set({
          examStartTime: timerData.examStartTime,
          timeLimitSeconds: timerData.timeLimitSeconds,
          penaltiesApplied: timerData.penaltiesApplied,
          isExamStarted: timerData.isExamStarted
        });
        
        // Calculate current remaining time
        const remainingTime = get().calculateRemainingTime();
        set({ timeRemaining: remainingTime });
        
        console.log('[ExamStore] Exam timer restored:', { 
          ...timerData, 
          calculatedRemainingTime: remainingTime 
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.log('[ExamStore] Error restoring exam timer:', error);
      return false;
    }
  },
  
  completeExam: () => set({ isExamCompleted: true }),
  
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  
  addPenalty: async () => {
    const { penaltiesApplied } = get();
    set({ penaltiesApplied: penaltiesApplied + 1 });
    
    // Update remaining time based on new penalty
    const remainingTime = get().calculateRemainingTime();
    set({ timeRemaining: remainingTime });
    
    // Save updated timer data
    await get().saveTimerToStorage();
    console.log('[ExamStore] Penalty added, remaining time updated:', remainingTime);
  },

  // Deduct an arbitrary number of seconds (e.g., 1200 for 20 minutes)
  addPenaltySeconds: async (seconds) => {
    if (!seconds || seconds <= 0) return;
    const { penaltiesApplied } = get();
    // Convert seconds to 5-minute penalty units (300s). Allow fractional units.
    const units = seconds / 300;
    set({ penaltiesApplied: penaltiesApplied + units });

    const remainingTime = get().calculateRemainingTime();
    set({ timeRemaining: remainingTime });

    await get().saveTimerToStorage();
    console.log('[ExamStore] Custom penalty applied (seconds):', seconds, 'remaining:', remainingTime);
  },
  
  addSecurityViolation: (violation) => {
    const { securityViolations } = get();
    set({ securityViolations: [...securityViolations, violation] });
  },
  
  setAirplaneModeStatus: (enabled) => set({ isAirplaneModeEnabled: enabled }),
  
  setScreenPinnedStatus: (pinned) => set({ isScreenPinned: pinned }),
  
  // Pause exam without clearing timers or progress (used on unpin/crash)
  pauseExam: async () => {
    const state = get();
    if (!state.isExamStarted) return;
    // Persist state BEFORE flipping isExamStarted so saveExamProgress() runs
    await get().saveTimerToStorage();
    await get().saveExamProgress();
    set({ isExamStarted: false });
    console.log('[ExamStore] Exam paused (state persisted, isExamStarted=false)');
  },
  
  setExamResults: (results) => set({ examResults: results }),
  
  setCurrentResult: (result) => set({ currentResult: result }),
  
  resetExam: async () => {
    // Clear timer and progress from storage
    await get().clearTimerFromStorage();
    await get().clearExamProgress();
    
    set({
      currentExam: null,
      questions: [],
      currentQuestionIndex: 0,
      answers: new Map(),
      categories: [],
      isExamStarted: false,
      isExamCompleted: false,
      examStartTime: null,
      timeRemaining: 0,
      timeLimitSeconds: 0,
      penaltiesApplied: 0,
      securityViolations: [],
      isAirplaneModeEnabled: false,
      isScreenPinned: false,
      currentResult: null
    });
    
    console.log('[ExamStore] Exam reset, timer and progress cleared');
  },
  
  getProgress: () => {
    const { answers, questions } = get();
    return questions.length > 0 ? (answers.size / questions.length) * 100 : 0;
  },
  
  getAnsweredCount: () => {
    const { answers } = get();
    return answers.size;
  },
  
  getUnansweredCount: () => {
    const { questions, answers } = get();
    return questions.length - answers.size;
  },

  getCategoryBreakdown: () => {
    const { questions, answers } = get();
    const categoryStats = {};
    
    questions.forEach(question => {
      const category = question.category || 'Other';
      if (!categoryStats[category]) {
        categoryStats[category] = {
          total: 0,
          answered: 0,
          unanswered: 0
        };
      }
      categoryStats[category].total++;
      if (answers.has(question.questionId)) {
        categoryStats[category].answered++;
      } else {
        categoryStats[category].unanswered++;
      }
    });
    
    return categoryStats;
  }
}));
