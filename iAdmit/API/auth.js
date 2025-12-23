import client, { buildUrl } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId, clearDeviceId } from '../utils/DeviceId';

export async function login(email, password) {
  console.log('[Auth] login called', { email });
  try {
    const deviceId = await getDeviceId();
    console.log('[Auth] Using device ID:', deviceId);
    
    const url = buildUrl('/mobile/login');
    console.log('[Auth] POST', url);
    const res = await client.post(url, { email, password, device_id: deviceId });
    console.log('[Auth] Login response received:', res.data);
    
    const token = res.data.access_token || res.data.token;
    console.log('[Auth] Token extracted:', token ? 'Token exists' : 'No token found');
    
    if (!token) {
      console.log('[Auth] Response data keys:', Object.keys(res.data));
      throw new Error('Login response missing token');
    }
    
    await AsyncStorage.setItem('auth_token', token);
    console.log('[Auth] Token stored in AsyncStorage');
    return res.data;
  } catch (error) {
    // Surface single-device restriction clearly
    if (error?.response?.status === 409) {
      const responseCode = error?.response?.data?.code;
      const msg = error?.response?.data?.message || "You're already logged in on another device. Please logout there first.";
      console.log('[Auth] Single-device restriction:', { message: msg, code: responseCode });
      const e = new Error(msg);
      e.code = responseCode || 'ALREADY_LOGGED_IN';
      throw e;
    }
    console.log('[Auth] Login error:', error);
    throw error;
  }
}

export async function me() {
  const url = buildUrl('/mobile/profile');
  console.log('[Auth] GET', url);
  const res = await client.get(url);
  return res.data;
}

export async function loginWithFingerprint() {
  console.log('[Auth] Fingerprint login called');
  try {
    const deviceId = await getDeviceId();
    console.log('[Auth] Using device ID:', deviceId);
    
    // Import ReactNativeBiometrics dynamically
    let ReactNativeBiometrics;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const biometricLib = require('react-native-biometrics');
      const ReactNativeBiometricsClass = biometricLib.default || biometricLib;
      if (typeof ReactNativeBiometricsClass === 'function') {
        ReactNativeBiometrics = new ReactNativeBiometricsClass({
          allowDeviceCredentials: true
        });
      } else {
        throw new Error('Biometric library not available');
      }
    } catch (e) {
      console.log('[Auth] Failed to load biometric library:', e);
      throw new Error('Biometric authentication is not available on this device');
    }

    console.log('[Auth] Checking if biometric keys exist...');
    const keysExist = await ReactNativeBiometrics.biometricKeysExist();
    console.log('[Auth] Keys exist:', keysExist);

    if (!keysExist.keysExist) {
      throw new Error('No fingerprint registered. Please register your fingerprint in the profile section first.');
    }

    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    let storedPublicKey = await AsyncStorage.getItem('fingerprint_public_key');

    if (!storedPublicKey) {
      throw new Error('Fingerprint not properly registered. Please register your fingerprint in the profile section first.');
    }

    console.log('[Auth] Using stored public key for login');

    const promptMessage = 'Authenticate with fingerprint to login';
    const payload = `fingerprint_login_${deviceId}_${Date.now()}`;
    console.log('[Auth] Creating signature for login with payload:', payload);
    const signatureResult = await ReactNativeBiometrics.createSignature({
      promptMessage,
      payload,
      cancelButtonText: 'Cancel',
    });

    if (!signatureResult.success || !signatureResult.signature) {
      if (signatureResult.error === 'User cancellation') {
        throw new Error('Fingerprint authentication cancelled');
      }
      throw new Error(signatureResult.error || 'Fingerprint authentication failed');
    }

    console.log('[Auth] Signature created successfully');
    
    const { loginWithFingerprint: fingerprintLogin } = require('./fingerprint');
    const response = await fingerprintLogin(
      storedPublicKey,
      signatureResult.signature,
      deviceId,
    );
    
    console.log('[Auth] Fingerprint login response received:', response);
    
    const token = response.access_token || response.token;
    if (!token) {
      throw new Error('Login response missing token');
    }
    
    await AsyncStorage.setItem('auth_token', token);
    console.log('[Auth] Token stored in AsyncStorage');
    return response;
  } catch (error) {
    console.log('[Auth] Fingerprint login error:', error);
    if (error?.response?.status === 409) {
      const responseCode = error?.response?.data?.code;
      const msg = error?.response?.data?.message || "You're already logged in on another device. Please logout there first.";
      const e = new Error(msg);
      e.code = responseCode || 'ALREADY_LOGGED_IN';
      throw e;
    }
    throw error;
  }
}

export async function logout() {
  try {
    const url = buildUrl('/mobile/logout');
    console.log('[Auth] POST', url);
    await client.post(url);
  } catch (e) {
    console.log('[Auth] logout API failed, continuing', e);
  }
  await AsyncStorage.removeItem('auth_token');
  await clearDeviceId(); // Clear device ID on logout
  console.log('[Auth] Token and device ID removed from storage');
}

export async function healthCheck() {
  const url = buildUrl('/mobile/health');
  console.log('[Auth] GET', url);
  const res = await client.get(url);
  return res.data;
}

/**
 * Validate token using Passport middleware
 * The endpoint is protected by auth:api middleware - if request succeeds, token is valid
 */
export async function validateToken() {
  console.log('[Auth] Validating token...');
  try {
    const url = buildUrl('/mobile/validate-token');
    console.log('[Auth] GET', url);
    console.log('[Auth] Current baseURL:', client.defaults.baseURL);
    const res = await client.get(url);
    console.log('[Auth] Token validation response:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Token validation error:', error?.response?.status, error?.response?.data || error?.message);
    
    // Check if it's a 401 Unauthorized from Passport middleware
    if (error?.response?.status === 401) {
      console.log('[Auth] Token is invalid or expired (401 from server)');
      return {
        success: false,
        valid: false,
        message: error?.response?.data?.message || 'Token is invalid or expired'
      };
    }
    
    // Check if it's a 403 Forbidden (not a student)
    if (error?.response?.status === 403) {
      console.log('[Auth] Access denied (403 from server)');
      return {
        success: false,
        valid: false,
        message: error?.response?.data?.message || 'Access denied'
      };
    }
    
    // For other errors (network, server errors), throw so caller can handle
    throw error;
  }
}

export async function getExamSchedule() {
  console.log('[Auth] Fetching exam schedule...');
  try {
    const res = await client.get('/mobile/exam-schedule');
    console.log('[Auth] Exam schedule received:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Exam schedule fetch failed:', error);
    throw error;
  }
}

export async function checkForceAllow() {
  console.log('[Auth] Checking force allow status...');
  try {
    const res = await client.get('/mobile/check-force-allow');
    console.log('[Auth] Force allow response:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Force allow check failed:', error);
    return { success: false, force_allow: false };
  }
}

// Store CSRF token globally
let csrfToken = null;

export async function getRegistrationSettings() {
  console.log('[Auth] Fetching registration settings...');
  try {
    // Use direct URL without /api prefix for web routes
    const baseURL = client.defaults.baseURL.replace('/api', '');
    const url = `${baseURL}/register`;
    console.log('[Auth] GET', url);
    const res = await client.get(url);
    
    // Extract CSRF token from HTML response
    if (typeof res.data === 'string') {
      const csrfMatch = res.data.match(/name="csrf-token" content="([^"]+)"/);
      if (csrfMatch) {
        csrfToken = csrfMatch[1];
        console.log('[Auth] CSRF token extracted:', csrfToken);
      }
    }
    
    // Parse JSON data from HTML response
    let registrationData = null;
    console.log('[Auth] Response type:', typeof res.data);
    console.log('[Auth] Response length:', res.data?.length);
    console.log('[Auth] Contains data-page:', res.data?.includes?.('data-page='));
    
    if (typeof res.data === 'string' && res.data.includes('data-page=')) {
      try {
        // Extract JSON data from the HTML page
        const match = res.data.match(/data-page="([^"]+)"/);
        console.log('[Auth] Match found:', !!match);
        if (match) {
          const jsonString = match[1].replace(/&quot;/g, '"');
          console.log('[Auth] JSON string length:', jsonString.length);
          const pageData = JSON.parse(jsonString);
          console.log('[Auth] Parsed page data:', pageData);
          registrationData = pageData.props;
          console.log('[Auth] Extracted props:', registrationData);
        } else {
          console.log('[Auth] No data-page match found');
        }
      } catch (parseError) {
        console.log('[Auth] Error parsing HTML response:', parseError);
        // Fallback: return default open registration
        console.log('[Auth] Using fallback registration data');
        registrationData = {
          registrationOpen: true,
          registrationMessage: 'Registration is open',
          availableExamDates: []
        };
      }
    } else {
      console.log('[Auth] Using direct response data');
      registrationData = res.data;
    }
    
    // Final fallback if still no data
    if (!registrationData) {
      console.log('[Auth] No data received, using fallback');
      registrationData = {
        registrationOpen: true,
        registrationMessage: 'Registration is open',
        availableExamDates: []
      };
    }
    
    console.log('[Auth] Registration settings received:', registrationData);
    return registrationData;
  } catch (error) {
    console.log('[Auth] Registration settings fetch failed:', error);
    // Return fallback data instead of throwing error
    console.log('[Auth] Using fallback due to error');
    return {
      registrationOpen: true,
      registrationMessage: 'Registration is open',
      availableExamDates: []
    };
  }
}

export async function startRegistration(registrationData) {
  console.log('[Auth] Starting registration process...');
  try {
    // Use new mobile registration API endpoint
    const url = '/mobile/register';
    console.log('[Auth] POST', url);
    
    // Create FormData for multipart/form-data submission
    const formData = new FormData();
    
    // Append all text fields
    formData.append('lname', registrationData.lname);
    formData.append('fname', registrationData.fname);
    if (registrationData.mname) {
      formData.append('mname', registrationData.mname);
    }
    formData.append('email', registrationData.email);
    formData.append('password', registrationData.password);
    formData.append('password_confirmation', registrationData.password_confirmation);
    formData.append('gender', registrationData.gender);
    formData.append('age', registrationData.age);
    formData.append('school_name', registrationData.school_name);
    formData.append('parent_name', registrationData.parent_name);
    formData.append('parent_phone', registrationData.parent_phone);
    formData.append('phone', registrationData.phone);
    formData.append('address', registrationData.address);
    formData.append('selected_exam_date', registrationData.selected_exam_date);
    formData.append('selected_exam_session', registrationData.selected_exam_session);
    
    // Append profile image
    if (registrationData.profile) {
      formData.append('profile', {
        uri: registrationData.profile.uri,
        type: registrationData.profile.type || 'image/jpeg',
        name: registrationData.profile.fileName || 'profile.jpg',
      });
    }
    
    const res = await client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('[Auth] Registration completed successfully:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Registration failed:', error);
    console.log('[Auth] Error response data:', error?.response?.data);
    // Re-throw the error to preserve the original response structure
    throw error;
  }
}

export async function verifyRegistration(email, verificationCode) {
  console.log('[Auth] Verifying registration code...');
  try {
    // Use mobile API endpoint
    const url = '/mobile/verify-email';
    console.log('[Auth] POST', url);
    
    const res = await client.post(url, {
      email: email,
      verification_code: verificationCode,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[Auth] Registration verified successfully:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Registration verification failed:', error);
    throw error;
  }
}

export async function resendVerificationCode(email) {
  console.log('[Auth] Resending verification code...');
  console.log('[Auth] Using mobile API endpoint');
  try {
    // Use mobile API endpoint
    const url = '/mobile/resend-verification';
    console.log('[Auth] POST', url);
    console.log('[Auth] Full URL will be:', client.defaults.baseURL + url);
    
    const res = await client.post(url, {
      email: email,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[Auth] Verification code resent successfully:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Resend verification code failed:', error);
    throw error;
  }
}

export async function getCourses() {
  console.log('[Auth] Fetching available courses...');
  try {
    const res = await client.get('/mobile/courses');
    console.log('[Auth] Courses received:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Courses fetch failed:', error);
    throw error;
  }
}

export async function forceLogoutOtherDevices(email, password, deviceId) {
  console.log('[Auth] Force logout other devices called for email:', email);
  try {
    const url = buildUrl('/mobile/force-logout-other-devices');
    console.log('[Auth] POST', url);
    const res = await client.post(url, { 
      email: email.trim(), 
      password: password,
      device_id: deviceId 
    });
    console.log('[Auth] Force logout response received:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Force logout error:', error);
    throw error;
  }
}

export async function requestForceLogoutOtp(email, deviceId) {
  console.log('[Auth] Requesting force logout OTP for email:', email);
  try {
    const url = buildUrl('/mobile/force-logout/request-otp');
    console.log('[Auth] POST', url);
    const res = await client.post(url, {
      email: email.trim(),
      device_id: deviceId,
    });
    console.log('[Auth] Force logout OTP response:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Force logout OTP request error:', error);
    throw error;
  }
}

export async function verifyForceLogoutOtp(email, otp, deviceId) {
  console.log('[Auth] Verifying force logout OTP for email:', email);
  try {
    const url = buildUrl('/mobile/force-logout/verify-otp');
    console.log('[Auth] POST', url);
    const res = await client.post(url, {
      email: email.trim(),
      otp: otp.trim(),
      device_id: deviceId,
    });
    console.log('[Auth] Force logout OTP verification response:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Force logout OTP verification error:', error);
    throw error;
  }
}

export async function updatePreferredCourse(courseCode) {
  console.log('[Auth] Updating preferred course to:', courseCode);
  try {
    const res = await client.post('/mobile/examinee/preferred-course', {
      preferred_course: courseCode
    });
    console.log('[Auth] Preferred course updated successfully:', res.data);
    return res.data;
  } catch (error) {
    console.log('[Auth] Preferred course update failed:', error);
    throw error;
  }
}

export const endpoints = {
  login: buildUrl('/mobile/login'),
  profile: buildUrl('/mobile/profile'),
  logout: buildUrl('/mobile/logout'),
  health: buildUrl('/mobile/health'),
  register: buildUrl('/register'),
  registerStart: buildUrl('/register/start'),
  registerVerify: buildUrl('/register/verify'),
  registerResend: buildUrl('/register/resend'),
  courses: buildUrl('/mobile/courses'),
  preferredCourse: buildUrl('/mobile/examinee/preferred-course'),
};
