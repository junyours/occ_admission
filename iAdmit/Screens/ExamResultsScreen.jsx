import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  Dimensions,
  Platform,
  BackHandler,
  AppState
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NavigationBar } from 'react-native-navigation-bar-color';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getExamResults } from '../API/exam';
import ScreenPinning from '../utils/ScreenPinning';
import userDataCache from '../utils/UserDataCache';
import offlineManager from '../utils/OfflineManager';
import globalFullscreen from '../utils/GlobalFullscreen';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 350;
const isMediumScreen = width >= 350 && width < 400;
const isShortScreen = height < 700;

export default function ExamResultsScreen({ navigation }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [entranceExpanded, setEntranceExpanded] = useState(false);
  const [departmentalExpanded, setDepartmentalExpanded] = useState(false);

  const toggleCourseExpanded = (courseId) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId], // default collapsed; toggle on tap
    }));
  };

  useEffect(() => {
    fetchResults();
    AsyncStorage.setItem('last_route', JSON.stringify({ name: 'ExamResults', params: {} })).catch(() => {});
    
    // Ensure screen pinning is stopped when results screen loads
    const ensureScreenPinningStopped = async () => {
      try {
        await ScreenPinning.stop();
        console.log('[ExamResultsScreen] Screen pinning stopped on load');
      } catch (error) {
        console.log('[ExamResultsScreen] Error stopping screen pinning on load:', error);
      }
    };
    ensureScreenPinningStopped();
  }, []);

  // Ensure fullscreen is enabled on mount
  useEffect(() => {
    globalFullscreen.enableFullscreen();
  }, []);

  // Handle app state changes to maintain fullscreen
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        // App came back to foreground - ensure fullscreen is maintained
        console.log('ExamResultsScreen: App became active, ensuring fullscreen');
        globalFullscreen.enableFullscreen();
        globalFullscreen.forceHideNavigationBar();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription?.remove();
    };
  }, []);

  // Handle full screen mode
  useFocusEffect(
    React.useCallback(() => {
      // Ensure fullscreen is enabled when ExamResults gains focus
      globalFullscreen.enableFullscreen();
      // Force hide navigation bar to ensure it stays hidden
      setTimeout(() => globalFullscreen.forceHideNavigationBar(), 100);
      setTimeout(() => globalFullscreen.forceHideNavigationBar(), 300);
      
      return () => {
        // DON'T restore system UI - Global fullscreen controls navigation bar state
        console.log('ExamResultsScreen: Keeping navigation bar hidden (controlled by GlobalFullscreen)');
      };
    }, [])
  );

  // Handle hardware back button - prevent going back to exam after submission
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Always go to Dashboard instead of going back to exam
      navigation.replace('Dashboard');
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [navigation]);

  const fetchResults = async () => {
    try {
      console.log('[ExamResults] Fetching exam results...');
      
      // Check if we're online
      const isOnline = offlineManager.isConnected();
      console.log('[ExamResults] Online status:', isOnline);
      
      if (isOnline) {
        // Fetch from API when online
        const examResults = await getExamResults();
        console.log('[ExamResults] Results received:', examResults);
        setResults(examResults);
        // Cache results for offline use
        await userDataCache.storeExamResults(examResults);
        console.log('[ExamResults] Results cached for offline use');
      } else {
        // Use cached data when offline
        console.log('[ExamResults] Offline mode - loading cached results...');
        const cachedResults = await userDataCache.getExamResults();
        
        if (cachedResults && Array.isArray(cachedResults)) {
          setResults(cachedResults);
          console.log('[ExamResults] Cached results loaded:', cachedResults.length);
        } else {
          console.log('[ExamResults] No cached results available');
          Alert.alert(
            'Offline Mode', 
            'No cached exam results available. Please connect to the internet to load results.'
          );
        }
      }
    } catch (error) {
      console.log('[ExamResults] Error fetching results:', error);
      
      // Try to load from cache as fallback
      try {
        const cachedResults = await userDataCache.getExamResults();
        if (cachedResults && Array.isArray(cachedResults)) {
          setResults(cachedResults);
          console.log('[ExamResults] Fallback to cached results:', cachedResults.length);
          Alert.alert(
            'Using Cached Data', 
            'Showing previously cached exam results. Some data may be outdated.'
          );
          return;
        }
      } catch (cacheError) {
        console.log('[ExamResults] Cache fallback failed:', cacheError);
      }
      
      Alert.alert('Error', 'Failed to load exam results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (isPassed) => {
    return isPassed ? 'Passed' : 'Failed';
  };

  const getStatusColor = (isPassed) => {
    return isPassed ? '#34C759' : '#FF3737';
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#34C759'; // Success - emerald-600
    if (percentage >= 60) return '#F7DC6F'; // Warning - amber-500
    return '#FF3737'; // Danger - rose-600
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingGradient}>
          <View style={styles.loadingContent}>
            <View style={styles.loadingIconContainer}>
              <Icon name="assessment" size={60} color="#1447E6" />
            </View>
            <Text style={styles.loadingText}>Loading Results...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.replace('Dashboard')} 
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Icon name="arrow-back" size={20} color="#1D293D" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Exam Results</Text>
          <Text style={styles.headerSubtitle}>Your performance overview</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.resultsIconContainer}>
            <Icon name="assessment" size={20} color="#1447E6" />
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {results.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Icon name="assessment" size={60} color="#6b7280" />
              </View>
              <Text style={styles.emptyTitle}>No Exam Results</Text>
              <Text style={styles.emptySubtitle}>
                You haven't taken any exams yet. Start by entering an exam code on the dashboard.
              </Text>
              <TouchableOpacity 
                style={styles.dashboardButton}
                onPress={() => navigation.navigate('Dashboard')}
                activeOpacity={0.8}
              >
                <View style={styles.buttonGradient}>
                  <Icon name="dashboard" size={20} color="#ffffff" style={styles.buttonIcon} />
                  <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Enhanced, compact Performance Summary */}
            {(() => {
              const total = results.length;
              const passed = results.filter(r => r.is_passed).length;
              const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
              const avg = total > 0 ? Math.round(results.reduce((a, r) => a + (r.percentage || 0), 0) / total) : 0;
              const best = total > 0 ? Math.max(...results.map(r => r.percentage || 0)) : 0;
              const worst = total > 0 ? Math.min(...results.map(r => r.percentage || 0)) : 0;
              const lastTaken = total > 0 ? results[0]?.created_at : null; // already sorted desc
              const entrance = results.find(r => r.exam_type === 'regular');
              const personality = entrance?.personality_type || null;
              return (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={styles.summaryIconContainer}>
                        <Icon name="trending-up" size={18} color="#1447E6" />
                      </View>
                      <Text style={styles.summaryTitle}>Performance Summary</Text>
                    </View>
                    {/* Compact preview when collapsed */}
                    {!summaryExpanded && (
                      <View style={styles.summaryPreviewRow}>
                        <View style={styles.previewPill}>
                          <Icon name="percent" size={12} color="#1447E6" />
                          <Text style={styles.previewText}>{passRate}%</Text>
                        </View>
                        <View style={styles.previewPill}>
                          <Icon name="grade" size={12} color="#f59e0b" />
                          <Text style={styles.previewText}>{avg}%</Text>
                        </View>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => setSummaryExpanded(!summaryExpanded)}
                      style={styles.summaryToggle}
                      activeOpacity={0.8}
                    >
                      <Icon name={summaryExpanded ? 'expand-less' : 'expand-more'} size={18} color="#1447E6" />
                      <Text style={styles.summaryToggleText}>{summaryExpanded ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  </View>

                  {summaryExpanded && (
                    <>
                      <View style={styles.summaryGrid}>
                        <View style={styles.summaryCell}>
                          <Text style={styles.summaryValue}>{total}</Text>
                          <Text style={styles.summaryKey}>Exams</Text>
                        </View>
                        <View style={styles.summaryCell}>
                          <Text style={styles.summaryValue}>{passed}</Text>
                          <Text style={styles.summaryKey}>Passed</Text>
                        </View>
                        <View style={styles.summaryCell}>
                          <Text style={styles.summaryValue}>{passRate}%</Text>
                          <Text style={styles.summaryKey}>Pass Rate</Text>
                        </View>
                        <View style={styles.summaryCell}>
                          <Text style={styles.summaryValue}>{avg}%</Text>
                          <Text style={styles.summaryKey}>Average</Text>
                        </View>
                        <View style={styles.summaryCell}>
                          <Text style={styles.summaryValue}>{best}%</Text>
                          <Text style={styles.summaryKey}>Best</Text>
                        </View>
                        <View style={styles.summaryCell}>
                          <Text style={styles.summaryValue}>{worst}%</Text>
                          <Text style={styles.summaryKey}>Worst</Text>
                        </View>
                      </View>
                      <View style={styles.summaryFooterRow}>
                        <View style={styles.summaryFooterItem}>
                          <Icon name="schedule" size={14} color="#9ca3af" />
                          <Text style={styles.summaryFooterText}>{lastTaken ? formatDate(lastTaken) : '—'}</Text>
                        </View>
                        <View style={styles.summaryFooterItem}>
                          <Icon name="psychology" size={14} color="#9ca3af" />
                          <Text style={styles.summaryFooterText}>{personality || '—'}</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              );
            })()}
            
            {/* Grouped Results */}
            {(() => {
              const entranceResults = results.filter(r => r.exam_type === 'regular');
              const departmentalResults = results.filter(r => r.exam_type === 'departmental');
              return (
                <>
                  {/* Entrance Exams Section (collapsible) */}
                  <View style={styles.resultsSection}>
                    <View style={styles.resultsSectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity onPress={() => setEntranceExpanded(!entranceExpanded)} activeOpacity={0.8} style={styles.collapseButton}>
                          <Icon name={entranceExpanded ? 'expand-less' : 'expand-more'} size={18} color="#1447E6" />
                          <Text style={styles.collapseButtonText}>{entranceExpanded ? 'Hide' : 'Show'}</Text>
                        </TouchableOpacity>
                        <Text style={styles.resultsTitle}>Entrance Exams</Text>
                      </View>
                      <View style={styles.resultsBadge}>
                        <Text style={styles.resultsBadgeText}>{entranceResults.length} Total</Text>
                      </View>
                    </View>

                    {entranceExpanded && (
                      entranceResults.length === 0 ? (
                        <View style={styles.emptySectionCard}>
                          <Text style={styles.emptySectionText}>No entrance exam results yet.</Text>
                        </View>
                      ) : (
                        entranceResults.map((result, index) => (
                        <View key={`entrance-${index}`} style={styles.resultCard}>
                          {/* Reuse existing regular result rendering */}
                          <View style={styles.resultHeader}>
                            <View style={styles.resultInfo}>
                              <View style={styles.examRefContainer}>
                                <Icon name="assignment" size={16} color="#1447E6" />
                                <Text style={styles.examRef}>{result.exam_ref_no}</Text>
                              </View>
                              <Text style={styles.examTitle}>{result.exam_title}</Text>
                              <Text style={styles.examDate}>
                                {formatDate(result.created_at)}
                              </Text>
                            </View>
                            <View style={[
                              styles.statusBadge,
                              { backgroundColor: getStatusColor(result.is_passed) + '20' },
                              { borderColor: getStatusColor(result.is_passed) + '40' }
                            ]}>
                              <Icon 
                                name={result.is_passed ? 'check-circle' : 'cancel'} 
                                size={12} 
                                color={getStatusColor(result.is_passed)} 
                              />
                              <Text style={[styles.statusText, { color: getStatusColor(result.is_passed) }]}>
                                {getStatusText(result.is_passed)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.scoreDetails}>
                            <View style={styles.scoreItem}>
                              <View style={styles.scoreIconContainer}>
                                <Icon name="grade" size={14} color="#1447E6" />
                              </View>
                              <Text style={styles.scoreLabel}>Score</Text>
                              <Text style={styles.scoreValue}>{result.percentage}%</Text>
                            </View>
                            <View style={styles.scoreItem}>
                              <View style={styles.scoreIconContainer}>
                                <Icon name="check" size={14} color="#10b981" />
                              </View>
                              <Text style={styles.scoreLabel}>Correct</Text>
                              <Text style={styles.scoreValue}>{result.correct}/{result.total_items}</Text>
                            </View>
                            <View style={styles.scoreItem}>
                              <View style={styles.scoreIconContainer}>
                                <Icon name="close" size={14} color="#ef4444" />
                              </View>
                              <Text style={styles.scoreLabel}>Incorrect</Text>
                              <Text style={styles.scoreValue}>{result.incorrect}</Text>
                            </View>
                          </View>

                          {/* Per-category breakdown (if provided by API) */}
                          {(() => {
                            let breakdown = [];
                            try {
                              if (Array.isArray(result.category_breakdown)) {
                                breakdown = result.category_breakdown;
                              } else if (typeof result.category_breakdown === 'string') {
                                breakdown = JSON.parse(result.category_breakdown);
                              }
                            } catch (_) {}

                            if (!breakdown || !Array.isArray(breakdown) || breakdown.length === 0) return null;

                            return (
                              <View style={styles.categoryContainer}>
                                <View style={styles.categoryHeaderRow}>
                                  <View style={styles.summaryIconContainer}>
                                    <Icon name="category" size={16} color="#a855f7" />
                                  </View>
                                  <Text style={styles.categoryHeaderText}>Category Breakdown</Text>
                                </View>
                                {breakdown.map((c, i) => {
                                  const total = Number(c.total || 0);
                                  const correct = Number(c.correct || 0);
                                  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((correct / total) * 100))) : 0;
                                  return (
                                    <View key={`${c.category || 'cat'}-${i}`} style={styles.categoryRow}>
                                      <View style={styles.categoryRowHeader}>
                                        <Text style={styles.categoryLabel}>{c.category || 'Uncategorized'}</Text>
                                        <Text style={styles.categoryValue}>{correct}/{total}</Text>
                                      </View>
                                      <View style={styles.categoryMeter}>
                                        <View style={[styles.categoryMeterFill, { width: `${pct}%` }]} />
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            );
                          })()}

                          {/* Recommendations (already enhanced) */}
                          {result.has_recommendation && (
                            <View style={styles.recommendationContainer}>
                              <View style={styles.recommendationHeader}>
                                <Icon name="school" size={16} color="#10b981" />
                                <Text style={styles.recommendationTitle}>
                                  {Array.isArray(result.recommended_courses) && result.recommended_courses.length > 1 ? 'Recommended Courses' : 'Recommended Course'}
                                </Text>
                              </View>
                              {Array.isArray(result.recommended_courses) && result.recommended_courses.length > 0 ? (
                                result.recommended_courses.map((course, idx) => {
                                  const key = course.id ?? idx;
                                  const isExpanded = expandedCourses[key] === true;
                                  return (
                                    <View key={key} style={styles.courseContainer}>
                                      <View style={styles.courseHeaderRow}>
                                        <View style={{ flex: 1 }}>
                                          <Text style={styles.courseCode}>{course.course_code}</Text>
                                          <Text style={styles.courseName}>{course.course_name}</Text>
                                        </View>
                                        <TouchableOpacity
                                          onPress={() => toggleCourseExpanded(key)}
                                          style={styles.collapseButton}
                                          activeOpacity={0.8}
                                        >
                                          <Icon name={isExpanded ? 'expand-less' : 'expand-more'} size={18} color="#a855f7" />
                                          <Text style={styles.collapseButtonText}>{isExpanded ? 'Hide' : 'Show'}</Text>
                                        </TouchableOpacity>
                                      </View>
                                      {isExpanded && (
                                        <View style={styles.recommendationContent}>
                                          {course.description ? (
                                            <Text style={styles.courseDescription}>{course.description}</Text>
                                          ) : null}
                                        </View>
                                      )}
                                    </View>
                                  );
                                })
                              ) : (
                                result.recommended_course && (
                                  <View style={styles.recommendationContent}>
                                    <Text style={styles.courseCode}>{result.recommended_course.course_code}</Text>
                                    <Text style={styles.courseName}>{result.recommended_course.course_name}</Text>
                                    {result.recommended_course.description && (
                                      <Text style={styles.courseDescription}>{result.recommended_course.description}</Text>
                                    )}
                                  </View>
                                )
                              )}
                              {result.personality_type && (
                                <View style={styles.personalityContainer}>
                                  <Icon name="psychology" size={12} color="#a855f7" />
                                  <Text style={styles.personalityText}>Based on your {result.personality_type} personality type and exam performance</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                        ))
                      )
                    )}
                  </View>

                  {/* Departmental Exams Section (collapsible) */}
                  <View style={styles.resultsSection}>
                    <View style={styles.resultsSectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity onPress={() => setDepartmentalExpanded(!departmentalExpanded)} activeOpacity={0.8} style={styles.collapseButton}>
                          <Icon name={departmentalExpanded ? 'expand-less' : 'expand-more'} size={18} color="#1447E6" />
                          <Text style={styles.collapseButtonText}>{departmentalExpanded ? 'Hide' : 'Show'}</Text>
                        </TouchableOpacity>
                        <Text style={styles.resultsTitle}>Departmental Exams</Text>
                      </View>
                      <View style={styles.resultsBadge}>
                        <Text style={styles.resultsBadgeText}>{departmentalResults.length} Total</Text>
                      </View>
                    </View>

                    {departmentalExpanded && (
                      departmentalResults.length === 0 ? (
                        <View style={styles.emptySectionCard}>
                          <Text style={styles.emptySectionText}>No departmental exam results yet.</Text>
                        </View>
                      ) : (
                        departmentalResults.map((result, index) => (
                        <View key={`dept-${index}`} style={styles.resultCard}>
                          <View style={styles.resultHeader}>
                            <View style={styles.resultInfo}>
                              <View style={styles.examRefContainer}>
                                <Icon name="assignment" size={16} color="#1447E6" />
                                <Text style={styles.examRef}>{result.exam_ref_no}</Text>
                              </View>
                              <Text style={styles.examTitle}>{result.exam_title}</Text>
                              <Text style={styles.examDate}>{formatDate(result.created_at)}</Text>
                            </View>
                            <View style={[
                              styles.statusBadge,
                              { backgroundColor: getStatusColor(result.is_passed) + '20' },
                              { borderColor: getStatusColor(result.is_passed) + '40' }
                            ]}>
                              <Icon name={result.is_passed ? 'check-circle' : 'cancel'} size={12} color={getStatusColor(result.is_passed)} />
                              <Text style={[styles.statusText, { color: getStatusColor(result.is_passed) }]}>{getStatusText(result.is_passed)}</Text>
                            </View>
                          </View>

                          <View style={styles.scoreDetails}>
                            <View style={styles.scoreItem}>
                              <View style={styles.scoreIconContainer}>
                                <Icon name="grade" size={14} color="#1447E6" />
                              </View>
                              <Text style={styles.scoreLabel}>Score</Text>
                              <Text style={styles.scoreValue}>{result.percentage}%</Text>
                            </View>
                            <View style={styles.scoreItem}>
                              <View style={styles.scoreIconContainer}>
                                <Icon name="check" size={14} color="#10b981" />
                              </View>
                              <Text style={styles.scoreLabel}>Correct</Text>
                              <Text style={styles.scoreValue}>{result.correct}</Text>
                            </View>
                            <View style={styles.scoreItem}>
                              <View style={styles.scoreIconContainer}>
                                <Icon name="close" size={14} color="#ef4444" />
                              </View>
                              <Text style={styles.scoreLabel}>Incorrect</Text>
                              <Text style={styles.scoreValue}>{result.incorrect}</Text>
                            </View>
                          </View>

                          {/* No course recommendations for departmental */}
                          <View style={styles.remarksContainer}>
                            <Icon name="info" size={14} color="#6b7280" />
                            <Text style={styles.remarksText}>Taken via {result.remarks}</Text>
                          </View>
                        </View>
                        ))
                      )
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 44 : 0, // Account for notch on iOS
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 44 : 0, // Account for notch on iOS
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(20, 71, 230, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  loadingText: {
    color: '#1D293D',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingTop: Platform.OS === 'ios' ? (isShortScreen ? 8 : 14) : 14,
    paddingBottom: isShortScreen ? 10 : 14,
  },
  backButton: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: 'rgba(20, 71, 230, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#1D293D',
    marginBottom: 0,
  },
  headerSubtitle: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  headerActions: {
    width: 32,
    alignItems: 'flex-end',
  },
  resultsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 71, 230, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingBottom: Platform.OS === 'ios' ? (isShortScreen ? 28 : 44) : 44,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyCard: {
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.15)',
    backgroundColor: '#FFFFFF',
  },
  emptyIconContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D293D',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  dashboardButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1447E6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 42,
    backgroundColor: '#1447E6',
  },
  buttonIcon: {
    marginRight: 8,
  },
  dashboardButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    gap: 12,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  summaryCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.15)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 71, 230, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D293D',
    flex: 1,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D293D',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  resultsSection: {
    gap: 8,
  },
  resultsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D293D',
  },
  resultsBadge: {
    backgroundColor: 'rgba(20, 71, 230, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.15)',
  },
  resultsBadgeText: {
    fontSize: 10,
    color: '#1447E6',
    fontWeight: '600',
  },
  resultCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.15)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultInfo: {
    flex: 1,
  },
  examRefContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  examRef: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D293D',
    marginLeft: 8,
  },
  examDate: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 24,
  },
  examTitle: {
    fontSize: 12,
    color: '#1447E6',
    marginLeft: 24,
    marginBottom: 2,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D293D',
  },
  categoryContainer: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)'
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  categoryHeaderText: {
    color: '#1D293D',
    fontSize: 13,
    fontWeight: '700'
  },
  categoryRow: {
    marginBottom: 6,
    gap: 4,
  },
  categoryRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600'
  },
  categoryValue: {
    color: '#1447E6',
    fontSize: 12,
    fontWeight: '700'
  },
  categoryMeter: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 71, 230, 0.1)'
  },
  categoryMeterFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#1447E6'
  },
  remarksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 71, 230, 0.1)',
    gap: 6,
  },
  remarksText: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    flex: 1,
  },
  recommendationContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  recommendationContent: {
    marginBottom: 6,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1447E6',
    marginBottom: 2,
  },
  courseName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D293D',
    marginBottom: 6,
  },
  courseDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 6,
  },
  personalityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personalityText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    flex: 1,
  },
  courseContainer: {
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(20, 71, 230, 0.05)'
  },
  courseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 71, 230, 0.12)'
  },
  collapseButtonText: {
    color: '#1447E6',
    fontSize: 11,
    fontWeight: '600'
  },
  emptySectionCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.1)',
    backgroundColor: 'rgba(20, 71, 230, 0.03)'
  },
  emptySectionText: {
    color: '#6b7280',
    fontSize: 11,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  summaryCell: {
    width: (width - (isSmallScreen ? 24 : 32)) / 3 - 6, // 3 per row compact
    backgroundColor: 'rgba(20, 71, 230, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#1D293D',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryKey: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '600',
  },
  summaryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryFooterText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '500',
  },
  summaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 71, 230, 0.12)'
  },
  summaryToggleText: {
    color: '#1447E6',
    fontSize: 11,
    fontWeight: '600'
  },
  summaryPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 6,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 71, 230, 0.06)'
  },
  previewText: {
    color: '#1D293D',
    fontSize: 11,
    fontWeight: '600',
  },
});
