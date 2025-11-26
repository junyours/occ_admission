import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG as PROD } from './config.prod';
import { API_CONFIG as LOCAL } from './config.local';

const STORAGE_KEY = 'api_environment'; // 'production' | 'local'

export async function getEnvironment() {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === 'local' ? 'local' : 'production';
  } catch (e) {
    console.log('[Env] getEnvironment failed, defaulting to production', e?.message);
    return 'production';
  }
}

export async function setEnvironment(env) {
  try {
    const normalized = env === 'local' ? 'local' : 'production';
    await AsyncStorage.setItem(STORAGE_KEY, normalized);
    console.log('[Env] Environment set to', normalized);
  } catch (e) {
    console.log('[Env] setEnvironment failed', e?.message);
  }
}

function buildBaseUrlFromProd() {
  const base = (PROD.baseURL || '').replace(/\/$/, '');
  const prefix = (PROD.apiPrefix || '').startsWith('/') ? PROD.apiPrefix : `/${PROD.apiPrefix || ''}`;
  return `${base}${prefix}`;
}

function buildBaseUrlFromLocal() {
  const host = LOCAL.defaultHost || 'http://127.0.0.1:8000';
  const base = host.replace(/\/$/, '');
  const prefix = (LOCAL.apiPrefix || '').startsWith('/') ? LOCAL.apiPrefix : `/${LOCAL.apiPrefix || ''}`;
  return `${base}${prefix}`;
}

export async function getCurrentApiConfig() {
  const env = await getEnvironment();
  const baseURL = env === 'local' ? buildBaseUrlFromLocal() : buildBaseUrlFromProd();
  return { env, baseURL };
}

export async function getBaseUrlSyncFallback() {
  // Best-effort sync fallback used during client initialization; defaults to production
  const base = (PROD.baseURL || '').replace(/\/$/, '');
  const prefix = (PROD.apiPrefix || '').startsWith('/') ? PROD.apiPrefix : `/${PROD.apiPrefix || ''}`;
  return `${base}${prefix}`;
}


