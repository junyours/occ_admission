import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEPLOYED_URL = 'https://your-domain.example.com';

export default function IosWebViewScreen() {
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AsyncStorage.setItem('last_route', JSON.stringify({ name: 'IosWebView', params: {} })).catch(() => {});
    }
  }, []);
  if (Platform.OS !== 'ios') return null;
  return <WebView source={{ uri: DEPLOYED_URL }} />;
}
