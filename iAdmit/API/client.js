import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentApiConfig, getBaseUrlSyncFallback, setEnvironment, getEnvironment } from './environment';

let BASE_URL = '';
let isInitialized = false;
let initializationPromise = null;

// Initialize base URL with a safe production fallback
const initializeClient = async () => {
  if (isInitialized) return true;
  
  try {
    BASE_URL = await getBaseUrlSyncFallback();
    const { env, baseURL } = await getCurrentApiConfig();
    BASE_URL = baseURL;
    console.log('[API] Initialized with env:', env, 'BASE_URL:', BASE_URL);
    // Ensure axios client picks up the resolved BASE_URL
    client.defaults.baseURL = BASE_URL;
    isInitialized = true;
    return true;
  } catch (e) {
    console.log('[API] Initialization error, sticking with fallback BASE_URL', e?.message);
    // Still mark as initialized so we don't hang forever
    isInitialized = true;
    return true;
  }
};

// Create a promise that resolves when initialization is complete
initializationPromise = initializeClient();

// Export function to wait for API client to be ready
export async function waitForApiReady() {
  if (isInitialized && BASE_URL) return true;
  await initializationPromise;
  // Double-check we have a valid baseURL
  if (!client.defaults.baseURL) {
    console.log('[API] waitForApiReady: baseURL still empty, reinitializing...');
    await initializeClient();
  }
  return true;
}

// Export function to check if API is ready (non-blocking)
export function isApiReady() {
  return isInitialized && !!client.defaults.baseURL;
}

export async function setApiEnvironment(env) {
  await setEnvironment(env);
  const { baseURL } = await getCurrentApiConfig();
  BASE_URL = baseURL;
  client.defaults.baseURL = BASE_URL;
  console.log('[API] Environment switched. New BASE_URL:', BASE_URL);
}

export async function getApiEnvironment() {
  return await getEnvironment();
}

export const buildUrl = (path) => `${client?.defaults?.baseURL || BASE_URL || ''}${path}`;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    console.log('[API] BaseURL:', client.defaults.baseURL);
    console.log('[API] Request to:', config.url, 'Token exists:', !!token);
    console.log('[API] Request method:', config.method);
    console.log('[API] Request data:', config.data);
    
    if (token) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      };
      console.log('[API] Authorization header set');
      console.log('[API] Full headers:', config.headers);
    } else {
      console.log('[API] No token found for request');
    }
  } catch (error) {
    console.log('[API] token read error', error);
  }
  return config;
});

// Add response interceptor for debugging
client.interceptors.response.use(
  (response) => {
    console.log('[API] Response received:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log('[API] Response error:', error.response?.status, error.config?.url);
    console.log('[API] Error data:', error.response?.data);
    return Promise.reject(error);
  }
);

export default client;
