/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, View, Text, ActivityIndicator } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './Screens/auth/LoginScreen';
import DashboardScreen from './Screens/DashboardScreen';
import PersonalityTestScreen from './Screens/PersonalityTestScreen';
import ExamScreen from './Screens/ExamScreen';
import ExamInstructionsScreen from './Screens/ExamInstructionsScreen';
import ExamResultsScreen from './Screens/ExamResultsScreen';
import UploadingExamScreen from './Screens/UploadingExamScreen';
import PersonalityReviewScreen from './Screens/PersonalityReviewScreen';
import QRScannerScreen from './Screens/QRScannerScreen';
import QueuedSubmissionsScreen from './Screens/QueuedSubmissionsScreen';
import CoursesScreen from './Screens/CoursesScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from './CSS/Design/theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useExamStore } from './stores/examStore';
import { getApiEnvironment, setApiEnvironment } from './API/client';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();
const hasResumedRef = { current: false };

function AppContent() {
  const isDarkMode = useColorScheme() === 'dark';
  const { isAuthenticated, isLoading } = useAuth();
  const { timeRemaining, restoreExamTimer } = useExamStore();
  const tryResume = async () => {
    if (!isAuthenticated || !navigationRef.isReady() || hasResumedRef.current) return;
    try {
      const raw = await AsyncStorage.getItem('last_route');
      if (!raw) return;
      const { name, params } = JSON.parse(raw);
      const allowed = ['ExamScreen', 'PersonalityTest', 'PersonalityReview'];
      
      // Check if exam was already submitted before resuming ExamScreen
      if (name === 'ExamScreen' && params?.examId) {
        try {
          const submissionFlag = await AsyncStorage.getItem(`exam_submitted_${params.examId}`);
          if (submissionFlag === 'true') {
            console.log('[App] Exam already submitted, clearing route and going to Dashboard');
            await AsyncStorage.removeItem('last_route');
            await AsyncStorage.removeItem(`exam_submitted_${params.examId}`);
            navigationRef.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
            hasResumedRef.current = true;
            return;
          }
        } catch (e) {
          console.log('[App] Error checking submission flag:', e?.message);
        }
      }
      
      if (allowed.includes(name)) {
        try { await restoreExamTimer(); } catch {}
        const remaining = useExamStore.getState().timeRemaining;
        if (typeof remaining === 'number' && remaining <= 0) {
          await AsyncStorage.removeItem('last_route');
          navigationRef.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
          hasResumedRef.current = true;
          return;
        }
        navigationRef.reset({ index: 0, routes: [{ name, params }] });
        hasResumedRef.current = true;
        return;
      }
      // Unknown or legacy route name (e.g., 'Personality Review' with a space)
      await AsyncStorage.removeItem('last_route');
      navigationRef.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      hasResumedRef.current = true;
    } catch (e) {
      console.log('[App] Failed to resume route (tryResume):', e?.message);
    }
  };

  useEffect(() => {
    // Respect stored environment; initialize client baseURL accordingly
    (async () => {
      try {
        const current = await getApiEnvironment();
        await setApiEnvironment(current);
        console.log('[App] API environment initialized to', current);
      } catch (e) {
        console.log('[App] Failed to initialize API environment', e?.message);
      }
    })();

    // Optional: enable capture protection if available
    (async () => {
      try {
        const mod = await import('react-native-capture-protection');
        if (mod?.default?.setAllowed) {
          mod.default.setAllowed(false);
        }
      } catch (e) {
        console.log('[Security] capture protection not enabled', e);
      }
    })();
  }, []);

  useEffect(() => { tryResume(); }, [isAuthenticated]);

  // Handle navigation when authentication status changes
  useEffect(() => {
    if (!isLoading && navigationRef.isReady()) {
      const currentRoute = navigationRef.getCurrentRoute();
      const currentRouteName = currentRoute?.name;

      if (isAuthenticated) {
        // User is authenticated - redirect to Dashboard if not already there
        if (currentRouteName !== 'Dashboard' && 
            currentRouteName !== 'ExamScreen' && 
            currentRouteName !== 'PersonalityTest' && 
            currentRouteName !== 'PersonalityReview' &&
            currentRouteName !== 'ExamInstructions') {
          console.log('[App] User authenticated, redirecting to Dashboard from:', currentRouteName);
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          });
        }
      } else {
        // User is not authenticated - redirect to Login if not already there
        if (currentRouteName !== 'Login') {
          console.log('[App] User not authenticated, redirecting to Login from:', currentRouteName);
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={isDarkMode ? darkTheme : lightTheme}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: isDarkMode ? '#0a0a1a' : '#ffffff'
          }}>
            <ActivityIndicator size="large" color={isDarkMode ? '#667eea' : '#667eea'} />
            <Text style={{ 
              marginTop: 16, 
              fontSize: 16,
              color: isDarkMode ? '#ffffff' : '#000000'
            }}>
              Loading...
            </Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer
          ref={navigationRef}
          onReady={() => { tryResume(); }}
          onStateChange={async () => {
            try {
              const route = navigationRef.getCurrentRoute();
              if (!route) return;
              // Persist current screen and params
              await AsyncStorage.setItem('last_route', JSON.stringify({ name: route.name, params: route.params || {} }));
            } catch (e) {
              console.log('[App] Failed to persist route:', e?.message);
            }
          }}
        >
          <Stack.Navigator 
            initialRouteName={isAuthenticated ? "Dashboard" : "Login"}
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="PersonalityTest" component={PersonalityTestScreen} />
            <Stack.Screen name="ExamInstructions" component={ExamInstructionsScreen} />
            <Stack.Screen name="ExamScreen" component={ExamScreen} />
            <Stack.Screen name="UploadingExam" component={UploadingExamScreen} />
            <Stack.Screen name="PersonalityReview" component={PersonalityReviewScreen} />
            <Stack.Screen name="ExamResults" component={ExamResultsScreen} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
            <Stack.Screen name="QueuedSubmissions" component={QueuedSubmissionsScreen} />
            <Stack.Screen name="Courses" component={CoursesScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
