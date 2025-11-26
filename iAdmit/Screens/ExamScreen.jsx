import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  BackHandler,
  AppState,
  Image,
  ActivityIndicator,  
  SafeAreaView,
  Platform,
  Animated,
  DeviceEventEmitter
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useExamStore } from '../stores/examStore';
import { getAcademicExamQuestions, getExamQuestions, submitExamAnswers, upsertExamProgress, fetchExamProgress, clearExamProgress } from '../API/exam';
import ExamSecurityModal from '../components/ExamSecurityModal';
import KeepAwakeWrapper from '../utils/KeepAwakeWrapper';
import { formatBase64Image } from '../utils/imageUtils';
import ImageModal from '../components/ImageModal';
// @ts-ignore
import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyExamStopped } from '../API/exam';
import ScreenPinning, { subscribeSystemOverlayAction } from '../utils/ScreenPinning';
import OfflineIndicator from '../components/OfflineIndicator';
import offlineManager from '../utils/OfflineManager';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 350;
const isMediumScreen = width >= 350 && width < 400;
const isShortScreen = height < 700;

// Deterministic per-examinee shuffling helpers
const makeSeedFromString = (str) => {
  let h = 2166136261 >>> 0; // FNV-1a base
  for (let i = 0; i < (str || '').length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const seededRand = (state) => {
  // xorshift32
  let x = state.value || 123456789;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.value = x >>> 0;
  // 0..1
  return (state.value % 1000000) / 1000000;
};

const seededShuffle = (array, seedStr) => {
  const arr = array.slice();
  const state = { value: makeSeedFromString(seedStr || '') };
  for (let i = arr.length - 1; i > 0; i--) {
    const r = seededRand(state);
    const j = Math.floor(r * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
};

const canonicalCategory = (q) => {
  const raw = (q?.category || q?.subject || q?.Category || q?.Subject || '').toString().toLowerCase();
  if (raw.includes('english')) return 'English';
  if (raw.includes('filipino') || raw.includes('tagalog')) return 'Filipino';
  if (raw.includes('math') || raw.includes('mathematics')) return 'Math';
  if (raw.includes('science')) return 'Science';
  if (raw.includes('abstract') || raw.includes('reasoning')) return 'Abstract';
  return 'Other';
};

const randomizeQuestionsByCategory = (questions, seedStr) => {
  if (!Array.isArray(questions) || questions.length === 0) return questions;
  const desiredOrder = ['English', 'Filipino', 'Math', 'Science', 'Abstract'];
  const buckets = new Map();
  for (const q of questions) {
    const key = canonicalCategory(q);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(q);
  }
  // Shuffle inside each bucket with a deterministic derived seed
  const shuffledBuckets = new Map();
  for (const [key, list] of buckets.entries()) {
    shuffledBuckets.set(key, seededShuffle(list, `${seedStr}::${key}`));
  }
  // Build final array in desired category order; append any others at the end in stable name order
  const result = [];
  for (const name of desiredOrder) {
    if (shuffledBuckets.has(name)) result.push(...shuffledBuckets.get(name));
  }
  const remainingNames = Array.from(shuffledBuckets.keys()).filter(n => !desiredOrder.includes(n)).sort();
  for (const name of remainingNames) {
    result.push(...shuffledBuckets.get(name));
  }
  return result;
};

// Per-attempt seed: generate a new seed for each fresh exam start, persist during that attempt
const getOrGenerateExamSeed = async (examRefNo, examId, restoringTimer) => {
  const key = `exam_seed_${examRefNo || ''}_${examId || ''}`;
  try {
    if (restoringTimer) {
      const existing = await AsyncStorage.getItem(key);
      if (existing) return existing;
    }
    // fresh attempt → generate a new seed and store it
    const seed = `${examRefNo || ''}:${examId || ''}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(key, seed);
    return seed;
  } catch {
    // fallback to refNo so we never crash
    return `${examRefNo || ''}:${examId || ''}`;
  }
};

// Clear seed after submission/cancel to force new order next time
const clearExamSeed = async (examRefNo, examId) => {
  const key = `exam_seed_${examRefNo || ''}_${examId || ''}`;
  try { await AsyncStorage.removeItem(key); } catch {}
};


// Optimized Image Component with Loading State - Production Ready
const OptimizedImage = React.memo(({ source, style, ...props }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Handle base64 images properly - memoized to prevent re-processing
  const imageSource = useMemo(() => {
    if (!source) return null;
    
    if (typeof source === 'string') {
      const formattedUri = formatBase64Image(source);
      return { uri: formattedUri };
    }
    
    if (source.uri) {
      const formattedUri = formatBase64Image(source.uri);
      return { ...source, uri: formattedUri };
    }
    
    return source;
  }, [source]);

  const handleImageError = useCallback((error) => {
    if (__DEV__) {
      console.log('[OptimizedImage] Image load error:', error.nativeEvent.error);
    }
    setImageLoading(false);
    setImageError(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);

  // If no source, don't render anything
  if (!source) return null;

  // If error, show fallback
  if (imageError) {
    return (
      <View style={[style, { backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center' }]}>
        <Icon name="broken-image" size={24} color="#6b7280" />
        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>Image failed to load</Text>
      </View>
    );
  }

  return (
    <View style={style}>
      {imageLoading && (
        <View style={[style, { position: 'absolute', backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', zIndex: 1 }]}>
          <ActivityIndicator size="small" color="#a855f7" />
        </View>
      )}
      <Image
        source={imageSource}
        style={style}
        resizeMode="cover"
        onLoad={handleImageLoad}
        onError={handleImageError}
        {...props}
      />
    </View>
  );
});

// Optimized Option Button Component with Image Loading
const OptionButton = React.memo(({ 
  option, 
  optionText, 
  isSelected, 
  hasImage, 
  optionImage, 
  onPress, 
  onImagePress 
}) => {
  const [imageLoading, setImageLoading] = useState(hasImage);
  
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const handleImagePress = useCallback(() => {
    onImagePress();
  }, [onImagePress]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback((error) => {
    if (__DEV__) {
      console.log('[OptionButton] Option image error:', error.nativeEvent.error);
    }
    setImageLoading(false);
  }, []);

  // Memoize the formatted image URI
  const optionImageUri = useMemo(() => {
    return hasImage && optionImage ? formatBase64Image(optionImage) : null;
  }, [hasImage, optionImage]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.optionButton}
      activeOpacity={0.1}
      delayPressIn={0}
      delayPressOut={0}
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      pressRetentionOffset={{ top: 25, bottom: 25, left: 25, right: 25 }}
      underlayColor="transparent"
    >
      <LinearGradient
        colors={
          isSelected 
            ? ['rgba(168, 85, 247, 0.2)', 'rgba(124, 58, 237, 0.1)']
            : ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']
        }
        style={[
          styles.optionGradient,
          isSelected && styles.selectedOptionGradient
        ]}
      >
        <View style={styles.optionContent}>
          <View style={[
            styles.optionCircle,
            isSelected && styles.selectedOptionCircle
          ]}>
            <Text style={[
              styles.optionLetter,
              isSelected && styles.selectedOptionLetter
            ]}>
              {option}
            </Text>
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={[
              styles.optionText,
              isSelected && styles.selectedOptionText
            ]}>
              {optionText || `Option ${option}`}
            </Text>
          </View>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Icon name="check-circle" size={20} color="#a855f7" />
            </View>
          )}
        </View>
        {hasImage && optionImageUri && (
          <View style={styles.optionImageContainer}>
            <TouchableOpacity
              onPress={handleImagePress}
              style={styles.optionImageWrapper}
              activeOpacity={0.8}
            >
              {imageLoading && (
                <View style={[styles.optionImage, { position: 'absolute', backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', zIndex: 1 }]}>
                  <ActivityIndicator size="small" color="#a855f7" />
                </View>
              )}
              <Image
                source={{ uri: optionImageUri }}
                style={styles.optionImage}
                resizeMode="cover"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              <View style={styles.optionImageOverlay}>
                <Icon name="zoom-in" size={20} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison for memo - reduce unnecessary re-renders
  return prevProps.option === nextProps.option &&
         prevProps.optionText === nextProps.optionText &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.hasImage === nextProps.hasImage &&
         prevProps.optionImage === nextProps.optionImage;
});

export default function ExamScreen({ navigation, route }) {
  const { examId, examRefNo, timeLimit, examType = 'regular', examTitle, personalityAnswers, autoStart } = route.params || {};
  
  // Log navigation details for debugging
  useEffect(() => {
    console.log('[ExamScreen] Component mounted with route params:', {
      examId,
      examRefNo,
      timeLimit,
      examType,
      examTitle,
      hasPersonalityAnswers: !!personalityAnswers,
      autoStart,
      hasParams: !!route.params
    });
    
    // Validate critical params immediately
    if (!examId || !examRefNo) {
      console.error('[ExamScreen] CRITICAL: Missing required params on mount:', {
        hasExamId: !!examId,
        hasExamRefNo: !!examRefNo,
        hasRouteParams: !!route.params,
        allParams: route.params
      });
    }
  }, []);
  
  // Function to open image modal
  const openImageModal = useCallback((imageUri, title = 'Image Preview') => {
    setSelectedImageUri(imageUri);
    setSelectedImageTitle(title);
    setImageModalVisible(true);
  }, []);

  // Function to close image modal
  const closeImageModal = useCallback(() => {
    setImageModalVisible(false);
    setSelectedImageUri(null);
    setSelectedImageTitle('');
  }, []);

  // Helper function to get exam questions from server (online only)
  const getExamQuestionsByType = async (examId, examType) => {
    console.log('[ExamScreen] Fetching questions for exam type:', examType);
    
    // Always fetch from server
    console.log('[ExamScreen] Fetching from server');
    setIsOfflineMode(false);
    
    if (examType === 'departmental') {
      return await getExamQuestions(examId, 'departmental');
    } else {
      // For regular exams, try academic questions first, fallback to regular questions
      try {
        return await getAcademicExamQuestions(examId);
      } catch (error) {
        console.log('[ExamScreen] Academic questions failed, trying regular questions:', error.message);
        return await getExamQuestions(examId, 'regular');
      }
    }
  };
  
  const {
    currentExam,
    questions,
    currentQuestionIndex,
    answers,
    categories,
    isExamStarted,
    examStartTime,
    timeRemaining,
    timeLimitSeconds,
    penaltiesApplied,
    securityViolations,
    setCurrentExam,
    setQuestions,
    setCurrentQuestionIndex,
    setAnswer,
    startExam,
    addPenalty,
    addSecurityViolation,
    resetExam,
    restoreExamTimer,
    updateTimeRemaining,
    saveTimerToStorage,
    calculateRemainingTime,
    getCategoryBreakdown,
    setTimeRemaining,
    restoreTimerFromServerProgress,
    // Resume functionality
    clearExamProgress,
    saveExamProgress,
    pauseExam
  } = useExamStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityViolation, setSecurityViolation] = useState(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [immediateSelection, setImmediateSelection] = useState({}); // For instant visual feedback
  const [examAlreadySubmitted, setExamAlreadySubmitted] = useState(false); // Track if exam was submitted from review
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(false); // Footer collapse state
  const [questionTimings, setQuestionTimings] = useState({}); // Track timing for each question
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [selectedImageTitle, setSelectedImageTitle] = useState('');
  // Offline-related state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineProgress, setOfflineProgress] = useState(null);
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  // Removed imageLoadingStates to prevent performance issues
  
  const timerRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const ANSWERS_STORAGE_KEY = useRef(null);
  const systemOverlaySubRef = useRef(null);
  const pinCheckIntervalRef = useRef(null); // For periodic pin state checking
  const FOOTER_STATE_KEY = useRef(null); // For footer state persistence
  const persistTimeoutRef = useRef(null); // For debounced persistence
  const autoAdvanceTimeoutRef = useRef(null); // For auto-advance timeout
  const lastTimerTick = useRef(0); // For timer performance optimization
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current; // For bounce effect
  // Keep a synchronous snapshot of the latest questions to compute indices before state settles
  const latestQuestionsRef = useRef([]);

  // Track question timing when current question changes
  useEffect(() => {
    if (currentQuestionIndex >= 0 && questions && questions[currentQuestionIndex]) {
      const questionId = questions[currentQuestionIndex].questionId;
      const currentTime = new Date().toISOString();
      
      // Reset scale animation for new question
      scaleAnim.setValue(1);
      
      setQuestionTimings(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          question_start_time: prev[questionId]?.question_start_time || currentTime
        }
      }));
    }
  }, [currentQuestionIndex, questions, scaleAnim]);

  // Initialize exam and restore timer
  useEffect(() => {
    // Block screenshots/screen recording while on this screen (Android)
    try { Platform.OS === 'android' && ScreenPinning.enableSecureFlag(); } catch {}
    initializeExam();
    // Persist that we're on ExamScreen as soon as it mounts with current params
    AsyncStorage.setItem('last_route', JSON.stringify({
      name: 'ExamScreen',
      params: { examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers }
    })).catch(() => {});
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
      KeepAwakeWrapper.deactivate();
      if (systemOverlaySubRef.current) {
        systemOverlaySubRef.current.remove();
        systemOverlaySubRef.current = null;
      }
      if (pinCheckIntervalRef.current) {
        clearInterval(pinCheckIntervalRef.current);
        pinCheckIntervalRef.current = null;
      }
      // Stop screen pinning on component unmount
      const stopScreenPinning = async () => {
        try {
          await ScreenPinning.stop();
          console.log('[ExamScreen] Screen pinning stopped on component unmount');
        } catch (error) {
          console.log('[ExamScreen] Error stopping screen pinning on unmount:', error);
        }
        try { Platform.OS === 'android' && await ScreenPinning.disableSecureFlag(); } catch {}
        // Notify backend as a safety net when leaving screen
        try { await notifyExamStopped(examId); } catch {}
      };
      stopScreenPinning();
    };
  }, []);

  // Periodic exam progress save (every 30 seconds)
  useEffect(() => {
    if (!isExamStarted || submitting || examAlreadySubmitted) return;

    const saveInterval = setInterval(() => {
      saveExamProgress();
      console.log('[ExamScreen] Auto-saved exam progress');
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [isExamStarted, submitting, examAlreadySubmitted, saveExamProgress]);

  // Monitor network status for submission queue
  useEffect(() => {
    const unsubscribe = offlineManager.addNetworkListener((online, wasOffline) => {
      setIsOnline(online);
      
      if (wasOffline && online) {
        // Coming back online - process submission queue
        console.log('[ExamScreen] Network restored, processing submission queue');
        offlineManager.processSubmissionQueue();
      }
    });

    return unsubscribe;
  }, []);

  // Save progress to offline cache
  // Offline progress saving removed - exams are now online only

  // Handle back button - prevent navigation during exam
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', async () => {
      if (isExamStarted && !submitting) {
        // Show strict warning about exam security
        Alert.alert(
          'Exam in Progress',
          'You cannot exit the exam while it is in progress. The screen is pinned for security. Complete the exam to proceed.',
          [
            { text: 'Continue Exam', style: 'default' }
          ]
        );
        try { const pinned = await ScreenPinning.isPinned(); if (!pinned) { await notifyExamStopped(examId); } } catch {}
        return true; // Prevent default back behavior
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isExamStarted, submitting]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - restore timer and check for violations
        if (isExamStarted) {
          console.log('[ExamScreen] App came to foreground, updating timer');
          updateTimeRemaining();
          handleSecurityViolation('background', 'App was backgrounded during exam');
        }
      } else if (nextAppState.match(/inactive|background/) && isExamStarted) {
        // App going to background - save timer state
        console.log('[ExamScreen] App going to background, saving timer');
        saveTimerToStorage();
        // Persist route for resume
        AsyncStorage.setItem('last_route', JSON.stringify({
          name: 'ExamScreen',
          params: { examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers }
        })).catch(() => {});
        // Proactively notify backend if pinning is not active anymore
        (async () => {
          try {
            const pinned = await ScreenPinning.isPinned();
            if (!pinned) {
              await notifyExamStopped(examId);
            }
          } catch {}
        })();
      }
      appState.current = nextAppState;
    });

    return () => subscription?.remove();
  }, [isExamStarted]);

  // Real-time timer effect - updates every second when exam is running
  useEffect(() => {
    if (isExamStarted && !examAlreadySubmitted) {
      console.log('[ExamScreen] Starting real-time timer');
      KeepAwakeWrapper.activate();
      
      // Start screen pinning with proper error handling (only if exam not already submitted)
      const startScreenPinning = async () => {
        try {
          // Check global submission flag before starting screen pinning
          const globalSubmissionFlag = await AsyncStorage.getItem('exam_submission_complete');
          if (globalSubmissionFlag === 'true') {
            console.log('[ExamScreen] Global submission flag detected, not starting screen pinning');
            return;
          }
          
          await ScreenPinning.start();
          console.log('[ExamScreen] Screen pinning started successfully');
        } catch (error) {
          console.log('[ExamScreen] Screen pinning start failed:', error);
        }
      };
      startScreenPinning();
      
      // Immediately update time
      updateTimeRemaining();
      
      // Set up interval to update every second with performance optimizations
      timerRef.current = setInterval(() => {
        const now = Date.now();
        
        // Throttle timer operations to prevent excessive processing
        if (now - lastTimerTick.current < 900) return; // Skip if less than 900ms since last tick
        lastTimerTick.current = now;
        
        const remainingTime = updateTimeRemaining();
        
        // Check if time is up (critical operation - keep first)
        if (remainingTime <= 0) {
          handleTimeUp().catch((error) => {
            if (__DEV__) {
              console.log('[ExamScreen] Error in handleTimeUp:', error);
            }
          });
          return;
        }
        
        // All operations below are throttled to reduce UI blocking
        
        // Mark last active timestamp every 10 seconds (reduced from 5)
        if (remainingTime % 10 === 0) {
          AsyncStorage.setItem('last_active_ts', String(now)).catch(() => {});
        }
        
        // Save timer state every 60 seconds (reduced from 30 for better performance)
        if (remainingTime % 60 === 0) {
          saveTimerToStorage();
        }
        
        // Try to dismiss system overlays every 30 seconds (reduced frequency)
        if (remainingTime % 30 === 0 && !submitting) {
          try {
            ScreenPinning.dismissSystemOverlay();
          } catch {
            // Silently ignore errors
          }
        }
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Stop screen pinning with proper error handling
        const stopScreenPinning = async () => {
          try {
            await ScreenPinning.stop();
            console.log('[ExamScreen] Screen pinning stopped successfully');
          } catch (error) {
            console.log('[ExamScreen] Screen pinning stop failed:', error);
          }
        };
        stopScreenPinning();
      };
    } else {
      // Stop timer if exam is not started or already submitted
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      KeepAwakeWrapper.deactivate();
      // Stop screen pinning when exam is not started or already submitted
      const stopScreenPinning = async () => {
        try {
          await ScreenPinning.stop();
          console.log('[ExamScreen] Screen pinning stopped (exam not started or already submitted)');
        } catch (error) {
          console.log('[ExamScreen] Screen pinning stop failed:', error);
        }
      };
      stopScreenPinning();
    }
  }, [isExamStarted, submitting, examAlreadySubmitted]);

  // Simple and reliable pin state monitoring
  useEffect(() => {
    if (!isExamStarted || submitting || examAlreadySubmitted) {
      // Clean up if exam is not active
      if (pinCheckIntervalRef.current) {
        clearInterval(pinCheckIntervalRef.current);
        pinCheckIntervalRef.current = null;
      }
      return;
    }
    
    // Clean up existing interval
    if (pinCheckIntervalRef.current) {
      clearInterval(pinCheckIntervalRef.current);
      pinCheckIntervalRef.current = null;
    }
    
    console.log('[ExamScreen] Starting simple pin monitoring for exam:', examId);
    
    // Simple periodic check - every 1 second for faster reaction
    pinCheckIntervalRef.current = setInterval(async () => {
      try {
        // Check if exam is still active
        if (submitting || examAlreadySubmitted) {
          console.log('[ExamScreen] Exam no longer active, stopping pin monitoring');
          if (pinCheckIntervalRef.current) {
            clearInterval(pinCheckIntervalRef.current);
            pinCheckIntervalRef.current = null;
          }
          return;
        }
        
        // Check if exam submission is complete
        const examSubmissionComplete = await AsyncStorage.getItem('exam_submission_complete');
        if (examSubmissionComplete === 'true') {
          console.log('[ExamScreen] Exam submission complete, stopping pin monitoring');
          if (pinCheckIntervalRef.current) {
            clearInterval(pinCheckIntervalRef.current);
            pinCheckIntervalRef.current = null;
          }
          return;
        }
        
        // Check current pin state
        const isCurrentlyPinned = await ScreenPinning.isPinned();
        console.log('[ExamScreen] Pin check - Currently pinned:', isCurrentlyPinned);
        
        // If screen is not pinned during exam, attempt immediate remediation
        if (!isCurrentlyPinned) {
          console.log('[ExamScreen] SCREEN UNPINNED DETECTED - attempting immediate re-pin');

          let repinSucceeded = false;
          try {
            await ScreenPinning.start();
            // verify by polling until pinned with bounded quick retries (no hard redirect timeout here)
            for (let i = 0; i < 5; i++) {
              const nowPinned = await ScreenPinning.isPinned();
              if (nowPinned) { repinSucceeded = true; break; }
              await new Promise(r => setTimeout(r, 200));
            }
          } catch {}

          if (repinSucceeded) {
            console.log('[ExamScreen] Screen re-pinned successfully after unpin');
            // restart overlay monitoring quietly
            setTimeout(async () => {
              try {
                await ScreenPinning.startSystemOverlayMonitor();
                await ScreenPinning.dismissSystemOverlay();
              } catch {}
            }, 300);
          } else {
            console.log('[ExamScreen] Re-pin failed. SAVING PROGRESS and redirecting to Dashboard for resume.');
            
            // ===== SAVE PROGRESS + PAUSE BEFORE EXIT (for resume) =====
            try {
              await pauseExam(); // internally saves timer+progress then flips isExamStarted=false
              console.log('[ExamScreen] Progress saved and exam paused after unpin - examinee can resume');
            } catch (error) {
              console.error('[ExamScreen] Failed to pause/save progress on unpin:', error);
            }
            // ===== END SAVE/PAUSE =====

            try { await ScreenPinning.stopSystemOverlayMonitor(); } catch {}
            try { await ScreenPinning.stop(); } catch {}
            
            // Notify backend exam stopped (but don't reset store - we want to resume)
            try { await notifyExamStopped(examId); } catch {}
            
            // Clear timer interval but DON'T reset exam store
            try { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } } catch {}
            
            // DON'T call resetExam() or clearExamSeed() - we want resume to work
            // DON'T clear the seed - question order must stay the same on resume
            
            KeepAwakeWrapper.deactivate();
            
            // Show alert explaining they can resume
            Alert.alert(
              'Exam Paused',
              'Your exam progress has been saved. You can resume where you left off by scanning the exam code again.',
              [{ text: 'OK', onPress: () => navigation.replace('Dashboard') }]
            );
          }
        }
        
      } catch (error) {
        console.log('[ExamScreen] Error in pin monitoring:', error);
      }
    }, 1000); // Check every 1 second
    
    return () => {
      if (pinCheckIntervalRef.current) {
        clearInterval(pinCheckIntervalRef.current);
        pinCheckIntervalRef.current = null;
      }
    };
  }, [isExamStarted, submitting, examAlreadySubmitted, examId]);


  // Handle system overlay actions
  useEffect(() => {
    // Clean up existing subscription
    if (systemOverlaySubRef.current) {
      systemOverlaySubRef.current.remove();
      systemOverlaySubRef.current = null;
    }
    
    // Set up new subscription for system overlay actions
    systemOverlaySubRef.current = subscribeSystemOverlayAction(async (action) => {
      console.log('[ExamScreen] System overlay action received:', action);
      console.log('[ExamScreen] Action type:', typeof action);
      console.log('[ExamScreen] Action value:', JSON.stringify(action));
      console.log('[ExamScreen] Exam state when overlay action received:', {
        isExamStarted,
        loading,
        hasQuestions: questions.length > 0
      });
      
      // Prevent redirect if exam hasn't started yet (might be during initialization)
      // Only allow redirect if exam has actually started or if user explicitly declined
      if (action === 'no_thanks') {
        // Only redirect if exam was actually started, otherwise it might be a premature dialog
        if (isExamStarted || questions.length > 0) {
          // User pressed "No thanks" during active exam - redirect to dashboard
          console.log('[ExamScreen] User chose not to proceed during active exam, redirecting to dashboard');
          console.log('[ExamScreen] Stopping screen pinning before redirect');
          ScreenPinning.stop().catch(() => {});
          try { await notifyExamStopped(examId); } catch {}
          try { Platform.OS === 'android' && await ScreenPinning.disableSecureFlag(); } catch {}
          navigation.replace('Dashboard');
        } else {
          // Exam hasn't started yet - might be initialization dialog, log but don't redirect
          console.log('[ExamScreen] System overlay "no_thanks" received before exam started, ignoring redirect');
        }
      } else if (action === 'got_it') {
        // User pressed "Got it" - continue with exam
        console.log('[ExamScreen] User acknowledged system overlay, continuing exam');
        // Exam should continue normally
      } else {
        console.log('[ExamScreen] Unknown system overlay action:', action);
      }
    });
    
    return () => {
      if (systemOverlaySubRef.current) {
        systemOverlaySubRef.current.remove();
        systemOverlaySubRef.current = null;
      }
    };
  }, [isExamStarted, questions.length, examId]);

  const initializeExam = async () => {
    try {
      // Validate required params at the very start
      if (!examId) {
        throw new Error('Exam ID is missing. Cannot initialize exam.');
      }
      
      if (!examRefNo) {
        throw new Error('Exam reference number is missing. Cannot initialize exam.');
      }
      
      if (!timeLimit) {
        throw new Error('Time limit is missing. Cannot initialize exam.');
      }
      
      console.log('[ExamScreen] Initializing exam for examId:', examId);
      console.log('[ExamScreen] Full initialization params:', { examId, examRefNo, timeLimit, examType, examTitle });
      
      ANSWERS_STORAGE_KEY.current = `exam_answers_${examId}`;
      FOOTER_STATE_KEY.current = `footer_state_${examId}`;
      
      // Load saved footer state
      await loadFooterState();
      
      // Clear any global submission flags for a fresh start
      try {
        await AsyncStorage.removeItem('exam_submission_complete');
      } catch (error) {
        console.log('[ExamScreen] Error clearing global submission flag:', error);
      }
      
      // Check if exam was already submitted from review screen
      try {
        const submissionFlag = await AsyncStorage.getItem(`exam_submitted_${examId}`);
        if (submissionFlag === 'true') {
          console.log('[ExamScreen] Exam was already submitted from review screen, redirecting to results');
          setExamAlreadySubmitted(true);
          // Clear the submission flag
          await AsyncStorage.removeItem(`exam_submitted_${examId}`);
          // IMMEDIATELY stop any screen pinning before redirecting
          try {
            await ScreenPinning.stop();
            console.log('[ExamScreen] Screen pinning stopped before redirect to results');
          } catch (error) {
            console.log('[ExamScreen] Error stopping screen pinning before redirect:', error);
          }
          // Redirect to results screen since exam is already submitted
          navigation.replace('ExamResults');
          return;
        }
      } catch {}

      // Clear any invalid saved data
      await clearExamProgress();

      // Update phase to 'academic' when entering academic exam (from personality test)
      // This ensures monitoring shows correct phase even if timer is already running
      try {
        const { updateExamPhase } = require('../API/exam');
        await updateExamPhase(examId, examType, 'academic');
        console.log('[ExamScreen] Updated exam phase to academic for monitoring');
      } catch (error) {
        console.log('[ExamScreen] Error updating exam phase:', error);
      }
      
      // Cold start detection: if significant gap since last active, apply penalty
      try {
        const lastTs = await AsyncStorage.getItem('last_active_ts');
        if (lastTs) {
          const gap = Date.now() - parseInt(lastTs, 10);
          // If app was closed/inactive for > 10 seconds during exam, penalize
          if (gap > 10000 && isExamStarted) {
            console.log('[ExamScreen] Cold start detected, applying penalty. Gap(ms):', gap);
            await handleSecurityViolation('cold_start', 'App was closed or inactive for too long during exam');
          }
        }
      } catch {}
      
      // First try to restore existing timer
      const timerRestored = await restoreExamTimer();
      
      // Always try to fetch server progress by exam_ref_no (independent of timer)
      let serverProgress = null;
      try {
        if (examRefNo) {
          const sp = await fetchExamProgress(examRefNo);
          if (sp?.success && sp?.answers?.length > 0) {
            serverProgress = sp;
            console.log('[ExamScreen] Server progress fetched:', { answered: sp.answers.length, remaining: sp.remaining_seconds });
          } else {
            console.log('[ExamScreen] No server progress available:', { success: sp?.success, answersLength: sp?.answers?.length });
          }
        } else {
          console.log('[ExamScreen] No examRefNo provided, skipping server progress fetch');
        }
      } catch (e) {
        console.log('[ExamScreen] Error fetching server progress:', e?.message);
      }
      
      if (timerRestored) {
        console.log('[ExamScreen] Existing exam timer restored');
        if (questions.length === 0) {
          const examData = await getExamQuestionsByType(examId, examType);
          setCurrentExam(examData);
          const seed = await getOrGenerateExamSeed(examRefNo, examId, true);
          const randomized = randomizeQuestionsByCategory(examData.questions, seed);
          latestQuestionsRef.current = randomized;
          setQuestions(randomized);
          await hydrateAnswersFromStorage(examData.questions);
        }
      } else {
        // No existing timer, start fresh
        console.log('[ExamScreen] No existing timer, setting up new exam');
        const examData = await getExamQuestionsByType(examId, examType);
        setCurrentExam(examData);
        const seed = await getOrGenerateExamSeed(examRefNo, examId, false);
        const randomized = randomizeQuestionsByCategory(examData.questions, seed);
        latestQuestionsRef.current = randomized;
        setQuestions(randomized);
        await hydrateAnswersFromStorage(examData.questions);
      }
      
      // Apply server progress if available (overrides local storage)
      if (serverProgress && serverProgress.answers && serverProgress.answers.length > 0) {
        console.log('[ExamScreen] Applying server progress...', {
          answersCount: serverProgress.answers.length,
          answers: serverProgress.answers
        });
        const answersMap = new Map();
        for (const a of serverProgress.answers) {
          answersMap.set(a.question_id, a.selected_answer);
        }
        console.log('[ExamScreen] Created answers map:', Object.fromEntries(answersMap));
        // Apply each answer via setAnswer to trigger store update
        for (const [qid, ans] of answersMap.entries()) {
          console.log('[ExamScreen] Setting answer:', { questionId: qid, answer: ans });
          setAnswer(qid, ans);
        }
        console.log('[ExamScreen] All server answers applied');
        // Override remaining time AND exam start time to calculate timer correctly
        if (typeof serverProgress.remaining_seconds === 'number' && serverProgress.remaining_seconds > 0) {
          const timeLimitMinutes = parseInt(timeLimit) || 60;
          const timeLimitSecs = timeLimitMinutes * 60;
          restoreTimerFromServerProgress(serverProgress.remaining_seconds, timeLimitSecs);
          console.log('[ExamScreen] Timer restored from server:', { 
            remaining_seconds: serverProgress.remaining_seconds, 
            remaining_minutes: Math.floor(serverProgress.remaining_seconds / 60),
            time_limit_minutes: timeLimitMinutes,
            time_limit_seconds: timeLimitSecs 
          });
        }
      }
      
      // Position at FIRST UNANSWERED question (or last answered if all answered)
      if (serverProgress && serverProgress.answers && serverProgress.answers.length > 0) {
        const qList = (questions && questions.length > 0) ? questions : latestQuestionsRef.current;
        const answeredQuestionIds = new Set(serverProgress.answers.map(a => a.question_id));
        console.log('[ExamScreen] Positioning logic:', {
          questionsCount: qList.length,
          answeredQuestionIds: Array.from(answeredQuestionIds),
          currentAnswers: Object.fromEntries(useExamStore.getState().answers)
        });
        
        const firstUnansweredIndex = qList.findIndex(q => !answeredQuestionIds.has(q.questionId));
        console.log('[ExamScreen] First unanswered index:', firstUnansweredIndex);
        
        if (firstUnansweredIndex >= 0) {
          setCurrentQuestionIndex(firstUnansweredIndex);
          console.log('[ExamScreen] Positioned at first unanswered question index:', firstUnansweredIndex);
        } else {
          // All answered, go to last
          const lastAnsweredIndex = Math.max(
            ...serverProgress.answers.map(a => {
              const q = qList.find(q => q.questionId === a.question_id);
              return q ? qList.indexOf(q) : -1;
            })
          );
          if (lastAnsweredIndex >= 0) {
            setCurrentQuestionIndex(lastAnsweredIndex);
            console.log('[ExamScreen] All answered, positioned at last:', lastAnsweredIndex);
          }
        }
      }
      
      console.log('[ExamScreen] Exam initialized:', {
        examId,
        questionsCount: questions.length || 'loading',
        timeLimit,
        timerRestored
      });
      
    } catch (error) {
      console.log('[ExamScreen] Error initializing exam:', error?.message);
      console.log('[ExamScreen] Error details:', error);
      console.log('[ExamScreen] Route params received:', { examId, examRefNo, timeLimit, examType, examTitle });
      
      // Check if it's a network error or recoverable error
      const isNetworkError = error?.message?.includes('Network') || 
                            error?.message?.includes('network') ||
                            error?.message?.includes('fetch') ||
                            error?.code === 'NETWORK_ERROR' ||
                            !error?.response;
      
      if (isNetworkError) {
        // Network error - give user option to retry instead of immediately redirecting
        Alert.alert(
          'Network Error',
          'Failed to load exam questions. Please check your internet connection and try again.',
          [
            {
              text: 'Go Back',
              style: 'cancel',
              onPress: () => {
                console.log('[ExamScreen] User chose to go back due to network error');
                navigation.replace('Dashboard');
              }
            },
            {
              text: 'Retry',
              onPress: async () => {
                console.log('[ExamScreen] User chose to retry loading exam');
                setLoading(true);
                try {
                  await initializeExam();
                } catch (retryError) {
                  console.log('[ExamScreen] Retry failed:', retryError?.message);
                  Alert.alert('Error', 'Failed to load exam after retry. Please scan the QR code again.');
                  navigation.replace('Dashboard');
                }
              }
            }
          ]
        );
      } else if (!examId || !examRefNo) {
        // Missing required params
        Alert.alert(
          'Missing Information',
          'Required exam information is missing. Please scan the QR code again to start the exam.',
          [{
            text: 'OK',
            onPress: () => {
              console.log('[ExamScreen] Redirecting to Dashboard due to missing params');
              navigation.replace('Dashboard');
            }
          }]
        );
      } else {
        // Other errors - show specific message but still redirect
        const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error occurred';
        Alert.alert(
          'Failed to Load Exam',
          `Error: ${errorMessage}. Please scan the QR code again.`,
          [{
            text: 'OK',
            onPress: () => {
              console.log('[ExamScreen] Redirecting to Dashboard due to initialization error');
              navigation.replace('Dashboard');
            }
          }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const hydrateAnswersFromStorage = async (fetchedQuestions) => {
    try {
      const key = ANSWERS_STORAGE_KEY.current;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return;
      let restoredCount = 0;
      for (const q of fetchedQuestions || questions) {
        const qid = q.questionId;
        if (saved[qid]) {
          setAnswer(qid, saved[qid]);
          restoredCount++;
        }
      }
      console.log('[ExamScreen] Hydrated answers from storage:', restoredCount);
    } catch (e) {
      console.log('[ExamScreen] Failed to hydrate answers:', e?.message);
    }
  };

  const persistAnswersToStorage = (nextMap) => {
    // Make it non-blocking by not awaiting
    const key = ANSWERS_STORAGE_KEY.current;
    const obj = Object.fromEntries(nextMap);
    AsyncStorage.setItem(key, JSON.stringify(obj))
      .then(() => {
        if (__DEV__) {
          console.log('[ExamScreen] Persisted answers to storage:', Object.keys(obj).length);
        }
      })
      .catch((e) => {
        if (__DEV__) {
          console.log('[ExamScreen] Failed to persist answers:', e?.message);
        }
      });
  };

  const clearAnswersStorage = async () => {
    try {
      const key = ANSWERS_STORAGE_KEY.current;
      if (key) await AsyncStorage.removeItem(key);
      console.log('[ExamScreen] Cleared stored answers');
    } catch (e) {
      console.log('[ExamScreen] Failed to clear stored answers:', e?.message);
    }
  };

  // Footer state persistence functions
  const saveFooterState = async (collapsed) => {
    try {
      const key = FOOTER_STATE_KEY.current;
      if (key) {
        await AsyncStorage.setItem(key, JSON.stringify(collapsed));
        console.log('[ExamScreen] Footer state saved:', collapsed);
      }
    } catch (e) {
      console.log('[ExamScreen] Failed to save footer state:', e?.message);
    }
  };

  const loadFooterState = async () => {
    try {
      const key = FOOTER_STATE_KEY.current;
      if (key) {
        const saved = await AsyncStorage.getItem(key);
        if (saved !== null) {
          const collapsed = JSON.parse(saved);
          setIsFooterCollapsed(collapsed);
          console.log('[ExamScreen] Footer state loaded:', collapsed);
        }
      }
    } catch (e) {
      console.log('[ExamScreen] Failed to load footer state:', e?.message);
    }
  };

  const toggleFooter = async () => {
    const newState = !isFooterCollapsed;
    setIsFooterCollapsed(newState);
    await saveFooterState(newState);
  };

  // Removed old startExamTimer function - timer is now handled by useEffect

  const handleStartExam = async () => {
    // Start exam directly without any overlay or modal
    await handleExamStart();
  };

  const handleExamStart = async () => {
    // Check if exam was already submitted before starting
    if (examAlreadySubmitted) {
      console.log('[ExamScreen] Exam already submitted, skipping exam start');
      return;
    }
    
    // Check global submission flag to prevent any screen pinning
    try {
      const globalSubmissionFlag = await AsyncStorage.getItem('exam_submission_complete');
      if (globalSubmissionFlag === 'true') {
        console.log('[ExamScreen] Global submission flag detected, preventing screen pinning');
        await AsyncStorage.removeItem('exam_submission_complete');
        return;
      }
    } catch (error) {
      console.log('[ExamScreen] Error checking global submission flag:', error);
    }

    // 1) Start monitoring for system overlay FIRST (to detect "No thanks" clicks)
    try {
      await ScreenPinning.startSystemOverlayMonitor();
      console.log('[ExamScreen] 👀 Started system overlay monitoring before screen pinning');
    } catch (error) {
      console.log('[ExamScreen] ⚠️ Could not start system overlay monitor:', error);
    }

    // 2) Attempt to start screen pinning BEFORE starting the exam
    try {
      console.log('[ExamScreen] 📱 Requesting screen pinning...');
      try { await updateExamPhase(examId, examType, 'pin_request'); } catch {}
      const requested = await ScreenPinning.start();
      if (!requested) {
        console.log('[ExamScreen] ❌ Pin request denied or failed immediately. Redirecting to Dashboard.');
        try { await updateExamPhase(examId, examType, 'pin_denied'); } catch {}
        try { await ScreenPinning.stopSystemOverlayMonitor(); } catch {}
        navigation.replace('Dashboard');
        return;
      }
      console.log('[ExamScreen] 📋 Pin request sent. Waiting for user response...');
      
      // Try to dismiss the system overlay instructions immediately after starting
      setTimeout(async () => {
        try { 
          await ScreenPinning.dismissSystemOverlay(); 
          console.log('[ExamScreen] 🔄 Attempted to dismiss system overlay instructions');
        } catch {}
      }, 200);
    } catch (error) {
      console.log('[ExamScreen] ❌ Error requesting pinning:', error);
      try { await updateExamPhase(examId, examType, 'pin_denied'); } catch {}
      try { await ScreenPinning.stopSystemOverlayMonitor(); } catch {}
      navigation.replace('Dashboard');
      return;
    }

    // 3) Listen for immediate denial or acceptance via SystemOverlayAction
    let userDenied = false;
    let userAccepted = false;
    const denyListener = DeviceEventEmitter.addListener('SystemOverlayAction', (action) => {
      console.log('[ExamScreen] 🔔 SystemOverlayAction received during pin wait:', action);
      if (action === 'no_thanks') {
        console.log('[ExamScreen] 🚫 User clicked "No thanks" - denial detected');
        userDenied = true;
      } else if (action === 'got_it') {
        console.log('[ExamScreen] ✅ User clicked "Got it" - acceptance detected');
        userAccepted = true;
      }
    });

    // 4) Poll frequently for screen pinning confirmation  
    // Use shorter timeout (5s) for faster dismissal detection
    try {
      const startTime = Date.now();
      const timeout = 5000; // 5 seconds timeout
      let pinned = false;
      let checkCount = 0;
      const pollInterval = 300; // Check every 300ms for faster detection
      
      console.log('[ExamScreen] ⏳ Starting fast polling for screen pin confirmation...');
      console.log('[ExamScreen] 💡 You have 5 seconds to respond to the dialog');
      console.log('[ExamScreen] 💡 Press "Yes" to accept pinning, "No thanks" to decline');
      
      while ((Date.now() - startTime) < timeout) {
        checkCount++;
        const elapsed = Date.now() - startTime;
        
        // Check if user explicitly denied via SystemOverlayAction event
        if (userDenied) {
          console.log('[ExamScreen] ❌ Pinned? DENIED by user (clicked "No thanks") → Redirecting to Dashboard');
          try { await updateExamPhase(examId, examType, 'pin_denied'); } catch {}
          try { await ScreenPinning.stopSystemOverlayMonitor(); } catch {}
          try { await ScreenPinning.stop(); } catch {}
          denyListener.remove();
          navigation.replace('Dashboard');
          return;
        }
        
        // Check if user accepted via event (faster than polling)
        if (userAccepted) {
          console.log('[ExamScreen] ✅ User accepted via event, verifying pin status...');
          pinned = true;
          break;
        }
        
        // Check if screen is pinned
        pinned = await ScreenPinning.isPinned();
        
        if (pinned) {
          console.log(`[ExamScreen] ✅ Pinned? PINNED ACCEPTED (after ${Math.floor(elapsed/1000)}s) → Proceeding to exam`);
          break;
        } else {
          // Only log every second to reduce console spam (every ~3 checks at 300ms)
          if (checkCount % 3 === 0) {
            console.log(`[ExamScreen] ⏸️ Pinned? Not yet (${Math.floor(elapsed/1000)}s elapsed) - waiting for user response...`);
          }
        }
        
        // Wait before next check
        await new Promise(r => setTimeout(r, pollInterval));
      }
      
      denyListener.remove();
      
      if (!pinned && !userDenied) {
        console.log('[ExamScreen] ⏱️ Pinned? TIMEOUT (5s elapsed, no response detected)');
        console.log('[ExamScreen] ❌ User likely dismissed or declined the dialog → Redirecting to Dashboard');
        try { await updateExamPhase(examId, examType, 'pin_timeout'); } catch {}
        try { await ScreenPinning.stopSystemOverlayMonitor(); } catch {}
        try { await ScreenPinning.stop(); } catch {}
        navigation.replace('Dashboard');
        return;
      }
      
      try { await updateExamPhase(examId, examType, 'pin_confirmed'); } catch {}
      console.log('[ExamScreen] 🎯 Pin confirmed. Starting exam timer...');
    } catch (e) {
      console.log('[ExamScreen] ❌ Error while waiting for pin:', e);
      try { await updateExamPhase(examId, examType, 'pin_denied'); } catch {}
      try { await ScreenPinning.stopSystemOverlayMonitor(); } catch {}
      try { await ScreenPinning.stop(); } catch {}
      denyListener.remove();
      navigation.replace('Dashboard');
      return;
    }

    // 5) Pinned confirmed → start the exam timer and proceed
    // Check if timer was already restored from server progress
    const currentTimeRemaining = useExamStore.getState().timeRemaining;
    const timeLimitMinutes = parseInt(timeLimit) || 60;
    const timeLimitSecs = timeLimitMinutes * 60;
    
    if (currentTimeRemaining && currentTimeRemaining < timeLimitSecs) {
      // Timer was already restored from server progress, just mark exam as started
      console.log('[ExamScreen] ✅ Timer already restored from server progress, preserving it:', {
        remaining: currentTimeRemaining,
        minutes: Math.floor(currentTimeRemaining / 60)
      });
      useExamStore.setState({ isExamStarted: true });
      await useExamStore.getState().saveTimerToStorage();
    } else {
      // No restored timer, start fresh
      await startExam(timeLimitMinutes, examId, examType, 'academic');
      console.log('[ExamScreen] ✅ Exam started with fresh timer (pin confirmed, academic phase)');
    }

    // System overlay monitor is already running from step 1 - keep it active during exam
    console.log('[ExamScreen] 👀 System overlay monitoring continues during exam');

    // Try to dismiss any system overlays that might show instructions
    setTimeout(async () => {
      try { await ScreenPinning.dismissSystemOverlay(); } catch {}
    }, 500);
    setTimeout(async () => {
      try { await ScreenPinning.dismissSystemOverlay(); } catch {}
    }, 1000);
    setTimeout(async () => {
      try { await ScreenPinning.dismissSystemOverlay(); } catch {}
    }, 1500);
  };

  const handleTimeUp = async () => {
    console.log('[ExamScreen] Timer expired - auto-submitting immediately');
    
    // Stop timer immediately
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Deactivate keep awake
    KeepAwakeWrapper.deactivate();
    
    // Stop screen pinning ASAP to avoid blocking transitions
    try {
      await ScreenPinning.stop();
    } catch {}
    try { Platform.OS === 'android' && await ScreenPinning.disableSecureFlag(); } catch {}
    
    // Stop system overlay monitoring
    try { await ScreenPinning.stopSystemOverlayMonitor(); } catch {}
    
    // Mark submission complete and clear ephemeral local state
    try { await AsyncStorage.setItem('exam_submission_complete', 'true'); } catch {}
    try { await AsyncStorage.removeItem('last_route'); } catch {}
    try { await AsyncStorage.removeItem('last_active_ts'); } catch {}
    try { await clearExamSeed(examRefNo, examId); } catch {}
    
    // Submit without user interaction
    await handleSubmitExam();
  };

  const handleSecurityViolation = async (type, message) => {
    console.log('[ExamScreen] Security violation:', type, message);
    
    const violation = {
      type,
      message,
      timestamp: Date.now()
    };
    
    addSecurityViolation(violation);
    
    // Only add penalty if it's not a screen unpin (we handle that separately)
    if (type !== 'screen_unpin') {
      await addPenalty();
    }
    
    setSecurityViolation(violation);
    setShowSecurityModal(true);
  };


  const continueNormalInit = async () => {
    try {
      // Cold start detection
      try {
        const lastTs = await AsyncStorage.getItem('last_active_ts');
        if (lastTs) {
          const gap = Date.now() - parseInt(lastTs, 10);
          if (gap > 10000 && isExamStarted) {
            console.log('[ExamScreen] Cold start detected, applying penalty. Gap(ms):', gap);
            await handleSecurityViolation('cold_start', 'App was closed or inactive for too long during exam');
          }
        }
      } catch {}
      
      // Try to restore existing timer
      const timerRestored = await restoreExamTimer();
      
      // Always try to fetch server progress by exam_ref_no (independent of timer)
      let serverProgress = null;
      try {
        if (examRefNo) {
          const sp = await fetchExamProgress(examRefNo);
          if (sp?.success && sp?.answers?.length > 0) {
            serverProgress = sp;
            console.log('[ExamScreen] Server progress fetched in continueNormalInit:', { answered: sp.answers.length, remaining: sp.remaining_seconds });
          } else {
            console.log('[ExamScreen] No server progress available in continueNormalInit:', { success: sp?.success, answersLength: sp?.answers?.length });
          }
        } else {
          console.log('[ExamScreen] No examRefNo provided in continueNormalInit, skipping server progress fetch');
        }
      } catch (e) {
        console.log('[ExamScreen] Error fetching server progress in continueNormalInit:', e?.message);
      }
      
      if (timerRestored) {
        console.log('[ExamScreen] Existing exam timer restored');
        if (questions.length === 0) {
          const examData = await getExamQuestionsByType(examId, examType);
          setCurrentExam(examData);
          const seed = await getOrGenerateExamSeed(examRefNo, examId, true);
          const randomized = randomizeQuestionsByCategory(examData.questions, seed);
          latestQuestionsRef.current = randomized;
          setQuestions(randomized);
          await hydrateAnswersFromStorage(examData.questions);
        }
      } else {
        // No existing timer, start fresh
        console.log('[ExamScreen] No existing timer, setting up new exam');
        const examData = await getExamQuestionsByType(examId, examType);
        setCurrentExam(examData);
        const seed = await getOrGenerateExamSeed(examRefNo, examId, false);
        const randomized = randomizeQuestionsByCategory(examData.questions, seed);
        latestQuestionsRef.current = randomized;
        setQuestions(randomized);
        await hydrateAnswersFromStorage(examData.questions);
      }
      
      // Apply server progress if available (overrides local storage)
      if (serverProgress && serverProgress.answers && serverProgress.answers.length > 0) {
        console.log('[ExamScreen] Applying server progress...', {
          answersCount: serverProgress.answers.length,
          answers: serverProgress.answers
        });
        const answersMap = new Map();
        for (const a of serverProgress.answers) {
          answersMap.set(a.question_id, a.selected_answer);
        }
        console.log('[ExamScreen] Created answers map:', Object.fromEntries(answersMap));
        // Apply each answer via setAnswer to trigger store update
        for (const [qid, ans] of answersMap.entries()) {
          console.log('[ExamScreen] Setting answer:', { questionId: qid, answer: ans });
          setAnswer(qid, ans);
        }
        console.log('[ExamScreen] All server answers applied');
        // Override remaining time AND exam start time to calculate timer correctly
        if (typeof serverProgress.remaining_seconds === 'number' && serverProgress.remaining_seconds > 0) {
          const timeLimitMinutes = parseInt(timeLimit) || 60;
          const timeLimitSecs = timeLimitMinutes * 60;
          restoreTimerFromServerProgress(serverProgress.remaining_seconds, timeLimitSecs);
          console.log('[ExamScreen] Timer restored from server:', { 
            remaining_seconds: serverProgress.remaining_seconds, 
            remaining_minutes: Math.floor(serverProgress.remaining_seconds / 60),
            time_limit_minutes: timeLimitMinutes,
            time_limit_seconds: timeLimitSecs 
          });
        }
      }
      
      // Position at FIRST UNANSWERED question (or last answered if all answered)
      if (serverProgress && serverProgress.answers && serverProgress.answers.length > 0) {
        const qList = (questions && questions.length > 0) ? questions : latestQuestionsRef.current;
        const answeredQuestionIds = new Set(serverProgress.answers.map(a => a.question_id));
        console.log('[ExamScreen] Positioning logic:', {
          questionsCount: qList.length,
          answeredQuestionIds: Array.from(answeredQuestionIds),
          currentAnswers: Object.fromEntries(useExamStore.getState().answers)
        });
        
        const firstUnansweredIndex = qList.findIndex(q => !answeredQuestionIds.has(q.questionId));
        console.log('[ExamScreen] First unanswered index:', firstUnansweredIndex);
        
        if (firstUnansweredIndex >= 0) {
          setCurrentQuestionIndex(firstUnansweredIndex);
          console.log('[ExamScreen] Positioned at first unanswered question index:', firstUnansweredIndex);
        } else {
          // All answered, go to last
          const lastAnsweredIndex = Math.max(
            ...serverProgress.answers.map(a => {
              const q = qList.find(q => q.questionId === a.question_id);
              return q ? qList.indexOf(q) : -1;
            })
          );
          if (lastAnsweredIndex >= 0) {
            setCurrentQuestionIndex(lastAnsweredIndex);
            console.log('[ExamScreen] All answered, positioned at last:', lastAnsweredIndex);
          }
        }
      }
      
      console.log('[ExamScreen] Exam initialized');
      setLoading(false);
    } catch (error) {
      console.error('[ExamScreen] Error in continueNormalInit:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to initialize exam. Please try again.');
    }
  };

  const handleAnswerSelect = useCallback((questionId, answer) => {
    // Prevent multiple rapid selections
    if (immediateSelection[questionId] === answer) return;
    
    // Track timing when answer is selected
    const currentTime = new Date().toISOString();
    setQuestionTimings(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        question_end_time: currentTime,
        time_spent_seconds: prev[questionId]?.question_start_time 
          ? Math.floor((new Date(currentTime) - new Date(prev[questionId].question_start_time)) / 1000)
          : 0
      }
    }));
    
    // INSTANT visual feedback - update state immediately (no delays)
    setImmediateSelection(prev => ({ ...prev, [questionId]: answer }));
    setAnswer(questionId, answer);
    
    // Add bounce animation when answer is selected (like PersonalityTestScreen)
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.02,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
    // Best-effort server sync of progress (answers + remaining time)
    try {
      const q = questions[currentQuestionIndex] || { questionId };
      const qid = q.questionId || questionId;
      const remaining = calculateRemainingTime();
      if (examRefNo) {
        upsertExamProgress(examRefNo, qid, answer, remaining);
      }
    } catch {}
    
    // Debounced persistence to prevent excessive storage operations
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }
    
    persistTimeoutRef.current = setTimeout(() => {
      // Persist in background without blocking
      const next = new Map(answers);
      next.set(questionId, answer);
      persistAnswersToStorage(next);
      
      // Persist resume index (async, non-blocking)
      AsyncStorage.setItem('last_route', JSON.stringify({
        name: 'ExamScreen',
        params: { examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers, resumeIndex: currentQuestionIndex }
      })).catch(() => {});
    }, 300); // Debounce storage operations
    
    // Auto-advance after exactly 1 second as requested
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
    }
    
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      const isLastQuestion = currentQuestionIndex >= questions.length - 1;
      const totalAnswered = answers.size + (answers.has(questionId) ? 0 : 1);
      const allAnswered = totalAnswered >= questions.length;
      if (!isLastQuestion) {
        handleNextQuestion();
      } else if (allAnswered) {
        setShowReviewModal(true);
      }
    }, 1000); // Exactly 1 second as requested
  }, [answers, currentQuestionIndex, examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers, questions.length, setAnswer, handleNextQuestion, immediateSelection]);

  // Animation functions - matching PersonalityTestScreen style with bounce
  const animateQuestionTransition = useCallback((direction = 'next') => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    // Slide animation for question transition (like PersonalityTestScreen)
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: direction === 'next' ? 30 : -30,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsAnimating(false);
    });
  }, [slideAnim, isAnimating]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      // Clear immediate selection for next question
      setImmediateSelection({});
      
      // Animate transition (slide animation like PersonalityTestScreen)
      animateQuestionTransition('next');
      
      // Update question index immediately (animation handles the transition)
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Persist index to route params for resume clarity
      AsyncStorage.setItem('last_route', JSON.stringify({
        name: 'ExamScreen',
        params: { examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers, resumeIndex: currentQuestionIndex + 1 }
      })).catch(() => {});
    }
  }, [currentQuestionIndex, questions.length, examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers, animateQuestionTransition]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      // Clear immediate selection for previous question
      setImmediateSelection({});
      
      // Animate transition (slide animation like PersonalityTestScreen)
      animateQuestionTransition('previous');
      
      // Update question index immediately (animation handles the transition)
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      AsyncStorage.setItem('last_route', JSON.stringify({
        name: 'ExamScreen',
        params: { examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers, resumeIndex: currentQuestionIndex - 1 }
      })).catch(() => {});
    }
  }, [currentQuestionIndex, examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers, animateQuestionTransition]);

  const handleSkipQuestion = useCallback(() => {
    console.log('[ExamScreen] Skip pressed at index:', currentQuestionIndex);
    // If not last question, move forward; if last, jump to first unanswered if any
    if (currentQuestionIndex < questions.length - 1) {
      setImmediateSelection({});
      
      // Animate transition (slide animation like PersonalityTestScreen)
      animateQuestionTransition('next');
      
      // Update question index immediately (animation handles the transition)
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      AsyncStorage.setItem('last_route', JSON.stringify({
        name: 'ExamScreen',
        params: { examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers, resumeIndex: currentQuestionIndex + 1 }
      })).catch(() => {});
    } else {
      const idx = getFirstUnansweredQuestionIndex();
      if (idx !== -1) {
        setImmediateSelection({});
        
        // Animate transition (slide animation like PersonalityTestScreen)
        animateQuestionTransition('next');
        
        // Update question index immediately (animation handles the transition)
        setCurrentQuestionIndex(idx);
        AsyncStorage.setItem('last_route', JSON.stringify({
          name: 'ExamScreen',
          params: { examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers, resumeIndex: idx }
        })).catch(() => {});
      } else {
        // All answered and at last question → open review
        setShowReviewModal(true);
      }
    }
  }, [currentQuestionIndex, questions.length, examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers, getFirstUnansweredQuestionIndex, animateQuestionTransition]);

  // Persist resume index whenever it changes
  useEffect(() => {
    AsyncStorage.setItem('last_route', JSON.stringify({
      name: 'ExamScreen',
      params: { examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers, resumeIndex: currentQuestionIndex }
    })).catch(() => {});
  }, [currentQuestionIndex]);

  const handleGoToReview = () => {
    // Open in-screen modal to avoid unpinning
    setShowReviewModal(true);
  };

  const handleSubmitExam = async () => {
    if (submitting) return;
    setSubmitting(true);

    // Prepare payload but do not upload here; navigate to uploading screen
    // Build a complete answer sheet covering ALL questions; unanswered => marked wrong by sending empty value
    let recoveredMap = null;
    let academicAnswersArray = [];
    const personalityAnswersArray = personalityAnswers ? Object.entries(personalityAnswers).map(([questionId, answer]) => ({
      questionId,
      selected_answer: answer
    })) : [];

    // Failsafe: if no academic answers captured in memory, try to recover from storage
    try {
      if (ANSWERS_STORAGE_KEY.current) {
        const raw = await AsyncStorage.getItem(ANSWERS_STORAGE_KEY.current);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && typeof saved === 'object') {
            recoveredMap = new Map(Object.entries(saved).map(([qid, ans]) => [isNaN(Number(qid)) ? qid : Number(qid), ans]));
            console.log('[ExamScreen] Recovered answers from storage. Count:', recoveredMap.size);
          }
        }
      }
    } catch (e) {
      console.log('[ExamScreen] Failed to recover answers from storage:', e?.message);
    }

    // Merge in-memory answers with recovered ones; prefer in-memory
    const merged = new Map(recoveredMap || []);
    for (const [qid, ans] of answers.entries()) {
      merged.set(qid, ans);
    }
    // Produce a row for every question; unanswered -> empty string
    academicAnswersArray = (questions || []).map((q) => {
      const timing = questionTimings[q.questionId] || {};
      return {
        questionId: q.questionId,
        // Use null for unanswered questions - backend now handles this properly
        selected_answer: merged.has(q.questionId) ? merged.get(q.questionId) : null,
        time_spent_seconds: timing.time_spent_seconds || null,
        question_start_time: timing.question_start_time || null,
        question_end_time: timing.question_end_time || null
      };
    });

    const allAnswersArray = [...academicAnswersArray, ...personalityAnswersArray];

    // Normalize payload keys back to original API expectation
    const payload = examType === 'departmental' ? {
      department_exam_id: examId,
      exam_ref_no: examRefNo,
      answers: allAnswersArray,
      time_taken: Math.floor((Date.now() - (examStartTime || Date.now())) / 1000),
      penalties_applied: penaltiesApplied,
      exam_type: 'departmental'
    } : {
      examId: examId,
      exam_ref_no: examRefNo,
      answers: allAnswersArray,
      time_taken: Math.floor((Date.now() - (examStartTime || Date.now())) / 1000),
      penalties_applied: penaltiesApplied,
      exam_type: 'regular'
    };

    // Save exam result to offline cache
    // Exam result saving removed - results are now online only

    // Build cleanup keys for after upload
    const cleanupKeys = [
      'last_route',
      'last_active_ts',
      `exam_seed_${examRefNo || ''}_${examId || ''}`,
      `personality_answers_${examId}`,
      `exam_answers_${examId}`
    ];

    // Stop timer and clear local state before navigating
    try { await resetExam(); } catch {}
    try { KeepAwakeWrapper.deactivate(); } catch {}

    // Hand off upload to a dedicated screen to avoid pinning glitches
    console.log('[ExamScreen] Navigating to UploadingExam with answers count:', allAnswersArray.length);
    // Clear saved exam progress after preparing submission
    await clearExamProgress();
    // Also clear server-side progress
    try {
      if (examRefNo) {
        await clearExamProgress(examRefNo);
        console.log('[ExamScreen] Cleared server-side exam progress');
      }
    } catch {}
    console.log('[ExamScreen] Cleared saved exam progress after submission preparation');
    
    navigation.replace('UploadingExam', { payload, cleanupKeys, navigateTo: 'ExamResults' });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining <= 300) return '#ef4444';
    if (timeRemaining <= 600) return '#f59e0b';
    return '#10b981';
  };

  const getProgressPercentage = () => {
    return questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  };

  const getAnsweredCount = () => {
    return answers.size;
  };

  const getUnansweredCount = () => {
    return questions.length - answers.size;
  };

  const getFirstUnansweredQuestionIndex = () => {
    console.log('[ExamScreen] Checking for unanswered questions...');
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qid = q.questionId;
      if (!answers.has(qid)) {
        console.log('[ExamScreen] First unanswered at index:', i, 'questionId:', qid);
        return i;
      }
    }
    console.log('[ExamScreen] All questions answered');
    return -1;
  };

  const isAllAnswered = () => {
    return answers.size === questions.length && questions.length > 0;
  };

  const goToUnansweredQuestion = useCallback(() => {
    const idx = getFirstUnansweredQuestionIndex();
    if (idx !== -1) {
      // Clear immediate selection
      setImmediateSelection({});
      
      // Animate transition (slide animation like PersonalityTestScreen)
      animateQuestionTransition('next');
      
      // Update question index immediately (animation handles the transition)
      setCurrentQuestionIndex(idx);
    }
  }, [getFirstUnansweredQuestionIndex, animateQuestionTransition]);

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = currentQuestion ? answers.has(currentQuestion.questionId) : false;
  const selectedAnswer = currentQuestion ? answers.get(currentQuestion.questionId) : null;

  // Memoize filtered options to prevent unnecessary re-renders
  const filteredOptions = useMemo(() => {
    if (!currentQuestion) return [];
    return ['A', 'B', 'C', 'D', 'E'].filter((option, index) => {
      const optionNumber = index + 1;
      return currentQuestion[`option${optionNumber}`];
    });
  }, [currentQuestion]);

  // Memoize question image URI to prevent re-processing
  const questionImageUri = useMemo(() => {
    if (currentQuestion?.has_image && currentQuestion?.image) {
      return formatBase64Image(currentQuestion.image);
    }
    return null;
  }, [currentQuestion?.has_image, currentQuestion?.image]);

  // State for question image loading
  const [questionImageLoading, setQuestionImageLoading] = useState(false);

  // Reset loading state when question changes
  useEffect(() => {
    if (questionImageUri) {
      setQuestionImageLoading(true);
    }
  }, [questionImageUri]);

  // Debug current question (only in development)
  if (currentQuestion && __DEV__) {
    console.log('[ExamScreen] Current question:', {
      questionId: currentQuestion.questionId,
      question: currentQuestion.question,
      option1: currentQuestion.option1,
      option2: currentQuestion.option2,
      option3: currentQuestion.option3,
      option4: currentQuestion.option4,
      option5: currentQuestion.option5,
      option1_image: currentQuestion.option1_image,
      option2_image: currentQuestion.option2_image,
      option3_image: currentQuestion.option3_image,
      option4_image: currentQuestion.option4_image,
      option5_image: currentQuestion.option5_image,
      option_images: currentQuestion.option_images,
      selectedAnswer,
      fullQuestion: currentQuestion // Log the full object to see structure
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
        <LinearGradient
          colors={['#0a0a1a', '#1a1a2e', '#16213e']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <View style={styles.loadingIconContainer}>
              <Icon name="quiz" size={60} color="#a855f7" />
            </View>
            <Text style={styles.loadingText}>Loading Exam...</Text>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!isExamStarted) {
    // If we were sent from instructions with autoStart, begin exam immediately
    if (autoStart) {
      handleStartExam();
      return (
        <SafeAreaView style={styles.loadingContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
          <LinearGradient colors={["#0a0a1a", "#1a1a2e", "#16213e"]} style={styles.loadingGradient}>
            <View style={styles.loadingContent}>
              <View style={styles.loadingIconContainer}><Icon name="quiz" size={60} color="#a855f7" /></View>
              <Text style={styles.loadingText}>Preparing Exam...</Text>
            </View>
          </LinearGradient>
        </SafeAreaView>
      );
    }
    const target = { examId, examRefNo, timeLimit, examType, examTitle, personalityAnswers };
    navigation.replace('ExamInstructions', target);
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
      
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0a0a1a', '#1a1a2e', '#16213e']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Enhanced Header */}
      <View style={styles.examHeader}>
        <View style={styles.examHeaderLeft}>
          <Text style={styles.questionCounter}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} />
          </View>
          {/* Current Question Category */}
          {currentQuestion?.category && (
            <View style={styles.currentQuestionCategoryContainer}>
              <Text style={styles.currentQuestionCategoryLabel}>Category:</Text>
              <View style={styles.currentQuestionCategoryBadge}>
                <Text style={styles.currentQuestionCategoryText}>{currentQuestion.category}</Text>
              </View>
            </View>
          )}
        </View>
        <View style={styles.examHeaderRight}>
          <View style={styles.timerContainer}>
            <Icon name="schedule" size={16} color={getTimeColor()} />
            <Text style={[styles.timer, { color: getTimeColor() }]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>
        </View>
      </View>

      {/* Question Content */}
      {currentQuestion && (
        <ScrollView 
          style={styles.questionScrollView}
          contentContainerStyle={[
            styles.questionScrollContent,
            isFooterCollapsed && styles.questionScrollContentCollapsed
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              styles.questionCardContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
              style={styles.questionCard}
            >
            {/* Question Header */}
            <View style={styles.questionHeader}>
              <View style={styles.questionNumberContainer}>
                <Text style={styles.questionNumber}>Q{currentQuestionIndex + 1}</Text>
              </View>
              <View style={styles.questionStatus}>
                {isAnswered ? (
                  <View style={styles.answeredBadge}>
                    <Icon name="check-circle" size={16} color="#10b981" />
                    <Text style={styles.answeredText}>Answered</Text>
                  </View>
                ) : (
                  <View style={styles.unansweredBadge}>
                    <Icon name="radio-button-unchecked" size={16} color="#6b7280" />
                    <Text style={styles.unansweredText}>Not Answered</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Question Text */}
            <View style={styles.questionSection}>
              <Text style={styles.questionText}>{currentQuestion.question}</Text>
            </View>

            {/* Question Direction */}
            {currentQuestion.direction && (
              <View style={styles.directionSection}>
                <Text style={styles.directionText}>{currentQuestion.direction}</Text>
              </View>
            )}

            {/* Question Image - Optimized with Loading State */}
            {questionImageUri && (
              <View style={styles.questionImageContainer}>
                <TouchableOpacity
                  onPress={() => openImageModal(currentQuestion.image, `Question ${currentQuestionIndex + 1} Image`)}
                  style={styles.questionImageWrapper}
                  activeOpacity={0.8}
                >
                  {questionImageLoading && (
                    <View style={[styles.questionImage, { position: 'absolute', backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', zIndex: 1 }]}>
                      <ActivityIndicator size="large" color="#a855f7" />
                    </View>
                  )}
                  <Image
                    source={{ uri: questionImageUri }}
                    style={styles.questionImage}
                    resizeMode="cover"
                    onLoad={() => setQuestionImageLoading(false)}
                    onError={(error) => {
                      if (__DEV__) {
                        console.log('[ExamScreen] Question image error:', error.nativeEvent.error);
                      }
                      setQuestionImageLoading(false);
                    }}
                  />
                  <View style={styles.imageOverlay}>
                    <Icon name="zoom-in" size={24} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Options */}
            <View style={styles.optionsContainer}>
              {filteredOptions.map((option, index) => {
                const optionNumber = ['A', 'B', 'C', 'D', 'E'].indexOf(option) + 1; // Get the original index
                const optionText = currentQuestion[`option${optionNumber}`];
                const isSelected = selectedAnswer === option || immediateSelection[currentQuestion.questionId] === option;
                
                // Handle both nested option_images structure and flat optionX_image structure
                const optionImage = currentQuestion.option_images?.[`option${optionNumber}`] || currentQuestion[`option${optionNumber}_image`];
                const hasImage = !!optionImage;
                
                return (
                  <OptionButton
                    key={`${currentQuestion.questionId}-${option}`}
                    option={option}
                    optionText={optionText}
                    isSelected={isSelected}
                    hasImage={hasImage}
                    optionImage={optionImage}
                    onPress={() => handleAnswerSelect(currentQuestion.questionId, option)}
                    onImagePress={() => openImageModal(optionImage, `Option ${option} Image`)}
                  />
                );
              })}
            </View>
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      )}

      {/* Enhanced Footer - Only show when not collapsed */}
      {!isFooterCollapsed && (
        <View style={styles.footer}>
          {/* Footer Toggle Button - Top Center */}
          <View style={styles.footerToggleContainer}>
            <TouchableOpacity
              onPress={toggleFooter}
              style={styles.footerToggleButton}
              activeOpacity={0.8}
            >
              <Icon 
                name="keyboard-arrow-down" 
                size={20} 
                color="#9ca3af" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.footerStats}>
            <Text style={styles.footerStat}>
              Answered: {getAnsweredCount()}/{questions.length}
            </Text>
            <Text style={styles.footerStat}>
              Remaining: {getUnansweredCount()}
            </Text>
          </View>

          <View style={styles.footerActions}>
            <TouchableOpacity
              onPress={handlePreviousQuestion}
              style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
              disabled={currentQuestionIndex === 0}
              activeOpacity={0.8}
            >
              <Icon name="chevron-left" size={20} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkipQuestion}
              style={styles.navButton}
              activeOpacity={0.8}
            >
              <Icon name="skip-next" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Show Review & Submit button on ANY question if all answered */}
            {isAllAnswered() ? (
              <TouchableOpacity
                onPress={() => setShowReviewModal(true)}
                style={styles.doneButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#a855f7', '#7c3aed']}
                  style={styles.doneButtonGradient}
                >
                  <View style={styles.doneButtonContent}>
                    <Icon name="check-circle" size={20} color="#ffffff" style={styles.doneButtonIcon} />
                    <Text style={styles.doneButtonText}>Review & Submit</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : getUnansweredCount() > 0 ? (
              <TouchableOpacity
                onPress={goToUnansweredQuestion}
                style={styles.unansweredButton}
                activeOpacity={0.8}
              >
                <Icon name="help-outline" size={18} color="#f59e0b" />
                <Text style={styles.unansweredButtonText}>Go to Unanswered</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleNextQuestion}
                style={styles.navButton}
                activeOpacity={0.8}
              >
                <Text style={styles.navButtonText}>Next</Text>
                <Icon name="chevron-right" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Show Footer Button - Lower Left when collapsed */}
      {isFooterCollapsed && (
        <TouchableOpacity
          onPress={toggleFooter}
          style={styles.showFooterButton}
          activeOpacity={0.8}
        >
          <Icon 
            name="keyboard-arrow-up" 
            size={24} 
            color="#ffffff" 
          />
        </TouchableOpacity>
      )}

      {/* Floating Review & Submit Button - Lower Right when all answered */}
      {isAllAnswered() && (
        <TouchableOpacity
          onPress={() => setShowReviewModal(true)}
          style={styles.floatingReviewButton}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#a855f7', '#7c3aed']}
            style={styles.floatingReviewButtonGradient}
          >
            <Icon name="check-circle" size={20} color="#ffffff" />
            <Text style={styles.floatingReviewButtonText}>Review & Submit</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* In-screen Review Modal */}
      {showReviewModal && (
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#111827', '#0b1220']} style={styles.reviewModal}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewTitle}>Review Answers</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)} style={styles.closeButton} activeOpacity={0.8}>
                <Icon name="close" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#9ca3af', marginBottom: 10, lineHeight: 20 }}>
              Tap any question below to jump and edit your answer. After making changes, use the "Review & Submit" button (always visible at the bottom) to return here or submit your exam.
            </Text>
            <View style={styles.reviewStatsRow}>
              <Text style={styles.reviewStatText}>Answered: {getAnsweredCount()} / {questions.length}</Text>
              <Text style={styles.reviewStatText}>Remaining: {getUnansweredCount()}</Text>
            </View>
            <View style={styles.filterRow}>
              <TouchableOpacity onPress={() => setReviewFilter('all')} style={[styles.filterBtn, reviewFilter === 'all' && styles.filterBtnActive]} activeOpacity={0.8}>
                <Text style={[styles.filterBtnText, reviewFilter === 'all' && styles.filterBtnTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReviewFilter('unanswered')} style={[styles.filterBtn, reviewFilter === 'unanswered' && styles.filterBtnActive]} activeOpacity={0.8}>
                <Text style={[styles.filterBtnText, reviewFilter === 'unanswered' && styles.filterBtnTextActive]}>Unanswered</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReviewFilter('answered')} style={[styles.filterBtn, reviewFilter === 'answered' && styles.filterBtnActive]} activeOpacity={0.8}>
                <Text style={[styles.filterBtnText, reviewFilter === 'answered' && styles.filterBtnTextActive]}>Answered</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              {questions
                .map((q, idx) => ({ q, idx }))
                .filter(({ q }) => {
                  const sel = answers.get(q.questionId);
                  if (reviewFilter === 'unanswered') return !sel;
                  if (reviewFilter === 'answered') return !!sel;
                  return true;
                })
                .map(({ q, idx }) => {
                  const qid = q.questionId;
                  const sel = answers.get(qid);
                  const optionText = sel ? q[`option${['A','B','C','D','E'].indexOf(sel)+1}`] : '';
                  const answered = !!sel;
                  return (
                    <TouchableOpacity
                      key={qid}
                      onPress={() => { 
                        setShowReviewModal(false); 
                        // Animate transition to selected question (slide animation like PersonalityTestScreen)
                        animateQuestionTransition('next');
                        // Update question index immediately (animation handles the transition)
                        setCurrentQuestionIndex(idx);
                      }}
                      style={styles.reviewRow}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.reviewBadge, answered ? styles.reviewBadgeAnswered : styles.reviewBadgeUnanswered]}>
                        <Text style={styles.reviewBadgeText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewQuestion} numberOfLines={2}>{q.question}</Text>
                        <Text style={[styles.reviewAnswer, answered ? styles.reviewAnswerAnswered : styles.reviewAnswerUnanswered]}>
                          {answered ? `${sel}) ${optionText || '—'}` : 'No answer'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <View style={styles.reviewFooter}>
              <TouchableOpacity onPress={() => setShowReviewModal(false)} style={styles.modalSecondaryBtn} activeOpacity={0.8}>
                <Text style={styles.modalSecondaryText}>Continue Reviewing</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowReviewModal(false); handleSubmitExam(); }} style={styles.modalPrimaryBtn} activeOpacity={0.8}>
                <LinearGradient colors={["#a855f7", "#7c3aed"]} style={styles.modalPrimaryGradient}>
                  <Icon name="send" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.modalPrimaryText}>Submit Exam</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Security Modal */}
      <ExamSecurityModal
        visible={showSecurityModal}
        violationType={securityViolation?.type}
        message={securityViolation?.message}
        onDismiss={() => setShowSecurityModal(false)}
        onEnableAirplaneMode={() => {
          setShowSecurityModal(false);
          // In a real app, you'd trigger airplane mode here
        }}
      />


      {/* Uploading overlay removed: handled by UploadingExamScreen */}

      {/* Secondary confirm modal removed: the review modal is the single flow */}

      {/* Image Modal */}
      <ImageModal
        visible={imageModalVisible}
        imageUri={selectedImageUri}
        title={selectedImageTitle}
        onClose={closeImageModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a855f7',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },

  // Instructions Styles
  instructionsScrollContent: {
    flexGrow: 1,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingTop: Platform.OS === 'ios' ? (isShortScreen ? 10 : 20) : 20,
    paddingBottom: Platform.OS === 'ios' ? (isShortScreen ? 30 : 40) : 40,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: isShortScreen ? 16 : 20,
    marginBottom: isShortScreen ? 16 : 24,
  },
  backButton: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 21,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  instructionsSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  headerActions: {
    width: 40,
    alignItems: 'flex-end',
  },
  examIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  examInfoCard: {
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    overflow: 'hidden',
  },
  examInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  examInfoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  examInfoContent: {
    flex: 1,
  },
  examRef: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  examDetails: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  instructionsCard: {
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  instructionsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  warningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  instructionsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  instructionsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  processOverview: {
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  processTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#a855f7',
    marginBottom: 12,
  },
  processSteps: {
    gap: 8,
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processStepText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  processStepTextCurrent: {
    fontSize: 14,
    color: '#a855f7',
    fontWeight: '700',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  instruction: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
    lineHeight: 20,
  },
  startExamButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  startButtonGradient: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  startButtonIcon: {
    marginRight: 8,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  startButtonArrow: {
    marginLeft: 8,
  },

  // Exam Screen Styles
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingTop: Platform.OS === 'ios' ? (isShortScreen ? 10 : 20) : 20,
    paddingBottom: isShortScreen ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 21,
  },
  examHeaderLeft: {
    flex: 1,
  },
  questionCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a855f7',
    borderRadius: 3,
  },
  categoryContainer: {
    marginTop: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryTag: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryTagText: {
    fontSize: 11,
    color: '#a855f7',
    fontWeight: '600',
  },
  examHeaderRight: {
    marginLeft: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  timerWarning: {
    color: '#ef4444',
  },
  questionScrollView: {
    flex: 1,
  },
  questionScrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isShortScreen ? 16 : 20,
    paddingBottom: isShortScreen ? 140 : 160, // Adjusted for different screen sizes
  },
  questionScrollContentCollapsed: {
    paddingBottom: isShortScreen ? 80 : 100, // More space when footer is completely hidden
  },
  questionCardContainer: {
    // Container for animated question card
  },
  questionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
  },
  questionNumberContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#a855f7',
  },
  currentQuestionCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  currentQuestionCategoryLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  currentQuestionCategoryBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentQuestionCategoryText: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '600',
  },
  questionStatus: {
    alignItems: 'flex-end',
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    gap: 4,
  },
  answeredText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  unansweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
    gap: 4,
  },
  unansweredText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  questionSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  questionText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    fontWeight: '500',
  },
  directionSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginTop: -8,
  },
  directionText: {
    fontSize: 14,
    color: '#a855f7',
    lineHeight: 20,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  questionImageContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  questionImageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  questionImage: {
    width: '100%',
    height: 200, // Restored original size
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    // Performance optimizations
    shouldRasterizeIOS: true,
    renderToHardwareTextureAndroid: true,
    // Additional performance optimizations
    overflow: 'hidden',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  optionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    // Performance optimizations
    shouldRasterizeIOS: true,
    renderToHardwareTextureAndroid: true,
  },
  optionGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  selectedOptionGradient: {
    borderColor: '#a855f7',
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedOptionCircle: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: '#a855f7',
  },
  optionLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9ca3af',
  },
  selectedOptionLetter: {
    color: '#a855f7',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 22,
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  optionImageContainer: {
    marginTop: 12,
  },
  optionImageWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  optionImage: {
    width: '100%',
    height: 120, // Restored original size
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    // Performance optimizations
    shouldRasterizeIOS: true,
    renderToHardwareTextureAndroid: true,
    // Additional performance optimizations
    overflow: 'hidden',
  },
  optionImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isShortScreen ? 12 : 16,
    paddingBottom: Platform.OS === 'ios' ? (isShortScreen ? 25 : 34) : 16, // Safe area handling
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(10, 10, 26, 0.98)',
    transition: 'all 0.3s ease-in-out', // Smooth transition
  },
  footerToggleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  footerToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  showFooterButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? (isShortScreen ? 20 : 28) : 16,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(10, 10, 26, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingReviewButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? (isShortScreen ? 20 : 28) : 16,
    right: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  floatingReviewButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  floatingReviewButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  footerStat: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 20,
    paddingVertical: 14, // Increased padding for better touch target
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 48, // Ensure minimum touch target size
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginHorizontal: 8,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    minHeight: 48,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a855f7',
    marginLeft: 6,
  },
  // Review modal styles
  reviewModal: {
    width: width - 40,
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  reviewStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewStatText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  filterBtnActive: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderColor: 'rgba(168,85,247,0.35)'
  },
  filterBtnText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 12,
  },
  filterBtnTextActive: {
    color: '#a855f7',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  reviewBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  reviewBadgeAnswered: { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  reviewBadgeUnanswered: { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.28)' },
  reviewBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  reviewQuestion: { color: '#ffffff', fontSize: 13, lineHeight: 18, marginBottom: 2 },
  reviewAnswer: { fontSize: 12 },
  reviewAnswerAnswered: { color: '#9ae6b4' },
  reviewAnswerUnanswered: { color: '#fca5a5' },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  modalSecondaryText: { color: '#ffffff', fontWeight: '600' },
  modalPrimaryBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalPrimaryGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  modalPrimaryText: { color: '#ffffff', fontWeight: '700' },
  doneButton: {
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  doneButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14, // Increased padding for better touch target
    justifyContent: 'center',
    minHeight: 48, // Ensure minimum touch target size
  },
  doneButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonIcon: {
    marginRight: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  unansweredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  unansweredButtonText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmModal: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    padding: 24,
  },
  confirmModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalSecondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  confirmModalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  confirmModalPrimaryButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmModalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  confirmModalButtonIcon: {
    marginRight: 8,
  },
  confirmModalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  uploadCard: {
    width: width - 40,
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    alignItems: 'center'
  },
  uploadIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 6 },
  uploadSubtitle: { color: '#9ca3af', fontSize: 12, textAlign: 'center' },
});
