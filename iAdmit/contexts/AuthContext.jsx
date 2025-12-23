import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client, { waitForApiReady, isApiReady } from '../API/client';
import userDataCache from '../utils/UserDataCache';
import * as AuthApi from '../API/auth';
import ToastNotification from '../components/ToastNotification';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const checkAuthStatus = async () => {
    try {
      console.log('[AuthContext] ========================================');
      console.log('[AuthContext] Starting authentication check...');
      
      // Wait for API client to be fully initialized before making any requests
      console.log('[AuthContext] Waiting for API client to be ready...');
      await waitForApiReady();
      console.log('[AuthContext] ✅ API client is ready, baseURL:', client.defaults.baseURL);
      
      // Verify we have a valid baseURL before proceeding
      if (!client.defaults.baseURL) {
        console.log('[AuthContext] ⚠️ API baseURL is empty, cannot validate token');
        console.log('[AuthContext] Keeping token and waiting for network...');
        // Don't clear token - just set not authenticated and let user retry
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      const token = await AsyncStorage.getItem('auth_token');
      
      if (token) {
        console.log('[AuthContext] ✅ Token found in AsyncStorage');
        console.log('[AuthContext] Token preview:', token.substring(0, 20) + '...');
        console.log('[AuthContext] Validating token against database...');
        
        // First validate token against database to check if it exists and is not revoked
        try {
          const validationResult = await AuthApi.validateToken();
          console.log('[AuthContext] Token validation response:', JSON.stringify(validationResult, null, 2));
          
          if (validationResult?.success && validationResult?.valid) {
            // Token is valid in database (exists, not revoked)
            console.log('[AuthContext] ✅✅✅ Token is VALID in database!');
            console.log('[AuthContext] User ID:', validationResult?.user?.id);
            console.log('[AuthContext] Setting isAuthenticated = true');
            setIsAuthenticated(true);

            // Fetch user profile and cache it
            try {
              console.log('[AuthContext] Fetching user profile...');
              const response = await client.get('/mobile/examinee/profile');
              console.log('[AuthContext] ✅ Profile fetched successfully');
              
              if (response?.data && response.data.id) {
                await userDataCache.storeExamineeData(response.data);
                console.log('[AuthContext] Profile cached successfully');
              }
              // Optionally prefetch schedule for cache
              try {
                const sched = await AuthApi.getExamSchedule();
                if (sched?.success && sched?.has_schedule) {
                  await userDataCache.storeExamSchedule(sched.schedule);
                  console.log('[AuthContext] Schedule cached successfully');
                }
              } catch (e) { 
                console.log('[AuthContext] Schedule prefetch failed, continuing', e?.message);
              }
            } catch (profileError) {
              console.log('[AuthContext] ⚠️ Profile fetch failed but token is valid:', profileError?.message);
              console.log('[AuthContext] User is still authenticated, profile will load on Dashboard');
              // Token is valid, so user is authenticated even if profile fetch fails
              // Profile will be fetched when Dashboard loads
            }
          } else {
            // Token is invalid or revoked in database - this is a real auth failure
            console.log('[AuthContext] ❌ Token is INVALID or REVOKED in database');
            console.log('[AuthContext] Validation result:', validationResult);
            await AsyncStorage.removeItem('auth_token');
            setIsAuthenticated(false);
            setToast({
              visible: true,
              message: 'Session expired. Please login again.',
              type: 'warning'
            });
          }
        } catch (validationError) {
          console.log('[AuthContext] ⚠️ Token validation request failed:', validationError);
          console.log('[AuthContext] Error details:', validationError?.response?.data || validationError?.message);
          
          // Check if this is a network/connectivity error vs an actual auth error
          const isNetworkError = !validationError?.response && (
            validationError?.message?.includes('Network Error') ||
            validationError?.message?.includes('timeout') ||
            validationError?.code === 'ECONNABORTED' ||
            validationError?.code === 'ERR_NETWORK'
          );
          
          if (isNetworkError) {
            console.log('[AuthContext] 📡 Network error detected - keeping token and trying offline mode');
            // Network error - keep the token and try to use cached data
            // User might be offline or server is temporarily unavailable
            try {
              const cachedData = await userDataCache.getExamineeData();
              if (cachedData) {
                console.log('[AuthContext] ✅ Found cached user data, authenticating with offline data');
                setIsAuthenticated(true);
              } else {
                console.log('[AuthContext] ⚠️ No cached data available, staying logged out until network available');
                setIsAuthenticated(false);
                setToast({
                  visible: true,
                  message: 'Unable to connect to server. Please check your internet connection.',
                  type: 'warning'
                });
              }
            } catch (cacheError) {
              console.log('[AuthContext] Cache read failed:', cacheError?.message);
              setIsAuthenticated(false);
            }
          } else {
            // Not a network error - try fallback to profile endpoint
            try {
              console.log('[AuthContext] Falling back to profile endpoint check...');
              const response = await client.get('/mobile/examinee/profile');
              console.log('[AuthContext] ✅ Profile check successful - token is valid');
              setIsAuthenticated(true);

              // Cache user profile
              try {
                if (response?.data && response.data.id) {
                  await userDataCache.storeExamineeData(response.data);
                }
                try {
                  const sched = await AuthApi.getExamSchedule();
                  if (sched?.success && sched?.has_schedule) {
                    await userDataCache.storeExamSchedule(sched.schedule);
                  }
                } catch (e) { /* ignore schedule cache errors */ }
              } catch (e) {
                console.log('[AuthContext] Failed to cache user profile after auth check', e?.message);
              }
            } catch (profileError) {
              // Token validation failed and profile check also failed
              console.log('[AuthContext] ❌ Both token validation and profile check failed');
              console.log('[AuthContext] Profile error:', profileError?.response?.data || profileError?.message);
              
              // Check if it's a token expiration error (401 Unauthorized)
              if (profileError?.response?.status === 401) {
                console.log('[AuthContext] Token expired (401), clearing token');
                await AsyncStorage.removeItem('auth_token');
                setIsAuthenticated(false);
                setToast({
                  visible: true,
                  message: 'Session expired. Please login again.',
                  type: 'warning'
                });
              } else if (profileError?.response?.status === 403) {
                console.log('[AuthContext] Access denied (403), clearing token');
                await AsyncStorage.removeItem('auth_token');
                setIsAuthenticated(false);
                setToast({
                  visible: true,
                  message: 'Access denied. Please login again.',
                  type: 'warning'
                });
              } else {
                // Other error - could be network issue, keep token
                console.log('[AuthContext] Non-auth error during validation, keeping token for retry');
                setIsAuthenticated(false);
                setToast({
                  visible: true,
                  message: 'Unable to verify session. Please try again.',
                  type: 'warning'
                });
              }
            }
          }
        }
      } else {
        console.log('[AuthContext] ❌ No token found in AsyncStorage');
        console.log('[AuthContext] User needs to login');
        setIsAuthenticated(false);
      }
      
      console.log('[AuthContext] Final isAuthenticated status:', isAuthenticated);
      console.log('[AuthContext] ========================================');
    } catch (error) {
      console.log('[AuthContext] ❌ Unexpected error during auth check:', error);
      console.log('[AuthContext] Error stack:', error?.stack);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] Auth check completed, isLoading = false');
    }
  };

  const login = async (token) => {
    await AsyncStorage.setItem('auth_token', token);
    setIsAuthenticated(true);
    console.log('[AuthContext] User logged in successfully');
    // Proactively cache user profile and schedule for offline dashboard
    try {
      const response = await client.get('/mobile/examinee/profile');
      if (response?.data && response.data.id) {
        await userDataCache.storeExamineeData(response.data);
      }
      try {
        const sched = await AuthApi.getExamSchedule();
        if (sched?.success && sched?.has_schedule) {
          await userDataCache.storeExamSchedule(sched.schedule);
        }
      } catch {}
    } catch (e) {
      console.log('[AuthContext] Post-login cache prefetch failed (will be cached on dashboard)', e?.message);
    }
  };

  const logout = async () => {
    try {
      await client.post('/mobile/logout');
    } catch (e) {
      console.log('[AuthContext] Logout API failed, continuing', e);
    }
    await AsyncStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    console.log('[AuthContext] User logged out successfully');
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </AuthContext.Provider>
  );
};
