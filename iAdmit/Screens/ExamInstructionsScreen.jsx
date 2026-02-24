import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Platform, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getAcademicExamQuestions, getExamQuestions } from '../API/exam';
import { useFocusEffect } from '@react-navigation/native';
import { NavigationBar } from 'react-native-navigation-bar-color';
import OfflineIndicator from '../components/OfflineIndicator';
import offlineManager from '../utils/OfflineManager';
import DeviceInfo from 'react-native-device-info';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 350;
const isShortScreen = height < 700;

export default function ExamInstructionsScreen({ navigation, route }) {
  const { examId, examRefNo, timeLimit, examType = 'regular', examTitle, personalityAnswers, questionsCount } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(questionsCount || 0);
  // Offline availability removed - exams are now online only
  const [isOnline, setIsOnline] = useState(true);
  const [showBatteryLowModal, setShowBatteryLowModal] = useState(false);
  const [batteryLowMessage, setBatteryLowMessage] = useState('');

  // Helper function to get exam questions based on exam type
  const getExamQuestionsByType = async (examId, examType) => {
    console.log('[ExamInstructions] Fetching questions for exam type:', examType);
    
    if (examType === 'departmental') {
      return await getExamQuestions(examId, 'departmental');
    } else {
      return await getAcademicExamQuestions(examId);
    }
  };

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setLoading(true);
        const examData = await getExamQuestionsByType(examId, examType);
        
        // Extract unique categories from questions
        const uniqueCategories = [...new Set(examData.questions.map(q => q.category).filter(Boolean))];
        setCategories(uniqueCategories);
        setTotalQuestions(examData.questions.length);
        
        console.log('[ExamInstructions] Exam data loaded:', {
          categories: uniqueCategories,
          totalQuestions: examData.questions.length
        });
      } catch (error) {
        console.log('[ExamInstructions] Error fetching exam data:', error?.message);
        // Continue without category data if fetch fails
      } finally {
        setLoading(false);
      }
    };

    // Offline availability check removed - exams are now online only

    if (examId) {
      fetchExamData();
    } else {
      setLoading(false);
    }
  }, [examId, examType]);

  // Listen for network changes
  useEffect(() => {
    const unsubscribe = offlineManager.addNetworkListener((online) => {
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  // Offline availability checking removed - exams are now online only

  // Handle full screen mode
  useFocusEffect(
    React.useCallback(() => {
      // Multiple attempts to hide status bar
      StatusBar.setHidden(true, 'fade');
      
      setTimeout(() => {
        StatusBar.setHidden(true, 'none');
        console.log('ExamInstructionsScreen: Status bar hidden with none animation');
      }, 50);
      
      setTimeout(() => {
        StatusBar.setHidden(true, 'slide');
        console.log('ExamInstructionsScreen: Status bar hidden with slide animation');
      }, 100);
      
      // For Android, hide navigation bar
      if (Platform.OS === 'android') {
        const hideNavigationBar = async () => {
          try {
            await NavigationBar.setNavigationBarVisibility(false);
            await NavigationBar.setNavigationBarColor('transparent', true);
            console.log('ExamInstructionsScreen: Navigation bar hidden successfully');
            
            setTimeout(async () => {
              try {
                await NavigationBar.setNavigationBarColor('#00000000', true);
                console.log('ExamInstructionsScreen: Alternative transparent method applied');
              } catch (e) {
                console.log('ExamInstructionsScreen: Alternative method failed:', e.message);
              }
            }, 200);
            
          } catch (error) {
            console.log('ExamInstructionsScreen: Navigation bar control error:', error.message);
          }
        };
        
        hideNavigationBar();
      }

      return () => {
        // DON'T restore system UI - Dashboard controls global navigation bar state
        console.log('ExamInstructionsScreen: Keeping navigation bar hidden (controlled by Dashboard)');
      };
    }, [])
  );

  // Additional useEffect to force hide system UI on component mount
  useEffect(() => {
    const forceHideSystemUI = () => {
      // Multiple attempts to hide status bar
      StatusBar.setHidden(true, 'fade');
      
      setTimeout(() => {
        StatusBar.setHidden(true, 'none');
        console.log('ExamInstructionsScreen: Status bar hidden with none animation');
      }, 50);
      
      setTimeout(() => {
        StatusBar.setHidden(true, 'slide');
        console.log('ExamInstructionsScreen: Status bar hidden with slide animation');
      }, 100);
      
      if (Platform.OS === 'android') {
        const hideNavigationBar = async () => {
          try {
            await NavigationBar.setNavigationBarVisibility(false);
            await NavigationBar.setNavigationBarColor('transparent', true);
            console.log('ExamInstructionsScreen: Force hide navigation bar on mount');
            
            setTimeout(async () => {
              try {
                await NavigationBar.setNavigationBarColor('#00000000', true);
                console.log('ExamInstructionsScreen: Force hide alternative method');
              } catch (e) {
                console.log('ExamInstructionsScreen: Force hide alternative failed:', e.message);
              }
            }, 100);
            
          } catch (error) {
            console.log('ExamInstructionsScreen: Force hide error:', error.message);
          }
        };
        
        hideNavigationBar();
      }
    };

    forceHideSystemUI();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.replace('Dashboard')}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Icon name="arrow-back" size={20} color="#1D293D" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Exam Instructions</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{examTitle || examRefNo}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Exam Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoIcon}>
              <Icon name="assignment" size={22} color="#1447E6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.refText}>Exam: {examTitle || examRefNo}</Text>
              <Text style={styles.detailsText}>
                {loading ? 'Loading...' : `${totalQuestions} Questions`} • {timeLimit} Minutes
              </Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        {!loading && categories.length > 0 && (
          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}>
                <Icon name="category" size={22} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryTitle}>Exam Categories</Text>
                <Text style={styles.categorySubtitle}>This exam covers the following subjects:</Text>
              </View>
            </View>
            <View style={styles.categoryList}>
              {categories.map((category, index) => (
                <View key={category} style={styles.categoryItem}>
                  <View style={styles.categoryBullet} />
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Instructions Card */}
        <View style={styles.instructionsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Icon name="warning" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.cardTitle}>Important Instructions</Text>
          </View>

          <View style={styles.list}>
            <View style={styles.item}>
              <Icon name="schedule" size={16} color="#1D293D" />
              <Text style={styles.itemText}>You have {timeLimit} minutes for the exam.</Text>
            </View>
            <View style={styles.item}>
              <Icon name="screenshot-monitor" size={16} color="#1D293D" />
              <Text style={styles.itemText}>Screenshots and navigation are disabled.</Text>
            </View>
            <View style={styles.item}>
              <Icon name="warning" size={16} color="#ef4444" />
              <Text style={styles.itemText}>Screen will be pinned. Allow Screen Pinning to proceed.</Text>
            </View>
            <View style={styles.item}>
              <Icon name="block" size={16} color="#ef4444" />
              <Text style={styles.itemText}>You cannot exit once the exam starts.</Text>
            </View>
            <View style={styles.item}>
              <Icon name="timer-off" size={16} color="#ef4444" />
              <Text style={styles.itemText}>Security violations deduct time from your timer.</Text>
            </View>
            <View style={styles.item}>
              <Icon name="edit" size={16} color="#10b981" />
              <Text style={styles.itemText}>You can review and change answers before submitting.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={async () => {
            // Check battery level before starting exam
            // TEST MODE: Use test battery level for testing
            const TEST_BATTERY_MODE = false; // Set to false to use real battery level
            const TEST_BATTERY_LEVEL = 21; // Test battery percentage (only used when TEST_BATTERY_MODE is true)

            try {
              // TEST MODE: Override battery level for testing
              if (TEST_BATTERY_MODE) {
                console.log('[ExamInstructionsScreen] TEST MODE: Using test battery level:', TEST_BATTERY_LEVEL + '%');
                if (TEST_BATTERY_LEVEL <= 30) {
                  setBatteryLowMessage(`Battery is too low. Charge your device to at least 31% and try again. Current battery: ${TEST_BATTERY_LEVEL}%`);
                  setShowBatteryLowModal(true);
                  return;
                }
              } else {
                if (typeof DeviceInfo.getBatteryLevel === 'function') {
                  const level = await DeviceInfo.getBatteryLevel();
                  if (level !== null && level !== undefined && !isNaN(level)) {
                    const percentage = Math.round(level * 100);
                    if (percentage <= 30) {
                      setBatteryLowMessage(`Battery is too low. Charge your device to at least 31% and try again. Current battery: ${percentage}%`);
                      setShowBatteryLowModal(true);
                      return;
                    }
                  }
                }
              }
            } catch (error) {
              console.log('[ExamInstructionsScreen] Failed to check battery level:', error?.message);
              // If we can't check battery, allow exam to proceed
            }

            // Validate all required params before navigation
            if (!examId) {
              Alert.alert('Error', 'Exam ID is missing. Please scan QR code again.');
              console.log('[ExamInstructionsScreen] Missing examId:', { examId, examRefNo, examTitle });
              return;
            }
            
            if (!examRefNo) {
              Alert.alert('Error', 'Exam reference number is missing. Please scan QR code again.');
              console.log('[ExamInstructionsScreen] Missing examRefNo:', { examId, examRefNo, examTitle });
              return;
            }
            
            if (!timeLimit) {
              Alert.alert('Error', 'Time limit is missing. Please scan QR code again.');
              console.log('[ExamInstructionsScreen] Missing timeLimit:', { examId, examRefNo, timeLimit });
              return;
            }
            
            console.log('[ExamInstructionsScreen] Navigating to ExamScreen with params:', {
              examId,
              examRefNo,
              timeLimit,
              examType: examType || 'regular',
              examTitle,
              hasPersonalityAnswers: !!personalityAnswers,
              autoStart: true
            });
            
            const target = { 
              examId, 
              examRefNo, 
              timeLimit, 
              examType: examType || 'regular', 
              examTitle, 
              personalityAnswers, 
              autoStart: true 
            };
            
            // Use replace to prevent going back to instructions
            navigation.replace('ExamScreen', target);
          }}
          style={styles.startButton}
          activeOpacity={0.85}
        >
          <LinearGradient colors={["#1447E6", "#0d47aa"]} style={styles.startButtonGradient}>
            <Icon name="play-arrow" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.startText}>Start Exam</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

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
              colors={['#1D293D', '#1447E6', '#0d47aa']}
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
                    colors={["#10b981", "#059669"]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 44 : 0, // Account for notch on iOS
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? (isShortScreen ? 12 : 20) : 20,
    paddingBottom: 12, marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(29, 41, 61, 0.04)',
    backgroundColor: 'rgba(29, 41, 61, 0.01)',
  },
  backButton: { 
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(29, 41, 61, 0.02)', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(29, 41, 61, 0.05)' 
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { 
    color: '#1D293D', fontSize: 16, fontWeight: '700', letterSpacing: -0.5 
  },
  subtitle: { 
    color: '#6b7280', fontSize: 12, marginTop: 2, letterSpacing: 0.1 
  },
  content: { 
    paddingHorizontal: 16, paddingBottom: 80 
  },
  infoCard: { 
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(29, 41, 61, 0.04)', overflow: 'hidden', 
    marginBottom: 16, backgroundColor: '#F8FAFC', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 
  },
  infoHeader: { 
    flexDirection: 'row', alignItems: 'center', padding: 12, 
    backgroundColor: 'rgba(20, 71, 230, 0.02)', borderRadius: 6
  },
  infoIcon: { 
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(20, 71, 230, 0.08)', 
    justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  refText: { 
    color: '#1D293D', fontSize: 14, fontWeight: '600' 
  },
  detailsText: { 
    color: '#6b7280', fontSize: 12, marginTop: 2, letterSpacing: 0.1 
  },
  categoryCard: { 
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(29, 41, 61, 0.04)', overflow: 'hidden', 
    marginBottom: 16, backgroundColor: '#F8FAFC', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 
  },
  categoryHeader: { 
    flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.02)', borderRadius: 6
  },
  categoryIcon: { 
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(16, 185, 129, 0.08)', 
    justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  categoryTitle: { 
    color: '#1D293D', fontSize: 14, fontWeight: '700', letterSpacing: -0.5 
  },
  categorySubtitle: { 
    color: '#6b7280', fontSize: 12, marginTop: 2, letterSpacing: 0.1 
  },
  categoryList: { 
    paddingHorizontal: 16, paddingBottom: 12, gap: 8 
  },
  categoryItem: { 
    flexDirection: 'row', alignItems: 'center', gap: 8 
  },
  categoryBullet: { 
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' 
  },
  categoryText: { 
    color: '#1D293D', fontSize: 12, flex: 1, letterSpacing: 0.1 
  },
  instructionsCard: { 
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(29, 41, 61, 0.04)', overflow: 'hidden', 
    marginBottom: 16, backgroundColor: '#F8FAFC', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 
  },
  cardHeader: { 
    flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.02)', borderRadius: 6
  },
  cardIcon: { 
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(245, 158, 11, 0.08)', 
    justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  cardTitle: { 
    color: '#1D293D', fontSize: 14, fontWeight: '700', letterSpacing: -0.5 
  },
  list: { 
    paddingHorizontal: 16, paddingBottom: 12, gap: 12 
  },
  item: { 
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8 
  },
  itemText: { 
    color: '#1D293D', fontSize: 13, flex: 1, lineHeight: 18, letterSpacing: 0.1 
  },
  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16,
    paddingVertical: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: 'rgba(29, 41, 61, 0.04)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 
  },
  startButton: { 
    borderRadius: 12, overflow: 'hidden', shadowColor: '#1447E6', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 
  },
  startButtonGradient: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48 
  },
  startText: { 
    color: '#ffffff', fontSize: 14, fontWeight: '600', letterSpacing: 0.5 
  },
  // Battery Low Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center'
  },
  batteryModalContainer: {
    width: '80%', maxWidth: 320, borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8
  },
  batteryModalGradient: {
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(29, 41, 61, 0.1)'
  },
  batteryModalHeader: {
    alignItems: 'center', padding: 24, paddingBottom: 12
  },
  batteryModalIconContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'rgba(239, 68, 68, 0.2)'
  },
  batteryModalTitle: {
    fontSize: 18, fontWeight: '700', color: '#ffffff', textAlign: 'center', letterSpacing: -0.5
  },
  batteryModalContent: {
    padding: 24, paddingTop: 8, paddingBottom: 12
  },
  batteryModalMessage: {
    fontSize: 14, color: '#d1d5db', textAlign: 'center', lineHeight: 22, marginBottom: 16, letterSpacing: 0.1
  },
  batteryModalInfoBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)'
  },
  batteryModalInfoText: {
    fontSize: 12, color: '#fbbf24', marginLeft: 12, flex: 1, letterSpacing: 0.1
  },
  batteryModalInfoBold: {
    fontWeight: '700', color: '#ffffff', letterSpacing: 0.1
  },
  batteryModalFooter: {
    padding: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)'
  },
  batteryModalButton: {
    borderRadius: 12, overflow: 'hidden', shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4
  },
  batteryButtonGradient: {
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row'
  },
  batteryModalButtonText: {
    fontSize: 14, fontWeight: '600', color: '#ffffff', letterSpacing: 0.1
  },
});
