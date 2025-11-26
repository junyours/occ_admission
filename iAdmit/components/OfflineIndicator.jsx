import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import offlineManager from '../utils/OfflineManager';

const OfflineIndicator = ({ style }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const [syncQueue, setSyncQueue] = useState(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Listen for network changes
    const unsubscribe = offlineManager.addNetworkListener((online, wasOffline) => {
      setIsOnline(online);
      
      if (wasOffline && online) {
        // Coming back online
        setSyncStatus('syncing');
        setIsVisible(true);
        showIndicator();
        
        // Simulate sync process
        setTimeout(() => {
          setSyncStatus('success');
          setTimeout(() => {
            hideIndicator();
          }, 2000);
        }, 1500);
      } else if (!online) {
        // Going offline
        setIsVisible(true);
        showIndicator();
      }
    });

    return unsubscribe;
  }, []);

  const showIndicator = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideIndicator = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
    });
  };

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        text: 'Offline Mode',
        subtext: 'Working without internet',
        colors: ['#ef4444', '#dc2626'],
        icon: 'wifi-off',
        iconColor: '#ffffff'
      };
    }

    switch (syncStatus) {
      case 'syncing':
        return {
          text: 'Syncing...',
          subtext: 'Uploading offline data',
          colors: ['#3b82f6', '#2563eb'],
          icon: 'sync',
          iconColor: '#ffffff'
        };
      case 'success':
        return {
          text: 'Synced',
          subtext: 'All data uploaded',
          colors: ['#10b981', '#059669'],
          icon: 'check-circle',
          iconColor: '#ffffff'
        };
      case 'error':
        return {
          text: 'Sync Failed',
          subtext: 'Will retry automatically',
          colors: ['#f59e0b', '#d97706'],
          icon: 'error',
          iconColor: '#ffffff'
        };
      default:
        return {
          text: 'Online',
          subtext: 'Connected to server',
          colors: ['#10b981', '#059669'],
          icon: 'wifi',
          iconColor: '#ffffff'
        };
    }
  };

  if (!isVisible) return null;

  const statusInfo = getStatusInfo();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, style]}>
      <LinearGradient
        colors={statusInfo.colors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon 
              name={statusInfo.icon} 
              size={16} 
              color={statusInfo.iconColor}
              style={syncStatus === 'syncing' ? styles.rotating : null}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.statusText}>{statusInfo.text}</Text>
            <Text style={styles.subText}>{statusInfo.subtext}</Text>
          </View>
          {syncQueue > 0 && (
            <View style={styles.queueBadge}>
              <Text style={styles.queueText}>{syncQueue}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  rotating: {
    transform: [{ rotate: '0deg' }],
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 1,
  },
  queueBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  queueText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OfflineIndicator;
