import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, SafeAreaView, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenPinning from '../utils/ScreenPinning';
import { submitExamAnswers } from '../API/exam';
import offlineManager from '../utils/OfflineManager';

const generateAttemptId = () => `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const { width, height } = Dimensions.get('window');

export default function UploadingExamScreen({ navigation, route }) {
  const { payload, cleanupKeys = [], navigateTo = 'ExamResults' } = route.params || {};

  useEffect(() => {
    const run = async () => {
      // Ensure pinning is fully stopped before network/transition
      try { await ScreenPinning.stop(); } catch {}
      try { await ScreenPinning.disableSecureFlag?.(); } catch {}

      // Mark global submission flag to silence pin logic
      try { await AsyncStorage.setItem('exam_submission_complete', 'true'); } catch {}

      // Try upload with small retry loop
      let uploadOk = false;
      let lastError = null;
      for (let attempt = 1; attempt <= 3 && !uploadOk; attempt++) {
        try {
          console.log('[UploadingExam] Submitting attempt', attempt);
          await submitExamAnswers(payload);
          uploadOk = true;
        } catch (e) {
          lastError = e;
          console.log('[UploadingExam] Upload failed attempt', attempt, e?.response?.status, e?.message);
          // brief backoff
          await new Promise(r => setTimeout(r, 700 * attempt));
        }
      }

      // Cleanup persisted local keys regardless (answers are already sent or we will still move on)
      for (const k of cleanupKeys) {
        try { await AsyncStorage.removeItem(k); } catch {}
      }

      if (!uploadOk) {
        console.log('[UploadingExam] Final upload failed, enqueueing for offline sync. Error:', lastError?.message);
        try {
          const attemptId = generateAttemptId();
          
          // Normalize payload keys for consistent storage
          const normalizedPayload = {
            ...payload,
            // Ensure consistent key names for both exam types
            exam_id: payload.examId || payload.exam_id,
            exam_ref_no: payload.exam_ref_no,
            exam_type: payload.exam_type,
            answers: payload.answers,
            time_taken: payload.time_taken,
            penalties_applied: payload.penalties_applied
          };
          
          // Create comprehensive metadata for better display in queue
          const meta = {
            examRefNo: payload.exam_ref_no,
            examId: payload.examId || payload.exam_id,
            examType: payload.exam_type,
            examTitle: payload.exam_title || `Exam ${payload.exam_ref_no}`,
            totalQuestions: payload.answers?.length || 0,
            timeTaken: payload.time_taken,
            submittedAt: new Date().toISOString()
          };
          
          await offlineManager.enqueueSubmission({ 
            attemptId, 
            submission: normalizedPayload, 
            meta 
          });
          
          console.log('[UploadingExam] Submission enqueued for offline sync:', attemptId);
        } catch (e) {
          console.log('[UploadingExam] Failed to enqueue submission', e?.message);
        }
      }

      navigation.replace(navigateTo);
    };
    run();
  }, [navigation, payload, cleanupKeys, navigateTo]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={StyleSheet.absoluteFillObject} />
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Icon name="cloud-upload" size={36} color="#1447E6" />
        </View>
        <Text style={styles.title}>Uploading Exam…</Text>
        <Text style={styles.subtitle}>Please wait while we securely submit your answers.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(20,71,230,0.1)', borderWidth: 1,
    borderColor: 'rgba(20,71,230,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 16
  },
  title: { color: '#1D293D', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#6b7280', fontSize: 13, textAlign: 'center' }
});


