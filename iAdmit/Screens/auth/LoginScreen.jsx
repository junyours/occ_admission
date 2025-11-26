import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  View, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  TouchableOpacity, 
  Image,
  Animated,
  Dimensions,
  SafeAreaView,
  Linking,
  Alert,
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TextInput, Text } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import AppLogo from '../../logo.png';
import * as Auth from '../../API/auth';
import { getApiEnvironment, setApiEnvironment } from '../../API/client';
import { useAuth } from '../../contexts/AuthContext';
import ToastNotification from '../../components/ToastNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import RegistrationWebView from '../../components/RegistrationWebView';
import { getDeviceId } from '../../utils/DeviceId';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 350;
const isMediumScreen = width >= 350 && width < 400;
const isShortScreen = height < 700;

const BIOMETRIC_PROMPT = 'To use fingerprint login, sign in with your email and password first, then open your Profile and register your fingerprint in the Biometric Security card.';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [env, setEnv] = useState('production');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [hasRegisteredFingerprint, setHasRegisteredFingerprint] = useState(false);
  const [showRegistrationWebView, setShowRegistrationWebView] = useState(false);
  const [showForceLogoutModal, setShowForceLogoutModal] = useState(false);
  const [forceLogoutEmail, setForceLogoutEmail] = useState('');
  const [forceLogoutOtp, setForceLogoutOtp] = useState('');
  const [forceLogoutOtpSent, setForceLogoutOtpSent] = useState(false);
  const [forceLogoutOtpExpiresAt, setForceLogoutOtpExpiresAt] = useState(null);
  const [forceLogoutOtpCountdown, setForceLogoutOtpCountdown] = useState(0);
  const [forceLogoutRequestingCode, setForceLogoutRequestingCode] = useState(false);
  const [forceLogoutVerifyingOtp, setForceLogoutVerifyingOtp] = useState(false);
  const [forceLogoutError, setForceLogoutError] = useState(null);
  const [lastLoginMethod, setLastLoginMethod] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const loadingRotation = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const getBiometricInstance = useMemo(() => {
    return () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const biometricLib = require('react-native-biometrics');
        const ReactNativeBiometricsClass = biometricLib.default || biometricLib;
        if (typeof ReactNativeBiometricsClass === 'function') {
          return new ReactNativeBiometricsClass({ allowDeviceCredentials: true });
        }
      } catch (error) {
        console.log('[LoginScreen] Biometric module load failed:', error);
      }
      return null;
    };
  }, []);

  const checkFingerprintStatus = useMemo(() => {
    return async () => {
      try {
        const publicKey = await AsyncStorage.getItem('fingerprint_public_key');
        console.log('[LoginScreen] Checking fingerprint status. Public key present:', !!publicKey);

        const biometrics = getBiometricInstance();
        let biometricKeysExist = false;

        if (biometrics && typeof biometrics.biometricKeysExist === 'function') {
          try {
            const keysResult = await biometrics.biometricKeysExist();
            biometricKeysExist = keysResult.keysExist === true;
            console.log('[LoginScreen] Biometric keys exist on device:', biometricKeysExist);
          } catch (biometricError) {
            console.log('[LoginScreen] Could not verify biometric keys:', biometricError);
          }
        }

        setHasRegisteredFingerprint(Boolean(publicKey) && biometricKeysExist);
      } catch (error) {
        console.log('[LoginScreen] Error checking fingerprint:', error);
        setHasRegisteredFingerprint(false);
      }
    };
  }, [getBiometricInstance]);

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
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
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  useEffect(() => {
    (async () => {
      try {
        const current = await getApiEnvironment();
        setEnv(current === 'local' ? 'local' : 'production');
      } catch (error) {
        setEnv('production');
      }
    })();
  }, []);

  useEffect(() => {
    if (!loading) {
      return undefined;
    }

    const rotation = Animated.loop(
      Animated.timing(loadingRotation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );

    rotation.start();
    return () => rotation.stop();
  }, [loading, loadingRotation]);

  useEffect(() => {
    checkFingerprintStatus();
  }, [checkFingerprintStatus]);

  useFocusEffect(
    React.useCallback(() => {
      checkFingerprintStatus();
    }, [checkFingerprintStatus])
  );

  useEffect(() => {
    if (!forceLogoutOtpSent || !forceLogoutOtpExpiresAt) {
      setForceLogoutOtpCountdown(0);
      return undefined;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((forceLogoutOtpExpiresAt - Date.now()) / 1000));
      setForceLogoutOtpCountdown(remaining);

      if (remaining <= 0) {
        setForceLogoutOtpSent(false);
        setForceLogoutOtpExpiresAt(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [forceLogoutOtpSent, forceLogoutOtpExpiresAt]);

  const isValidEmail = useMemo(() => {
    const value = email.trim();
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }, [email]);

  const canSubmit = isValidEmail && password.length >= 4;

  const toggleEnvironment = React.useCallback(async () => {
    try {
      const next = env === 'production' ? 'local' : 'production';
      setEnv(next);
      await setApiEnvironment(next);
      Alert.alert('API Environment', `Switched to ${next.toUpperCase()}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to switch API environment.');
    }
  }, [env]);

  const onSubmit = React.useCallback(async () => {
    setLastLoginMethod('password');
    setError(null);
    setLoading(true);

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      console.log('[LoginScreen] Attempting login with email:', email);
      const response = await Auth.login(email.trim(), password);

      const token = response.access_token || response.token;
      if (!token) {
        throw new Error('No token received from server');
      }

      await login(token);
      console.log('[LoginScreen] User logged in successfully');

      setTimeout(() => {
        navigation.replace('Dashboard');
      }, 100);
    } catch (error) {
      console.log('[LoginScreen] Login error:', error);
      let errorMessage = 'Login failed. Please try again.';

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      const errorCode = error?.code || error?.response?.data?.code;

      if (errorCode === 'EXAM_IN_PROGRESS') {
        setToast({ visible: true, message: errorMessage, type: 'warning' });
        setError(errorMessage);
      } else if (errorCode === 'ALREADY_LOGGED_IN' || error?.response?.status === 409) {
        openForceLogoutModal(email.trim());
        setToast({ visible: true, message: 'Please verify via email to continue on this device.', type: 'info' });
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [buttonScale, email, login, navigation, openForceLogoutModal, password]);

  const handleFingerprintLogin = React.useCallback(async () => {
    setLastLoginMethod('fingerprint');
    setError(null);

    try {
      console.log('[LoginScreen] Verifying stored fingerprint before login');
      const publicKey = await AsyncStorage.getItem('fingerprint_public_key');
      const biometrics = getBiometricInstance();
      let biometricKeysExist = false;

      if (biometrics && typeof biometrics.biometricKeysExist === 'function') {
        try {
          const keysResult = await biometrics.biometricKeysExist();
          biometricKeysExist = keysResult.keysExist === true;
        } catch (biometricError) {
          console.log('[LoginScreen] Error checking biometric keys before login:', biometricError);
        }
      }

      if (!publicKey || !biometricKeysExist) {
        console.log('[LoginScreen] Fingerprint prerequisites missing', { hasPublicKey: !!publicKey, biometricKeysExist });
        Alert.alert('Fingerprint Not Registered', BIOMETRIC_PROMPT, [{ text: 'OK' }]);
        setHasRegisteredFingerprint(false);
        await checkFingerprintStatus();
        return;
      }

      setFingerprintLoading(true);
      console.log('[LoginScreen] Attempting fingerprint login');
      const response = await Auth.loginWithFingerprint();

      const token = response.access_token || response.token;
      if (!token) {
        throw new Error('No token received from server');
      }

      await login(token);
      console.log('[LoginScreen] User logged in successfully via fingerprint');

      setTimeout(() => {
        navigation.replace('Dashboard');
      }, 100);
    } catch (error) {
      console.log('[LoginScreen] Fingerprint login error:', error);
      let errorMessage = 'Fingerprint login failed. Please try again or use email/password.';

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      const errorCode = error?.code || error?.response?.data?.code;

      if (errorCode === 'EXAM_IN_PROGRESS') {
        setToast({ visible: true, message: errorMessage, type: 'warning' });
        setError(errorMessage);
      } else if (errorCode === 'ALREADY_LOGGED_IN' || error?.response?.status === 409) {
        openForceLogoutModal(email.trim());
        setToast({ visible: true, message: 'Please verify via email to continue on this device.', type: 'info' });
      } else {
        setToast({ visible: true, message: errorMessage, type: 'error' });
        setError(errorMessage);
      }
    } finally {
      setFingerprintLoading(false);
    }
  }, [checkFingerprintStatus, email, getBiometricInstance, login, navigation, openForceLogoutModal]);

  const handleForceLogoutModalClose = React.useCallback(() => {
    setShowForceLogoutModal(false);
    setForceLogoutOtp('');
    setForceLogoutOtpSent(false);
    setForceLogoutOtpExpiresAt(null);
    setForceLogoutOtpCountdown(0);
    setForceLogoutError(null);
    setForceLogoutRequestingCode(false);
    setForceLogoutVerifyingOtp(false);
  }, []);

  const handleRequestForceLogoutOtp = React.useCallback(async () => {
    const normalizedEmail = forceLogoutEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setForceLogoutError('Please enter the email associated with your account.');
      return;
    }

    setForceLogoutError(null);
    setForceLogoutRequestingCode(true);

    try {
      const deviceId = await getDeviceId();
      await Auth.requestForceLogoutOtp(normalizedEmail, deviceId);
      setForceLogoutOtp('');
      setForceLogoutOtpSent(true);
      setForceLogoutOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      setForceLogoutOtpCountdown(600);
      setToast({ visible: true, message: 'Verification code sent to your email.', type: 'success' });
    } catch (error) {
      console.log('[LoginScreen] Force logout OTP request error:', error);
      let errorMessage = 'Failed to send verification code. Please try again.';

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setForceLogoutError(errorMessage);
    } finally {
      setForceLogoutRequestingCode(false);
    }
  }, [forceLogoutEmail, setToast]);

  const handleVerifyForceLogoutOtp = React.useCallback(async () => {
    const normalizedEmail = forceLogoutEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setForceLogoutError('Please enter the email associated with your account.');
      return;
    }

    if (!forceLogoutOtp || forceLogoutOtp.length < 4) {
      setForceLogoutError('Enter the verification code sent to your email.');
      return;
    }

    setForceLogoutError(null);
    setForceLogoutVerifyingOtp(true);

    try {
      const deviceId = await getDeviceId();
      await Auth.verifyForceLogoutOtp(normalizedEmail, forceLogoutOtp, deviceId);

      setToast({ visible: true, message: 'Verification successful. Trying again...', type: 'success' });
      handleForceLogoutModalClose();

      setTimeout(() => {
        if (lastLoginMethod === 'fingerprint') {
          handleFingerprintLogin();
        } else {
          onSubmit();
        }
      }, 350);
    } catch (error) {
      console.log('[LoginScreen] Force logout OTP verification error:', error);
      let errorMessage = 'Failed to verify the code. Please try again.';

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setForceLogoutError(errorMessage);
    } finally {
      setForceLogoutVerifyingOtp(false);
    }
  }, [forceLogoutEmail, forceLogoutOtp, handleFingerprintLogin, handleForceLogoutModalClose, lastLoginMethod, onSubmit, setToast]);

  const handleRegisterPress = React.useCallback(() => {
    console.log('[LoginScreen] Opening web registration');
    setShowRegistrationWebView(true);
  }, []);

  const openForceLogoutModal = React.useCallback((prefillEmail = '') => {
    setForceLogoutEmail(prefillEmail);
    setForceLogoutOtp('');
    setForceLogoutOtpSent(false);
    setForceLogoutOtpExpiresAt(null);
    setForceLogoutOtpCountdown(0);
    setForceLogoutError(null);
    setForceLogoutRequestingCode(false);
    setForceLogoutVerifyingOtp(false);
    setShowForceLogoutModal(true);
  }, []);

  const handleRegistrationWebViewClose = React.useCallback((registrationComplete) => {
    console.log('[LoginScreen] Closing registration WebView, complete:', registrationComplete);
    setShowRegistrationWebView(false);
    
    if (registrationComplete) {
      // Show success message
      setToast({
        visible: true,
        message: 'Registration complete! Please login with your credentials.',
        type: 'success'
      });
    }
  }, []);

  const spin = loadingRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0a0a1a', '#1a1a2e', '#16213e']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Animated.View 
            style={[
              styles.contentContainer, 
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            
            {/* Enhanced Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.logoContainer}>
                  <Image 
                    source={AppLogo} 
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.titleContainer}>
                  <Text style={styles.appTitle}>iAdmit</Text>
                  <Text style={styles.subtitle}>Online College Admission</Text>
                </View>
              </View>
              <View style={styles.securityBadge}>
                <Icon name="security" size={12} color="#a855f7" />
                <Text style={styles.securityText}>Secure Login</Text>
              </View>
            </View>

            {/* Enhanced Login Card */}
            <View style={styles.loginCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.welcomeText}>Welcome Back</Text>
                <Text style={styles.signInText}>Sign in to access your account</Text>
              </View>

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <View style={styles.errorContent}>
                    <Icon name="error-outline" size={24} color="#ef4444" />
                    <View style={styles.errorTextContainer}>
                      <Text style={styles.errorTitle}>Login Failed</Text>
                      <Text style={styles.errorMessage}>{error}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Enhanced Form */}
              <View style={styles.formSection}>
                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={[
                    styles.inputContainer,
                    emailFocused && styles.inputContainerFocused,
                    email.length > 0 && !isValidEmail && styles.inputContainerError
                  ]}>
                    <View style={styles.inputIconContainer}>
                      <Icon 
                        name="email" 
                        size={20} 
                        color={emailFocused ? '#a855f7' : '#6b7280'} 
                      />
                    </View>
                    <TextInput
                      mode="flat"
                      placeholder="Enter your email address"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (error) setError(null);
                      }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      style={styles.textInput}
                      contentStyle={styles.inputContent}
                      underlineStyle={{ display: 'none' }}
                      theme={{
                        colors: {
                          primary: '#a855f7',
                          placeholder: '#6b7280',
                          text: '#ffffff',
                          background: 'transparent',
                        }
                      }}
                    />
                    {isValidEmail && (
                      <View style={styles.validationIcon}>
                        <Icon name="check-circle" size={20} color="#10b981" />
                      </View>
                    )}
                  </View>
                  {email.length > 0 && !isValidEmail && (
                    <Text style={styles.fieldError}>Please enter a valid email address</Text>
                  )}
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.passwordLabelRow}>
                    <Text style={styles.inputLabel}>Password</Text>
                  </View>
                  <View style={[
                    styles.inputContainer,
                    passwordFocused && styles.inputContainerFocused,
                    password.length > 0 && password.length < 4 && styles.inputContainerError
                  ]}>
                    <View style={styles.inputIconContainer}>
                      <Icon 
                        name="lock" 
                        size={20} 
                        color={passwordFocused ? '#a855f7' : '#6b7280'} 
                      />
                    </View>
                    <TextInput
                      mode="flat"
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (error) setError(null);
                      }}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      style={[styles.textInput, styles.passwordInput]}
                      contentStyle={styles.inputContent}
                      underlineStyle={{ display: 'none' }}
                      theme={{
                        colors: {
                          primary: '#a855f7',
                          placeholder: '#6b7280',
                          text: '#ffffff',
                          background: 'transparent',
                        }
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon 
                        name={showPassword ? "visibility-off" : "visibility"} 
                        size={20} 
                        color="#6b7280" 
                      />
                    </TouchableOpacity>
                  </View>
                  {password.length > 0 && password.length < 4 && (
                    <Text style={styles.fieldError}>Password must be at least 4 characters</Text>
                  )}
                </View>
              </View>

              {/* Side-by-side Login Buttons */}
              <View style={styles.buttonRow}>
                {/* Fingerprint Login Button */}
                <TouchableOpacity
                  onPress={handleFingerprintLogin}
                  disabled={fingerprintLoading || loading}
                  style={[
                    styles.fingerprintButton,
                    (fingerprintLoading || loading) && styles.fingerprintButtonDisabled
                  ]}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={
                      hasRegisteredFingerprint && !fingerprintLoading && !loading
                        ? ['#8b5cf6', '#6366f1'] 
                        : ['#374151', '#4b5563']
                    }
                    style={styles.sideButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {fingerprintLoading ? (
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Icon name="fingerprint" size={24} color="#ffffff" />
                      </Animated.View>
                    ) : (
                      <Icon name="fingerprint" size={24} color="#ffffff" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Sign In Button */}
                <Animated.View style={{ flex: 1, transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    onPress={onSubmit}
                    disabled={!canSubmit || loading || fingerprintLoading}
                    style={[
                      styles.loginButton,
                      (!canSubmit || loading || fingerprintLoading) && styles.loginButtonDisabled
                    ]}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={
                        canSubmit && !loading && !fingerprintLoading
                          ? ['#a855f7', '#7c3aed'] 
                          : ['#374151', '#4b5563']
                      }
                      style={styles.sideButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {loading ? (
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                          <Icon name="login" size={24} color="#ffffff" />
                        </Animated.View>
                      ) : (
                        <Icon name="login" size={24} color="#ffffff" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {!hasRegisteredFingerprint && !fingerprintLoading && (
                <Text style={styles.fingerprintHint}>{BIOMETRIC_PROMPT}</Text>
              )}

              {/* Register Link */}
              <View style={styles.registerSection}>
                <Text style={styles.registerText}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={handleRegisterPress} activeOpacity={0.7}>
                  <Text style={styles.registerLink}>Register here</Text>
                </TouchableOpacity>
              </View>

            {/* Server Environment Toggle */}
            <View style={[styles.cardFooter]}> 
              <View style={styles.divider} />
              <TouchableOpacity onPress={toggleEnvironment} activeOpacity={0.8} style={styles.serverToggle}>
                <View style={styles.serverToggleContent}>
                  <Icon name="cloud" size={18} color="#9ca3af" />
                  <Text style={styles.serverText}>Server Environment</Text>
                  <View style={styles.serverStatus}>
                    <View style={[styles.statusDot, { backgroundColor: env === 'production' ? '#10b981' : '#f59e0b' }]} />
                    <Text style={[styles.statusText, { color: env === 'production' ? '#10b981' : '#f59e0b' }]}>
                      {env === 'production' ? 'Production' : 'Local'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
            </View>

            {/* Enhanced Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                © 2025 Opol Community College. All rights reserved.
              </Text>
              <Text style={styles.versionText}>Version 2 Stable.</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Registration WebView Modal */}
      <RegistrationWebView
        visible={showRegistrationWebView}
        onClose={handleRegistrationWebViewClose}
      />

      {/* Force Logout Modal */}
      <Modal
        visible={showForceLogoutModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleForceLogoutModalClose}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f172a']}
              style={styles.modalGradient}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Icon name="warning" size={32} color="#f59e0b" />
                </View>
                <Text style={styles.modalTitle}>Already Logged In</Text>
                <Text style={styles.modalSubtitle}>
                  You're logged in on another device. Verify via email to sign out the old session and continue here.
                </Text>
              </View>
              
              {/* Error Display */}
              {forceLogoutError && (
                <View style={styles.forceLogoutErrorContainer}>
                  <Icon name="error-outline" size={20} color="#ef4444" />
                  <Text style={styles.forceLogoutErrorText}>{forceLogoutError}</Text>
                </View>
              )}

              <View style={styles.forceLogoutForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.forceLogoutCard}>
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconContainer}>
                        <Icon 
                          name="email" 
                          size={20} 
                          color={forceLogoutEmail ? '#10b981' : '#6b7280'} 
                        />
                      </View>
                      <TextInput
                        mode="flat"
                        placeholder="jane.doe@example.com"
                        value={forceLogoutEmail}
                        onChangeText={(text) => setForceLogoutEmail(text)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        style={[styles.textInput, styles.disabledInput]}
                        contentStyle={styles.inputContent}
                        underlineStyle={{ display: 'none' }}
                        editable={false}
                        selectTextOnFocus={false}
                        theme={{
                          colors: {
                            primary: '#a855f7',
                            placeholder: '#6b7280',
                            text: '#ffffff',
                            background: 'transparent',
                          }
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleRequestForceLogoutOtp}
                      disabled={
                        forceLogoutRequestingCode ||
                        !forceLogoutEmail.trim() ||
                        (forceLogoutOtpSent && forceLogoutOtpCountdown > 0)
                      }
                      style={[
                        styles.sendCodeButton,
                        (
                          forceLogoutRequestingCode ||
                          !forceLogoutEmail.trim() ||
                          (forceLogoutOtpSent && forceLogoutOtpCountdown > 0)
                        ) && styles.modalButtonDisabled
                      ]}
                      activeOpacity={0.9}
                    >
                      {forceLogoutRequestingCode ? (
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                          <Icon name="sync" size={20} color="#ffffff" />
                        </Animated.View>
                      ) : (
                        <>
                          <Icon name="mark-email-read" size={18} color="#ffffff" />
                          <Text style={styles.sendCodeButtonText}>
                            {forceLogoutOtpSent ? 'Resend Code' : 'Send Code'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {forceLogoutOtpSent && (
                      <Text style={styles.otpHelperText}>
                        {forceLogoutOtpCountdown > 0
                          ? `Code sent to ${forceLogoutEmail}. Resend available in ${forceLogoutOtpCountdown}s.`
                          : 'Didn’t get it? You can request a new code.'}
                      </Text>
                    )}
                  </View>
                </View>

                {forceLogoutOtpSent && (
                  <View style={styles.forceLogoutCard}>
                    <Text style={styles.otpCardTitle}>Enter Verification Code</Text>
                    <Text style={styles.otpCardSubtitle}>Check your inbox for the 6-digit code we just sent.</Text>
                    <View style={[
                      styles.inputContainer,
                      forceLogoutOtp.length > 0 && forceLogoutOtp.length < 6 && styles.inputContainerError
                    ]}>
                      <View style={styles.inputIconContainer}>
                        <Icon 
                          name="confirmation-number" 
                          size={20} 
                          color={forceLogoutOtp.length === 6 ? '#10b981' : '#6b7280'} 
                        />
                      </View>
                      <TextInput
                        mode="flat"
                        placeholder="Enter 6-digit code"
                        value={forceLogoutOtp}
                        onChangeText={(text) => setForceLogoutOtp(text.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        maxLength={6}
                        style={[styles.textInput, styles.otpInput]}
                        contentStyle={styles.inputContent}
                        underlineStyle={{ display: 'none' }}
                        editable={!forceLogoutVerifyingOtp}
                        theme={{
                          colors: {
                            primary: '#a855f7',
                            placeholder: '#6b7280',
                            text: '#ffffff',
                            background: 'transparent',
                          }
                        }}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    onPress={handleForceLogoutModalClose}
                    disabled={forceLogoutRequestingCode || forceLogoutVerifyingOtp}
                    style={[
                      styles.modalCancelButton,
                      (forceLogoutRequestingCode || forceLogoutVerifyingOtp) && styles.modalButtonDisabled
                    ]}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  {forceLogoutOtpSent && (
                    <TouchableOpacity
                      onPress={handleVerifyForceLogoutOtp}
                      disabled={forceLogoutVerifyingOtp || forceLogoutOtp.length < 4}
                      style={[
                        styles.modalConfirmButton,
                        (forceLogoutVerifyingOtp || forceLogoutOtp.length < 4) && styles.modalButtonDisabled
                      ]}
                      activeOpacity={0.9}
                    >
                      {forceLogoutVerifyingOtp ? (
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                          <Icon name="sync" size={24} color="#ffffff" />
                        </Animated.View>
                      ) : (
                        <LinearGradient
                          colors={
                            !forceLogoutVerifyingOtp && forceLogoutOtp.length >= 4
                              ? ['#22d3ee', '#0ea5e9'] 
                              : ['#374151', '#4b5563']
                          }
                          style={styles.modalConfirmGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Icon name="verified-user" size={24} color="#ffffff" />
                          <Text style={styles.modalConfirmButtonText}>Verify & Continue</Text>
                        </LinearGradient>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? (isShortScreen ? 10 : 20) : 40,
    paddingBottom: Platform.OS === 'ios' ? (isShortScreen ? 40 : 60) : 60, // Safe area for bottom
  },
  contentContainer: {
    flex: 1,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  
  // Header Styles
  header: {
    marginBottom: isShortScreen ? 24 : 32,
    alignItems: 'center',
    marginTop: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    width: isSmallScreen ? 56 : 64,
    height: isSmallScreen ? 56 : 64,
    marginRight: isSmallScreen ? 16 : -50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: isSmallScreen ? 28 : 32,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    marginLeft: 35,
  },
  titleContainer: {
    flex: 1,
  },
  logo: {
    width: isSmallScreen ? 44 : 52,
    height: isSmallScreen ? 44 : 52,
  },
  appTitle: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: isSmallScreen ? 13 : 15,
    color: '#9ca3af',
    fontWeight: '500',
    textAlign: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  securityText: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card Styles
  loginCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: isSmallScreen ? 20 : 24,
    padding: isSmallScreen ? 24 : 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  signInText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Error Styles
  errorContainer: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  errorMessage: {
    color: '#ef4444',
    fontSize: 13,
    lineHeight: 18,
  },

  // Form Styles
  formSection: {
    marginBottom: 36,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 58,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: '#a855f7',
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  inputIconContainer: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  textInput: {
    backgroundColor: 'transparent',
    fontSize: 16,
    paddingLeft: 48,
    paddingRight: 16,
    height: 58,
    fontWeight: '500',
    color: '#ffffff',
  },
  disabledInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: '#9ca3af',
  },
  passwordInput: {
    paddingRight: 48,
  },
  inputContent: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 18,
    zIndex: 1,
    padding: 4,
  },
  validationIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
    zIndex: 1,
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },

  // Button Row Container
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },

  // Button Styles
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  loginButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  sideButtonGradient: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonGradient: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonArrow: {
    marginLeft: 8,
  },

  // Register Section Styles
  registerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  registerText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  registerLink: {
    fontSize: 14,
    color: '#a855f7',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Footer Styles
  cardFooter: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  serverToggle: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  serverToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  serverText: {
    fontSize: 13,
    color: '#9ca3af',
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '500',
  },
  
  // Fingerprint Button Styles
  fingerprintButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: 58,
    marginRight: 12,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  fingerprintButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  fingerprintButtonGradient: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loginDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    marginHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fingerprintHint: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  
  // Force Logout Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  forceLogoutErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  forceLogoutErrorText: {
    color: '#ef4444',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  forceLogoutInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
    marginBottom: 16,
    gap: 12,
  },
  forceLogoutInfoTitle: {
    color: '#e0f2fe',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  forceLogoutInfoText: {
    color: '#e5e7eb',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  forceLogoutSteps: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 20,
  },
  forceLogoutStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  forceLogoutStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forceLogoutStepTitle: {
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  forceLogoutStepText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  forceLogoutStepDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 12,
  },
  forceLogoutForm: {
    marginTop: 8,
  },
  forceLogoutCard: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginTop: 8,
  },
  sendCodeButton: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendCodeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  otpHelperText: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  otpCardTitle: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  otpCardSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 12,
  },
  otpInput: {
    letterSpacing: 6,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalCancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  modalConfirmGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalConfirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
});
