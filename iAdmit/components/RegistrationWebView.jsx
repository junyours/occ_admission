import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { getCurrentApiConfig } from '../API/environment';

function RegistrationWebView({ visible, onClose }) {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [progress, setProgress] = useState(0);

  // Get the registration URL from API config
  useEffect(() => {
    const loadUrl = async () => {
      try {
        const { env } = await getCurrentApiConfig();
        console.log('[RegistrationWebView] API Config - env:', env);
        
        let finalUrl;
        
        if (env === 'local') {
          // For local development, always use production URL
          // This avoids CORS and network issues
          finalUrl = 'https://admission.occph.com/register';
          console.log('[RegistrationWebView] Using production URL for local testing');
        } else {
          // For production
          finalUrl = 'https://admission.occph.com/register';
        }
        
        setRegistrationUrl(finalUrl);
        console.log('[RegistrationWebView] Registration URL:', finalUrl);
      } catch (error) {
        console.log('[RegistrationWebView] Error loading URL:', error);
        // Fallback to production
        setRegistrationUrl('https://admission.occph.com/register');
      }
    };
    
    if (visible) {
      loadUrl();
    } else {
      // Reset state when modal closes
      setLoading(true);
      setCurrentUrl('');
      setCanGoBack(false);
      setProgress(0);
    }
  }, [visible]);

  const handleNavigationStateChange = useCallback((navState) => {
    console.log('[RegistrationWebView] Navigation changed:', navState.url);
    setCurrentUrl(navState.url);
    setCanGoBack(navState.canGoBack);

    // Check if user was redirected to registration complete page
    if (navState.url.includes('/registration/complete')) {
      console.log('[RegistrationWebView] Detected registration complete page - will wait for page to send close message');
      // Don't close immediately - let the page show for 5 seconds with countdown
      // The page will send a message when ready to close
    }
  }, [onClose]);

  const handleGoBack = useCallback(() => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    }
  }, [canGoBack]);

  const handleRefresh = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  }, []);

  const handleClose = useCallback(() => {
    onClose(false);
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      hardwareAccelerated={true}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        
        {/* Header */}
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            {canGoBack && (
              <TouchableOpacity
                onPress={handleGoBack}
                style={[styles.headerButton, styles.backButton]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Student Registration
            </Text>
            {__DEV__ && registrationUrl && (
              <Text style={styles.debugUrl} numberOfLines={1}>
                {registrationUrl}
              </Text>
            )}
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="refresh" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          {registrationUrl ? (
            <WebView
              ref={webViewRef}
              source={{ uri: registrationUrl + '?mobile=true' }}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadStart={() => {
                console.log('[RegistrationWebView] Load started');
                setLoading(true);
                setProgress(0);
              }}
              onLoadProgress={({ nativeEvent }) => {
                setProgress(nativeEvent.progress);
              }}
              onLoadEnd={() => {
                console.log('[RegistrationWebView] Load ended');
                setLoading(false);
                setProgress(1);
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log('[RegistrationWebView] WebView error:', nativeEvent);
                setLoading(false);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log('[RegistrationWebView] HTTP error:', nativeEvent.statusCode, nativeEvent.url);
              }}
              // Core functionality
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              scalesPageToFit={true}
              style={styles.webView}
              
              // Performance optimizations
              androidHardwareAccelerationDisabled={false}
              androidLayerType="hardware"
              cacheEnabled={true}
              cacheMode="LOAD_DEFAULT"
              
              // iOS specific props
              allowsBackForwardNavigationGestures={true}
              allowsInlineMediaPlayback={true}
              bounces={false}
              scrollEnabled={true}
              automaticallyAdjustContentInsets={false}
              contentInsetAdjustmentBehavior="never"
              
              // Android specific props
              mixedContentMode="always"
              thirdPartyCookiesEnabled={true}
              sharedCookiesEnabled={true}
              
              // Reduce unnecessary features for better performance
              mediaPlaybackRequiresUserAction={true}
              allowsFullscreenVideo={false}
              allowFileAccess={false}
              allowUniversalAccessFromFileURLs={false}
              
              // Optimize rendering
              overScrollMode="never"
              nestedScrollEnabled={true}
              
              // Handle messages from web page if needed
              onMessage={(event) => {
                const data = event.nativeEvent.data;
                console.log('[RegistrationWebView] Message from web:', data);
                
                // Check for close message from web
                if (data === 'close_registration' || data === 'close_browser') {
                  console.log('[RegistrationWebView] Received close message, closing WebView');
                  onClose(true);
                }
                
                // Handle JSON messages
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'close_browser' || parsed.type === 'close_registration') {
                    console.log('[RegistrationWebView] Received close message (JSON), closing WebView');
                    onClose(true);
                  }
                } catch (e) {
                  // Not JSON, ignore
                }
              }}
            />
          ) : (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#a855f7" />
              <Text style={styles.loadingText}>Preparing registration form...</Text>
            </View>
          )}

          {/* Progress Bar */}
          {loading && progress > 0 && progress < 1 && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
            </View>
          )}

          {/* Loading Indicator - Only show at the very beginning */}
          {loading && progress === 0 && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#a855f7" />
              <Text style={styles.loadingText}>Loading registration form...</Text>
            </View>
          )}
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Icon name="info-outline" size={16} color="#9ca3af" />
          <Text style={styles.infoText}>
            Complete the form to register for entrance exam
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  debugUrl: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff',
    opacity: 0.99, // Slight opacity for better rendering performance
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    zIndex: 1000,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#a855f7',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(168, 85, 247, 0.2)',
  },
  infoText: {
    fontSize: 13,
    color: '#9ca3af',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default memo(RegistrationWebView);

