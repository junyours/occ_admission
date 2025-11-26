import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function ExamSecurityModal({ 
  visible, 
  violationType, 
  message, 
  onDismiss, 
  onEnableAirplaneMode 
}) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: height,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.8,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const getViolationIcon = () => {
    switch (violationType) {
      case 'internet':
        return 'wifi-off';
      case 'screenshot':
        return 'screen-capture';
      case 'navigation':
        return 'navigation';
      case 'background':
        return 'visibility-off';
      default:
        return 'warning';
    }
  };

  const getViolationColor = () => {
    switch (violationType) {
      case 'internet':
        return '#ef4444';
      case 'screenshot':
        return '#f59e0b';
      case 'navigation':
        return '#3b82f6';
      case 'background':
        return '#8b5cf6';
      default:
        return '#ef4444';
    }
  };

  const getViolationTitle = () => {
    switch (violationType) {
      case 'internet':
        return 'Internet Connection Detected';
      case 'screenshot':
        return 'Screenshot Attempt Detected';
      case 'navigation':
        return 'Navigation Attempt Detected';
      case 'background':
        return 'App Backgrounded';
      default:
        return 'Security Violation';
    }
  };

  const getViolationDescription = () => {
    switch (violationType) {
      case 'internet':
        return 'Please enable airplane mode to continue with the exam. Internet access is not allowed during the exam.';
      case 'screenshot':
        return 'Screenshots are not allowed during the exam. This violation has been recorded.';
      case 'navigation':
        return 'Navigation away from the exam is not allowed. Please stay on the exam screen.';
      case 'background':
        return 'The app was backgrounded. Please return to the exam immediately.';
      default:
        return 'A security violation has been detected. Please follow exam guidelines.';
    }
  };

  const handleEnableAirplaneMode = () => {
    Alert.alert(
      'Enable Airplane Mode',
      'Please enable airplane mode in your device settings to continue with the exam.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            onEnableAirplaneMode();
            onDismiss();
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.modal,
          {
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={[getViolationColor(), '#1f2937']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Icon 
                name={getViolationIcon()} 
                size={48} 
                color="#ffffff" 
              />
            </View>
            
            <Text style={styles.title}>{getViolationTitle()}</Text>
            <Text style={styles.description}>{getViolationDescription()}</Text>
            
            {message && (
              <View style={styles.messageContainer}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              {violationType === 'internet' && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleEnableAirplaneMode}
                >
                  <Text style={styles.primaryButtonText}>Enable Airplane Mode</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onDismiss}
              >
                <Text style={styles.secondaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  messageText: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
