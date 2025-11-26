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
      case 'pending': return '#f59e0b';
      case 'submitting': return '#3b82f6';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
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
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <View style={styles.examIconContainer}>
              <Icon name="quiz" size={20} color="#a855f7" />
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
              <Icon name="tag" size={14} color="#9ca3af" />
              <Text style={styles.detailLabel}>Ref:</Text>
              <Text style={styles.detailValue}>{item?.meta?.examRefNo || 'N/A'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon name="category" size={14} color="#9ca3af" />
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{item?.meta?.examType || 'Regular'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="help" size={14} color="#9ca3af" />
              <Text style={styles.detailLabel}>Questions:</Text>
              <Text style={styles.detailValue}>{item?.meta?.totalQuestions || 0}</Text>
            </View>

            {item?.meta?.timeTaken && (
              <View style={styles.detailRow}>
                <Icon name="timer" size={14} color="#9ca3af" />
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>
                  {Math.floor(item.meta.timeTaken / 60)}m {item.meta.timeTaken % 60}s
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Icon name="schedule" size={14} color="#9ca3af" />
              <Text style={styles.detailLabel}>Submitted:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {new Date(item.submittedAt).toLocaleString()}
              </Text>
            </View>
          </View>

          {item.lastError && (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={14} color="#ef4444" />
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
              <LinearGradient
                colors={isSubmitting || submittingAll ? ['#4b5563', '#374151'] : ['#7c3aed', '#a855f7']}
                style={styles.btnGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="cloud-upload" size={18} color="#fff" />
                )}
                <Text style={styles.btnText}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Text>
              </LinearGradient>
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
        </LinearGradient>
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
        <Icon name="cloud-done" size={64} color="#6b7280" />
      </View>
      <Text style={styles.emptyTitle}>All Clear!</Text>
      <Text style={styles.emptyText}>No pending submissions in queue</Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#7c3aed', '#a855f7']}
          style={styles.emptyButtonGradient}
        >
          <Icon name="arrow-back" size={18} color="#fff" />
          <Text style={styles.emptyButtonText}>Back to Dashboard</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#0a0a1a", "#1a1a2e", "#16213e"]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
          <Text style={styles.loadingText}>Loading queue...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0a0a1a", "#1a1a2e", "#16213e"]} style={StyleSheet.absoluteFillObject} />
      
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
          <Icon name="arrow-back" size={22} color="#fff" />
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
            <LinearGradient
              colors={submittingAll || submittingId ? ['#4b5563', '#374151'] : ['#10b981', '#059669']}
              style={styles.submitAllGradient}
            >
              {submittingAll ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="cloud-upload" size={20} color="#fff" />
              )}
              <Text style={styles.submitAllText}>
                {submittingAll ? 'Submitting All...' : 'Submit All'}
              </Text>
            </LinearGradient>
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
            tintColor="#a855f7"
            colors={['#a855f7', '#7c3aed']}
            progressBackgroundColor="#1a1a2e"
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
    backgroundColor: '#0a0a1a' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#9ca3af',
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
    backgroundColor: 'rgba(168, 85, 247, 0.15)', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  headerBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  headerBadgeText: {
    color: '#a855f7',
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
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    borderColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  title: { 
    color: '#fff', 
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
    color: '#6b7280',
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
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
    width: 75,
  },
  detailValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#ef4444',
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
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
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
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: { 
    color: '#9ca3af', 
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
