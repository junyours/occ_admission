import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

const DEVICE_ID_KEY = 'device_id';

/**
 * Get or generate a unique device ID
 * Uses hardware-based ID (Android ID / iOS Identifier) that persists even after app data clearing
 * Falls back to stored ID if hardware ID is not available
 */
export const getDeviceId = async () => {
  try {
    // First, try to get hardware-based unique ID (persists even after app data clear)
    let hardwareId = null;
    try {
      hardwareId = await DeviceInfo.getUniqueId();
      console.log('[DeviceId] Hardware device ID retrieved:', hardwareId);
    } catch (error) {
      console.log('[DeviceId] Could not get hardware ID, using fallback:', error);
    }

    if (hardwareId) {
      // Use hardware ID as base, but add platform prefix for consistency
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const deviceId = `${platform}_${hardwareId}`;
      
      // Store it for reference (optional, but helps with debugging)
      const storedId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (storedId !== deviceId) {
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
        console.log('[DeviceId] Stored hardware-based device ID:', deviceId);
      }
      
      return deviceId;
    }

    // Fallback: Try to get existing stored device ID
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Last resort: Generate new device ID (should rarely happen)
      deviceId = generateUniqueDeviceId();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('[DeviceId] Generated fallback device ID:', deviceId);
    } else {
      console.log('[DeviceId] Retrieved stored device ID:', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('[DeviceId] Error getting device ID:', error);
    // Final fallback: generate a new ID
    return generateUniqueDeviceId();
  }
};

/**
 * Generate a unique device ID based on platform and timestamp (fallback only)
 */
const generateUniqueDeviceId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  
  return `${platform}_${timestamp}_${random}`;
};

/**
 * Clear the stored device ID (useful for testing or logout)
 */
export const clearDeviceId = async () => {
  try {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
    console.log('[DeviceId] Device ID cleared');
  } catch (error) {
    console.error('[DeviceId] Error clearing device ID:', error);
  }
};

/**
 * Get device info for debugging
 */
export const getDeviceInfo = () => {
  return {
    platform: Platform.OS,
    version: Platform.Version,
    timestamp: new Date().toISOString()
  };
};
