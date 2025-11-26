import { Platform, StatusBar } from 'react-native';
import SystemNavigationBar from 'react-native-system-navigation-bar';

// Global fullscreen manager using SystemNavigationBar
class GlobalFullscreen {
  constructor() {
    this.isFullscreen = false;
    this.hideIntervalId = null;
  }

  // Initialize fullscreen - call once from Dashboard
  async initializeFullscreen() {
    console.log('GlobalFullscreen: Initializing...');
    this.isFullscreen = true;
    
    // Hide status bar immediately
    StatusBar.setHidden(true, 'none');
    
    if (Platform.OS === 'android') {
      try {
        // Hide navigation bar using SystemNavigationBar
        await SystemNavigationBar.navigationHide();
        await SystemNavigationBar.immersive();
        await SystemNavigationBar.setNavigationColor('transparent', 'light');
        
        console.log('GlobalFullscreen: Navigation bar hidden via SystemNavigationBar');
        
        // Set up persistent hiding
        if (this.hideIntervalId) {
          clearInterval(this.hideIntervalId);
        }
        
        this.hideIntervalId = setInterval(async () => {
          if (this.isFullscreen) {
            try {
              await SystemNavigationBar.navigationHide();
              await SystemNavigationBar.immersive();
            } catch (e) {
              // Silently fail
            }
          }
        }, 500);
        
      } catch (error) {
        console.log('GlobalFullscreen: Error with SystemNavigationBar:', error.message);
      }
    }
  }

  // Enable fullscreen mode
  async enableFullscreen() {
    console.log('GlobalFullscreen: Enabling fullscreen');
    this.isFullscreen = true;
    
    // Hide status bar
    StatusBar.setHidden(true, 'none');
    
    if (Platform.OS === 'android') {
      try {
        // Hide navigation bar
        await SystemNavigationBar.navigationHide();
        await SystemNavigationBar.immersive();
        
        // Hide again after short delays
        setTimeout(async () => {
          try {
            await SystemNavigationBar.navigationHide();
            await SystemNavigationBar.immersive();
          } catch (e) {}
        }, 100);
        
        setTimeout(async () => {
          try {
            await SystemNavigationBar.navigationHide();
            await SystemNavigationBar.immersive();
          } catch (e) {}
        }, 300);
        
      } catch (error) {
        console.log('GlobalFullscreen: Error enabling fullscreen:', error.message);
      }
    }
  }

  // Force hide - called when screen gains focus
  async forceHideNavigationBar() {
    if (this.isFullscreen && Platform.OS === 'android') {
      try {
        await SystemNavigationBar.navigationHide();
        await SystemNavigationBar.immersive();
      } catch (e) {
        // Silently fail
      }
    }
  }

  // Disable fullscreen
  async disableFullscreen() {
    console.log('GlobalFullscreen: Disabling fullscreen');
    this.isFullscreen = false;
    
    if (this.hideIntervalId) {
      clearInterval(this.hideIntervalId);
      this.hideIntervalId = null;
    }
    
    StatusBar.setHidden(false, 'fade');
    
    if (Platform.OS === 'android') {
      try {
        await SystemNavigationBar.navigationShow();
        await SystemNavigationBar.setNavigationColor('#000000', 'dark');
      } catch (e) {
        console.log('GlobalFullscreen: Error restoring navigation bar:', e.message);
      }
    }
  }

  // Check if fullscreen is enabled
  getFullscreenState() {
    return this.isFullscreen;
  }
}

// Export singleton
export default new GlobalFullscreen();
