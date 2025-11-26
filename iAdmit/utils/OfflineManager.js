import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { submitExamAnswers } from '../API/exam';

const SUBMISSION_QUEUE_KEY = 'submissionQueue:v1';
const MAX_RETRIES = 10;
const BASE_BACKOFF_MS = 1000;

class OfflineManager {
  constructor() {
    this.isOnline = true;
    this.listeners = [];
    this.queueListeners = [];
    this.init();
  }

  async init() {
    // Check initial network status
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected && netInfo.isInternetReachable;
    
    // Listen for network changes
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      console.log('Network status changed:', {
        isOnline: this.isOnline,
        wasOffline,
        type: state.type
      });

      // Notify listeners
      this.listeners.forEach(listener => {
        listener(this.isOnline, wasOffline);
      });

      // Auto-sync when coming back online
      if (wasOffline && this.isOnline) {
        this.processSubmissionQueue();
      }
    });
  }

  // Add listener for network status changes
  addNetworkListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Check if currently online
  isConnected() {
    return this.isOnline;
  }

  // ---- Submission Queue (Persistent) ----
  async getSubmissionQueue() {
    try {
      const raw = await AsyncStorage.getItem(SUBMISSION_QUEUE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.log('[OfflineManager] Failed to read submission queue', e?.message);
      return [];
    }
  }

  async setSubmissionQueue(list) {
    try {
      await AsyncStorage.setItem(SUBMISSION_QUEUE_KEY, JSON.stringify(list || []));
      this.queueListeners.forEach(cb => {
        try { cb(list || []); } catch {}
      });
    } catch (e) {
      console.log('[OfflineManager] Failed to write submission queue', e?.message);
    }
  }

  addQueueListener(callback) {
    this.queueListeners.push(callback);
    return () => { this.queueListeners = this.queueListeners.filter(c => c !== callback); };
  }

  async enqueueSubmission({ attemptId, submission, meta = {} }) {
    try {
      const queue = await this.getSubmissionQueue();
      const item = {
        id: attemptId,
        status: 'queued',
        retries: 0,
        lastError: null,
        submittedAt: new Date().toISOString(),
        payload: submission,
        meta,
      };
      await this.setSubmissionQueue([item, ...queue]);
      console.log('[OfflineManager] Submission enqueued', item.id);
      // Try immediate process if online
      if (this.isOnline) {
        this.processSubmissionQueue();
      }
    } catch (e) {
      console.log('[OfflineManager] enqueueSubmission error', e?.message);
    }
  }

  async removeSubmission(id) {
    const queue = await this.getSubmissionQueue();
    const next = queue.filter(q => q.id !== id);
    await this.setSubmissionQueue(next);
  }

  async markSubmission(id, patch) {
    const queue = await this.getSubmissionQueue();
    const next = queue.map(q => q.id === id ? { ...q, ...patch } : q);
    await this.setSubmissionQueue(next);
  }

  async processSubmissionQueue() {
    if (!this.isOnline) return { successCount: 0, failedCount: 0 };
    let queue = await this.getSubmissionQueue();
    if (queue.length === 0) return { successCount: 0, failedCount: 0 };
    
    console.log('[OfflineManager] Processing submission queue size:', queue.length);
    let successCount = 0;
    let failedCount = 0;
    
    for (const item of queue) {
      if (!this.isOnline) break;
      await this.markSubmission(item.id, { status: 'syncing', lastError: null });
      try {
        const payload = { ...item.payload, attempt_id: item.id };
        await submitExamAnswers(payload);
        await this.removeSubmission(item.id);
        successCount++;
        console.log('[OfflineManager] Submission synced', item.id);
      } catch (e) {
        const retries = (item.retries || 0) + 1;
        const lastError = e?.response?.data?.message || e?.message || 'Unknown error';
        await this.markSubmission(item.id, { status: 'failed', retries, lastError });
        const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, retries - 1), 120000);
        console.log('[OfflineManager] Retry scheduled', { id: item.id, retries, delay });
        if (retries >= MAX_RETRIES) {
          failedCount++;
          continue;
        }
        await new Promise(r => setTimeout(r, delay));
      }
      queue = await this.getSubmissionQueue();
    }
    
    return { successCount, failedCount };
  }

  async processSingleSubmission(id) {
    const queue = await this.getSubmissionQueue();
    const item = queue.find(q => q.id === id);
    if (!item) return { success: false, error: 'Item not found' };
    if (!this.isOnline) throw new Error('Offline');
    
    await this.markSubmission(id, { status: 'syncing', lastError: null });
    try {
      const payload = { ...item.payload, attempt_id: item.id };
      await submitExamAnswers(payload);
      await this.removeSubmission(item.id);
      console.log('[OfflineManager] Single submission synced', item.id);
      return { success: true };
    } catch (e) {
      const retries = (item.retries || 0) + 1;
      const lastError = e?.response?.data?.message || e?.message || 'Unknown error';
      await this.markSubmission(item.id, { status: 'failed', retries, lastError });
      throw e;
    }
  }

  // Exam data storage removed - exams are now loaded online only

  // Exam data optimization removed - exams are now loaded online only

  // Image compression removed - exams are now loaded online only

  // Chunked exam storage removed - exams are now loaded online only

  // Chunked exam retrieval removed - exams are now loaded online only

  // Minimal exam data creation removed - exams are now loaded online only

  // Clean up old submission queue items
  async freeStorageSpace() {
    try {
      console.log('[OfflineManager] Starting submission queue cleanup...');
      
      let removedCount = 0;
      
      // Remove submission queue items older than 24 hours
      try {
        const queue = await this.getSubmissionQueue();
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const filteredQueue = queue.filter(item => {
          const itemTime = new Date(item.submittedAt).getTime();
          return itemTime > cutoff;
        });
        
        if (filteredQueue.length < queue.length) {
          await this.setSubmissionQueue(filteredQueue);
          removedCount += queue.length - filteredQueue.length;
          console.log(`[OfflineManager] Cleaned ${queue.length - filteredQueue.length} old submission queue items`);
        }
      } catch (e) {
        console.log('[OfflineManager] Error cleaning submission queue:', e.message);
      }
      
      console.log(`[OfflineManager] Submission queue cleanup complete: removed ${removedCount} items`);
      return removedCount > 0;
      
    } catch (error) {
      console.error('[OfflineManager] Error during submission queue cleanup:', error);
      return false;
    }
  }

  // Exam data retrieval removed - exams are now loaded online only

  // Exam progress and result storage removed - exams are now online only

  // Sync queue methods removed - no longer storing exam progress/results offline

  // Exam data clearing removed - no longer storing exam data offline

  // Exam data clearing methods removed - no longer storing exam data offline

  // Exam storage methods removed - no longer storing exam data offline

  // Get storage statistics for submission queue only
  async getStorageStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const queueKey = keys.filter(key => key === SUBMISSION_QUEUE_KEY);
      
      let totalSize = 0;
      let itemCount = 0;
      
      // Calculate size for submission queue
      for (const key of queueKey) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            totalSize += data.length;
            itemCount++;
          }
        } catch (e) {
          console.log(`[OfflineManager] Error reading ${key}:`, e.message);
        }
      }
      
      return {
        totalSize,
        itemCount,
        totalSizeKB: Math.round(totalSize / 1024),
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        examCount: 0,
        progressCount: 0,
        queueCount: queueKey.length
      };
    } catch (error) {
      console.error('[OfflineManager] Error getting storage stats:', error);
      return {
        totalSize: 0,
        itemCount: 0,
        totalSizeKB: 0,
        totalSizeMB: 0,
        examCount: 0,
        progressCount: 0,
        queueCount: 0
      };
    }
  }

  // Optimize storage by cleaning submission queue
  async optimizeStorage() {
    try {
      console.log('[OfflineManager] Starting submission queue optimization...');
      
      let removedCount = 0;
      let savedSpace = 0;
      
      // Clean old submission queue items (older than 24 hours)
      try {
        const queue = await this.getSubmissionQueue();
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const filteredQueue = queue.filter(item => {
          const itemTime = new Date(item.submittedAt).getTime();
          return itemTime > cutoff;
        });
        
        if (filteredQueue.length < queue.length) {
          removedCount += queue.length - filteredQueue.length;
          await this.setSubmissionQueue(filteredQueue);
          console.log(`[OfflineManager] Cleaned ${removedCount} old submission queue items`);
        }
      } catch (e) {
        console.log('[OfflineManager] Error cleaning submission queue:', e.message);
      }
      
      console.log(`[OfflineManager] Submission queue optimization complete: removed ${removedCount} items`);
      return { removedCount, savedSpaceKB: 0 };
    } catch (error) {
      console.error('[OfflineManager] Error optimizing storage:', error);
      return { removedCount: 0, savedSpaceKB: 0 };
    }
  }
}

// Create singleton instance
const offlineManager = new OfflineManager();

export default offlineManager;
