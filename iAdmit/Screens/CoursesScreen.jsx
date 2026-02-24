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
  'BSIT': { primary: '#1447E6', secondary: '#1D293D', icon: 'computer' },
  'BSBA': { primary: '#1447E6', secondary: '#1D293D', icon: 'business-center' },
  'BSED': { primary: '#1447E6', secondary: '#1D293D', icon: 'school' },
  'BEED': { primary: '#1447E6', secondary: '#1D293D', icon: 'child-care' },
  'default': { primary: '#1447E6', secondary: '#1D293D', icon: 'local-library' }
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
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconContainer}>
            <Icon name="school" size={48} color="#1447E6" />
          </View>
          <Text style={styles.loadingText}>Loading Courses...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Simplified Header */}
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
            <Icon name="arrow-back" size={22} color="#1D293D" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Available Courses</Text>
            <Text style={styles.headerSubtitle}>
              {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
            </Text>
          </View>
          {isOffline && (
            <View style={styles.offlineBadge}>
              <Icon name="wifi-off" size={12} color="#F59E0B" />
            </View>
          )}
        </View>
      </Animated.View>

      {/* Simplified Category Filter */}
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
            const color = getCategoryColor(cat);
            
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillSelected
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text 
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextSelected
                  ]}
                >
                  {cat === 'all' ? 'All' : cat}
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
            tintColor="#1447E6"
            colors={['#1447E6', '#1D293D']}
            progressBackgroundColor="#FFFFFF"
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
          {/* Courses List */}
          {filteredCourses.length > 0 ? (
            <View style={styles.coursesList}>
              {filteredCourses.map((course) => {
                const isExpanded = expandedCourses[course.id];
                const color = getCategoryColor(course.course_code);
                
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.courseCard}
                    onPress={() => toggleCourseExpansion(course.id)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.courseCardGradient}>
                      {/* Course Header */}
                      <View style={styles.courseHeader}>
                        <View style={styles.courseCodeBadge}>
                          <Text style={styles.courseCode}>{course.course_code}</Text>
                        </View>
                        <Icon 
                          name={isExpanded ? "expand-less" : "expand-more"} 
                          size={20} 
                          color="#6B7280" 
                        />
                      </View>

                      <Text style={styles.courseName}>{course.course_name}</Text>

                      {/* Passing Rate */}
                      <View style={styles.passingRateContainer}>
                        <Icon name="trending-up" size={14} color="#10B981" />
                        <Text style={styles.passingRateText}>{course.passing_rate_display} pass rate</Text>
                      </View>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <View style={styles.expandedContent}>
                          {course.description && (
                            <Text style={styles.descriptionText}>{course.description}</Text>
                          )}
                          
                          <View style={styles.requirementsList}>
                            <Text style={styles.requirementsTitle}>Requirements:</Text>
                            <Text style={styles.requirementItem}>• Minimum score: {course.passing_rate_display}</Text>
                            <Text style={styles.requirementItem}>• Personality assessment</Text>
                            <Text style={styles.requirementItem}>• Completed entrance exam</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="search-off" size={48} color="#9CA3AF" />
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
                  <Text style={styles.clearFilterText}>Show All Courses</Text>
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'rgba(20, 71, 230, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  loadingText: {
    color: '#1D293D',
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
    backgroundColor: 'rgba(20, 71, 230, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D293D',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  offlineBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  categoryContainer: {
    paddingVertical: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryPillSelected: {
    backgroundColor: '#1447E6',
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
  },
  coursesList: {
    gap: 12,
  },
  courseCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  courseCardGradient: {
    padding: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCodeBadge: {
    backgroundColor: '#1447E6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D293D',
    marginBottom: 8,
    lineHeight: 22,
  },
  passingRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  passingRateText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  requirementsList: {
    gap: 4,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D293D',
    marginBottom: 4,
  },
  requirementItem: {
    fontSize: 13,
    color: '#6B7280',
    paddingLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D293D',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  clearFilterBtn: {
    backgroundColor: '#1447E6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
