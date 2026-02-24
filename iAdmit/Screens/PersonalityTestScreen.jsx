import React, { useEffect, useState, useRef } from 'react';
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
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Animated,
  AppState
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { getPersonalityTestQuestions, getAllPersonalityTestQuestions, submitPersonalityAnswers, getPersonalityStatus, notifyExamStopped } from '../API/exam';
import KeepAwakeWrapper from '../utils/KeepAwakeWrapper';
import { useExamStore } from '../stores/examStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ExamSecurityModal from '../components/ExamSecurityModal';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 350;
const isShortScreen = height < 700;

export default function PersonalityTestScreen({ navigation, route }) {
  const { examId, examRefNo, examTitle, timeLimit, includesPersonalityTest } = route.params;
  
  // Use shared exam store for timer and state management
  const {
    timeRemaining,
    isExamStarted,
    startExam,
    updateTimeRemaining,
    saveTimerToStorage,
    restoreExamTimer,
    resetExam,
    addPenalty,
    addSecurityViolation
  } = useExamStore();
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPersonalityPhase, setIsPersonalityPhase] = useState(true);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const overviewHeightAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const ANSWERS_STORAGE_KEY = useRef(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityViolation, setSecurityViolation] = useState(null);
  const [showTakenModal, setShowTakenModal] = useState(false);

  // Initialize personality test and shared timer
  useEffect(() => {
    initializePersonalityTest();
    KeepAwakeWrapper.activate();
    // No screen pinning needed for personality test
    AsyncStorage.setItem('last_route', JSON.stringify({
      name: 'PersonalityTest',
      params: { examId, examRefNo, examTitle, timeLimit, includesPersonalityTest }
    })).catch(() => {});
    
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();
    
    return () => {
      KeepAwakeWrapper.deactivate();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Notify backend when leaving personality test screen (if exam not completed)
      const notifyStop = async () => {
        try {
          await notifyExamStopped(examId);
          console.log('[PersonalityTestScreen] Notified backend of personality test exit');
        } catch (error) {
          console.log('[PersonalityTestScreen] Error notifying exam stop:', error);
        }
      };
      notifyStop();
    };
  }, []);

  // Shared timer effect - updates every second when exam is running
  useEffect(() => {
    if (isExamStarted && isPersonalityPhase) {
      console.log('[PersonalityTestScreen] Starting shared timer for personality phase');
      KeepAwakeWrapper.activate();

      // Set up interval to update every second
      timerRef.current = setInterval(() => {
        const remainingTime = updateTimeRemaining();
        // Mark last active timestamp for cold-start detection
        AsyncStorage.setItem('last_active_ts', String(Date.now())).catch(() => {});
        
        // Check if time is up
        if (remainingTime <= 0) {
          console.log('[PersonalityTestScreen] Time is up during personality phase');
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          Alert.alert(
            'Time\'s Up!',
            'The exam time has ended. Any unanswered questions will be marked as incorrect.',
            [{ text: 'OK', onPress: handleTimeUp }]
          );
          return;
        }
        
        // Save timer state every 30 seconds
        if (remainingTime % 30 === 0) {
          saveTimerToStorage();
          AsyncStorage.setItem('last_route', JSON.stringify({
            name: 'PersonalityTest',
            params: { examId, examRefNo, examTitle, timeLimit, includesPersonalityTest: true }
          })).catch(() => {});
        }
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        KeepAwakeWrapper.deactivate();
      };
    } else {
      // Stop timer if not in personality phase or exam not started
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isExamStarted, isPersonalityPhase]);

  // No screen pinning monitoring needed for personality test

  // App state handling for timer save/restore
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isExamStarted && isPersonalityPhase) {
          const remaining = updateTimeRemaining();
          if (remaining <= 0) {
            handleTimeUp();
            return;
          }
          // Foreground event counts as violation to discourage app switching
          handleSecurityViolation('background', 'App was backgrounded during personality test');
        }
      } else if (nextAppState.match(/inactive|background/) && isExamStarted && isPersonalityPhase) {
        saveTimerToStorage();
        AsyncStorage.setItem('last_route', JSON.stringify({
          name: 'PersonalityTest',
          params: { examId, examRefNo, examTitle, timeLimit, includesPersonalityTest, resumeIndex: currentQuestionIndex }
        })).catch(() => {});
        // App going to background triggers a violation immediately
        handleSecurityViolation('background', 'App moved to background during personality test');
      }
      appState.current = nextAppState;
    });

    return () => subscription?.remove();
  }, [isExamStarted, isPersonalityPhase, currentQuestionIndex]);

  // Cold-start detection on init
  useEffect(() => {
    (async () => {
      try {
        const lastTs = await AsyncStorage.getItem('last_active_ts');
        if (lastTs && isExamStarted && isPersonalityPhase) {
          const gap = Date.now() - parseInt(lastTs, 10);
          if (gap > 10000) {
            console.log('[PersonalityTestScreen] Cold start detected, potential penalty. Gap(ms):', gap);
            await handleSecurityViolation('cold_start', 'App was closed or inactive for too long during personality test');
          }
        }
      } catch {}
    })();
  }, []);

  const handleSecurityViolation = async (type, message) => {
    try {
      const violation = { type, message, timestamp: Date.now() };
      addSecurityViolation(violation);
      await addPenalty();
      setSecurityViolation(violation);
      setShowSecurityModal(true);
    } catch (e) {
      console.log('[PersonalityTestScreen] Failed to handle security violation:', e?.message);
    }
  };

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Exit Personality Test?',
        'Are you sure you want to exit? Your progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Exit', 
            style: 'destructive',
            onPress: async () => {
              // Notify backend that exam is being stopped
              try {
                await notifyExamStopped(examId);
                console.log('[PersonalityTestScreen] Notified backend of manual exit');
              } catch (error) {
                console.log('[PersonalityTestScreen] Error notifying exam stop on exit:', error);
              }
              navigation.replace('Dashboard');
            }
          }
        ]
      );
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const initializePersonalityTest = async () => {
    try {
      console.log('[PersonalityTestScreen] Initializing personality test for examId:', examId);
      console.log('[PersonalityTestScreen] Includes personality test:', includesPersonalityTest);
      console.log('[PersonalityTestScreen] Time limit from database:', timeLimit);
      
      // Prepare storage key
      ANSWERS_STORAGE_KEY.current = `personality_answers_${examId}`;

      // New: Check if already taken
      try {
        const status = await getPersonalityStatus();
        if (status?.has_taken) {
          setShowTakenModal(true);
          return;
        }
      } catch (e) {
        console.log('[PersonalityTestScreen] Personality status check failed (continuing):', e?.message);
      }

      // First try to restore existing timer
      const timerRestored = await restoreExamTimer();
      
      if (!timerRestored && !isExamStarted) {
        // No existing timer, start fresh with the database time limit
        const timeLimitMinutes = parseInt(timeLimit) || 60;
        await startExam(timeLimitMinutes, examId, 'regular', 'personality');
        console.log('[PersonalityTestScreen] Started new shared timer:', timeLimitMinutes, 'minutes (personality phase)');
      } else {
        console.log('[PersonalityTestScreen] Using existing shared timer, remaining:', timeRemaining);
      }
      // If timer has expired after restore/start, handle immediately
      const remainingAfterInit = useExamStore.getState().timeRemaining;
      if (typeof remainingAfterInit === 'number' && remainingAfterInit <= 0) {
        console.log('[PersonalityTestScreen] Timer expired on init, handling time up');
        handleTimeUp();
        return;
      }
      
      // Always try to fetch personality test questions from API first
      const data = await getPersonalityTestQuestions(examId);
      setQuestions(data.personality_questions);
      await hydrateAnswersFromStorage(data.personality_questions);

      // Attempt resume index
      const raw = await AsyncStorage.getItem('last_route');
      let appliedIndex = false;
      if (raw) {
        const parsed = JSON.parse(raw);
        const idx = parsed?.params?.resumeIndex;
        if (typeof idx === 'number' && idx >= 0 && idx < data.personality_questions.length) {
          setCurrentQuestionIndex(idx);
          appliedIndex = true;
        }
      }
      if (!appliedIndex) {
        // Fallback to first unanswered, else last answered
        let firstUnanswered = getFirstUnansweredQuestionIndex();
        if (firstUnanswered !== -1) setCurrentQuestionIndex(firstUnanswered);
        else if (answers.size > 0) setCurrentQuestionIndex(Math.max(0, data.personality_questions.length - 1));
      }
      
      console.log('[PersonalityTestScreen] Personality test initialized:', {
        examId,
        questionsCount: data.personality_questions.length,
        isExamSpecific: includesPersonalityTest,
        sharedTimerRemaining: timeRemaining,
        firstQuestionSample: data.personality_questions[0]
      });
      
    } catch (error) {
      console.log('[PersonalityTestScreen] Error initializing personality test:', error?.message);
      console.log('[PersonalityTestScreen] Error details:', error?.response?.data);
      
      // Try to get all personality questions as fallback
      try {
        console.log('[PersonalityTestScreen] Trying fallback: all personality questions');
        const fallbackData = await getAllPersonalityTestQuestions();
        setQuestions(fallbackData.personality_questions);
        console.log('[PersonalityTestScreen] Fallback successful: got', fallbackData.personality_questions.length, 'questions');
        console.log('[PersonalityTestScreen] Fallback first question sample:', fallbackData.personality_questions[0]);
      } catch (fallbackError) {
        console.log('[PersonalityTestScreen] Fallback also failed:', fallbackError?.message);
        
        // If both APIs fail, create minimal default questions as last resort
        try {
          const defaultQuestions = await createDefaultPersonalityQuestions();
          setQuestions(defaultQuestions);
          console.log('[PersonalityTestScreen] Using minimal default personality questions');
          
          Alert.alert(
            'Connection Issue', 
            'Unable to load personality questions from server. Using offline questions.',
            [{ text: 'Continue' }]
          );
        } catch (defaultError) {
          Alert.alert('Error', 'Failed to load personality test. Please try again.');
          navigation.replace('Dashboard');
        }
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
      const restored = new Map();
      let count = 0;
      for (const q of fetchedQuestions || questions) {
        const qid = getQuestionId(q);
        if (saved[qid]) {
          restored.set(qid, saved[qid]);
          count++;
        }
      }
      if (count > 0) {
        setAnswers(restored);
      }
      console.log('[PersonalityTestScreen] Hydrated personality answers:', count);
    } catch (e) {
      console.log('[PersonalityTestScreen] Failed to hydrate personality answers:', e?.message);
    }
  };

  const persistAnswersToStorage = async (nextMap) => {
    try {
      const key = ANSWERS_STORAGE_KEY.current;
      const obj = Object.fromEntries(nextMap);
      await AsyncStorage.setItem(key, JSON.stringify(obj));
      console.log('[PersonalityTestScreen] Persisted answers:', Object.keys(obj).length);
    } catch (e) {
      console.log('[PersonalityTestScreen] Failed to persist answers:', e?.message);
    }
  };

  // Create default personality questions when exam doesn't include specific ones
  const createDefaultPersonalityQuestions = async () => {
    return [
      {
        questionId: 'personality_default_1',
        personality_question_id: 'default_1',
        question: 'Do you prefer working in groups rather than alone?',
        option1: 'Yes',
        option2: 'No',
        dichotomy: 'EI',
        positive_side: 'E',
        negative_side: 'I',
        question_type: 'personality'
      },
      {
        questionId: 'personality_default_2',
        personality_question_id: 'default_2',
        question: 'Do you focus more on details and facts than on possibilities?',
        option1: 'Yes',
        option2: 'No',
        dichotomy: 'SN',
        positive_side: 'S',
        negative_side: 'N',
        question_type: 'personality'
      },
      {
        questionId: 'personality_default_3',
        personality_question_id: 'default_3',
        question: 'Do you make decisions based on logic rather than feelings?',
        option1: 'Yes',
        option2: 'No',
        dichotomy: 'TF',
        positive_side: 'T',
        negative_side: 'F',
        question_type: 'personality'
      },
      {
        questionId: 'personality_default_4',
        personality_question_id: 'default_4',
        question: 'Do you prefer having a clear plan rather than keeping options open?',
        option1: 'Yes',
        option2: 'No',
        dichotomy: 'JP',
        positive_side: 'J',
        negative_side: 'P',
        question_type: 'personality'
      },
      {
        questionId: 'personality_default_5',
        personality_question_id: 'default_5',
        question: 'Do you enjoy meeting new people and socializing?',
        option1: 'Yes',
        option2: 'No',
        dichotomy: 'EI',
        positive_side: 'E',
        negative_side: 'I',
        question_type: 'personality'
      },
      {
        questionId: 'personality_default_6',
        personality_question_id: 'default_6',
        question: 'Do you prefer practical and concrete information over abstract theories?',
        option1: 'Yes',
        option2: 'No',
        dichotomy: 'SN',
        positive_side: 'S',
        negative_side: 'N',
        question_type: 'personality'
      },
      {
        questionId: 'personality_default_7',
        personality_question_id: 'default_7',
        question: 'Do you prioritize being objective and fair over being compassionate?',
        option1: 'Yes',
        option2: 'No',
        dichotomy: 'TF',
        positive_side: 'T',
        negative_side: 'F',
        question_type: 'personality'
      },
      {
        questionId: 'personality_default_8',
        personality_question_id: 'default_8',
        question: 'Do you prefer to stick to schedules and deadlines?',
        option1: 'Yes',
        option2: 'No',
        dichotomy: 'JP',
        positive_side: 'J',
        negative_side: 'P',
        question_type: 'personality'
      }
    ];
  };

  const handleAnswerSelect = (questionId, answer) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, answer);
    setAnswers(newAnswers);
    // Persist answers and resume position
    persistAnswersToStorage(newAnswers);
    AsyncStorage.setItem('last_route', JSON.stringify({
      name: 'PersonalityTest',
      params: { examId, examRefNo, examTitle, timeLimit, includesPersonalityTest, resumeIndex: currentQuestionIndex }
    })).catch(() => {});
    console.log('[PersonalityTestScreen] Answer selected:', { 
      questionId, 
      answer,
      totalAnswers: newAnswers.size,
      totalQuestions: questions.length,
      currentQuestion: currentQuestionIndex + 1
    });
    
    // Add subtle animation for answer selection
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
    ]).start(() => {
      // Auto-advance to next question after animation completes
      if (currentQuestionIndex < questions.length - 1) {
        // Add a slight delay for better UX
        setTimeout(() => {
          handleNextQuestion();
        }, 300);
      } else {
        // If this is the last question, only auto-complete if all questions are answered
        if (answers.size === questions.length) {
          setTimeout(() => {
            handleCompletePersonalityTest();
          }, 500);
        }
        // Otherwise, user will need to use the "Done" button or "Go to Unanswered" button
      }
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      AsyncStorage.setItem('last_route', JSON.stringify({
        name: 'PersonalityTest',
        params: { examId, examRefNo, examTitle, timeLimit, includesPersonalityTest, resumeIndex: currentQuestionIndex + 1 }
      })).catch(() => {});
      
      // Add slide animation
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 30,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      AsyncStorage.setItem('last_route', JSON.stringify({
        name: 'PersonalityTest',
        params: { examId, examRefNo, examTitle, timeLimit, includesPersonalityTest, resumeIndex: currentQuestionIndex - 1 }
      })).catch(() => {});
      
      // Add slide animation
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  const handleCompletePersonalityTest = () => {
    if (answers.size < questions.length) {
      const unanswered = questions.length - answers.size;
      const firstUnanswered = getFirstUnansweredQuestionIndex();
      
      Alert.alert(
        'Incomplete Test',
        `You have ${unanswered} unanswered question(s). Would you like to go to the first unanswered question?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Unanswered', 
            onPress: () => {
              if (firstUnanswered !== -1) {
                setCurrentQuestionIndex(firstUnanswered);
              }
            }
          }
        ]
      );
      return;
    }

    // Calculate time used for personality test only
    const totalTimeLimitMinutes = parseInt(timeLimit) || 60;
    const totalTimeSeconds = totalTimeLimitMinutes * 60;
    const timeUsedSeconds = totalTimeSeconds - timeRemaining;
    
    // Format time used in a readable way
    const formatTimeUsed = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      } else {
        return `${secs}s`;
      }
    };

    // Navigate to a dedicated review screen before submission
    const answersObject = Object.fromEntries(answers);
    navigation.navigate('PersonalityReview', {
      examId,
      examRefNo,
      timeLimit,
      examTitle,
      questions,
      answers: answersObject
    });
  };

  const handleTimeUp = () => {
    Alert.alert(
      'Time\'s Up!',
      'The exam time has ended. Proceeding to submit with current answers.',
      [{ 
        text: 'OK', 
        onPress: () => {
          // If time is up during personality phase, proceed with available answers
          const answersObject = Object.fromEntries(answers);
          const target = {
            examId,
            examRefNo,
            timeLimit,
            examTitle,
            examType: 'regular',
            personalityAnswers: answersObject
          };
          // Clear personality cache when moving to exam due to timeout
          AsyncStorage.removeItem(`personality_answers_${examId}`).catch(() => {});
          AsyncStorage.setItem('last_route', JSON.stringify({ name: 'ExamScreen', params: target })).catch(() => {});
          navigation.replace('ExamScreen', target);
        }
      }]
    );
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      // Show HH:MM:SS format when there are hours
      return `${hours.toString().padStart(1, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      // Show MM:SS format when less than an hour
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getTimeColor = () => {
    if (timeRemaining <= 300) return '#ef4444'; // Red for last 5 minutes
    if (timeRemaining <= 600) return '#f59e0b'; // Amber for last 10 minutes
    return '#10b981'; // Green otherwise
  };

  const formatProgress = () => {
    return `${currentQuestionIndex + 1} of ${questions.length}`;
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

  const getQuestionId = (question) => {
    // Ensure consistent question ID handling
    return question.questionId || question.id || question.personality_question_id;
  };

  const getFirstUnansweredQuestionIndex = () => {
    console.log('[PersonalityTestScreen] Checking for unanswered questions...');
    console.log('[PersonalityTestScreen] Total questions:', questions.length);
    console.log('[PersonalityTestScreen] Total answers:', answers.size);
    console.log('[PersonalityTestScreen] Answer keys:', Array.from(answers.keys()));
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionId = getQuestionId(question);
      const hasAnswer = answers.has(questionId);
      
      console.log(`[PersonalityTestScreen] Question ${i + 1}:`, {
        questionId: questionId,
        originalQuestionId: question.questionId,
        hasAnswer,
        question: question.question?.substring(0, 50) + '...'
      });
      
      if (!hasAnswer) {
        console.log('[PersonalityTestScreen] Found first unanswered at index:', i);
        return i;
      }
    }
    
    console.log('[PersonalityTestScreen] All questions are answered');
    return -1; // All questions answered
  };

  const isAllAnswered = () => {
    return answers.size === questions.length && questions.length > 0;
  };

  const goToUnansweredQuestion = () => {
    const unansweredIndex = getFirstUnansweredQuestionIndex();
    if (unansweredIndex !== -1) {
      setCurrentQuestionIndex(unansweredIndex);
      
      // Add slide animation
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 30,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  const toggleOverview = () => {
    const toValue = isOverviewExpanded ? 0 : 1;
    setIsOverviewExpanded(!isOverviewExpanded);
    
    Animated.timing(overviewHeightAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Persist resume index whenever it changes (belt-and-suspenders)
  useEffect(() => {
    AsyncStorage.setItem('last_route', JSON.stringify({
      name: 'PersonalityTest',
      params: { examId, examRefNo, examTitle, timeLimit, includesPersonalityTest, resumeIndex: currentQuestionIndex }
    })).catch(() => {});
  }, [currentQuestionIndex]);

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = currentQuestion ? answers.has(getQuestionId(currentQuestion)) : false;
  const selectedAnswer = currentQuestion ? answers.get(getQuestionId(currentQuestion)) : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <LinearGradient
          colors={['rgba(20, 71, 230, 0.02)', 'rgba(29, 41, 61, 0.01)']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <View style={styles.loadingIconContainer}>
              <Icon name="psychology" size={60} color="#1447E6" />
            </View>
            <Text style={styles.loadingText}>Loading Personality Test...</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Background - removed for light theme */}

      {/* Minimal Header */}
      <Animated.View style={[styles.minimalHeader, { opacity: fadeAnim }]}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.minimalTitle}>Personality Test</Text>
            {examTitle && (
              <Text style={styles.examTitleText} numberOfLines={1}>{examTitle}</Text>
            )}
            <Text style={styles.questionCounter}>Q{currentQuestionIndex + 1}/{questions.length}</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={toggleOverview}
              style={styles.infoButton}
              activeOpacity={0.7}
            >
              <Icon 
                name={isOverviewExpanded ? "expand-less" : "info-outline"} 
                size={20} 
                color="#1447E6" 
              />
            </TouchableOpacity>
            
            <View style={styles.compactTimer}>
              <Icon name="schedule" size={14} color={getTimeColor()} />
              <Text style={[styles.compactTimerText, { color: getTimeColor() }]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Minimal Progress Bar */}
        <View style={styles.minimalProgressBar}>
          <Animated.View 
            style={[
              styles.minimalProgressFill, 
              { 
                width: `${getProgressPercentage()}%`,
                backgroundColor: '#1447E6'
              }
            ]} 
          />
        </View>
      </Animated.View>

      {/* Collapsible Process Overview */}
      {isOverviewExpanded && (
        <Animated.View 
          style={[
            styles.collapsibleOverview,
            { 
              opacity: overviewHeightAnim,
              transform: [
                { scaleY: overviewHeightAnim },
                { translateY: overviewHeightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })}
              ]
            }
          ]}
        >
          <View style={styles.compactOverviewCard}>
            <View style={styles.compactSteps}>
              <View style={styles.compactStep}>
                <Icon name="radio-button-checked" size={14} color="#1447E6" />
                <Text style={styles.compactStepTextCurrent}>1. Personality Test (Current)</Text>
              </View>
              <View style={styles.compactStep}>
                <Icon name="radio-button-unchecked" size={14} color="#6b7280" />
                <Text style={styles.compactStepTextPending}>2. Academic Exam (Next)</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Minimal Question Content */}
      {currentQuestion && (
        <Animated.View 
          style={[
            { flex: 1 },
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <ScrollView 
            style={styles.minimalQuestionContainer}
            contentContainerStyle={styles.minimalQuestionContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Minimal Question Card */}
            <View style={styles.minimalQuestionCard}>
              {/* Question Text */}
              <View style={styles.minimalQuestionSection}>
                <Text style={styles.minimalQuestionText}>{currentQuestion.question}</Text>
              </View>

              {/* Minimal Options */}
              <View style={styles.minimalOptionsContainer}>
                {['A', 'B'].map((option, index) => {
                  const optionText = index === 0 ? currentQuestion.option1 : currentQuestion.option2;
                  const isSelected = selectedAnswer === option;
                  
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => handleAnswerSelect(getQuestionId(currentQuestion), option)}
                      style={[
                        styles.minimalOptionButton,
                        isSelected && styles.minimalOptionSelected
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.minimalOptionContent}>
                        <View style={[
                          styles.minimalOptionIndicator,
                          isSelected && styles.minimalOptionIndicatorSelected
                        ]}>
                          <Icon 
                            name={isSelected ? "check" : (index === 0 ? "check" : "close")} 
                            size={18} 
                            color={isSelected ? '#ffffff' : '#6b7280'} 
                          />
                        </View>
                        <Text style={[
                          styles.minimalOptionText,
                          isSelected && styles.minimalOptionTextSelected
                        ]}>
                          {optionText}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* Footer */}
      <Animated.View 
        style={[
          styles.footer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.footerContent}>
          {/* Previous Button */}
          <TouchableOpacity
            onPress={handlePreviousQuestion}
            style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            disabled={currentQuestionIndex === 0}
            activeOpacity={0.8}
          >
            <Icon name="chevron-left" size={16} color="#9ca3af" />
          </TouchableOpacity>

          {/* Progress Info */}
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {getAnsweredCount()}/{questions.length}
            </Text>
            {!isAllAnswered() ? (
              <View style={styles.unansweredBadge}>
                <Icon name="help-outline" size={10} color="#f59e0b" />
                <Text style={styles.unansweredBadgeText}>
                  {getUnansweredCount()}
                </Text>
              </View>
            ) : (
              <View style={styles.completedBadge}>
                <Icon name="check-circle" size={10} color="#10b981" />
                <Text style={styles.completedBadgeText}>
                  Complete
                </Text>
              </View>
            )}
          </View>

          {/* Action Button */}
          {isAllAnswered() ? (
            <TouchableOpacity
              onPress={handleCompletePersonalityTest}
              style={styles.actionButton}
              activeOpacity={0.8}
            >
              <Icon name="check" size={16} color="#ffffff" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          ) : getUnansweredCount() > 0 ? (
            <TouchableOpacity
              onPress={goToUnansweredQuestion}
              style={styles.unansweredActionButton}
              activeOpacity={0.8}
            >
              <Icon name="help-outline" size={16} color="#ffffff" />
              <Text style={styles.unansweredActionText}>Unanswered</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleNextQuestion}
              style={styles.nextButton}
              activeOpacity={0.8}
            >
              <Icon name="chevron-right" size={16} color="#ffffff" />
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Security Modal (same UX as ExamScreen) */}
      <ExamSecurityModal
        visible={showSecurityModal}
        violationType={securityViolation?.type}
        message={securityViolation?.message}
        onDismiss={() => setShowSecurityModal(false)}
        onEnableAirplaneMode={() => {
          setShowSecurityModal(false);
        }}
      />
      {showTakenModal && (
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
            style={styles.confirmModal}
          >
            <View style={styles.confirmModalHeader}>
              <View style={styles.confirmModalIconContainerWarning}>
                <Icon name="warning" size={32} color="#f59e0b" />
              </View>
              <Text style={styles.confirmModalTitle}>Personality Test Already Taken</Text>
            </View>
            <Text style={styles.confirmModalText}>
              You already completed the personality test. Do you want to proceed to the academic exam?
            </Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowTakenModal(false);
                  navigation.replace('Dashboard');
                }}
                style={styles.confirmModalSecondaryButton}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmModalSecondaryButtonText}>No, go back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowTakenModal(false);
                  const target = { examId, examRefNo, timeLimit, examTitle, examType: 'regular' };
                  AsyncStorage.setItem('last_route', JSON.stringify({ name: 'ExamScreen', params: target })).catch(() => {});
                  navigation.replace('ExamScreen', target);
                }}
                style={styles.confirmModalPrimaryButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  style={styles.confirmModalButtonGradient}
                >
                  <Icon name="arrow-forward" size={16} color="#ffffff" style={styles.confirmModalButtonIcon} />
                  <Text style={styles.confirmModalPrimaryButtonText}>Proceed to Exam</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 3,
    borderColor: 'rgba(20, 71, 230, 0.3)',
  },
  loadingText: {
    color: '#1D293D',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1447E6',
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

  // Minimal Header Styles
  minimalHeader: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? (isShortScreen ? 10 : 20) : 20,
    paddingBottom: 16,
    marginTop: 21,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
  },
  minimalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D293D',
    marginBottom: 2,
  },
  examTitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  questionCounter: {
    fontSize: 13,
    color: '#1447E6',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 71, 230, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  compactTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 41, 61, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  compactTimerText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  minimalProgressBar: {
    height: 3,
    backgroundColor: 'rgba(29, 41, 61, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  minimalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Enhanced Header Styles (kept for reference)
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? (isShortScreen ? 10 : 20) : 20,
    paddingBottom: isShortScreen ? 20 : 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 21,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  headerTitleContainer: {
    marginBottom: 16,
  },
  testTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  testSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a855f7',
  },
  progressSection: {
    gap: 8,
  },
  progressText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a855f7',
    borderRadius: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  personalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    gap: 6,
  },
  personalityText: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '600',
  },

  // Collapsible Overview Styles
  collapsibleOverview: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingBottom: 16,
    transformOrigin: 'top',
  },
  compactOverviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
    padding: 16,
  },
  compactSteps: {
    gap: 8,
  },
  compactStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactStepTextCurrent: {
    fontSize: 13,
    color: '#a855f7',
    fontWeight: '600',
  },
  compactStepTextPending: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Enhanced Overview Styles (kept for reference)
  overviewContainer: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingBottom: 20,
  },
  overviewCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    padding: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#a855f7',
  },
  processSteps: {
    gap: 10,
    marginBottom: 16,
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  processStepTextCurrent: {
    fontSize: 15,
    color: '#a855f7',
    fontWeight: '700',
  },
  processStepTextPending: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  overviewDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Minimal Question Styles
  minimalQuestionContainer: {
    flex: 1,
  },
  minimalQuestionContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingVertical: 20,
    paddingBottom: 120,
  },
  minimalQuestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(29, 41, 61, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  minimalQuestionSection: {
    marginBottom: 32,
  },
  minimalQuestionText: {
    fontSize: 19,
    color: '#1D293D',
    lineHeight: 28,
    fontWeight: '500',
    textAlign: 'center',
  },
  minimalOptionsContainer: {
    gap: 12,
  },
  minimalOptionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(29, 41, 61, 0.15)',
    overflow: 'hidden',
  },
  minimalOptionSelected: {
    backgroundColor: 'rgba(20, 71, 230, 0.08)',
    borderColor: '#1447E6',
  },
  minimalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  minimalOptionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(29, 41, 61, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimalOptionIndicatorSelected: {
    backgroundColor: '#1447E6',
  },
  minimalOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#1D293D',
    fontWeight: '500',
  },
  minimalOptionTextSelected: {
    fontWeight: '600',
  },

  // Enhanced Question Styles (kept for reference)
  questionScrollView: {
    flex: 1,
  },
  questionScrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingBottom: isShortScreen ? 160 : 180,
  },
  questionCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 20,
  },
  questionNumberContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#a855f7',
  },
  questionStatus: {
    alignItems: 'flex-end',
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  answeredText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  unansweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
    gap: 6,
  },
  unansweredText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  questionSection: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  questionText: {
    fontSize: 18,
    color: '#ffffff',
    lineHeight: 28,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Enhanced Options Styles
  optionsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  optionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionGradient: {
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  selectedOptionGradient: {
    borderColor: '#a855f7',
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedOptionCircle: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: '#a855f7',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 18,
    color: '#ffffff',
    lineHeight: 26,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  selectedIndicator: {
    marginLeft: 20,
  },

  // Footer Styles
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(29, 41, 61, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  footerContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
  },
  
  // Navigation Buttons
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1D293D',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  
  // Progress Info
  progressInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1447E6',
    marginBottom: 8,
  },
  unansweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f59e0b',
    gap: 6,
  },
  unansweredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10b981',
    gap: 6,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  
  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1447E6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: '#1447E6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unansweredActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    gap: 8,
  },
  unansweredActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#1D293D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D293D',
  },

  // Minimal Footer Styles
  minimalFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: isSmallScreen ? 20 : 28,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(29, 41, 61, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  minimalFooterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minimalNavButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(29, 41, 61, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(29, 41, 61, 0.15)',
  },
  minimalNavButtonDisabled: {
    opacity: 0.3,
  },
  minimalProgress: {
    backgroundColor: 'rgba(20, 71, 230, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 2,
  },
  completedHint: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1447E6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#1447E6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  unansweredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 4,
  },
  unansweredButtonText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
  minimalCompleteIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  minimalNextIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(156, 163, 175, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.1)',
  },
  minimalCompleteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  // Modal styles (warning)
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmModal: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(29, 41, 61, 0.1)',
    overflow: 'hidden',
    padding: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmModalIconContainerWarning: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D293D',
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#6b7280',
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
    backgroundColor: 'rgba(29, 41, 61, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(29, 41, 61, 0.15)',
  },
  confirmModalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D293D',
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
});