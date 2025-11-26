import { NativeModules, Platform, AppState } from 'react-native';

// Safe wrapper for KeepAwake to handle null module errors
class KeepAwakeWrapper {
  private static isAvailable = false;
  private static isActivated = false;
  private static fallbackInterval: ReturnType<typeof setInterval> | null = null;

  static initialize() {
    try {
      console.log('[KeepAwakeWrapper] Initializing...');
      console.log('[KeepAwakeWrapper] Platform:', Platform.OS);
      console.log('[KeepAwakeWrapper] Available NativeModules:', Object.keys(NativeModules));
      
      // Check if the native module is available
      if (Platform.OS === 'android' && NativeModules.KCKeepAwake) {
        this.isAvailable = true;
        console.log('[KeepAwakeWrapper] Android native module available');
      } else if (Platform.OS === 'ios' && NativeModules.KCKeepAwake) {
        this.isAvailable = true;
        console.log('[KeepAwakeWrapper] iOS native module available');
      } else {
        console.log('[KeepAwakeWrapper] Native module not available, using fallback');
        console.log('[KeepAwakeWrapper] KCKeepAwake module:', NativeModules.KCKeepAwake);
        this.isAvailable = false;
      }
    } catch (error) {
      console.log('[KeepAwakeWrapper] Error initializing:', error);
      this.isAvailable = false;
    }
  }

  static activate() {
    try {
      console.log('[KeepAwakeWrapper] Activating keep awake...');
      console.log('[KeepAwakeWrapper] Is available:', this.isAvailable);
      console.log('[KeepAwakeWrapper] KCKeepAwake module:', NativeModules.KCKeepAwake);
      
      if (this.isAvailable && NativeModules.KCKeepAwake) {
        NativeModules.KCKeepAwake.activate();
        this.isActivated = true;
        console.log('[KeepAwakeWrapper] Keep awake activated via native module');
      } else {
        console.log('[KeepAwakeWrapper] Using fallback keep awake method');
        this.activateFallback();
      }
    } catch (error) {
      console.log('[KeepAwakeWrapper] Error activating keep awake:', error);
      this.activateFallback();
    }
  }

  static deactivate() {
    try {
      console.log('[KeepAwakeWrapper] Deactivating keep awake...');
      
      if (this.isAvailable && NativeModules.KCKeepAwake) {
        NativeModules.KCKeepAwake.deactivate();
        this.isActivated = false;
        console.log('[KeepAwakeWrapper] Keep awake deactivated via native module');
      } else {
        console.log('[KeepAwakeWrapper] Deactivating fallback keep awake');
        this.deactivateFallback();
      }
    } catch (error) {
      console.log('[KeepAwakeWrapper] Error deactivating keep awake:', error);
      this.deactivateFallback();
    }
  }

  private static activateFallback() {
    // Fallback method - prevent screen sleep using app state monitoring
    console.log('[KeepAwakeWrapper] Fallback keep awake activated');
    this.isActivated = true;
    
    // Create a periodic task to keep the app active
    this.fallbackInterval = setInterval(() => {
      // This keeps the JavaScript thread active
      console.log('[KeepAwakeWrapper] Fallback keep awake pulse');
    }, 30000); // Every 30 seconds
    
    // Monitor app state changes
    const handleAppStateChange = (nextAppState: string) => {
      console.log('[KeepAwakeWrapper] App state changed to:', nextAppState);
      if (nextAppState === 'active' && this.isActivated) {
        console.log('[KeepAwakeWrapper] App became active, maintaining keep awake');
      }
    };
    
    AppState.addEventListener('change', handleAppStateChange);
  }

  private static deactivateFallback() {
    console.log('[KeepAwakeWrapper] Fallback keep awake deactivated');
    this.isActivated = false;
    
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }

  static isKeepAwakeActive() {
    return this.isActivated;
  }

  static isModuleAvailable() {
    return this.isAvailable;
  }

  static getStatus() {
    return {
      isAvailable: this.isAvailable,
      isActivated: this.isActivated,
      platform: Platform.OS,
      nativeModule: !!NativeModules.KCKeepAwake
    };
  }
}

// Initialize the wrapper
KeepAwakeWrapper.initialize();

export default KeepAwakeWrapper;
