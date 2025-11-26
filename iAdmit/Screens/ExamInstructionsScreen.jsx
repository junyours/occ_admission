import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getAcademicExamQuestions, getExamQuestions } from '../API/exam';
import { useFocusEffect } from '@react-navigation/native';
import { NavigationBar } from 'react-native-navigation-bar-color';
import OfflineIndicator from '../components/OfflineIndicator';
import offlineManager from '../utils/OfflineManager';

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
      <LinearGradient colors={["#0a0a1a", "#1a1a2e", "#16213e"]} style={StyleSheet.absoluteFillObject} />
      
      {/* Offline Indicator */}
      <OfflineIndicator />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.replace('Dashboard')}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Icon name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Exam Instructions</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{examTitle || examRefNo}</Text>
        </View>
        {/* Offline download button removed - exams are now online only */}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["rgba(168, 85, 247, 0.1)", "rgba(124, 58, 237, 0.05)"]} style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoIcon}><Icon name="assignment" size={22} color="#a855f7" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.refText}>Exam: {examTitle || examRefNo}</Text>
              <Text style={styles.detailsText}>
                {loading ? 'Loading...' : `${totalQuestions} Questions`} • {timeLimit} Minutes
              </Text>
              {/* Offline status removed - exams are now online only */}
            </View>
          </View>
        </LinearGradient>

        {/* Category Breakdown */}
        {!loading && categories.length > 0 && (
          <LinearGradient colors={["rgba(16, 185, 129, 0.1)", "rgba(5, 150, 105, 0.05)"]} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIcon}><Icon name="category" size={22} color="#10b981" /></View>
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
          </LinearGradient>
        )}

        <LinearGradient colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}><Icon name="warning" size={24} color="#f59e0b" /></View>
            <Text style={styles.cardTitle}>Important Instructions</Text>
          </View>

          <View style={styles.list}>
            <View style={styles.item}><Icon name="schedule" size={16} color="#a855f7" /><Text style={styles.itemText}>You have {timeLimit} minutes for the exam.</Text></View>
            <View style={styles.item}><Icon name="screenshot-monitor" size={16} color="#a855f7" /><Text style={styles.itemText}>Screenshots and navigation are disabled.</Text></View>
            <View style={styles.item}><Icon name="warning" size={16} color="#ef4444" /><Text style={styles.itemText}>Screen will be pinned. Allow Screen Pinning to proceed.</Text></View>
            <View style={styles.item}><Icon name="block" size={16} color="#ef4444" /><Text style={styles.itemText}>You cannot exit once the exam starts.</Text></View>
            <View style={styles.item}><Icon name="timer-off" size={16} color="#ef4444" /><Text style={styles.itemText}>Security violations deduct time from your timer.</Text></View>
            <View style={styles.item}><Icon name="edit" size={16} color="#10b981" /><Text style={styles.itemText}>You can review and change answers before submitting.</Text></View>
          </View>
        </LinearGradient>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => {
            // Validate all required params before navigation
            if (!examId) {
              Alert.alert('Error', 'Exam ID is missing. Please scan the QR code again.');
              console.log('[ExamInstructionsScreen] Missing examId:', { examId, examRefNo, examTitle });
              return;
            }
            
            if (!examRefNo) {
              Alert.alert('Error', 'Exam reference number is missing. Please scan the QR code again.');
              console.log('[ExamInstructionsScreen] Missing examRefNo:', { examId, examRefNo, examTitle });
              return;
            }
            
            if (!timeLimit) {
              Alert.alert('Error', 'Time limit is missing. Please scan the QR code again.');
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
          <LinearGradient colors={["#a855f7", "#7c3aed"]} style={styles.startButtonGradient}>
            <Icon name="play-arrow" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.startText}>Start Exam</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Offline Exam Downloader removed - exams are now online only */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a1a',
    paddingTop: Platform.OS === 'ios' ? 44 : 0, // Account for notch on iOS
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: isSmallScreen ? 16 : 20, paddingTop: Platform.OS === 'ios' ? (isShortScreen ? 10 : 20) : 20,
    paddingBottom: isShortScreen ? 12 : 16, marginTop: 21
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  offlineButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  content: { paddingHorizontal: isSmallScreen ? 16 : 20, paddingBottom: 100 },
  infoCard: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', overflow: 'hidden', marginBottom: 16 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(168,85,247,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  refText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  detailsText: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  offlineStatusContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  offlineStatusText: { 
    color: '#10b981', 
    fontSize: 12, 
    fontWeight: '600', 
    marginLeft: 4 
  },
  categoryCard: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', overflow: 'hidden', marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 10 },
  categoryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  categorySubtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  categoryList: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  categoryText: { color: '#ffffff', fontSize: 14, flex: 1 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 10 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,158,11,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemText: { color: '#ffffff', fontSize: 14, flex: 1, lineHeight: 20 },
  footer: { position: 'absolute', bottom: 40, left: 0, right: 0, paddingHorizontal: isSmallScreen ? 16 : 20 },
  startButton: { borderRadius: 16, overflow: 'hidden' },
  startButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  startText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});


