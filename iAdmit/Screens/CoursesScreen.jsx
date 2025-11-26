import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Animated,
  Dimensions,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Text } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import client from '../API/client';
import userDataCache from '../utils/UserDataCache';
import offlineManager from '../utils/OfflineManager';
import globalFullscreen from '../utils/GlobalFullscreen';

const { width } = Dimensions.get('window');

// Course category colors
const CATEGORY_COLORS = {
  'BSIT': { primary: '#3b82f6', secondary: '#2563eb', icon: 'computer' },
  'BSBA': { primary: '#10b981', secondary: '#059669', icon: 'business-center' },
  'BSED': { primary: '#f59e0b', secondary: '#d97706', icon: 'school' },
  'BEED': { primary: '#ec4899', secondary: '#db2777', icon: 'child-care' },
  'default': { primary: '#6366f1', secondary: '#4f46e5', icon: 'local-library' }
};

const getCategoryColor = (courseCode) => {
  const key = Object.keys(CATEGORY_COLORS).find(k => courseCode?.startsWith(k));
  return CATEGORY_COLORS[key] || CATEGORY_COLORS['default'];
};

export default function CoursesScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isOffline, setIsOffline] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    fetchCourses();
  }, []);

  // Handle full screen mode
  useFocusEffect(
    React.useCallback(() => {
      globalFullscreen.enableFullscreen();
      setTimeout(() => globalFullscreen.forceHideNavigationBar(), 100);
      setTimeout(() => globalFullscreen.forceHideNavigationBar(), 300);
      
      return () => {
        console.log('CoursesScreen: Keeping navigation bar hidden (controlled by GlobalFullscreen)');
      };
    }, [])
  );

  const fetchCourses = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const isOnline = offlineManager.isConnected();
      setIsOffline(!isOnline);
      
      if (isOnline) {
        const response = await client.get('/mobile/courses');
        
        if (response.data.success && response.data.courses) {
          setCourses(response.data.courses);
          await userDataCache.storeCourses(response.data.courses);
        }
      } else {
        const cachedCourses = await userDataCache.getCourses();
        
        if (cachedCourses && Array.isArray(cachedCourses)) {
          setCourses(cachedCourses);
        } else {
          Alert.alert(
            'Offline Mode', 
            'No cached courses available. Please connect to the internet.'
          );
        }
      }
    } catch (error) {
      try {
        const cachedCourses = await userDataCache.getCourses();
        if (cachedCourses && Array.isArray(cachedCourses)) {
          setCourses(cachedCourses);
          Alert.alert(
            'Using Cached Data', 
            'Showing previously cached courses.'
          );
          return;
        }
      } catch (cacheError) {
        console.log('Cache fallback failed:', cacheError);
      }
      
      Alert.alert('Error', 'Failed to load courses.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    await fetchCourses(true);
  };

  const toggleCourseExpansion = (courseId) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Get unique categories
  const categories = ['all', ...new Set(courses.map(c => {
    const code = c.course_code?.substring(0, 4);
    return code;
  }))];

  // Filter courses by category
  const filteredCourses = selectedCategory === 'all' 
    ? courses 
    : courses.filter(c => c.course_code?.startsWith(selectedCategory));

  // Group courses by category
  const groupedCourses = filteredCourses.reduce((acc, course) => {
    const category = course.course_code?.substring(0, 4) || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(course);
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a1a', '#1a1a2e', '#16213e']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconContainer}>
            <Icon name="school" size={48} color="#3b82f6" />
          </View>
          <Text style={styles.loadingText}>Loading Courses...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a1a', '#1a1a2e', '#16213e']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Enhanced Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Available Courses</Text>
            <View style={styles.headerBadgeContainer}>
              <View style={styles.courseBadge}>
                <Icon name="school" size={14} color="#3b82f6" />
                <Text style={styles.headerSubtitle}>
                  {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
                </Text>
              </View>
              {isOffline && (
                <View style={styles.offlineBadge}>
                  <Icon name="wifi-off" size={12} color="#f59e0b" />
                  <Text style={styles.offlineText}>Offline</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Category Filter Pills */}
      <Animated.View 
        style={[
          styles.categoryContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const color = cat === 'all' ? CATEGORY_COLORS.default : getCategoryColor(cat);
            
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected && { backgroundColor: `${color.primary}20`, borderColor: color.primary }
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Icon 
                  name={cat === 'all' ? 'apps' : getCategoryColor(cat).icon} 
                  size={16} 
                  color={isSelected ? color.primary : '#9ca3af'} 
                />
                <Text 
                  style={[
                    styles.categoryText,
                    isSelected && { color: color.primary, fontWeight: '700' }
                  ]}
                >
                  {cat === 'all' ? 'All Courses' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6', '#2563eb']}
            progressBackgroundColor="#1a1a2e"
          />
        }
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.05)']}
              style={styles.infoCardGradient}
            >
              <View style={styles.infoIconContainer}>
                <Icon name="info-outline" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.infoText}>
                Course recommendations based on your exam score and personality assessment
              </Text>
            </LinearGradient>
          </View>

          {/* Courses by Category */}
          {filteredCourses.length > 0 ? (
            Object.entries(groupedCourses).map(([category, categoryCourses]) => {
              const categoryColor = getCategoryColor(category);
              
              return (
                <View key={category} style={styles.categorySection}>
                  <View style={styles.categorySectionHeader}>
                    <View style={[styles.categoryIconContainer, { backgroundColor: `${categoryColor.primary}15` }]}>
                      <Icon name={categoryColor.icon} size={20} color={categoryColor.primary} />
                    </View>
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <View style={[styles.categoryCountBadge, { backgroundColor: `${categoryColor.primary}20` }]}>
                      <Text style={[styles.categoryCount, { color: categoryColor.primary }]}>
                        {categoryCourses.length}
                      </Text>
                    </View>
                  </View>

                  {categoryCourses.map((course) => {
                    const isExpanded = expandedCourses[course.id];
                    const color = getCategoryColor(course.course_code);
                    
                    return (
                      <TouchableOpacity
                        key={course.id}
                        style={styles.courseCard}
                        onPress={() => toggleCourseExpansion(course.id)}
                        activeOpacity={0.9}
                      >
                        <LinearGradient
                          colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                          style={styles.courseCardGradient}
                        >
                          {/* Course Header */}
                          <View style={styles.courseHeader}>
                            <View style={styles.courseHeaderLeft}>
                              <View style={[styles.courseCodeBadge, { backgroundColor: `${color.primary}20`, borderColor: color.primary }]}>
                                <Text style={[styles.courseCode, { color: color.primary }]}>
                                  {course.course_code}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.expandIconContainer}>
                              <Icon 
                                name={isExpanded ? "expand-less" : "expand-more"} 
                                size={24} 
                                color="#9ca3af" 
                              />
                            </View>
                          </View>

                          <Text style={styles.courseName} numberOfLines={isExpanded ? undefined : 2}>
                            {course.course_name}
                          </Text>

                          {/* Passing Rate Badge */}
                          <View style={styles.passingRateContainer}>
                            <Icon name="trending-up" size={16} color="#10b981" />
                            <Text style={styles.passingRateLabel}>Passing Rate:</Text>
                            <Text style={styles.passingRateValue}>{course.passing_rate_display}</Text>
                          </View>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <View style={styles.expandedContent}>
                              {course.description && (
                                <View style={styles.descriptionContainer}>
                                  <Text style={styles.descriptionLabel}>Description</Text>
                                  <Text style={styles.descriptionText}>{course.description}</Text>
                                </View>
                              )}
                              
                              <View style={styles.requirementsContainer}>
                                <Text style={styles.requirementsTitle}>Requirements</Text>
                                
                                <View style={styles.requirementItem}>
                                  <View style={styles.requirementIconContainer}>
                                    <Icon name="check-circle" size={18} color="#10b981" />
                                  </View>
                                  <Text style={styles.requirementText}>
                                    Minimum passing score of {course.passing_rate_display}
                                  </Text>
                                </View>

                                <View style={styles.requirementItem}>
                                  <View style={styles.requirementIconContainer}>
                                    <Icon name="psychology" size={18} color="#a855f7" />
                                  </View>
                                  <Text style={styles.requirementText}>
                                    Personality assessment compatibility
                                  </Text>
                                </View>

                                <View style={styles.requirementItem}>
                                  <View style={styles.requirementIconContainer}>
                                    <Icon name="assignment-turned-in" size={18} color="#3b82f6" />
                                  </View>
                                  <Text style={styles.requirementText}>
                                    Completed entrance examination
                                  </Text>
                                </View>
                              </View>
                            </View>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Icon name="search-off" size={64} color="#6b7280" />
              </View>
              <Text style={styles.emptyTitle}>No Courses Found</Text>
              <Text style={styles.emptyText}>
                {selectedCategory === 'all' 
                  ? 'No courses available at the moment.'
                  : `No courses found in ${selectedCategory} category.`}
              </Text>
              {selectedCategory !== 'all' && (
                <TouchableOpacity
                  style={styles.clearFilterBtn}
                  onPress={() => setSelectedCategory('all')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    style={styles.clearFilterGradient}
                  >
                    <Icon name="clear-all" size={18} color="#fff" />
                    <Text style={styles.clearFilterText}>Clear Filter</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  headerBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  offlineText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
  },
  categoryContainer: {
    paddingVertical: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  categoryText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  content: {
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  infoCard: {
    marginBottom: 20,
  },
  infoCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    padding: 14,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#d1d5db',
    lineHeight: 18,
  },
  categorySection: {
    marginBottom: 24,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  categoryCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  courseCard: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  courseCardGradient: {
    padding: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseHeaderLeft: {
    flex: 1,
  },
  courseCodeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  courseCode: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  expandIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    lineHeight: 22,
  },
  passingRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 6,
  },
  passingRateLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  passingRateValue: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a855f7',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
  requirementsContainer: {
    gap: 10,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 10,
  },
  requirementIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementText: {
    flex: 1,
    fontSize: 13,
    color: '#e5e7eb',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  clearFilterBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  clearFilterGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
