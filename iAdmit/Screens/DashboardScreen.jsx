import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  TouchableOpacity, 
  Animated,
  Dimensions,
  Alert,
  SafeAreaView,
  Platform,
  Image,
  RefreshControl,
  Modal,
  BackHandler,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NavigationBar } from 'react-native-navigation-bar-color';
import { Text, TextInput } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
// import DateTimePicker from '@react-native-community/datetimepicker';
import * as Auth from '../API/auth';
import client from '../API/client';
import { formatBase64Image } from '../utils/imageUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import EditableProfileModal from '../components/EditableProfileModal';
import { validateExamCode, getPersonalityStatus } from '../API/exam';
import { useExamStore } from '../stores/examStore';
import offlineManager from '../utils/OfflineManager';
import userDataCache from '../utils/UserDataCache';
import { validateExamAccess } from '../utils/examScheduleValidation';
import globalFullscreen from '../utils/GlobalFullscreen';
import { checkForceAllow, getCourses, updatePreferredCourse } from '../API/auth';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 350;
const isMediumScreen = width >= 350 && width < 400;
const isShortScreen = height < 700;

// Personality type descriptions
const personalityTypes = {
  'ISTJ': { title: 'The Inspector', description: 'Quiet, serious, and dependable. Practical, matter-of-fact, realistic, and responsible. Decide logically what should be done and work toward it steadily, regardless of distractions. Take pleasure in making everything orderly and organized. Value traditions and loyalty.' },
  'ISFJ': { title: 'The Protector', description: 'Quiet, friendly, responsible, and conscientious. Committed and steady in meeting their obligations. Thorough, painstaking, and accurate. Loyal, considerate, notice and remember specifics about people who are important to them. Strive to create an orderly and harmonious environment.' },
  'INFJ': { title: 'The Advocate', description: 'Seek meaning and connection in ideas, relationships, and material possessions. Want to understand what motivates people and are insightful about others. Conscientious and committed to their firm values. Develop a clear vision about how best to serve the common good.' },
  'INTJ': { title: 'The Architect', description: 'Have original minds and great drive for implementing their ideas and achieving their goals. Quickly see patterns in external events and develop long-range explanatory perspectives. When committed, organize a job and carry it through. Skeptical and independent, have high standards of competence.' },
  'ISTP': { title: 'The Crafter', description: 'Tolerant and flexible, quiet observers until a problem appears, then act quickly to find workable solutions. Analyze what makes things work and readily get through large amounts of data to isolate the core of practical problems. Interested in cause and effect, value efficiency.' },
  'ISFP': { title: 'The Artist', description: 'Quiet, friendly, sensitive, and kind. Enjoy the present moment, what\'s going on around them. Like to have their own space and to work within their own time frame. Loyal and committed to their values and to people who are important to them. Dislike disagreements and conflicts.' },
  'INFP': { title: 'The Mediator', description: 'Idealistic, loyal to their values and to people who are important to them. Want to live a life that is congruent with their values. Curious, quick to see possibilities, can be catalysts for implementing ideas. Seek to understand people and to help them fulfill their potential.' },
  'INTP': { title: 'The Thinker', description: 'Seek to develop logical explanations for everything that interests them. Theoretical and abstract, interested more in ideas than in social interaction. Quiet, contained, flexible, and adaptable. Have unusual ability to focus in depth to solve problems in their area of interest.' },
  'ESTP': { title: 'The Persuader', description: 'Flexible and tolerant, take a pragmatic approach focused on immediate results. Bored by theories and conceptual explanations; want to act energetically to solve the problem. Focus on the here and now, spontaneous, enjoy each moment they can be active with others.' },
  'ESFP': { title: 'The Performer', description: 'Outgoing, friendly, and accepting. Exuberant lovers of life, people, and material comforts. Enjoy working with others to make things happen. Bring common sense and a realistic approach to their work and make work fun. Flexible and spontaneous, adapt readily to new people.' },
  'ENFP': { title: 'The Champion', description: 'Warmly enthusiastic and imaginative. See life as full of possibilities. Make connections between events and information very quickly, and confidently proceed based on the patterns they see. Want a lot of affirmation from others, and readily give appreciation and support.' },
  'ENTP': { title: 'The Debater', description: 'Quick, ingenious, stimulating, alert, and outspoken. Resourceful in solving new and challenging problems. Adept at generating conceptual possibilities and then analyzing them strategically. Good at reading other people. Bored by routine, will seldom do the same thing the same way.' },
  'ESTJ': { title: 'The Director', description: 'Practical, realistic, matter-of-fact. Decisive, quickly move to implement decisions. Organize projects and people to get things done, focus on getting results in the most efficient way possible. Take care of routine details. Have a clear set of logical standards.' },
  'ESFJ': { title: 'The Caregiver', description: 'Warmhearted, conscientious, and cooperative. Want harmony in their environment, work with determination to establish it. Like to work with others to complete tasks accurately and on time. Loyal, follow through even in small matters. Notice what others need in their day-to-day lives.' },
  'ENFJ': { title: 'The Giver', description: 'Warm, empathetic, responsive, and responsible. Highly attuned to the emotions, needs, and motivations of others. Find potential in everyone, want to help others fulfill their potential. May act as catalysts for individual and group growth. Sociable, facilitate others in a group.' },
  'ENTJ': { title: 'The Commander', description: 'Frank, decisive, assume leadership readily. Quickly see illogical and inefficient procedures and policies, develop and implement comprehensive systems to solve organizational problems. Enjoy long-term planning and goal setting. Usually well informed, well read, enjoy expanding their knowledge.' }
};

export default function DashboardScreen({ navigation }) {
  const { logout } = useAuth();
  const [examineeData, setExamineeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [examCode, setExamCode] = useState('');
  const [examCodeFocused, setExamCodeFocused] = useState(false);
  const [showEditableProfile, setShowEditableProfile] = useState(false);
  const [examCodeLoading, setExamCodeLoading] = useState(false);
  const [retryInfo, setRetryInfo] = useState(null);
  const { resetExam } = useExamStore();
  const [personalityType, setPersonalityType] = useState(null);
  const [examSchedule, setExamSchedule] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [autoDownloading, setAutoDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseUpdateLoading, setCourseUpdateLoading] = useState(false);
  
  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isCharging, setIsCharging] = useState(false);
  const [showBatteryLowModal, setShowBatteryLowModal] = useState(false);
  const [batteryLowMessage, setBatteryLowMessage] = useState('');
  const [showBatteryInfoModal, setShowBatteryInfoModal] = useState(false);
  const [signalStrength, setSignalStrength] = useState(null); // 0-100 or null
  const [signalType, setSignalType] = useState(null); // 'wifi' | 'cellular' | null
  const [latency, setLatency] = useState(null); // Latency in milliseconds
  const [latencyHistory, setLatencyHistory] = useState([]); // Array of latency measurements for deviation calculation
  const [latencyDeviation, setLatencyDeviation] = useState(null); // Calculated deviation in milliseconds
  // Determine if we should show an active schedule (hide if completed or archived)
  const hasActiveSchedule = !!(
    examSchedule ||
    (examineeData?.exam_schedule?.assigned_exam_date && 
     examineeData?.exam_schedule?.status !== 'completed' && 
     examineeData?.exam_schedule?.status !== 'archived')
  );

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  // Loading dots animation
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;
  // Battery border pulse animation for 0-40% (opacity from transparent to full color)
  const batteryBorderPulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Initial connectivity-aware load
    (async () => {
      try {
        const online = offlineManager.isConnected();
        setIsOnline(online);
        if (!online) {
          console.log('[Dashboard] Initial load: offline detected, loading cache');
          await loadCachedData();
        } else {
          await fetchExamineeData();
        }
      } catch (e) {
        console.log('[Dashboard] Initial load fallback to fetch', e?.message);
        await fetchExamineeData();
      }
    })();
  }, []);

  // Monitor network status and handle offline mode
  useEffect(() => {
    const unsubscribe = offlineManager.addNetworkListener(async (online, wasOffline) => {
      setIsOnline(online);
      
      if (wasOffline && online) {
        // Coming back online - refresh data
        console.log('[Dashboard] Network restored, refreshing data');
        fetchExamineeData();
      } else if (!online) {
        // Going offline - switch to cached data
        console.log('[Dashboard] Network lost, switching to offline mode');
        loadCachedData();
        try { await userDataCache.storeDashboardData({
          examineeData,
          examSchedule,
          personalityType,
          examResults: null,
          lastOfflineFlag: true,
        }); } catch {}
      }
    });

    return unsubscribe;
  }, []);

  // Subscribe to submission queue updates for footer badge
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const list = await offlineManager.getSubmissionQueue();
        setQueuedCount(Array.isArray(list) ? list.length : 0);
      } catch {}
      try {
        unsub = offlineManager.addQueueListener((list) => {
          try { setQueuedCount(Array.isArray(list) ? list.length : 0); } catch {}
        });
      } catch {}
    })();
    return () => { try { unsub?.(); } catch {} };
  }, []);

  // Initialize global fullscreen on mount
  useEffect(() => {
    globalFullscreen.initializeFullscreen();
  }, []);

  // Handle full screen mode
  useFocusEffect(
    React.useCallback(() => {
      // Ensure fullscreen is enabled when Dashboard gains focus
      globalFullscreen.enableFullscreen();
      // Force hide navigation bar to ensure it stays hidden
      setTimeout(() => globalFullscreen.forceHideNavigationBar(), 100);
      setTimeout(() => globalFullscreen.forceHideNavigationBar(), 300);
      
      return () => {
        // DON'T restore system UI when leaving Dashboard
        // Keep navigation bar hidden globally across the app
        console.log('Dashboard: Keeping navigation bar hidden globally');
      };
    }, [])
  );

  // Animate loading dots while loading
  useEffect(() => {
    if (!loading) return;
    const pulse = (val) => Animated.sequence([
      Animated.timing(val, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(val, { toValue: 0.3, duration: 350, useNativeDriver: true })
    ]);
    const loop = Animated.loop(
      Animated.stagger(150, [pulse(dot1Anim), pulse(dot2Anim), pulse(dot3Anim)])
    );
    loop.start();
    return () => { try { loop.stop(); } catch {} };
  }, [loading, dot1Anim, dot2Anim, dot3Anim]);

  // Battery border pulse animation when 0-40% (transparent to full color and back)
  useEffect(() => {
    if (batteryLevel !== null && batteryLevel <= 40) {
      // Reset to 0 (transparent) first
      batteryBorderPulseAnim.setValue(0);
      
      const pulse = Animated.loop(
        Animated.sequence([
          // Fade in: transparent (0) to full color (1)
          Animated.timing(batteryBorderPulseAnim, {
            toValue: 1, // Full color
            duration: 1200,
            useNativeDriver: true, // Opacity supports native driver
          }),
          // Fade out: full color (1) back to transparent (0)
          Animated.timing(batteryBorderPulseAnim, {
            toValue: 0, // Transparent
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => {
        try { pulse.stop(); } catch {}
        batteryBorderPulseAnim.setValue(0);
      };
    } else {
      batteryBorderPulseAnim.setValue(0);
    }
  }, [batteryLevel, batteryBorderPulseAnim]);

  // Get battery color based on precise ranges
  const getBatteryColor = (level) => {
    if (level >= 60) return '#10b981'; // Green
    if (level >= 45) return '#84cc16'; // Yellow-green (lime)
    if (level >= 31) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  // Get battery icon name based on level (segmented bars)
  // Material Icons uses battery-X-bar format where X is number of bars (1-6)
  const getBatteryIcon = (level, isCharging) => {
    if (isCharging) return 'battery-charging-full';
    // Use battery bar icons to represent battery level segments
    if (level >= 85) return 'battery-full'; // 85-100%
    if (level >= 70) return 'battery-6-bar'; // 70-84%
    if (level >= 55) return 'battery-5-bar'; // 55-69%
    if (level >= 40) return 'battery-4-bar'; // 40-54%
    if (level >= 25) return 'battery-3-bar'; // 25-39%
    if (level >= 10) return 'battery-2-bar'; // 10-24%
    if (level > 0) return 'battery-1-bar'; // 1-9%
    return 'battery-0-bar'; // 0%
  };

  // Get pulse color for border (0-40% range)
  const getPulseColor = (level) => {
    if (level <= 30) return '#ef4444'; // Red pulse
    if (level <= 40) return '#f59e0b'; // Yellow pulse
    return null; // No pulse
  };

  // Get signal strength status (weak, fair, strong)
  const getSignalStatus = (strength) => {
    if (strength === null || strength === undefined) return null;
    if (strength >= 66) return 'strong';
    if (strength >= 33) return 'fair';
    return 'weak';
  };

  // Get signal color based on strength
  const getSignalColor = (strength) => {
    const status = getSignalStatus(strength);
    if (status === 'strong') return '#10b981'; // Green
    if (status === 'fair') return '#f59e0b'; // Yellow
    if (status === 'weak') return '#ef4444'; // Red
    return '#9ca3af'; // Gray (no signal)
  };

  // Get latency color based on latency value
  // Best practices: <50ms Excellent, 50-100ms Good, 100-200ms Moderate, >200ms Poor
  const getLatencyColor = (latencyMs) => {
    if (latencyMs === null || latencyMs === undefined) return '#9ca3af'; // Gray (unknown)
    if (latencyMs < 50) return '#10b981'; // Green (Excellent)
    if (latencyMs < 100) return '#84cc16'; // Yellow-Green (Good)
    if (latencyMs < 200) return '#f59e0b'; // Yellow (Moderate)
    return '#ef4444'; // Red (Poor)
  };

  // Get signal icon name based on strength and type
  const getSignalIcon = (strength, type) => {
    if (!type || strength === null) return 'signal-wifi-off';
    if (type === 'wifi') {
      return 'wifi';
    } else { // cellular
      return 'signal-cellular-alt';
    }
  };

  // Monitor battery level using react-native-device-info
  useEffect(() => {
      // TEST MODE: Set to true to override battery level for testing
      const TEST_BATTERY_MODE = false; // Set to false to use real battery level
      const TEST_BATTERY_LEVEL = 21; // Test battery percentage (only used when TEST_BATTERY_MODE is true)

    const updateBatteryInfo = async () => {
      try {
        // TEST MODE: Override battery level for testing
        if (TEST_BATTERY_MODE) {
          console.log('[Dashboard] TEST MODE: Using test battery level:', TEST_BATTERY_LEVEL + '%');
          setBatteryLevel(TEST_BATTERY_LEVEL);
          setIsCharging(false);
          return;
        }

        // Get battery level (returns 0-1, multiply by 100 for percentage)
        if (typeof DeviceInfo.getBatteryLevel === 'function') {
          const level = await DeviceInfo.getBatteryLevel();
          if (level !== null && level !== undefined && !isNaN(level)) {
            const percentage = Math.round(level * 100);
            setBatteryLevel(percentage);
            console.log('[Dashboard] Battery level updated:', percentage + '%');
          }
        }
        
        // Check if battery is charging
        if (typeof DeviceInfo.isBatteryCharging === 'function') {
          const charging = await DeviceInfo.isBatteryCharging();
          setIsCharging(charging === true);
        }
      } catch (error) {
        console.log('[Dashboard] Failed to get battery info:', error?.message);
        // If battery API is not available, set to null to hide display
        setBatteryLevel(null);
      }
    };

    // Initial load
    updateBatteryInfo();

    // Update every 30 seconds to keep battery level current
    const batteryInterval = setInterval(updateBatteryInfo, 30000);

    return () => {
      clearInterval(batteryInterval);
    };
  }, []);

  // Monitor signal strength using NetInfo
  useEffect(() => {
    const updateSignalInfo = async () => {
      try {
        const state = await NetInfo.fetch();
        
        // Check if connected
        if (!state.isConnected) {
          setSignalStrength(null);
          setSignalType(null);
          return;
        }

        // Determine signal type
        const type = state.type === 'wifi' ? 'wifi' : (state.type === 'cellular' ? 'cellular' : null);
        setSignalType(type);

        // Get signal strength
        let strength = null;
        
        if (type === 'wifi' && state.details) {
          // WiFi signal strength (Android: -100 to 0, iOS: -100 to 0, but we convert to 0-100)
          // Android provides signalStrength in dBm (typically -100 to -50)
          // iOS provides signalStrength in percentage (0-100)
          if (Platform.OS === 'android' && state.details.signalStrength !== undefined) {
            // Android: Convert dBm to 0-100 scale (-100 to -50 dBm -> 0-100%)
            const dbm = state.details.signalStrength;
            strength = Math.max(0, Math.min(100, Math.round((dbm + 100) * 2))); // -100 to -50 maps to 0-100
          } else if (Platform.OS === 'ios' && state.details.signalStrength !== undefined) {
            // iOS: Already in 0-100 range
            strength = Math.round(state.details.signalStrength);
          } else {
            // Fallback: If WiFi is connected but no signal strength, assume good signal
            strength = 75;
          }
        } else if (type === 'cellular' && state.details) {
          // Cellular signal strength
          if (state.details.cellularGeneration) {
            // Android provides signalStrength (0-4 bars, or dBm)
            // iOS provides bars (0-4)
            if (Platform.OS === 'android' && state.details.signalStrength !== undefined) {
              const rawStrength = state.details.signalStrength;
              if (rawStrength >= 0 && rawStrength <= 4) {
                // Convert bars (0-4) to percentage (0-100)
                strength = rawStrength * 25; // 0=0%, 1=25%, 2=50%, 3=75%, 4=100%
              } else if (rawStrength < 0) {
                // dBm value, convert similar to WiFi
                strength = Math.max(0, Math.min(100, Math.round((rawStrength + 140) * (100/110))));
              } else {
                strength = 50; // Default
              }
            } else if (Platform.OS === 'ios' && state.details.bars !== undefined) {
              // iOS: Convert bars (0-4) to percentage
              strength = state.details.bars * 25;
            } else {
              // Fallback: If cellular is connected but no signal strength, assume fair
              strength = 50;
            }
          } else {
            strength = 50; // Default for cellular
          }
        }

        setSignalStrength(strength);
        // Only log in development to reduce performance impact
        if (__DEV__) {
          console.log('[Dashboard] Signal strength updated:', strength + '%', type);
        }
      } catch (error) {
        // Only log in development to reduce performance impact
        if (__DEV__) {
          console.log('[Dashboard] Failed to get signal info:', error?.message);
        }
        setSignalStrength(null);
        setSignalType(null);
      }
    };

    // Helper function to calculate sample standard deviation
    const calculateStdDev = (values) => {
      if (values.length < 2) return null;
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const sumSquaredDeviations = values.reduce((sum, val) => {
        const deviation = val - mean;
        return sum + (deviation * deviation);
      }, 0);
      const sampleVariance = sumSquaredDeviations / (values.length - 1);
      const sampleStdDev = Math.sqrt(sampleVariance);
      return Math.round(sampleStdDev * 10) / 10;
    };

    // Calculate robust deviation from latency history
    // Filters outliers using IQR (Interquartile Range) method for more accurate results
    const calculateDeviation = (history) => {
      if (history.length < 2) return null;
      
      // Sort history for outlier detection
      const sorted = [...history].sort((a, b) => a - b);
      
      // If we have less than 4 values, use simple std dev without filtering
      if (sorted.length < 4) {
        return calculateStdDev(sorted);
      }
      
      // Calculate quartiles for outlier detection (IQR method - industry standard)
      const q1Index = Math.floor(sorted.length * 0.25);
      const q3Index = Math.floor(sorted.length * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;
      
      // Only filter outliers if IQR is meaningful (not zero or too small)
      if (iqr > 0 && iqr < q1) {
        // Define outlier bounds (1.5 * IQR is standard for outlier detection)
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        // Filter out outliers for more accurate deviation calculation
        const filteredHistory = sorted.filter(val => val >= lowerBound && val <= upperBound);
        
        // Need at least 2 values after filtering
        if (filteredHistory.length >= 2) {
          return calculateStdDev(filteredHistory);
        }
      }
      
      // Fallback: use trimmed mean approach (remove top and bottom 10% if many samples)
      if (sorted.length >= 5) {
        const trimCount = Math.floor(sorted.length * 0.1);
        const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
        if (trimmed.length >= 2) {
          return calculateStdDev(trimmed);
        }
      }
      
      // Final fallback: use all data with standard deviation
      return calculateStdDev(sorted);
    };

    // Measure latency (ping) to API server
    // Using round-trip time (RTT) measurement with lightweight health endpoint
    const measureLatency = async () => {
      try {
        if (!isOnline) {
          setLatency(null);
          setLatencyDeviation(null);
          setLatencyHistory([]);
          return;
        }

        // Use lightweight health check endpoint for latency measurement
        // This measures round-trip time (RTT) which is standard for latency measurement
        // RTT = time from sending request to receiving response (industry standard)
        const startTime = Date.now();
        
        try {
          // Use the public health endpoint which is lightweight and doesn't require auth
          // Reduced timeout to 1.5 seconds for faster measurement and better performance
          // validateStatus accepts 2xx, 3xx, 4xx (but not 5xx server errors)
          await client.get('/mobile/health', {
            timeout: 1500, // 1.5 second timeout for faster real-time measurement
            validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx (but not 5xx)
          });
        } catch (err) {
          // If health endpoint is not available, don't measure latency
          // For connection errors, set latency to null
          if (err.response?.status === 404 || err.code === 'ECONNREFUSED' || err.code === 'NETWORK_ERROR') {
            setLatency(null);
            setLatencyDeviation(null);
            setLatencyHistory([]);
            return;
          }
          // For auth errors on health endpoint, silently fail and don't measure
          if (err.response?.status === 401 || err.response?.status === 403) {
            setLatency(null);
            setLatencyDeviation(null);
            setLatencyHistory([]);
            return;
          }
          // For timeout, set latency to null
          if (err.code === 'ECONNABORTED') {
            setLatency(null);
            setLatencyDeviation(null);
            setLatencyHistory([]);
            return;
          }
          // For other errors, don't measure
          setLatency(null);
          setLatencyDeviation(null);
          setLatencyHistory([]);
          return;
        }
        
        const endTime = Date.now();
        // Calculate latency: Round-Trip Time (RTT) in milliseconds
        // RTT measures the time from sending a request to receiving a response
        const rtt = Math.round(endTime - startTime);
        
        // Validate latency value (should be positive and reasonable)
        if (rtt > 0 && rtt < 10000) { // Reasonable range: 0-10 seconds
          setLatency(rtt);
          
          // Update latency history (keep last 10 measurements for deviation calculation)
          setLatencyHistory(prev => {
            const newHistory = [...prev, rtt].slice(-10); // Keep last 10 measurements
            const deviation = calculateDeviation(newHistory);
            setLatencyDeviation(deviation);
            return newHistory;
          });
          
          console.log('[Dashboard] Latency (RTT) measured:', rtt + 'ms');
        } else {
        setLatency(null);
        setLatencyDeviation(null);
        if (__DEV__) {
          console.log('[Dashboard] Invalid latency value:', rtt + 'ms');
        }
        }
      } catch (error) {
        // If request fails, latency is unknown
        setLatency(null);
        setLatencyDeviation(null);
        // Only log in development to reduce performance impact
        if (__DEV__) {
          console.log('[Dashboard] Failed to measure latency:', error?.message);
        }
      }
    };

    // Initial load
    updateSignalInfo();
    measureLatency();

    // Update signal info every 15 seconds (network info doesn't change frequently)
    const signalInterval = setInterval(() => {
      updateSignalInfo();
    }, 15000);

    // Measure latency more frequently (every 3 seconds) for real-time updates
    // Using a separate interval optimized for performance
    const latencyInterval = setInterval(() => {
      measureLatency();
    }, 3000); // 3 seconds for real-time feel without overwhelming the device

    // Also listen to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      updateSignalInfo();
      measureLatency();
    });

    return () => {
      clearInterval(signalInterval);
      clearInterval(latencyInterval);
      unsubscribe();
    };
  }, [isOnline]);

  const fetchExamineeData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('[Dashboard] Fetching examinee data...');
      console.log('[Dashboard] API URL:', client.defaults.baseURL + '/mobile/examinee/profile');
      
      // Check if we have a token
      const token = await AsyncStorage.getItem('auth_token');
      console.log('[Dashboard] Auth token exists:', !!token);
      
      const response = await client.get('/mobile/examinee/profile');
      console.log('[Dashboard] Examinee data received:', response.data);
      
      // The API returns the examinee data directly, not wrapped in a response object
      if (response.data && response.data.id) {
        console.log('[Dashboard] Full examinee data received:', JSON.stringify(response.data, null, 2));
        console.log('[Dashboard] Exam schedule data:', response.data.exam_schedule);
        console.log('[Dashboard] Registration status:', response.data.exam_schedule?.status);
        setExamineeData(response.data);
        
        // Store examinee data in cache for offline use
        await userDataCache.storeExamineeData(response.data);
        setIsOfflineMode(false);
      } else {
        console.log('[Dashboard] Invalid examinee data format:', response.data);
        if (!isRefresh) {
          Alert.alert('Error', 'Invalid data format received from server.');
        }
      }

      // Fetch personality status/type (optional)
      try {
        const status = await getPersonalityStatus();
        if (status?.has_taken && status?.last_result) {
          const { EI, SN, TF, JP } = status.last_result;
          const mbti = `${EI || ''}${SN || ''}${TF || ''}${JP || ''}`;
          if (mbti.length === 4) {
            setPersonalityType(mbti);
            // Store personality type in cache
            await userDataCache.storePersonalityType(mbti);
          }
        } else {
          setPersonalityType(null);
        }
      } catch (e) {
        console.log('[Dashboard] Personality status fetch failed:', e?.message);
      }

      // Fetch exam schedule details
      try {
        const scheduleData = await Auth.getExamSchedule();
        console.log('[Dashboard] Raw schedule data:', scheduleData);
        if (scheduleData?.success && scheduleData?.has_schedule) {
          // Only show schedule if exam is not completed
          if (scheduleData.registration?.status !== 'completed') {
            setExamSchedule(scheduleData.schedule);
            // Store exam schedule in cache
            await userDataCache.storeExamSchedule(scheduleData.schedule);
            console.log('[Dashboard] Exam schedule loaded:', scheduleData.schedule);
            console.log('[Dashboard] Session:', scheduleData.schedule.session);
            console.log('[Dashboard] Time:', scheduleData.schedule.start_time_formatted, '-', scheduleData.schedule.end_time_formatted);
          } else {
            setExamSchedule(null);
            console.log('[Dashboard] Exam completed - hiding schedule');
          }
        } else {
          setExamSchedule(null);
          console.log('[Dashboard] No exam schedule assigned:', scheduleData?.message);
        }
      } catch (e) {
        console.log('[Dashboard] Exam schedule fetch failed:', e?.message);
        console.log('[Dashboard] Error details:', e);
        setExamSchedule(null);
      }

      // Fetch courses for offline use
      try {
        console.log('[Dashboard] Fetching courses...');
        const coursesResponse = await client.get('/mobile/courses');
        console.log('[Dashboard] Courses response:', coursesResponse.data);
        
        if (coursesResponse.data) {
          const success = await userDataCache.storeCourses(coursesResponse.data);
          if (success) {
            console.log('[Dashboard] Courses cached for offline use');
          } else {
            console.log('[Dashboard] Failed to cache courses');
          }
        } else {
          console.log('[Dashboard] No courses data in response');
        }
      } catch (e) {
        console.log('[Dashboard] Courses fetch failed:', e?.message);
      }

      // Fetch exam results for offline use
      try {
        console.log('[Dashboard] Fetching exam results...');
        const resultsResponse = await client.get('/mobile/exam/results');
        console.log('[Dashboard] Exam results response:', resultsResponse.data);
        
        if (resultsResponse.data?.success && resultsResponse.data?.data) {
          const success = await userDataCache.storeExamResults(resultsResponse.data.data);
          if (success) {
            console.log('[Dashboard] Exam results cached for offline use');
          } else {
            console.log('[Dashboard] Failed to cache exam results');
          }
        } else {
          console.log('[Dashboard] No exam results data in response');
        }
      } catch (e) {
        console.log('[Dashboard] Exam results fetch failed:', e?.message);
      }

      // Persist a combined dashboard snapshot for offline use and update last synced time
      try {
        const snapshot = {
          examineeData: response.data,
          examSchedule: (await userDataCache.getExamSchedule()) || examSchedule,
          personalityType,
          examResults: (await userDataCache.getExamResults()) || null,
          courses: (await userDataCache.getCourses()) || null
        };
        await userDataCache.storeDashboardData(snapshot);
        const ts = new Date().toISOString();
        setLastSyncedAt(ts);
      } catch (e) {
        console.log('[Dashboard] Failed to store dashboard snapshot', e?.message);
      }
    } catch (error) {
      console.log('[Dashboard] Error fetching examinee data:', error?.response?.data || error?.message);
      console.log('[Dashboard] Error status:', error?.response?.status);
      console.log('[Dashboard] Error headers:', error?.response?.headers);
      
      // Try to load cached data when online fetch fails
      await loadCachedData();
      
      if (!isRefresh) {
        if (isOfflineMode) {
          Alert.alert('Offline Mode', 'You are currently offline. Showing cached data.');
        } else {
          Alert.alert('Error', 'Failed to load profile data. Please try again.');
        }
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadCachedData = async () => {
    try {
      console.log('[Dashboard] Loading cached data...');
      
      const cachedData = await userDataCache.getDashboardData();
      if (cachedData) {
        console.log('[Dashboard] Using cached dashboard data');
        
        if (cachedData.examineeData) {
          setExamineeData(cachedData.examineeData);
        }
        if (cachedData.personalityType) {
          setPersonalityType(cachedData.personalityType);
        }
        if (cachedData.examSchedule) {
          setExamSchedule(cachedData.examSchedule);
        }
        
        setIsOfflineMode(true);
        if (cachedData.cachedAt) setLastSyncedAt(cachedData.cachedAt);
        // Persist flag so banner shows after relaunch when still offline
        try {
          await userDataCache.storeDashboardData({
            examineeData: cachedData.examineeData,
            examSchedule: cachedData.examSchedule,
            personalityType: cachedData.personalityType,
            examResults: cachedData.examResults,
            lastOfflineFlag: true,
          });
        } catch {}
        console.log('[Dashboard] Cached data loaded successfully');
      } else {
        console.log('[Dashboard] No cached data available');
        setIsOfflineMode(false);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading cached data:', error);
      setIsOfflineMode(false);
    } finally {
      // Ensure we exit loading state when using cache path
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debug function to clear corrupted exam data
  // Corrupted data clearing removed - no longer storing exam data offline

  // Debug function to show storage statistics
  const showStorageStats = async () => {
    try {
      const stats = await userDataCache.getStorageStats();
      const optimization = await userDataCache.optimizeStorage();
      
      Alert.alert(
        'Storage Statistics',
        `Total Cache Size: ${stats.totalSizeMB}MB (${stats.totalSizeKB}KB)\n` +
        `Cached Items: ${stats.itemCount}\n` +
        `Optimization: Removed ${optimization.removedCount} expired items, saved ${optimization.savedSpaceKB}KB`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error getting storage stats:', error);
      Alert.alert('Error', 'Failed to get storage statistics');
    }
  };

  const onLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('[Dashboard] logout confirmed');
            await logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const mapValidationErrorToMessage = (error) => {
    const status = error?.response?.status;
    const apiMessage = error?.response?.data?.message || '';
    console.log('[Dashboard] mapValidationErrorToMessage status:', status, 'apiMessage:', apiMessage);
    if (status === 400) {
      if (/already/i.test(apiMessage) && /submit|took|taken/i.test(apiMessage)) {
        return 'You have already taken this exam.';
      }
      return 'This exam code is invalid or inactive.';
    }
    if (status === 404) {
      return 'Exam not found. Please check the code and try again.';
    }
    if (status === 401 || status === 403) {
      return 'You are not allowed to take this exam right now.';
    }
    if (error?.message && /network/i.test(error.message)) {
      return 'Network error. Please check your internet connection and try again.';
    }
    return apiMessage || 'Something went wrong while validating the exam code.';
  };

  // Check battery level before allowing exam
  const checkBatteryLevel = async () => {
    try {
      // TEST MODE: Use test battery level for testing
      const TEST_BATTERY_MODE = false; // Set to false to use real battery level
      const TEST_BATTERY_LEVEL = 21; // Test battery percentage (only used when TEST_BATTERY_MODE is true)

      // TEST MODE: Override battery level for testing
      if (TEST_BATTERY_MODE) {
        console.log('[Dashboard] TEST MODE: Using test battery level for validation:', TEST_BATTERY_LEVEL + '%');
        if (TEST_BATTERY_LEVEL <= 30) {
          setBatteryLowMessage(`Battery is too low. Charge your device to at least 31% and try again. Current battery: ${TEST_BATTERY_LEVEL}%`);
          setShowBatteryLowModal(true);
          return false;
        }
        return true;
      }

      if (typeof DeviceInfo.getBatteryLevel === 'function') {
        const level = await DeviceInfo.getBatteryLevel();
        if (level !== null && level !== undefined && !isNaN(level)) {
          const percentage = Math.round(level * 100);
          if (percentage <= 30) {
            setBatteryLowMessage(`Battery is too low. Charge your device to at least 31% and try again. Current battery: ${percentage}%`);
            setShowBatteryLowModal(true);
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      console.log('[Dashboard] Failed to check battery level:', error?.message);
      // If we can't check battery, allow exam to proceed
      return true;
    }
  };

  const handleExamCodeSubmit = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You are offline. Connect to the internet to validate an exam code or scan a QR.');
      return;
    }
    if (!examCode.trim()) {
      Alert.alert('Error', 'Please enter an exam code.');
      return;
    }

    // Check battery level before proceeding
    const batteryOk = await checkBatteryLevel();
    if (!batteryOk) {
      return;
    }

    setExamCodeLoading(true);
    setRetryInfo(null);
    
    try {
      console.log('[Dashboard] Validating exam code:', examCode);
      
      const examValidation = await validateExamCode(examCode.trim(), (attempt, maxRetries) => {
        setRetryInfo({ attempt, maxRetries });
      });
      
      console.log('[Dashboard] Exam validation successful:', examValidation.exam_title || examValidation.exam_ref_no, examValidation);

      // Check if guidance force-allowed this examinee today
      const forceAllowCheck = await checkForceAllow();
      const forceAllowEnabled = forceAllowCheck?.force_allow || false;
      console.log('[Dashboard] Force allow status:', forceAllowEnabled);

      // Check exam access based on assigned schedule and exam type
      const accessValidation = validateExamAccess(
        examineeData?.exam_schedule, 
        examValidation.exam_type,
        examSchedule,
        forceAllowEnabled
      );
      
      console.log('[Dashboard] Exam access validation:', accessValidation);
      console.log('[Dashboard] Exam schedule data:', examSchedule);
      console.log('[Dashboard] Examinee schedule data:', examineeData?.exam_schedule);
      
      if (!accessValidation.isValid) {
        setExamCodeLoading(false);
        Alert.alert(
          'Exam Not Available',
          accessValidation.message,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      console.log('[Dashboard] Exam access validation passed:', accessValidation);
      
      // Reset any previous exam state and clear local caches for this exam
      resetExam();
      try {
        await AsyncStorage.multiRemove([
          `exam_answers_${examValidation.examId}`,
          `personality_answers_${examValidation.examId}`,
          'last_route',
          'last_active_ts'
        ]);
      } catch {}

      // Route based on whether this exam includes a personality test
      if (examValidation.include_personality_test) {
        // If personality already taken, skip directly to instructions/exam
        try {
          const status = await getPersonalityStatus();
          if (status?.has_taken) {
            // Auto-download removed - exams are now loaded online only
            
            navigation.navigate('ExamInstructions', {
              examId: examValidation.examId,
              examRefNo: examValidation.exam_ref_no,
              examTitle: examValidation.exam_title,
              timeLimit: examValidation.time_limit,
              examType: examValidation.exam_type || 'regular',
              questionsCount: examValidation.questions_count
            });
          } else {
            navigation.navigate('PersonalityTest', { 
              examId: examValidation.examId,
              examRefNo: examValidation.exam_ref_no,
              examTitle: examValidation.exam_title,
              timeLimit: examValidation.time_limit,
              examType: examValidation.exam_type || 'regular',
              includesPersonalityTest: true
            });
          }
        } catch {
          // Fallback to personality test if status check fails
          navigation.navigate('PersonalityTest', { 
            examId: examValidation.examId,
            examRefNo: examValidation.exam_ref_no,
            examTitle: examValidation.exam_title,
            timeLimit: examValidation.time_limit,
            examType: examValidation.exam_type || 'regular',
            includesPersonalityTest: true
          });
        }
      } else {
        // Auto-download removed - exams are now loaded online only
        
        navigation.navigate('ExamInstructions', {
          examId: examValidation.examId,
          examRefNo: examValidation.exam_ref_no,
          examTitle: examValidation.exam_title,
          timeLimit: examValidation.time_limit,
          examType: examValidation.exam_type || 'regular',
          questionsCount: examValidation.questions_count
        });
      }
      
    } catch (error) {
      console.log('[Dashboard] Exam validation failed:', error);
      const friendly = mapValidationErrorToMessage(error);
      Alert.alert('Cannot Start Exam', friendly);
    } finally {
      setExamCodeLoading(false);
      setRetryInfo(null);
    }
  };

  const handleViewResults = () => {
    navigation.navigate('ExamResults');
  };

  // Auto-download exam after validation
  // Auto-download exam removed - exams are now loaded online only

  const handleQRCodeScanned = async (scannedCode) => {
    console.log('QR Code scanned:', scannedCode);
    
    if (!scannedCode.trim()) {
      Alert.alert('Error', 'Invalid QR code.');
      return;
    }

    // Check battery level before proceeding
    const batteryOk = await checkBatteryLevel();
    if (!batteryOk) {
      return;
    }

    setExamCodeLoading(true);
    setRetryInfo(null);
    
    try {
      console.log('[Dashboard] Validating QR exam code:', scannedCode);
      
      const examValidation = await validateExamCode(scannedCode.trim(), (attempt, maxRetries) => {
        setRetryInfo({ attempt, maxRetries });
      });
      
      console.log('[Dashboard] QR Exam validation successful:', examValidation.exam_title || examValidation.exam_ref_no, examValidation);

      // Check if guidance force-allowed this examinee today
      const forceAllowCheck = await checkForceAllow();
      const forceAllowEnabled = forceAllowCheck?.force_allow || false;
      console.log('[Dashboard] QR Force allow status:', forceAllowEnabled);

      // Check exam access based on assigned schedule and exam type
      const accessValidation = validateExamAccess(
        examineeData?.exam_schedule, 
        examValidation.exam_type,
        examSchedule,
        forceAllowEnabled
      );
      
      console.log('[Dashboard] QR Exam access validation:', accessValidation);
      
      if (!accessValidation.isValid) {
        setExamCodeLoading(false);
        Alert.alert(
          'Exam Not Available',
          accessValidation.message,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      console.log('[Dashboard] QR Exam access validation passed:', accessValidation);
      
      // Reset any previous exam state and clear local caches for this exam
      resetExam();
      try {
        await AsyncStorage.multiRemove([
          `exam_answers_${examValidation.examId}`,
          `personality_answers_${examValidation.examId}`,
          'last_route',
          'last_active_ts'
        ]);
      } catch {}

      // Route based on whether this exam includes a personality test
      if (examValidation.include_personality_test) {
        // Check if user has already completed personality test for this exam
        try {
          const personalityStatus = await getPersonalityStatus(examValidation.examId);
          console.log('[Dashboard] QR Personality status check:', personalityStatus);
          
          if (personalityStatus.has_taken) {
            // User has completed personality test, go directly to academic exam
            console.log('[Dashboard] QR Personality test already completed, proceeding to academic exam');
            
            // Auto-download removed - exams are now loaded online only
            
            navigation.navigate('ExamInstructions', {
              examId: examValidation.examId,
              examRefNo: examValidation.exam_ref_no,
              examTitle: examValidation.exam_title,
              timeLimit: examValidation.time_limit,
              examType: examValidation.exam_type || 'regular',
              questionsCount: examValidation.questions_count
            });
          } else {
            // User needs to take personality test first
            console.log('[Dashboard] QR User needs to take personality test first');
            
            navigation.navigate('PersonalityTest', { 
              examId: examValidation.examId,
              examRefNo: examValidation.exam_ref_no,
              examTitle: examValidation.exam_title,
              timeLimit: examValidation.time_limit,
              examType: examValidation.exam_type || 'regular',
              includesPersonalityTest: true
            });
          }
        } catch (personalityError) {
          console.log('[Dashboard] QR Error checking personality status:', personalityError);
          
          // Default to personality test if we can't determine status
          navigation.navigate('PersonalityTest', { 
            examId: examValidation.examId,
            examRefNo: examValidation.exam_ref_no,
            examTitle: examValidation.exam_title,
            timeLimit: examValidation.time_limit,
            examType: examValidation.exam_type || 'regular',
            includesPersonalityTest: true
          });
        }
      } else {
        // No personality test required, go directly to academic exam
        console.log('[Dashboard] QR No personality test required, proceeding to academic exam');
        
        // Auto-download removed - exams are now loaded online only
        
        navigation.navigate('ExamInstructions', {
          examId: examValidation.examId,
          examRefNo: examValidation.exam_ref_no,
          examTitle: examValidation.exam_title,
          timeLimit: examValidation.time_limit,
          examType: examValidation.exam_type || 'regular',
          questionsCount: examValidation.questions_count
        });
      }
      
    } catch (error) {
      console.log('[Dashboard] QR Exam code validation error:', error);
      setExamCodeLoading(false);
      setRetryInfo(null);
      const friendly = mapValidationErrorToMessage(error);
      Alert.alert('Cannot Start Exam', friendly, [{ text: 'OK', style: 'default' }]);
    }
  };

  const onRefresh = async () => {
    console.log('[Dashboard] Pull to refresh triggered');
    await fetchExamineeData(true);
  };


  const handleViewCourses = () => {
    navigation.navigate('Courses');
  };

  const handleOpenCourseModal = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to select a preferred course.');
      return;
    }
    
    try {
      console.log('[Dashboard] Fetching courses for modal...');
      const response = await getCourses();
      if (response.success && response.courses) {
        setAvailableCourses(response.courses);
        setShowCourseModal(true);
        console.log('[Dashboard] Courses loaded:', response.courses.length);
      } else {
        Alert.alert('Error', 'Failed to load courses. Please try again.');
      }
    } catch (error) {
      console.error('[Dashboard] Error loading courses:', error);
      Alert.alert('Error', 'Failed to load courses. Please try again.');
    }
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
  };

  const handleConfirmCourseSelection = async () => {
    if (!selectedCourse) {
      Alert.alert('No Selection', 'Please select a course before continuing.');
      return;
    }

    setCourseUpdateLoading(true);
    try {
      console.log('[Dashboard] Updating preferred course to:', selectedCourse.course_code);
      const response = await updatePreferredCourse(selectedCourse.course_code);
      
      if (response.success) {
        // Update local state
        setExamineeData(prev => ({
          ...prev,
          preferred_course: selectedCourse.course_code
        }));
        
        // Update cache
        try {
          const cachedData = await userDataCache.getDashboardData();
          if (cachedData?.examineeData) {
            cachedData.examineeData.preferred_course = selectedCourse.course_code;
            await userDataCache.storeDashboardData(cachedData);
          }
        } catch (cacheError) {
          console.log('[Dashboard] Cache update failed:', cacheError);
        }
        
        setShowCourseModal(false);
        setSelectedCourse(null);
        Alert.alert('Success', 'Your preferred course has been updated successfully!');
        console.log('[Dashboard] Preferred course updated successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to update preferred course.');
      }
    } catch (error) {
      console.error('[Dashboard] Error updating preferred course:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to update preferred course. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setCourseUpdateLoading(false);
    }
  };

  const handleRescheduleExam = async () => {
    console.log('[Dashboard] Reschedule exam button pressed');
    setShowRescheduleModal(true);
    setSelectedSlot(null);
    
    // Fetch available dates from the database
    await fetchAvailableDates();
  };

  const fetchAvailableDates = async () => {
    try {
      console.log('[Dashboard] Fetching available exam dates...');
      
      // Fetch all available exam dates from backend
      const response = await client.get('/mobile/exam-dates');
      
      if (response.data && response.data.success) {
        const dates = response.data.data || [];
        console.log('[Dashboard] Raw dates from API:', dates);
        setAvailableDates(dates);
        
        // Set the first available date as selected
        if (dates.length > 0) {
          const firstDateString = dates[0].exam_date;
          console.log('[Dashboard] First date string:', firstDateString);
          const firstDate = new Date(firstDateString);
          console.log('[Dashboard] First date object:', firstDate);
          setSelectedDate(firstDate);
          // Fetch slots for the first date
          console.log('[Dashboard] Fetching slots for:', firstDateString);
          await fetchAvailableSlotsForDate(firstDateString);
        } else {
          console.log('[Dashboard] No dates available');
        }
        
        console.log('[Dashboard] Available dates loaded:', dates.length);
      } else {
        setAvailableDates([]);
        console.log('[Dashboard] No available dates found in response');
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching available dates:', error);
      console.error('[Dashboard] Error details:', error.response?.data);
      setAvailableDates([]);
    }
  };

  const fetchAvailableSlotsForDate = async (dateString) => {
    try {
      // Ensure date is in YYYY-MM-DD format
      let formattedDate = dateString;
      if (dateString instanceof Date) {
        formattedDate = dateString.toISOString().split('T')[0];
      } else if (typeof dateString === 'string' && !dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // If not in correct format, try to parse and reformat
        const date = new Date(dateString);
        formattedDate = date.toISOString().split('T')[0];
      }
      
      console.log('[Dashboard] Fetching available exam slots for date:', formattedDate);
      
      // Fetch exam schedules from backend
      const response = await client.get(`/mobile/exam-schedules?date=${formattedDate}`);
      
      if (response.data && response.data.success) {
        const schedules = response.data.data || [];
        
        // Transform schedules to slot format
        const slots = schedules.map(schedule => ({
          id: schedule.id,
          time: formatTimeSlot(schedule.start_time, schedule.end_time),
          session: schedule.session,
          available: schedule.current_registrations < schedule.max_capacity,
          capacity: schedule.max_capacity,
          current: schedule.current_registrations,
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          examDate: schedule.exam_date
        }));
        
        setAvailableSlots(slots);
        console.log('[Dashboard] Available slots loaded:', slots);
      } else {
        // Fallback to empty slots if API fails
        setAvailableSlots([]);
        console.log('[Dashboard] No available slots found');
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching available slots:', error);
      console.error('[Dashboard] Error details:', error.response?.data);
      console.error('[Dashboard] Error status:', error.response?.status);
      // Fallback to empty slots on error
      setAvailableSlots([]);
      
      // Show user-friendly error
      if (error.response?.status === 400) {
        Alert.alert('Error', error.response?.data?.message || 'Invalid date format');
      }
    }
  };

  const fetchAvailableSlots = async () => {
    const formattedDate = selectedDate.toISOString().split('T')[0];
    await fetchAvailableSlotsForDate(formattedDate);
  };

  const formatTimeSlot = (startTime, endTime) => {
    // Convert 24-hour format to 12-hour format
    const formatTime = (time) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  const loadDashboardData = async () => {
    try {
      console.log('[Dashboard] Refreshing dashboard data...');
      // This function should reload the dashboard data
      // For now, we'll just refetch the slots if modal is open
      if (showRescheduleModal) {
        await fetchAvailableSlots();
      }
    } catch (error) {
      console.error('[Dashboard] Error loading dashboard data:', error);
    }
  };

  const getDateOptions = () => {
    // Use real dates from the database
    return availableDates.map(dateInfo => {
      const date = new Date(dateInfo.exam_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      
      const diffTime = dateOnly - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        date: date,
        dateString: dateInfo.exam_date,
        day: date.getDate(),
        formatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: diffDays === 0,
        isTomorrow: diffDays === 1,
        slotsCount: dateInfo.slots_count || 0
      };
    });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setSelectedSlot(null);
      // Fetch slots for the new date
      fetchAvailableSlots();
    }
  };

  const handleSlotSelection = (slot) => {
    if (slot.available) {
      setSelectedSlot(slot);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) {
      Alert.alert('No Selection', 'Please select an available time slot.');
      return;
    }

    setRescheduleLoading(true);
    try {
      console.log('[Dashboard] Confirming reschedule for schedule ID:', selectedSlot.id);
      
      // Call the reschedule API
      const response = await client.post('/mobile/reschedule-exam', {
        schedule_id: selectedSlot.id
      });
      
      if (response.data && response.data.success) {
        const data = response.data.data;
        Alert.alert(
          'Reschedule Successful',
          `Your exam has been rescheduled to ${new Date(data.exam_date).toDateString()} at ${selectedSlot.time}.`,
          [
            {
              text: 'OK',
              onPress: async () => {
                setShowRescheduleModal(false);
                // Refresh the dashboard data to show updated schedule
                await fetchExamineeData(true);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.data.message || 'Failed to reschedule exam.');
      }
    } catch (error) {
      console.error('[Dashboard] Error rescheduling exam:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to reschedule exam. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingGradient}>
          <Animated.View style={[styles.loadingContent, { opacity: fadeAnim }]}>
            <View style={styles.loadingIconContainer}>
              <Image
                source={require('../logo.png')}
                style={{ width: 56, height: 56 }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.loadingText}>Loading Dashboard...</Text>
            <View style={styles.loadingDots}>
              <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
              <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
              <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1447E6"
            colors={['#1447E6']}
            progressBackgroundColor="#FFFFFF"
            title="Pull to refresh"
            titleColor="#6b7280"
          />
        }
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: cardScale }
              ]
            }
          ]}
        >
          {/* Offline Indicator (new position, above Welcome card) */}
          {isOfflineMode && (
            <View style={styles.offlineIndicatorInline}>
              <Icon name="wifi-off" size={16} color="#f59e0b" />
              <Text style={styles.offlineText}>Offline Mode{lastSyncedAt ? ` • Last synced ${new Date(lastSyncedAt).toLocaleString()}` : ''}</Text>
            </View>
          )}

          {queuedCount > 0 && (
            <View style={styles.queuedIndicatorInline}>
              <Icon name="cloud-queue" size={16} color="#1447E6" />
              <Text style={styles.queuedText}>
                {queuedCount} exam submission{queuedCount > 1 ? 's' : ''} pending upload
              </Text>
              <TouchableOpacity 
                style={styles.queuedButton}
                onPress={() => navigation.navigate('QueuedSubmissions')}
              >
                <Text style={styles.queuedButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          )}

          

          {/* Enhanced Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../logo.png')}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>Dashboard</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {/* Battery Percentage Display - Minimal Style */}
              {batteryLevel !== null && (
                <TouchableOpacity 
                  onPress={() => setShowBatteryInfoModal(true)}
                  activeOpacity={0.7}
                  style={styles.batteryWrapper}
                >
                  <View 
                    style={[
                      styles.batteryMinimal,
                      { 
                        borderColor: batteryLevel <= 40 && getPulseColor(batteryLevel) 
                          ? 'rgba(255, 255, 255, 0.1)' // Dim base border when pulsing
                          : getBatteryColor(batteryLevel)
                      }
                    ]}
                  >
                    {/* Lightning Icon */}
                    {isCharging && (
                      <Icon 
                        name="bolt" 
                        size={8} 
                        color={getBatteryColor(batteryLevel)} 
                      />
                    )}
                    
                    {/* Single Horizontal Battery Bar with Terminal and Percentage Inside */}
                    <View style={styles.batteryMinimalBarContainer}>
                      <View style={styles.batteryMinimalBar}>
                        <View 
                          style={[
                            styles.batteryMinimalFill,
                            {
                              width: `${batteryLevel}%`,
                              backgroundColor: getBatteryColor(batteryLevel),
                            }
                          ]}
                        />
                        {/* Percentage Text Inside Battery */}
                        <View style={styles.batteryTextContainer}>
                          <Text style={[
                            styles.batteryMinimalText,
                            { 
                              color: batteryLevel > 30 ? '#ffffff' : '#ffffff',
                              textShadowColor: 'rgba(0, 0, 0, 0.5)',
                              textShadowOffset: { width: 0, height: 1 },
                              textShadowRadius: 2,
                            }
                          ]}>
                            {batteryLevel}%
                          </Text>
                        </View>
                      </View>
                      {/* Battery Terminal */}
                      <View style={[
                        styles.batteryTerminal,
                        { backgroundColor: getBatteryColor(batteryLevel) }
                      ]} />
                    </View>
                  </View>
                  {/* Pulsing border overlay for 0-40% - transparent to full color */}
                  {batteryLevel <= 40 && getPulseColor(batteryLevel) && (
                    <Animated.View
                      style={[
                        styles.batteryPulseBorder,
                        {
                          borderColor: getPulseColor(batteryLevel),
                          opacity: batteryBorderPulseAnim, // Animates from 0 (transparent) to 1 (full color) and back
                        }
                      ]}
                    />
                  )}
                </TouchableOpacity>
              )}
              {/* Latency Display - Minimal Style */}
              {(latency !== null || signalStrength !== null) && (
                <View style={styles.signalWrapper}>
                  <View 
                    style={[
                      styles.signalMinimal,
                      { 
                        borderColor: latency !== null 
                          ? getLatencyColor(latency) 
                          : getSignalColor(signalStrength) 
                      }
                    ]}
                  >
                    {/* Latency Deviation (ms) or Signal Percentage */}
                    {latencyDeviation !== null ? (
                      <>
                        <Text style={[
                          styles.signalText,
                          { color: getLatencyColor(latency) }
                        ]}>
                          {latencyDeviation}ms
                        </Text>
                        <Icon 
                          name={getSignalIcon(signalStrength, signalType)} 
                          size={8} 
                          color={getLatencyColor(latency)} 
                        />
                      </>
                    ) : latency !== null ? (
                      <>
                        <Text style={[
                          styles.signalText,
                          { color: getLatencyColor(latency) }
                        ]}>
                          {latency}ms
                        </Text>
                        <Icon 
                          name={getSignalIcon(signalStrength, signalType)} 
                          size={8} 
                          color={getLatencyColor(latency)} 
                        />
                      </>
                    ) : (
                      <>
                        <Text style={[
                          styles.signalText,
                          { color: getSignalColor(signalStrength) }
                        ]}>
                          {signalStrength}%
                        </Text>
                        <Icon 
                          name={getSignalIcon(signalStrength, signalType)} 
                          size={8} 
                          color={getSignalColor(signalStrength)} 
                        />
                      </>
                    )}
                  </View>
                </View>
              )}
              <TouchableOpacity 
                onPress={() => setShowEditableProfile(true)} 
                style={styles.profileButton}
              >
                <Icon name="person" size={18} color="#1447E6" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Preferred Course Warning */}
          {examineeData && !examineeData.preferred_course && (
            <TouchableOpacity 
              style={styles.preferredCourseWarning}
              onPress={handleOpenCourseModal}
              activeOpacity={0.8}
            >
              <View style={styles.preferredCourseWarningContent}>
                <View style={styles.preferredCourseWarningIconContainer}>
                  <Icon name="warning" size={20} color="#f59e0b" />
                </View>
                <View style={styles.preferredCourseWarningTextContainer}>
                  <Text style={styles.preferredCourseWarningTitle}>Preferred Course Required</Text>
                  <Text style={styles.preferredCourseWarningText}>
                    Tap here to select your preferred course
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color="#f59e0b" />
              </View>
            </TouchableOpacity>
          )}

          {/* Compact Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeContent}>
                <View style={styles.welcomeHeader}>
                  <View style={styles.welcomeTextContainer}>
                    <Text style={styles.welcomeTitle}>Welcome back</Text>
                    <Text style={styles.welcomeSubtitle} numberOfLines={1}>
                      {examineeData?.name || 'Student'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <View style={styles.welcomeBadge}>
                        <Icon name="verified-user" size={12} color="#059669" />
                        <Text style={styles.welcomeBadgeText}>Verified</Text>
                      </View>
                      {personalityType && (
                        <TouchableOpacity 
                          style={styles.personalityBadge}
                          onPress={() => setShowPersonalityModal(true)}
                          activeOpacity={0.7}
                        >
                          <Icon name="psychology" size={12} color="#1447E6" />
                          <Text style={styles.personalityBadgeText}>{personalityType}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowEditableProfile(true)}
                    style={styles.welcomeProfileContainer}
                  >
                    {examineeData?.Profile ? (
                      <Image
                        source={{ uri: formatBase64Image(examineeData.Profile) }}
                        style={styles.welcomeProfileImage}
                        resizeMode="cover"
                        defaultSource={require('../logo.png')}
                      />
                    ) : (
                      <View style={styles.welcomeProfilePlaceholder}>
                        <Icon name="person" size={28} color="#1447E6" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Check if registration status is cancelled (but not archived) */}
                {(() => {
                  console.log('[Dashboard] Checking cancelled status - examineeData:', examineeData);
                  console.log('[Dashboard] exam_schedule:', examineeData?.exam_schedule);
                  console.log('[Dashboard] status:', examineeData?.exam_schedule?.status);
                  console.log('[Dashboard] is cancelled?', examineeData?.exam_schedule?.status === 'cancelled');
                  console.log('[Dashboard] is archived?', examineeData?.exam_schedule?.status === 'archived');
                  return null;
                })()}
                {examineeData?.exam_schedule?.status === 'cancelled' && examineeData?.exam_schedule?.status !== 'archived' ? (
                  <View style={styles.welcomeScheduleBlock}>
                    <View style={styles.welcomeScheduleBlockHeader}>
                      <Icon name="warning" size={18} color="#e11d48" />
                      <Text style={[styles.sectionTitle, styles.welcomeScheduleBlockTitle, { color: '#e11d48' }]}>Exam Status</Text>
                    </View>
                    <View style={styles.cancelledMessageContainer}>
                      <View style={styles.cancelledMessageHeader}>
                        <Icon name="info" size={16} color="#e11d48" />
                        <Text style={styles.cancelledMessageTitle}>Exam Schedule Cancelled</Text>
                      </View>
                      <Text style={styles.cancelledMessageText}>
                        You failed to take your exam in the given schedule. You can reschedule your exam by selecting a new date below.
                      </Text>
                      
                      <TouchableOpacity 
                        style={styles.rescheduleButton}
                        onPress={handleRescheduleExam}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#e11d48', '#e11d48']}
                          style={styles.rescheduleButtonGradient}
                        >
                          <Icon name="schedule" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                          <Text style={styles.rescheduleButtonText}>Reschedule Exam</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      
                      <View style={styles.cancelledMessageFooter}>
                        <Icon name="location-on" size={14} color="#6b7280" />
                        <Text style={styles.cancelledMessageFooterText}>Or visit OCC Guidance Office for assistance</Text>
                      </View>
                    </View>
                  </View>
                ) : hasActiveSchedule && (
                  <View style={styles.welcomeScheduleBlock}>
                    <View style={styles.welcomeScheduleBlockHeader}>
                      <Icon name="event" size={18} color="#059669" />
                      <Text style={[styles.sectionTitle, styles.welcomeScheduleBlockTitle]}>Your Exam Schedule</Text>
                    </View>

                    {examSchedule ? (
                      <View style={styles.scheduleDetails}>
                        <View style={styles.scheduleItem}>
                          <Icon name="calendar-today" size={16} color="#059669" />
                          <Text style={styles.scheduleLabel}>Exam Date:</Text>
                          <Text style={styles.scheduleValue}>
                            {examSchedule.exam_date_formatted}
                          </Text>
                        </View>

                        <View style={styles.scheduleItem}>
                          <Icon name="schedule" size={16} color="#059669" />
                          <Text style={styles.scheduleLabel}>Session:</Text>
                          <Text style={[styles.scheduleValue, styles.sessionText]}>
                            {examSchedule.session_display} Session
                          </Text>
                        </View>

                        <View style={styles.scheduleItem}>
                          <Icon name="access-time" size={16} color="#059669" />
                          <Text style={styles.scheduleLabel}>Time:</Text>
                          <Text style={[styles.scheduleValue, styles.timeText]}>
                            {examSchedule.start_time_formatted} - {examSchedule.end_time_formatted}
                          </Text>
                        </View>

                        <View style={styles.scheduleItem}>
                          <Icon name="info" size={16} color="#059669" />
                          <Text style={styles.scheduleLabel}>Status:</Text>
                          <Text style={[styles.scheduleValue, styles.statusText]}>
                            Assigned
                          </Text>
                        </View>
                      </View>
                    ) : examineeData?.exam_schedule?.assigned_exam_date && examineeData?.exam_schedule?.status !== 'completed' ? (
                      <View style={styles.scheduleDetails}>
                        <View style={styles.scheduleItem}>
                          <Icon name="calendar-today" size={16} color="#059669" />
                          <Text style={styles.scheduleLabel}>Exam Date:</Text>
                          <Text style={styles.scheduleValue}>
                            {new Date(examineeData.exam_schedule.assigned_exam_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </Text>
                        </View>

                        <View style={styles.scheduleItem}>
                          <Icon name="school" size={16} color="#059669" />
                          <Text style={styles.scheduleLabel}>Academic Year:</Text>
                          <Text style={styles.scheduleValue}>
                            {examineeData.exam_schedule.school_year || 'Current Year'}
                          </Text>
                        </View>

                        <View style={styles.scheduleItem}>
                          <Icon name="info" size={16} color="#059669" />
                          <Text style={styles.scheduleLabel}>Status:</Text>
                          <Text style={[styles.scheduleValue, styles.statusText]}>
                            Assigned
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          </View>


          {/* Exam Schedule now merged into the Welcome/Profile card above */}

          {/* Enhanced Exam Code Section */}
          <View style={styles.examSection}>
            <View style={styles.examCard}>
              <View style={styles.examHeader}>
                <View style={styles.examIconContainer}>
                  <Icon name="quiz" size={24} color="#1447E6" />
                </View>
                <View style={styles.examHeaderText}>
                  <Text style={styles.sectionTitle}>Take an Exam</Text>
                  <Text style={styles.sectionSubtitle}>
                    Enter your exam code to start
                  </Text>
                </View>
              </View>
              
              <View style={styles.examCodeContainer}>
                <View style={[
                  styles.inputContainer,
                  examCodeFocused && styles.inputContainerFocused
                ]}>
                  <View style={styles.inputIconContainer}>
                    <Icon 
                      name="key" 
                      size={20} 
                      color={examCodeFocused ? '#1447E6' : '#6b7280'} 
                    />
                  </View>
                  <TextInput
                    mode="flat"
                    placeholder="Enter exam code"
                    value={examCode}
                    onChangeText={setExamCode}
                    onFocus={() => setExamCodeFocused(true)}
                    onBlur={() => setExamCodeFocused(false)}
                    style={styles.textInput}
                    contentStyle={styles.inputContent}
                    underlineStyle={{ display: 'none' }}
                    editable={isOnline}
                    placeholderTextColor={isOnline ? '#9ca3af' : '#6b728099'}
                    theme={{
                      colors: {
                        primary: '#1447E6',
                        placeholder: '#9ca3af',
                        text: '#1D293D',
                        background: 'transparent'
                      }
                    }}
                  />
                </View>
                
                
                <TouchableOpacity
                  style={[
                    styles.startExamButton,
                    (!isOnline || !examCode.trim() || examCodeLoading || autoDownloading) && styles.startExamButtonDisabled
                  ]}
                  onPress={handleExamCodeSubmit}
                  disabled={!isOnline || !examCode.trim() || examCodeLoading || autoDownloading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      isOnline && examCode.trim() && !examCodeLoading && !autoDownloading
                        ? ['#1447E6', '#1447E6'] 
                        : ['#e5e7eb', '#e5e7eb']
                    }
                    style={styles.buttonGradient}
                  >
                    <View style={styles.buttonContent}>
                      {examCodeLoading ? (
                        <Icon name="refresh" size={20} color={isOnline && examCode.trim() && !examCodeLoading && !autoDownloading ? '#FFFFFF' : '#9ca3af'} style={styles.buttonIcon} />
                      ) : autoDownloading ? (
                        <Icon name="download" size={20} color={isOnline && examCode.trim() && !examCodeLoading && !autoDownloading ? '#FFFFFF' : '#9ca3af'} style={styles.buttonIcon} />
                      ) : (
                        <Icon name="play-arrow" size={20} color={isOnline && examCode.trim() && !examCodeLoading && !autoDownloading ? '#FFFFFF' : '#9ca3af'} style={styles.buttonIcon} />
                      )}
                      <Text style={[styles.startExamButtonText, (!isOnline || !examCode.trim() || examCodeLoading || autoDownloading) && styles.startExamButtonTextDisabled]}>
                        {examCodeLoading 
                          ? (retryInfo 
                              ? `Retrying... (${retryInfo.attempt}/${retryInfo.maxRetries})` 
                              : 'Validating...'
                            ) 
                          : autoDownloading 
                            ? `Downloading... ${downloadProgress}%` 
                            : (isOnline ? 'Start Exam' : 'Offline')
                        }
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

        </Animated.View>
      </ScrollView>

      {/* Footer with Navigation Buttons - Hidden when profile modal is open */}
      {!showEditableProfile && (
        <View style={styles.footer}>
          <View style={styles.footerGradient}>
            <View style={styles.footerContent}>
              {/* Logout Button */}
              <TouchableOpacity 
                style={styles.footerButton}
                onPress={onLogout}
                activeOpacity={0.8}
              >
                <View style={styles.footerButtonContent}>
                  <View style={styles.footerButtonIconContainer}>
                    <Icon name="logout" size={20} color="#e11d48" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* View Results Button */}
              <TouchableOpacity 
                style={styles.footerButton}
                onPress={handleViewResults}
                onLongPress={showStorageStats}
                activeOpacity={0.8}
              >
                <View style={styles.footerButtonContent}>
                  <View style={styles.footerButtonIconContainer}>
                    <Icon name="assessment" size={20} color="#059669" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Central QR Scanner Button */}
              <TouchableOpacity
                style={styles.centralQRButton}
                onPress={() => {
                  if (!isOnline) {
                    Alert.alert('Offline', 'QR scanning requires an internet connection.');
                    return;
                  }
                  console.log('Central QR Scanner button pressed - navigating to QRScanner screen');
                  navigation.navigate('QRScanner', { onCodeScanned: handleQRCodeScanned });
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isOnline ? ['#1447E6', '#1447E6'] : ['#e5e7eb', '#e5e7eb']}
                  style={styles.centralQRButtonGradient}
                >
                  <Icon name="qr-code-scanner" size={28} color={isOnline ? '#ffffff' : '#9ca3af'} />
                </LinearGradient>
              </TouchableOpacity>

              {/* Available Courses Button */}
              <TouchableOpacity 
                style={styles.footerButton}
                onPress={handleViewCourses}
                activeOpacity={0.8}
              >
                <View style={styles.footerButtonContent}>
                  <View style={styles.footerButtonIconContainer}>
                    <Icon name="school" size={20} color="#1447E6" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Queued Submissions Button */}
              <TouchableOpacity 
                style={styles.footerButton}
                onPress={() => navigation.navigate('QueuedSubmissions')}
                activeOpacity={0.8}
              >
                <View style={styles.footerButtonContent}>
                  <View style={styles.footerButtonIconContainer}>
                    <Icon name="cloud-queue" size={20} color="#1447E6" />
                  </View>
                  {queuedCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{queuedCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Editable Profile Modal */}
      <EditableProfileModal
        visible={showEditableProfile}
        examineeData={examineeData}
        onClose={() => setShowEditableProfile(false)}
        onUpdate={setExamineeData}
      />

      {/* Course Selection Modal */}
      <Modal
        visible={showCourseModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCourseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.courseModalContainer}>
            <View style={styles.courseModalGradient}>
              {/* Modal Header */}
              <View style={styles.courseModalHeader}>
                <View style={styles.courseModalHeaderLeft}>
                  <View style={styles.courseModalIconContainer}>
                    <Icon name="school" size={24} color="#f59e0b" />
                  </View>
                  <View style={styles.courseModalHeaderText}>
                    <Text style={styles.courseModalTitle}>Select Preferred Course</Text>
                    <Text style={styles.courseModalSubtitle}>Choose your desired program</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.courseModalCloseButton}
                  onPress={() => setShowCourseModal(false)}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={20} color="#1D293D" />
                </TouchableOpacity>
              </View>

              {/* Modal Content */}
              <ScrollView style={styles.courseModalContent} showsVerticalScrollIndicator={false}>
                {availableCourses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      styles.courseItem,
                      selectedCourse?.id === course.id && styles.courseItemSelected
                    ]}
                    onPress={() => handleSelectCourse(course)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.courseItemContent}>
                      <View style={[
                        styles.courseRadio,
                        selectedCourse?.id === course.id && styles.courseRadioSelected
                      ]}>
                        {selectedCourse?.id === course.id && (
                          <View style={styles.courseRadioInner} />
                        )}
                      </View>
                      <View style={styles.courseInfo}>
                        <Text style={styles.courseTitle}>
                          {course.course_code} - {course.course_name}
                        </Text>
                        {course.description && (
                          <Text style={styles.courseDescription} numberOfLines={3}>
                            {course.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.courseModalFooter}>
                <TouchableOpacity
                  style={[styles.courseModalButton, styles.courseModalButtonSecondary]}
                  onPress={() => setShowCourseModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.courseModalButtonTextSecondary}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.courseModalButton,
                    styles.courseModalButtonPrimary,
                    (!selectedCourse || courseUpdateLoading) && styles.courseModalButtonDisabled
                  ]}
                  onPress={handleConfirmCourseSelection}
                  disabled={!selectedCourse || courseUpdateLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={selectedCourse && !courseUpdateLoading ? ['#1447E6', '#1447E6'] : ['#e5e7eb', '#e5e7eb']}
                    style={styles.courseButtonGradient}
                  >
                    {courseUpdateLoading ? (
                      <Icon name="refresh" size={20} color={selectedCourse && !courseUpdateLoading ? '#FFFFFF' : '#9ca3af'} style={{ marginRight: 8 }} />
                    ) : (
                      <Icon name="check" size={20} color={selectedCourse && !courseUpdateLoading ? '#FFFFFF' : '#9ca3af'} style={{ marginRight: 8 }} />
                    )}
                    <Text style={[styles.courseModalButtonText, (!selectedCourse || courseUpdateLoading) && { color: '#9ca3af' }]}>
                      {courseUpdateLoading ? 'Updating...' : 'Confirm'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Personality Type Modal */}
      <Modal
        visible={showPersonalityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPersonalityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.personalityModalContainer}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f172a']}
              style={styles.personalityModalGradient}
            >
              {/* Modal Header */}
              <View style={styles.personalityModalHeader}>
                <View style={styles.personalityModalHeaderLeft}>
                  <View style={styles.personalityModalIconContainer}>
                    <Icon name="psychology" size={24} color="#a855f7" />
                  </View>
                  <View style={styles.personalityModalHeaderText}>
                    <Text style={styles.personalityModalTitle}>Your Personality Type</Text>
                    <Text style={styles.personalityModalSubtitle}>MBTI Assessment Result</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.personalityModalCloseButton}
                  onPress={() => setShowPersonalityModal(false)}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Modal Content */}
              <View style={styles.personalityModalContent}>
                {personalityType && personalityTypes[personalityType] ? (
                  <>
                    {/* Personality Type Badge */}
                    <View style={styles.personalityTypeDisplay}>
                      <LinearGradient
                        colors={['#a855f7', '#7c3aed']}
                        style={styles.personalityTypeBadge}
                      >
                        <Text style={styles.personalityTypeCode}>{personalityType}</Text>
                      </LinearGradient>
                      <Text style={styles.personalityTypeTitle}>
                        {personalityTypes[personalityType].title}
                      </Text>
                    </View>

                    {/* Description */}
                    <View style={styles.personalityDescriptionContainer}>
                      <Text style={styles.personalityDescriptionLabel}>Description</Text>
                      <Text style={styles.personalityDescriptionText}>
                        {personalityTypes[personalityType].description}
                      </Text>
                    </View>

                    {/* Additional Info */}
                    <View style={styles.personalityInfoContainer}>
                      <View style={styles.personalityInfoItem}>
                        <Icon name="info" size={16} color="#059669" />
                        <Text style={styles.personalityInfoText}>
                          This result is based on your personality assessment responses
                        </Text>
                      </View>
                      <View style={styles.personalityInfoItem}>
                        <Icon name="school" size={16} color="#3b82f6" />
                        <Text style={styles.personalityInfoText}>
                          Used for course recommendations and career guidance
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.personalityErrorContainer}>
                    <Icon name="error" size={48} color="#ef4444" />
                    <Text style={styles.personalityErrorText}>
                      Unable to load personality information
                    </Text>
                  </View>
                )}
              </View>

              {/* Modal Footer */}
              <View style={styles.personalityModalFooter}>
                <TouchableOpacity
                  style={styles.personalityModalButton}
                  onPress={() => setShowPersonalityModal(false)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#a855f7', '#7c3aed']}
                    style={styles.personalityButtonGradient}
                  >
                    <Text style={styles.personalityButtonText}>Got it</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
          </Modal>

      {/* Battery Low Modal */}
      <Modal
        visible={showBatteryLowModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBatteryLowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.batteryModalContainer}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f172a']}
              style={styles.batteryModalGradient}
            >
              {/* Modal Header */}
              <View style={styles.batteryModalHeader}>
                <View style={styles.batteryModalIconContainer}>
                  <Icon name="battery-alert" size={48} color="#ef4444" />
                </View>
                <Text style={styles.batteryModalTitle}>Battery Too Low</Text>
              </View>

              {/* Modal Content */}
              <View style={styles.batteryModalContent}>
                <Text style={styles.batteryModalMessage}>
                  {batteryLowMessage || 'Battery is too low. Charge your device to at least 31% and try again.'}
                </Text>
                <View style={styles.batteryModalInfoBox}>
                  <Icon name="info" size={20} color="#f59e0b" />
                  <Text style={styles.batteryModalInfoText}>
                    Minimum battery required: <Text style={styles.batteryModalInfoBold}>31%</Text>
                  </Text>
                </View>
              </View>

              {/* Modal Footer */}
              <View style={styles.batteryModalFooter}>
                <TouchableOpacity
                  style={styles.batteryModalButton}
                  onPress={() => setShowBatteryLowModal(false)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.batteryButtonGradient}
                  >
                    <Icon name="check-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.batteryModalButtonText}>Understood</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Battery Info Modal - Dropdown Style */}
      <Modal
        visible={showBatteryInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBatteryInfoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBatteryInfoModal(false)}
        >
          <View style={styles.batteryInfoModalContainer}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f172a']}
              style={styles.batteryInfoModalGradient}
            >
              {/* Modal Header */}
              <View style={styles.batteryInfoModalHeader}>
                <View style={styles.batteryInfoModalHeaderLeft}>
                  <View style={[
                    styles.batteryInfoModalIconContainer,
                    { backgroundColor: batteryLevel !== null ? (batteryLevel > 30 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'rgba(156, 163, 175, 0.1)' }]
                  }>
                    <Icon 
                      name={isCharging ? 'battery-charging-full' : 'battery-full'} 
                      size={24} 
                      color={batteryLevel !== null ? getBatteryColor(batteryLevel) : '#9ca3af'} 
                    />
                  </View>
                  <View style={styles.batteryInfoModalHeaderText}>
                    <Text style={styles.batteryInfoModalTitle}>Battery Status</Text>
                    <Text style={styles.batteryInfoModalSubtitle}>
                      {batteryLevel !== null ? `${batteryLevel}% ${isCharging ? '• Charging' : ''}` : 'Unknown'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.batteryInfoModalCloseButton}
                  onPress={() => setShowBatteryInfoModal(false)}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Modal Content */}
              <View style={styles.batteryInfoModalContent}>
                <View style={styles.batteryInfoSection}>
                  <View style={styles.batteryInfoItem}>
                    <Icon name="info" size={18} color="#10b981" style={{ marginRight: 12 }} />
                    <View style={styles.batteryInfoItemText}>
                      <Text style={styles.batteryInfoItemTitle}>Exam Requirement</Text>
                      <Text style={styles.batteryInfoItemDescription}>
                        Your device battery must be above <Text style={styles.batteryInfoHighlight}>30%</Text> to take an exam.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.batteryInfoItem}>
                    <Icon 
                      name={batteryLevel !== null && batteryLevel > 30 ? 'check-circle' : 'cancel'} 
                      size={18} 
                      color={batteryLevel !== null && batteryLevel > 30 ? '#10b981' : '#ef4444'} 
                      style={{ marginRight: 12 }} 
                    />
                    <View style={styles.batteryInfoItemText}>
                      <Text style={styles.batteryInfoItemTitle}>Current Status</Text>
                      <Text style={[
                        styles.batteryInfoItemDescription,
                        { color: batteryLevel !== null && batteryLevel > 30 ? '#10b981' : '#ef4444' }
                      ]}>
                        {batteryLevel !== null && batteryLevel > 30 
                          ? `You can take the exam (${batteryLevel}% available)` 
                          : `You cannot take the exam. Please charge to at least 31% (Current: ${batteryLevel}%)`}
                      </Text>
                    </View>
                  </View>

                  {batteryLevel !== null && batteryLevel <= 30 && (
                    <View style={styles.batteryWarningBox}>
                      <Icon name="warning" size={16} color="#f59e0b" style={{ marginRight: 8 }} />
                      <Text style={styles.batteryWarningText}>
                        Battery is too low. Charge your device to at least 31% and try again.
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Modal Footer */}
              <View style={styles.batteryInfoModalFooter}>
                <TouchableOpacity
                  style={styles.batteryInfoModalButton}
                  onPress={() => setShowBatteryInfoModal(false)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.batteryInfoButtonGradient}
                  >
                    <Text style={styles.batteryInfoButtonText}>Got it</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reschedule Exam Modal */}
      {showRescheduleModal && (
        <Modal
          visible={showRescheduleModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRescheduleModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.rescheduleModalContainer}>
              <View style={styles.rescheduleModalGradient}>
                {/* Modal Header */}
                <View style={styles.rescheduleModalHeader}>
                  <View style={styles.rescheduleModalHeaderLeft}>
                    <View style={styles.rescheduleModalIconContainer}>
                      <Icon name="schedule" size={24} color="#e11d48" />
                    </View>
                    <View style={styles.rescheduleModalHeaderText}>
                      <Text style={styles.rescheduleModalTitle}>Reschedule Exam</Text>
                      <Text style={styles.rescheduleModalSubtitle}>Select a new date and time</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.rescheduleModalCloseButton}
                    onPress={() => setShowRescheduleModal(false)}
                    activeOpacity={0.7}
                  >
                    <Icon name="close" size={20} color="#1D293D" />
                  </TouchableOpacity>
                </View>

                {/* Modal Content */}
                <ScrollView style={styles.rescheduleModalContent} showsVerticalScrollIndicator={false}>
                  {/* Date Selection */}
                  <View style={styles.rescheduleSection}>
                    <Text style={styles.rescheduleSectionTitle}>Select Date</Text>
                    <TouchableOpacity
                      style={styles.dateSelector}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Icon name="calendar-today" size={20} color="#f59e0b" />
                      <Text style={styles.dateSelectorText}>
                        {selectedDate.toDateString()}
                      </Text>
                      <Icon name="keyboard-arrow-down" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>

                  {/* Time Slots */}
                  <View style={styles.rescheduleSection}>
                    <Text style={styles.rescheduleSectionTitle}>Available Time Slots</Text>
                    
                    {/* Morning Session */}
                    {availableSlots.filter(slot => slot.session === 'morning').length > 0 && (
                      <View style={styles.sessionContainer}>
                        <View style={styles.sessionHeader}>
                          <Icon name="wb-sunny" size={20} color="#f59e0b" />
                          <Text style={styles.sessionTitle}>Morning Session</Text>
                        </View>
                        <View style={styles.sessionSlotsContainer}>
                          {availableSlots
                            .filter(slot => slot.session === 'morning')
                            .map((slot) => (
                              <TouchableOpacity
                                key={slot.id}
                                style={[
                                  styles.slotItem,
                                  !slot.available && styles.slotItemUnavailable,
                                  selectedSlot?.id === slot.id && styles.slotItemSelected
                                ]}
                                onPress={() => handleSlotSelection(slot)}
                                activeOpacity={slot.available ? 0.7 : 1}
                                disabled={!slot.available}
                              >
                                <View style={styles.slotItemContent}>
                                  <Icon 
                                    name={slot.available ? "access-time" : "block"} 
                                    size={18} 
                                    color={slot.available ? "#10b981" : "#ef4444"} 
                                  />
                                  <View style={styles.slotItemTextContainer}>
                                    <Text style={[
                                      styles.slotItemText,
                                      !slot.available && styles.slotItemTextUnavailable,
                                      selectedSlot?.id === slot.id && styles.slotItemTextSelected
                                    ]}>
                                      {slot.time}
                                    </Text>
                                  </View>
                                  <View style={styles.slotItemStatusContainer}>
                                    {!slot.available ? (
                                      <Text style={styles.slotItemStatus}>Full</Text>
                                    ) : (
                                      <Text style={styles.slotItemCapacity}>
                                        {slot.current}/{slot.capacity}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))}
                        </View>
                      </View>
                    )}

                    {/* Afternoon Session */}
                    {availableSlots.filter(slot => slot.session === 'afternoon').length > 0 && (
                      <View style={styles.sessionContainer}>
                        <View style={styles.sessionHeader}>
                          <Icon name="brightness-3" size={20} color="#f59e0b" />
                          <Text style={styles.sessionTitle}>Afternoon Session</Text>
                        </View>
                        <View style={styles.sessionSlotsContainer}>
                          {availableSlots
                            .filter(slot => slot.session === 'afternoon')
                            .map((slot) => (
                              <TouchableOpacity
                                key={slot.id}
                                style={[
                                  styles.slotItem,
                                  !slot.available && styles.slotItemUnavailable,
                                  selectedSlot?.id === slot.id && styles.slotItemSelected
                                ]}
                                onPress={() => handleSlotSelection(slot)}
                                activeOpacity={slot.available ? 0.7 : 1}
                                disabled={!slot.available}
                              >
                                <View style={styles.slotItemContent}>
                                  <Icon 
                                    name={slot.available ? "access-time" : "block"} 
                                    size={18} 
                                    color={slot.available ? "#10b981" : "#ef4444"} 
                                  />
                                  <View style={styles.slotItemTextContainer}>
                                    <Text style={[
                                      styles.slotItemText,
                                      !slot.available && styles.slotItemTextUnavailable,
                                      selectedSlot?.id === slot.id && styles.slotItemTextSelected
                                    ]}>
                                      {slot.time}
                                    </Text>
                                  </View>
                                  <View style={styles.slotItemStatusContainer}>
                                    {!slot.available ? (
                                      <Text style={styles.slotItemStatus}>Full</Text>
                                    ) : (
                                      <Text style={styles.slotItemCapacity}>
                                        {slot.current}/{slot.capacity}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))}
                        </View>
                      </View>
                    )}

                    {/* No Slots Available */}
                    {availableSlots.length === 0 && (
                      <View style={styles.noSlotsContainer}>
                        <Icon name="event-busy" size={48} color="#6b7280" />
                        <Text style={styles.noSlotsText}>No available time slots for this date</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* Modal Footer */}
                <View style={styles.rescheduleModalFooter}>
                  <TouchableOpacity
                    style={styles.rescheduleModalButton}
                    onPress={handleConfirmReschedule}
                    activeOpacity={0.7}
                    disabled={!selectedSlot || rescheduleLoading}
                  >
                    <LinearGradient
                      colors={selectedSlot && !rescheduleLoading ? ['#e11d48', '#e11d48'] : ['#e5e7eb', '#e5e7eb']}
                      style={styles.rescheduleButtonGradient}
                    >
                      {rescheduleLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Icon name="check" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                          <Text style={styles.rescheduleModalButtonText}>Confirm Reschedule</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Custom Date Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModalContainer}>
              <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0f172a']}
                style={styles.datePickerModalGradient}
              >
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.datePickerCloseButton}
                  >
                    <Icon name="close" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.datePickerContent}>
                  <Text style={styles.datePickerSubtitle}>Choose your preferred exam date</Text>
                  
                  {/* Date Options */}
                  <View style={styles.dateOptionsContainer}>
                    {getDateOptions().map((dateOption, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dateOption,
                          selectedDate.toDateString() === dateOption.date.toDateString() && styles.dateOptionSelected
                        ]}
                        onPress={async () => {
                          setSelectedDate(dateOption.date);
                          setSelectedSlot(null);
                          setShowDatePicker(false);
                          // Fetch slots for the selected date
                          await fetchAvailableSlotsForDate(dateOption.dateString);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dateOptionContent}>
                          <Text style={styles.dateOptionDay}>{dateOption.day}</Text>
                          <Text style={styles.dateOptionDate}>{dateOption.formatted}</Text>
                          <Text style={styles.dateOptionWeekday}>{dateOption.weekday}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </LinearGradient>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  offlineIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
  },
  offlineIndicatorInline: {
    backgroundColor: '#fef3c7',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offlineText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  queuedIndicatorInline: {
    backgroundColor: '#eff6ff',
    borderColor: 'rgba(20, 71, 230, 0.2)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  queuedText: {
    color: '#1447E6',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    flex: 1,
  },
  queuedButton: {
    backgroundColor: 'rgba(20, 71, 230, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  queuedButtonText: {
    color: '#1447E6',
    fontSize: 10,
    fontWeight: '600',
  },
  // Preferred Course Warning Styles
  preferredCourseWarning: {
    backgroundColor: '#fef3c7',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  preferredCourseWarningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  preferredCourseWarningIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  preferredCourseWarningTextContainer: {
    flex: 1,
  },
  preferredCourseWarningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d97706',
    marginBottom: 2,
  },
  preferredCourseWarningText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '500',
  },
  // Course Selection Modal Styles
  courseModalContainer: {
    width: '85%',
    maxWidth: 380,
    maxHeight: '75%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  courseModalGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
  },
  courseModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  courseModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  courseModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  courseModalHeaderText: {
    flex: 1,
  },
  courseModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D293D',
    marginBottom: 2,
  },
  courseModalSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  courseModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseModalContent: {
    maxHeight: 350,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  courseItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  courseItemSelected: {
    backgroundColor: '#fef3c7',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderWidth: 2,
  },
  courseItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  courseRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  courseRadioSelected: {
    borderColor: '#d97706',
  },
  courseRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d97706',
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D293D',
    marginBottom: 4,
    lineHeight: 18,
  },
  courseDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    marginTop: 1,
  },
  courseModalFooter: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  courseModalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  courseModalButtonSecondary: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  courseModalButtonPrimary: {
    shadowColor: '#1447E6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  courseModalButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  courseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  courseModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  courseModalButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D293D',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
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
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.15)',
  },
  loadingText: {
    color: '#1D293D',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 14,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  content: {
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Allow header content to take available space
    minWidth: 0, // Prevent overflow
  },
  logoContainer: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 8 : 10,
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.15)',
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D293D',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Reduced gap for better fit on small screens
    flexShrink: 0, // Prevent buttons from shrinking
  },
  batteryWrapper: {
    position: 'relative',
  },
  batteryMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
    zIndex: 2,
    gap: 3,
  },
  batteryMinimalBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  batteryMinimalBar: {
    width: 26,
    height: 11,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1d5db',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  batteryMinimalFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 1,
  },
  batteryTextContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  batteryMinimalText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#1D293D',
  },
  batteryTerminal: {
    width: 2,
    height: 5,
    borderRadius: 0.5,
    backgroundColor: '#10b981',
  },
  batteryPulseBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ef4444',
    zIndex: 1,
    pointerEvents: 'none',
  },
  signalWrapper: {
    position: 'relative',
    marginLeft: 4,
  },
  signalMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
    zIndex: 2,
    gap: 3,
  },
  signalBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 14,
  },
  signalBarWrapper: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  signalBar: {
    width: 2.5,
    borderRadius: 1,
    minHeight: 3,
  },
  signalText: {
    fontSize: 7,
    fontWeight: '700',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    marginBottom: 16,
  },
  welcomeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#1D293D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeContent: {
    padding: 16,
    alignItems: 'flex-start',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  welcomeTextContainer: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  welcomeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'left',
    letterSpacing: 0.2,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  welcomeProfileContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flexShrink: 0,
  },
  welcomeProfileImage: {
    width: '100%',
    height: '100%',
  },
  welcomeProfilePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.16)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  welcomeBadgeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  personalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  personalityBadgeText: {
    fontSize: 11,
    color: '#1447E6',
    fontWeight: '700',
    marginLeft: 4,
  },
  welcomeScheduleBlock: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  welcomeScheduleBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeScheduleBlockTitle: {
    marginLeft: 8,
    marginBottom: 0,
  },
  profileCard: {
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  editIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    gap: 12,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  // Schedule Section Styles
  scheduleSection: {
    marginBottom: 16,
  },
  scheduleCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.18)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#1D293D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  scheduleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  scheduleContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  scheduleDetails: {
    gap: 10,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    minWidth: 80,
  },
  scheduleValue: {
    fontSize: 13,
    color: '#1D293D',
    fontWeight: '600',
    flex: 1,
  },
  statusText: {
    color: '#059669',
    textTransform: 'capitalize',
  },
  sessionText: {
    color: '#d97706',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  timeText: {
    color: '#1447E6',
    fontWeight: '600',
  },
  noScheduleContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noScheduleText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '600',
  },
  noScheduleSubtext: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  
  examSection: {
    marginBottom: 16,
  },
  examCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#1D293D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  examIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  examHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D293D',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  examCodeContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
    gap: 12,
  },
  inputContainer: {
    position: 'relative',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 44,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: '#1447E6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1447E6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  inputIconContainer: {
    position: 'absolute',
    left: 12,
    top: 14,
    zIndex: 1,
  },
  textInput: {
    backgroundColor: 'transparent',
    fontSize: 14,
    paddingLeft: 36,
    paddingRight: 12,
    height: 44,
    fontWeight: '500',
    color: '#1D293D',
  },
  inputContent: {
    color: '#1D293D',
    fontSize: 14,
    fontWeight: '500',
  },
  startExamButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#1447E6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 44,
  },
  startExamButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGradient: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  startExamButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  startExamButtonTextDisabled: {
    color: '#9ca3af',
  },
  // Cancelled Status Styles
  cancelledMessageContainer: {
    backgroundColor: 'rgba(225, 29, 72, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.2)',
    padding: 16,
  },
  cancelledMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelledMessageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e11d48',
    marginLeft: 8,
  },
  cancelledMessageText: {
    fontSize: 14,
    color: '#1D293D',
    lineHeight: 20,
    marginBottom: 12,
  },
  cancelledMessageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelledMessageFooterText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginLeft: 6,
  },
  rescheduleButton: {
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  rescheduleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  rescheduleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Reschedule Modal Styles
  rescheduleModalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  rescheduleModalGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
  },
  rescheduleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rescheduleModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rescheduleModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.2)',
  },
  rescheduleModalHeaderText: {
    flex: 1,
  },
  rescheduleModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D293D',
    marginBottom: 4,
  },
  rescheduleModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  rescheduleModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescheduleModalContent: {
    maxHeight: 400,
    padding: 20,
  },
  rescheduleSection: {
    marginBottom: 24,
  },
  rescheduleSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D293D',
    marginBottom: 12,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#1D293D',
    marginLeft: 12,
    fontWeight: '500',
  },
  sessionContainer: {
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D293D',
    marginLeft: 8,
  },
  sessionSlotsContainer: {
    gap: 8,
  },
  slotItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  slotItemUnavailable: {
    backgroundColor: 'rgba(225, 29, 72, 0.06)',
    borderColor: 'rgba(225, 29, 72, 0.25)',
    opacity: 0.8,
  },
  slotItemSelected: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: 'rgba(5, 150, 105, 0.4)',
    borderWidth: 2,
  },
  slotItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  slotItemTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  slotItemText: {
    fontSize: 16,
    color: '#1D293D',
    fontWeight: '600',
  },
  slotItemTextUnavailable: {
    color: '#9ca3af',
  },
  slotItemTextSelected: {
    color: '#059669',
  },
  slotItemSession: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 2,
  },
  slotItemStatusContainer: {
    alignItems: 'flex-end',
  },
  slotItemStatus: {
    fontSize: 12,
    color: '#e11d48',
    fontWeight: '600',
  },
  slotItemCapacity: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  noSlotsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  rescheduleModalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  rescheduleModalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    
  },
  rescheduleModalButtonSecondary: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rescheduleModalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D293D',
  },
  rescheduleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  rescheduleModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Custom Date Picker Styles
  datePickerModalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  datePickerModalGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  datePickerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContent: {
    maxHeight: 500,
    padding: 20,
    
  },
  datePickerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
    textAlign: 'center',
  },
  dateOptionsContainer: {
    gap: 12,
  },
  dateOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  dateOptionSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderWidth: 2,
  },
  dateOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dateOptionDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f59e0b',
    width: 40,
    textAlign: 'center',
  },
  dateOptionDate: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 16,
    fontWeight: '600',
  },
  dateOptionWeekday: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  // Personality Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  personalityModalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  personalityModalGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  personalityModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  personalityModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  personalityModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  personalityModalHeaderText: {
    flex: 1,
  },
  personalityModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  personalityModalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  personalityModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personalityModalContent: {
    padding: 20,
  },
  personalityTypeDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  personalityTypeBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  personalityTypeCode: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  personalityTypeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  personalityDescriptionContainer: {
    marginBottom: 20,
  },
  personalityDescriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a855f7',
    marginBottom: 12,
  },
  personalityDescriptionText: {
    fontSize: 15,
    color: '#e5e7eb',
    lineHeight: 24,
    textAlign: 'justify',
  },
  personalityInfoContainer: {
    gap: 12,
  },
  personalityInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  personalityInfoText: {
    fontSize: 14,
    color: '#d1d5db',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  personalityErrorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  personalityErrorText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  personalityModalFooter: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  personalityModalButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  personalityButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Battery Low Modal Styles
  batteryModalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  batteryModalGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  batteryModalHeader: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  batteryModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  batteryModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  batteryModalContent: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  batteryModalMessage: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  batteryModalInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  batteryModalInfoText: {
    fontSize: 14,
    color: '#fbbf24',
    marginLeft: 12,
    flex: 1,
  },
  batteryModalInfoBold: {
    fontWeight: '700',
    color: '#ffffff',
  },
  batteryModalFooter: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  batteryModalButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  batteryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  batteryModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Battery Info Modal Styles
  batteryInfoModalContainer: {
    width: '85%',
    maxWidth: 380,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  batteryInfoModalGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  batteryInfoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  batteryInfoModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  batteryInfoModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  batteryInfoModalHeaderText: {
    flex: 1,
  },
  batteryInfoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  batteryInfoModalSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  batteryInfoModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  batteryInfoModalContent: {
    padding: 16,
    paddingTop: 12,
  },
  batteryInfoSection: {
    gap: 12,
  },
  batteryInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  batteryInfoItemText: {
    flex: 1,
  },
  batteryInfoItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  batteryInfoItemDescription: {
    fontSize: 12,
    color: '#d1d5db',
    lineHeight: 18,
  },
  batteryInfoHighlight: {
    fontWeight: '700',
    color: '#10b981',
  },
  batteryWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    marginTop: 4,
  },
  batteryWarningText: {
    fontSize: 12,
    color: '#fbbf24',
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  batteryInfoModalFooter: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  batteryInfoModalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  batteryInfoButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  batteryInfoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Footer Styles
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#1D293D',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  footerGradient: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 48 : 8,
    paddingHorizontal: 16,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  footerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  footerButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#e11d48',
    borderRadius: 10,
    minWidth: 18,
    paddingHorizontal: 5,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  footerButtonIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  footerButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1D293D',
    textAlign: 'center',
  },
  centralQRButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 16,
    shadowColor: '#1447E6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  centralQRButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});

