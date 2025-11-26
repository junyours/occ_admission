import AsyncStorage from '@react-native-async-storage/async-storage';
import offlineManager from './OfflineManager';

class UserDataCache {
  constructor() {
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  // Remove large blobs (e.g., base64 images) to avoid SQLITE_FULL on low storage devices
  sanitizeExamineeData(examineeData) {
    if (!examineeData || typeof examineeData !== 'object') return examineeData;
    const { Profile, profile, avatar, ...rest } = examineeData;
    return {
      ...rest,
      // Keep a small hint only
      hasProfileImage: !!(Profile || profile || avatar),
    };
  }

  // Compress data by removing unnecessary fields and optimizing structure
  compressData(data, type) {
    if (!data || typeof data !== 'object') return data;
    
    switch (type) {
      case 'courses':
        // Handle different possible API response structures
        let coursesArray = data;
        
        // If data has a 'courses' property, use that
        if (data.courses && Array.isArray(data.courses)) {
          coursesArray = data.courses;
        }
        // If data is not an array, return as is
        else if (!Array.isArray(data)) {
          console.warn('[UserDataCache] Courses data is not an array:', typeof data, data);
          return data;
        }
        
        // Remove large description fields and keep only essential info
        return coursesArray.map(course => ({
          id: course.id,
          name: course.name,
          code: course.code,
          description: course.description?.substring(0, 200) + (course.description?.length > 200 ? '...' : ''),
          requirements: course.requirements,
          duration: course.duration,
          units: course.units,
          // Remove large images or base64 data
          hasImage: !!(course.image || course.photo),
        }));
      
      case 'examResults':
        // Handle different possible API response structures
        let resultsArray = data;
        
        // If data has a 'results' property, use that
        if (data.results && Array.isArray(data.results)) {
          resultsArray = data.results;
        }
        // If data is not an array, return as is
        else if (!Array.isArray(data)) {
          console.warn('[UserDataCache] Exam results data is not an array:', typeof data, data);
          return data;
        }
        
        // Keep only essential result data
        return resultsArray.map(result => ({
          id: result.id,
          exam_title: result.exam_title,
          exam_type: result.exam_type,
          score_percentage: result.score_percentage,
          remarks: result.remarks,
          total_items: result.total_items,
          correct_answers: result.correct_answers,
          wrong_answers: result.wrong_answers,
          created_at: result.created_at,
          // Remove large detailed breakdowns if not essential
        }));
      
      default:
        return data;
    }
  }

  async safeSetItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (err) {
      const msg = err?.message || '';
      console.log('[UserDataCache] safeSetItem failed for', key, msg);
      // If storage is full, try to free space by removing less critical caches, then retry once
      if (msg.includes('SQLITE_FULL') || msg.includes('database or disk is full')) {
        try {
          await AsyncStorage.multiRemove([
            'cached_exam_results',
            'cached_personality_type',
          ]);
        } catch {}
        try {
          await AsyncStorage.setItem(key, value);
          return true;
        } catch (err2) {
          console.log('[UserDataCache] Retry failed for', key, err2?.message);
          return false;
        }
      }
      return false;
    }
  }

  // Store examinee data locally
  async storeExamineeData(examineeData) {
    try {
      const data = {
        ...this.sanitizeExamineeData(examineeData),
        cachedAt: new Date().toISOString(),
        version: 1
      };
      const ok = await this.safeSetItem('cached_examinee_data', JSON.stringify(data));
      if (!ok) throw new Error('Failed to write examinee cache');
      console.log('Examinee data stored locally');
      return true;
    } catch (error) {
      console.error('Error storing examinee data:', error);
      return false;
    }
  }

  // Retrieve examinee data from local storage
  async getExamineeData() {
    try {
      const data = await AsyncStorage.getItem('cached_examinee_data');
      
      if (data) {
        const parsedData = JSON.parse(data);
        
        // Check if data is still valid (not expired)
        const cacheAge = Date.now() - new Date(parsedData.cachedAt).getTime();
        if (cacheAge < this.cacheExpiry) {
          console.log('Examinee data retrieved from cache');
          return parsedData;
        } else {
          console.log('Cached examinee data expired');
          await this.clearExamineeData();
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving examinee data:', error);
      return null;
    }
  }

  // Store exam schedule locally
  async storeExamSchedule(examSchedule) {
    try {
      const data = {
        ...examSchedule,
        cachedAt: new Date().toISOString(),
        version: 1
      };
      const ok = await this.safeSetItem('cached_exam_schedule', JSON.stringify(data));
      if (!ok) throw new Error('Failed to write exam schedule cache');
      console.log('Exam schedule stored locally');
      return true;
    } catch (error) {
      console.error('Error storing exam schedule:', error);
      return false;
    }
  }

  // Retrieve exam schedule from local storage
  async getExamSchedule() {
    try {
      const data = await AsyncStorage.getItem('cached_exam_schedule');
      
      if (data) {
        const parsedData = JSON.parse(data);
        
        // Check if data is still valid
        const cacheAge = Date.now() - new Date(parsedData.cachedAt).getTime();
        if (cacheAge < this.cacheExpiry) {
          console.log('Exam schedule retrieved from cache');
          return parsedData;
        } else {
          console.log('Cached exam schedule expired');
          await this.clearExamSchedule();
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving exam schedule:', error);
      return null;
    }
  }

  // Store personality type locally
  async storePersonalityType(personalityType) {
    try {
      const data = {
        personalityType,
        cachedAt: new Date().toISOString(),
        version: 1
      };
      const ok = await this.safeSetItem('cached_personality_type', JSON.stringify(data));
      if (!ok) throw new Error('Failed to write personality cache');
      console.log('Personality type stored locally');
      return true;
    } catch (error) {
      console.error('Error storing personality type:', error);
      return false;
    }
  }

  // Retrieve personality type from local storage
  async getPersonalityType() {
    try {
      const data = await AsyncStorage.getItem('cached_personality_type');
      
      if (data) {
        const parsedData = JSON.parse(data);
        
        // Check if data is still valid
        const cacheAge = Date.now() - new Date(parsedData.cachedAt).getTime();
        if (cacheAge < this.cacheExpiry) {
          console.log('Personality type retrieved from cache');
          return parsedData.personalityType;
        } else {
          console.log('Cached personality type expired');
          await this.clearPersonalityType();
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving personality type:', error);
      return null;
    }
  }

  // Store exam results locally
  async storeExamResults(examResults) {
    try {
      // Validate input data
      if (!examResults) {
        console.warn('[UserDataCache] No exam results data provided');
        return false;
      }
      
      console.log('[UserDataCache] Storing exam results data:', typeof examResults, Array.isArray(examResults) ? examResults.length : 'not array');
      
      const compressedResults = this.compressData(examResults, 'examResults');
      const data = {
        results: compressedResults,
        cachedAt: new Date().toISOString(),
        version: 1
      };
      const ok = await this.safeSetItem('cached_exam_results', JSON.stringify(data));
      if (!ok) throw new Error('Failed to write results cache');
      console.log('Exam results stored locally');
      return true;
    } catch (error) {
      console.error('Error storing exam results:', error);
      return false;
    }
  }

  // Retrieve exam results from local storage
  async getExamResults() {
    try {
      const data = await AsyncStorage.getItem('cached_exam_results');
      
      if (data) {
        const parsedData = JSON.parse(data);
        
        // Check if data is still valid
        const cacheAge = Date.now() - new Date(parsedData.cachedAt).getTime();
        if (cacheAge < this.cacheExpiry) {
          console.log('Exam results retrieved from cache');
          return parsedData.results;
        } else {
          console.log('Cached exam results expired');
          await this.clearExamResults();
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving exam results:', error);
      return null;
    }
  }

  // Store courses locally
  async storeCourses(courses) {
    try {
      // Validate input data
      if (!courses) {
        console.warn('[UserDataCache] No courses data provided');
        return false;
      }
      
      console.log('[UserDataCache] Storing courses data:', typeof courses, Array.isArray(courses) ? courses.length : 'not array');
      
      const compressedCourses = this.compressData(courses, 'courses');
      const data = {
        courses: compressedCourses,
        cachedAt: new Date().toISOString(),
        version: 1
      };
      const ok = await this.safeSetItem('cached_courses', JSON.stringify(data));
      if (!ok) throw new Error('Failed to write courses cache');
      console.log('Courses stored locally');
      return true;
    } catch (error) {
      console.error('Error storing courses:', error);
      return false;
    }
  }

  // Retrieve courses from local storage
  async getCourses() {
    try {
      const data = await AsyncStorage.getItem('cached_courses');
      
      if (data) {
        const parsedData = JSON.parse(data);
        
        // Check if data is still valid
        const cacheAge = Date.now() - new Date(parsedData.cachedAt).getTime();
        if (cacheAge < this.cacheExpiry) {
          console.log('Courses retrieved from cache');
          return parsedData.courses;
        } else {
          console.log('Cached courses expired');
          await this.clearCourses();
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving courses:', error);
      return null;
    }
  }

  // Store all dashboard data at once
  async storeDashboardData(dashboardData) {
    try {
      const data = {
        examineeData: this.sanitizeExamineeData(dashboardData.examineeData),
        examSchedule: dashboardData.examSchedule,
        personalityType: dashboardData.personalityType,
        examResults: dashboardData.examResults ? this.compressData(dashboardData.examResults, 'examResults') : null,
        courses: dashboardData.courses ? this.compressData(dashboardData.courses, 'courses') : null,
        cachedAt: new Date().toISOString(),
        lastOfflineFlag: dashboardData.lastOfflineFlag === true,
        version: 1
      };
      const ok = await this.safeSetItem('cached_dashboard_data', JSON.stringify(data));
      if (!ok) throw new Error('Failed to write dashboard cache');
      console.log('Dashboard data stored locally');
      return true;
    } catch (error) {
      console.error('Error storing dashboard data:', error);
      return false;
    }
  }

  // Retrieve all dashboard data at once
  async getDashboardData() {
    try {
      const data = await AsyncStorage.getItem('cached_dashboard_data');
      
      if (data) {
        const parsedData = JSON.parse(data);
        
        // Check if data is still valid
        const cacheAge = Date.now() - new Date(parsedData.cachedAt).getTime();
        if (cacheAge < this.cacheExpiry) {
          console.log('Dashboard data retrieved from cache');
          return {
            examineeData: parsedData.examineeData,
            examSchedule: parsedData.examSchedule,
            personalityType: parsedData.personalityType,
            examResults: parsedData.examResults,
            courses: parsedData.courses,
            cachedAt: parsedData.cachedAt,
            lastOfflineFlag: parsedData.lastOfflineFlag === true
          };
        } else {
          console.log('Cached dashboard data expired');
          await this.clearDashboardData();
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving dashboard data:', error);
      return null;
    }
  }

  // Clear specific cached data
  async clearExamineeData() {
    try {
      await AsyncStorage.removeItem('cached_examinee_data');
      console.log('Examinee data cleared from cache');
    } catch (error) {
      console.error('Error clearing examinee data:', error);
    }
  }

  async clearExamSchedule() {
    try {
      await AsyncStorage.removeItem('cached_exam_schedule');
      console.log('Exam schedule cleared from cache');
    } catch (error) {
      console.error('Error clearing exam schedule:', error);
    }
  }

  async clearPersonalityType() {
    try {
      await AsyncStorage.removeItem('cached_personality_type');
      console.log('Personality type cleared from cache');
    } catch (error) {
      console.error('Error clearing personality type:', error);
    }
  }

  async clearExamResults() {
    try {
      await AsyncStorage.removeItem('cached_exam_results');
      console.log('Exam results cleared from cache');
    } catch (error) {
      console.error('Error clearing exam results:', error);
    }
  }

  async clearCourses() {
    try {
      await AsyncStorage.removeItem('cached_courses');
      console.log('Courses cleared from cache');
    } catch (error) {
      console.error('Error clearing courses:', error);
    }
  }

  async clearDashboardData() {
    try {
      await AsyncStorage.removeItem('cached_dashboard_data');
      console.log('Dashboard data cleared from cache');
    } catch (error) {
      console.error('Error clearing dashboard data:', error);
    }
  }

  // Clear all cached data
  async clearAllCache() {
    try {
      const keys = [
        'cached_examinee_data',
        'cached_exam_schedule',
        'cached_personality_type',
        'cached_exam_results',
        'cached_courses',
        'cached_dashboard_data'
      ];
      
      await AsyncStorage.multiRemove(keys);
      console.log('All user data cache cleared');
      return true;
    } catch (error) {
      console.error('Error clearing all cache:', error);
      return false;
    }
  }

  // Get cache info
  async getCacheInfo() {
    try {
      const keys = [
        'cached_examinee_data',
        'cached_exam_schedule',
        'cached_personality_type',
        'cached_exam_results',
        'cached_courses',
        'cached_dashboard_data'
      ];
      
      const data = await AsyncStorage.multiGet(keys);
      const cacheInfo = {};
      
      data.forEach(([key, value]) => {
        if (value) {
          const parsed = JSON.parse(value);
          const cacheAge = Date.now() - new Date(parsed.cachedAt).getTime();
          const isExpired = cacheAge >= this.cacheExpiry;
          
          cacheInfo[key] = {
            exists: true,
            cachedAt: parsed.cachedAt,
            age: cacheAge,
            isExpired,
            size: JSON.stringify(parsed).length
          };
        } else {
          cacheInfo[key] = { exists: false };
        }
      });
      
      return cacheInfo;
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {};
    }
  }

  // Check if we have valid cached data for offline mode
  async hasValidOfflineData() {
    try {
      const dashboardData = await this.getDashboardData();
      return dashboardData !== null;
    } catch (error) {
      console.error('Error checking offline data validity:', error);
      return false;
    }
  }

  // Get storage usage statistics
  async getStorageStats() {
    try {
      const cacheInfo = await this.getCacheInfo();
      let totalSize = 0;
      let itemCount = 0;
      
      Object.values(cacheInfo).forEach(item => {
        if (item.exists && item.size) {
          totalSize += item.size;
          itemCount++;
        }
      });
      
      return {
        totalSize,
        itemCount,
        totalSizeKB: Math.round(totalSize / 1024),
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        items: cacheInfo
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { totalSize: 0, itemCount: 0, totalSizeKB: 0, totalSizeMB: 0, items: {} };
    }
  }

  // Optimize storage by removing expired data and compressing
  async optimizeStorage() {
    try {
      const cacheInfo = await this.getCacheInfo();
      let removedCount = 0;
      let savedSpace = 0;
      
      // Remove expired data
      for (const [key, info] of Object.entries(cacheInfo)) {
        if (info.exists && info.isExpired) {
          await AsyncStorage.removeItem(key);
          removedCount++;
          savedSpace += info.size;
          console.log(`Removed expired cache: ${key}`);
        }
      }
      
      console.log(`Storage optimization complete: removed ${removedCount} items, saved ${Math.round(savedSpace / 1024)}KB`);
      return { removedCount, savedSpaceKB: Math.round(savedSpace / 1024) };
    } catch (error) {
      console.error('Error optimizing storage:', error);
      return { removedCount: 0, savedSpaceKB: 0 };
    }
  }
}

// Create singleton instance
const userDataCache = new UserDataCache();

export default userDataCache;
