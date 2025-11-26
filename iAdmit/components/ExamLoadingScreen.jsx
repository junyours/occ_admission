import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import ScreenPinning from '../utils/ScreenPinning';
import { updateExamPhase } from '../API/exam';

const { width, height } = Dimensions.get('window');

const ExamLoadingScreen = ({ 
  visible = false, 
  hasPersonalityTest = false,
  onComplete = () => {},
  // Optional pin guard: poll for Android screen pinning up to 60s, then fall back
  pinGuard = false,
  examId = null,
  examType = 'regular',
  onTimeout = () => {}
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = hasPersonalityTest ? [
    {
      title: 'Processing Academic Answers',
      subtitle: 'Calculating exam score...',
      icon: 'quiz',
      duration: 2000
    },
    {
      title: 'Analyzing Personality Profile',
      subtitle: 'Determining MBTI type...',
      icon: 'psychology',
      duration: 2500
    },
    {
      title: 'Generating Course Recommendations',
      subtitle: 'Finding suitable programs...',
      icon: 'school',
      duration: 2000
    },
    {
      title: 'Finalizing Results',
      subtitle: 'Almost ready...',
      icon: 'check-circle',
      duration: 1000
    }
  ] : [
    {
      title: 'Processing Academic Answers',
      subtitle: 'Calculating exam score...',
      icon: 'quiz',
      duration: 2000
    },
    {
      title: 'Finalizing Results',
      subtitle: 'Almost ready...',
      icon: 'check-circle',
      duration: 1500
    }
  ];

  useEffect(() => {
    if (!visible) return;

    let stepTimer;
    let progressTimer;
    let currentStepIndex = 0;

    const startStep = (stepIndex) => {
      if (stepIndex >= steps.length) {
        onComplete();
        return;
      }

      setCurrentStep(stepIndex);
      const stepDuration = steps[stepIndex].duration;
      
      // Progress animation
      const progressInterval = 50; // Update every 50ms
      const progressIncrement = 100 / (stepDuration / progressInterval);
      let currentProgress = 0;

      progressTimer = setInterval(() => {
        currentProgress += progressIncrement;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(progressTimer);
        }
        setProgress(currentProgress);
      }, progressInterval);

      // Step completion timer
      stepTimer = setTimeout(() => {
        setProgress(0);
        startStep(stepIndex + 1);
      }, stepDuration);
    };

    // Start the loading sequence
    startStep(0);

    return () => {
      if (stepTimer) clearTimeout(stepTimer);
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [visible, hasPersonalityTest]);

  // Optional: Guard for screen pinning state (poll up to 60s, 1s interval)
  useEffect(() => {
    if (!visible || !pinGuard) return;
    let mounted = true;
    let intervalId;
    let deadline = Date.now() + 60000; // 60s

    const poll = async () => {
      try {
        const pinned = await ScreenPinning.isPinned();
        if (pinned) {
          if (!mounted) return;
          try { await updateExamPhase(examId, examType, 'pin_confirmed'); } catch {}
          // proceed
          onComplete();
          return;
        }
        if (Date.now() >= deadline) {
          // timeout: stop any pinning dialog/overlay and go back
          try { await updateExamPhase(examId, examType, 'pin_timeout'); } catch {}
          try { await ScreenPinning.stop(); } catch {}
          if (!mounted) return;
          onTimeout();
          return;
        }
      } catch {}
    };

    // initial poll and then every 1s
    poll();
    intervalId = setInterval(poll, 1000);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [visible, pinGuard, examId, examType, onComplete, onTimeout]);

  if (!visible) return null;

  const currentStepData = steps[currentStep];

  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0a0a1a', '#1a1a2e', '#16213e']}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Main Loading Icon */}
          <View style={styles.mainIconContainer}>
            <LinearGradient
              colors={['rgba(168, 85, 247, 0.2)', 'rgba(124, 58, 237, 0.1)']}
              style={styles.mainIconGradient}
            >
              <Icon 
                name={currentStepData?.icon || 'hourglass-empty'} 
                size={80} 
                color="#a855f7" 
              />
            </LinearGradient>
          </View>

          {/* Step Title */}
          <Text style={styles.stepTitle}>
            {currentStepData?.title || 'Processing...'}
          </Text>

          {/* Step Subtitle */}
          <Text style={styles.stepSubtitle}>
            {currentStepData?.subtitle || 'Please wait...'}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#a855f7', '#7c3aed']}
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>

          {/* Step Indicators */}
          <View style={styles.stepsIndicator}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepIndicatorContainer}>
                <View style={[
                  styles.stepIndicator,
                  index <= currentStep && styles.stepIndicatorActive,
                  index === currentStep && styles.stepIndicatorCurrent
                ]}>
                  {index < currentStep ? (
                    <Icon name="check" size={16} color="#ffffff" />
                  ) : (
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  )}
                </View>
                {index < steps.length - 1 && (
                  <View style={[
                    styles.stepConnector,
                    index < currentStep && styles.stepConnectorActive
                  ]} />
                )}
              </View>
            ))}
          </View>

          {/* Loading Animation */}
          <View style={styles.loadingDotsContainer}>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>

          {/* Additional Info */}
          <Text style={styles.infoText}>
            {hasPersonalityTest 
              ? 'Analyzing your responses to provide personalized course recommendations...'
              : 'Computing your exam results...'
            }
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 360,
  },
  mainIconContainer: {
    marginBottom: 32,
  },
  mainIconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#a855f7',
    fontWeight: '600',
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepIndicatorActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: '#a855f7',
  },
  stepIndicatorCurrent: {
    backgroundColor: '#a855f7',
    borderColor: '#7c3aed',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  stepConnector: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 4,
  },
  stepConnectorActive: {
    backgroundColor: '#a855f7',
  },
  loadingDotsContainer: {
    marginBottom: 24,
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
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default ExamLoadingScreen;
