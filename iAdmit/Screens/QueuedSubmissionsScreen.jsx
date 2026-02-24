import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  Animated,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import offlineManager from '../utils/OfflineManager';
import globalFullscreen from '../utils/GlobalFullscreen';

const { width } = Dimensions.get('window');

export default function QueuedSubmissionsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [submittingAll, setSubmittingAll] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const list = await offlineManager.getSubmissionQueue();
      setItems(list);
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

    load();
    const unsub = offlineManager.addQueueListener(setItems);
    return () => { try { unsub?.(); } catch {} };
  }, []);

  // Ensure fullscreen is enabled on mount
  useEffect(() => {
    globalFullscreen.enableFullscreen();
    setTimeout(() => globalFullscreen.forceHideNavigationBar(), 100);
    setTimeout(() => globalFullscreen.forceHideNavigationBar(), 300);
  }, []);

  const onRefresh = () => {
    load(true);
  };

  const onSubmitAll = async () => {
    if (submittingAll || items.length === 0) return;
    
    Alert.alert(
      'Submit All Exams',
      `Do you want to submit all ${items.length} queued exam(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit All',
          style: 'default',
          onPress: async () => {
            setSubmittingAll(true);
            try {
              const result = await offlineManager.processSubmissionQueue();
              if (result && result.successCount > 0) {
                Alert.alert(
                  'Success! 🎉', 
                  `${result.successCount} exam${result.successCount > 1 ? 's' : ''} submitted successfully!${result.failedCount > 0 ? `\n${result.failedCount} failed - please try again.` : ''}`,
                  [{ text: 'OK', style: 'default' }]
                );
              } else if (result && result.failedCount > 0) {
                Alert.alert('Error', 'Failed to submit exams. Please check your connection and try again.', [{ text: 'OK' }]);
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to submit some items. Please try again.', [{ text: 'OK' }]);
            } finally {
              setSubmittingAll(false);
            }
          }
        }
      ]
    );
  };

  const onSubmitOne = async (id, examTitle) => {
    if (submittingId) return;
    
    Alert.alert(
      'Submit Exam',
      `Submit "${examTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            setSubmittingId(id);
            try {
              const result = await offlineManager.processSingleSubmission(id);
              if (result && result.success) {
                Alert.alert(
                  'Success! 🎉', 
                  'Exam submitted successfully!',
                  [{ text: 'OK', style: 'default' }]
                );
              } else {
                Alert.alert('Failed', result?.error || 'Please try again when online.', [{ text: 'OK' }]);
              }
            } catch (e) {
              Alert.alert('Submit Failed', e?.message || 'Please try again when online.', [{ text: 'OK' }]);
            } finally {
              setSubmittingId(null);
            }
          }
        }
      ]
    );
  };

  const onDelete = async (id, examTitle) => {
    Alert.alert(
      'Remove Submission', 
      `Delete "${examTitle}" from queue? This cannot be undone.`, 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => { 
            await offlineManager.removeSubmission(id);
            Alert.alert('Deleted', 'Submission removed from queue.', [{ text: 'OK' }]);
          } 
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'submitting': return '#1447E6';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'submitting': return 'sync';
      case 'failed': return 'error';
      default: return 'help';
    }
  };

  const renderItem = ({ item, index }) => {
    const isSubmitting = submittingId === item.id;
    const examTitle = item?.meta?.examTitle || item?.meta?.examRefNo || 'Exam';
    
    return (
      <Animated.View 
        style={[
          styles.cardContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { 
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1]
                })
              }
            ]
          }
        ]}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.examIconContainer}>
              <Icon name="quiz" size={20} color="#1447E6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{examTitle}</Text>
              <View style={styles.statusBadge}>
                <Icon name={getStatusIcon(item.status)} size={12} color={getStatusColor(item.status)} />
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
                {item.retries > 0 && (
                  <Text style={styles.retryText}>• {item.retries} retries</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Icon name="tag" size={14} color="#6B7280" />
              <Text style={styles.detailLabel}>Ref:</Text>
              <Text style={styles.detailValue}>{item?.meta?.examRefNo || 'N/A'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon name="category" size={14} color="#6B7280" />
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{item?.meta?.examType || 'Regular'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="help" size={14} color="#6B7280" />
              <Text style={styles.detailLabel}>Questions:</Text>
              <Text style={styles.detailValue}>{item?.meta?.totalQuestions || 0}</Text>
            </View>

            {item?.meta?.timeTaken && (
              <View style={styles.detailRow}>
                <Icon name="timer" size={14} color="#6B7280" />
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>
                  {Math.floor(item.meta.timeTaken / 60)}m {item.meta.timeTaken % 60}s
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Icon name="schedule" size={14} color="#6B7280" />
              <Text style={styles.detailLabel}>Submitted:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {new Date(item.submittedAt).toLocaleString()}
              </Text>
            </View>
          </View>

          {item.lastError && (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={14} color="#EF4444" />
              <Text style={styles.errorText} numberOfLines={2}>{item.lastError}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.btnPrimary, isSubmitting && styles.btnDisabled]} 
              onPress={() => onSubmitOne(item.id, examTitle)}
              disabled={Boolean(isSubmitting || submittingAll)}
              activeOpacity={0.7}
            >
              <View style={[styles.btnGradient, isSubmitting && styles.btnGradientDisabled]}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="cloud-upload" size={18} color="#fff" />
                )}
                <Text style={styles.btnText}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.btnDanger} 
              onPress={() => onDelete(item.id, examTitle)}
              disabled={Boolean(isSubmitting || submittingAll)}
              activeOpacity={0.7}
            >
              <Icon name="delete" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <Animated.View 
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <Icon name="cloud-done" size={64} color="#6B7280" />
      </View>
      <Text style={styles.emptyTitle}>All Clear!</Text>
      <Text style={styles.emptyText}>No pending submissions in queue</Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <View style={styles.emptyButtonGradient}>
          <Icon name="arrow-back" size={18} color="#fff" />
          <Text style={styles.emptyButtonText}>Back to Dashboard</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1447E6" />
          <Text style={styles.loadingText}>Loading queue...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color="#1D293D" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Queued Submissions</Text>
          <Text style={styles.headerSubtitle}>
            {items.length} {items.length === 1 ? 'item' : 'items'} pending
          </Text>
        </View>
        {items.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{items.length}</Text>
          </View>
        )}
      </Animated.View>

      {/* Toolbar */}
      {items.length > 0 && (
        <Animated.View 
          style={[
            styles.toolbar,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={[styles.submitAllBtn, (submittingAll || submittingId) && styles.btnDisabled]} 
            onPress={onSubmitAll}
            disabled={Boolean(submittingAll || submittingId)}
            activeOpacity={0.7}
          >
            <View style={[styles.submitAllGradient, (submittingAll || submittingId) && styles.submitAllGradientDisabled]}>
              {submittingAll ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="cloud-upload" size={20} color="#fff" />
              )}
              <Text style={styles.submitAllText}>
                {submittingAll ? 'Submitting All...' : 'Submit All'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1447E6"
            colors={['#1447E6', '#1D293D']}
            progressBackgroundColor="#FFFFFF"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#1D293D',
    fontSize: 14,
    fontWeight: '500',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Extra padding to avoid camera punch hole
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(20, 71, 230, 0.1)', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: { 
    color: '#1D293D', 
    fontSize: 20, 
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  headerBadge: {
    backgroundColor: 'rgba(20, 71, 230, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  headerBadgeText: {
    color: '#1447E6',
    fontSize: 14,
    fontWeight: '700',
  },
  toolbar: { 
    paddingHorizontal: 16, 
    paddingBottom: 12,
  },
  submitAllBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1447E6',
  },
  submitAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  submitAllGradientDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitAllText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: { 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  examIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 71, 230, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 71, 230, 0.2)',
  },
  title: { 
    color: '#1D293D', 
    fontSize: 16, 
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  retryText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
    width: 75,
  },
  detailValue: {
    color: '#1D293D',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  actions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
  },
  btnPrimary: { 
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1447E6',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  btnGradientDisabled: {
    backgroundColor: '#9CA3AF',
  },
  btnDanger: { 
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ef4444', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  btnText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '700',
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    color: '#1D293D',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: { 
    color: '#6B7280', 
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1447E6',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
