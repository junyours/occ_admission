import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Platform,
  SafeAreaView,
  Alert,
  Text
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { submitPersonalityAnswers } from '../API/exam';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 350;
const isShortScreen = height < 700;

export default function PersonalityReviewScreen({ navigation, route }) {
  const {
    examId,
    examRefNo,
    examTitle,
    timeLimit,
    questions,
    answers
  } = route.params;

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // No screen pinning needed for personality review
    return () => {
      // Cleanup if needed
    };
  }, []);

  // Normalize answers into a Map for easy lookup
  const answersMap = new Map(
    Object.entries(answers || {}).map(([key, value]) => [String(key), value])
  );

  const getAnsweredCount = () => answersMap.size;
  const getUnansweredCount = () => questions.length - answersMap.size;

  const currentAnswerFor = (question) => {
    const qid = String(question.questionId || question.id || question.personality_question_id);
    return answersMap.get(qid);
  };

  const handleSubmitAndProceed = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const answersArray = Array.from(answersMap.entries()).map(([questionId, selected]) => ({
        questionId,
        selected_answer: selected
      }));

      const result = await submitPersonalityAnswers({ examId, answers: answersArray });
      console.log('[PersonalityReviewScreen] Personality submitted:', result);

      // Clear cached personality answers after successful submit
      try { await AsyncStorage.removeItem(`personality_answers_${examId}`); } catch {}

      // Proceed to exam instructions (then to pinned exam)
      const target = { examId, examRefNo, timeLimit, examTitle, examType: 'regular' };
      AsyncStorage.setItem('last_route', JSON.stringify({ name: 'ExamInstructions', params: target })).catch(() => {});
      navigation.replace('ExamInstructions', target);
    } catch (error) {
      console.log('[PersonalityReviewScreen] Submission error:', error?.response?.data || error?.message);
      Alert.alert('Submission Error', 'Failed to submit personality test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />

      <LinearGradient
        colors={['#0a0a1a', '#1a1a2e', '#16213e']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Text style={styles.reviewTitle}>Review Personality Answers</Text>
        <Text style={styles.reviewSubtitle}>
          {getAnsweredCount()}/{questions.length} answered • {getUnansweredCount()} unanswered
        </Text>
      </View>

      <ScrollView 
        style={styles.questionScrollView}
        contentContainerStyle={styles.questionScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {questions.map((q, idx) => {
          const qid = String(q.questionId || q.id || q.personality_question_id);
          const sel = answersMap.get(qid);
          const optionText = sel === 'A' ? q.option1 : sel === 'B' ? q.option2 : '';
          return (
            <View key={qid} style={styles.compactItem}>
              <View style={styles.compactHeader}>
                <Text style={styles.compactQLabel}>Q{idx + 1}</Text>
                <Text style={styles.compactQuestion} numberOfLines={2}>{q.question}</Text>
              </View>
              <View style={styles.compactAnswerRow}>
                <Text style={[styles.compactAnswerLetter, sel ? styles.compactAnswerLetterAnswered : styles.compactAnswerLetterUnanswered]}>
                  {sel ? `${sel})` : '—'}
                </Text>
                <Text style={[styles.compactAnswerText, sel ? styles.compactAnswerTextAnswered : styles.compactAnswerTextUnanswered]}>
                  {sel ? optionText : 'No answer'}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerActions}>
          <TouchableOpacity
            onPress={handleSubmitAndProceed}
            style={styles.submitButton}
            activeOpacity={0.8}
            disabled={submitting}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.submitButtonGradient}
            >
              <View style={styles.submitButtonContent}>
                <Icon name="send" size={20} color="#ffffff" style={styles.submitButtonIcon} />
                <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit & Proceed to Entrance Exam'}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingTop: Platform.OS === 'ios' ? (isShortScreen ? 10 : 20) : 50,
    paddingBottom: isShortScreen ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  reviewTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  reviewSubtitle: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  questionScrollView: {
    flex: 1,
  },
  questionScrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingBottom: isShortScreen ? 100 : 120,
  },
  compactItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingRight: 8,
    marginBottom: 4,
  },
  compactQLabel: {
    color: '#a855f7',
    fontWeight: '700',
    width: 40,
  },
  compactQuestion: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  compactAnswerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 40,
    gap: 8,
  },
  compactAnswerLetter: {
    width: 28,
    fontSize: 13,
    fontWeight: '700',
  },
  compactAnswerLetterAnswered: {
    color: '#10b981',
  },
  compactAnswerLetterUnanswered: {
    color: '#ef4444',
  },
  compactAnswerText: {
    flex: 1,
    fontSize: 13,
  },
  compactAnswerTextAnswered: {
    color: '#9ae6b4',
  },
  compactAnswerTextUnanswered: {
    color: '#fca5a5',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isShortScreen ? 12 : 16,
    paddingBottom: Platform.OS === 'ios' ? (isShortScreen ? 25 : 34) : 60,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(10, 10, 26, 0.98)',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    minHeight: 48,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center'
  },
});


