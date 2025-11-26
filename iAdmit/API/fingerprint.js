import client, { buildUrl } from './client';

/**
 * Get fingerprint registration status
 */
export async function getFingerprintStatus() {
  console.log('[Fingerprint] Getting fingerprint status');
  try {
    const url = buildUrl('/mobile/user/fingerprint');
    console.log('[Fingerprint] GET', url);
    const response = await client.get(url);
    console.log('[Fingerprint] Status response:', response.data);
    return response.data;
  } catch (error) {
    console.log('[Fingerprint] Get status error:', error?.response?.data || error?.message);
    throw error;
  }
}

/**
 * Register fingerprint/biometric data
 */
export async function registerFingerprint(fingerprintData) {
  console.log('[Fingerprint] Registering fingerprint');
  try {
    const url = buildUrl('/mobile/user/fingerprint');
    console.log('[Fingerprint] POST', url);
    const response = await client.post(url, {
      fingerprint_data: fingerprintData
    });
    console.log('[Fingerprint] Registration response:', response.data);
    return response.data;
  } catch (error) {
    console.log('[Fingerprint] Registration error:', error?.response?.data || error?.message);
    throw error;
  }
}

/**
 * Delete/Remove fingerprint registration
 */
export async function deleteFingerprint() {
  console.log('[Fingerprint] Deleting fingerprint');
  try {
    const url = buildUrl('/mobile/user/fingerprint');
    console.log('[Fingerprint] DELETE', url);
    const response = await client.delete(url);
    console.log('[Fingerprint] Deletion response:', response.data);
    return response.data;
  } catch (error) {
    console.log('[Fingerprint] Deletion error:', error?.response?.data || error?.message);
    throw error;
  }
}

/**
 * Login using fingerprint
 * Creates a signature and authenticates the user
 */
export async function loginWithFingerprint(publicKey, signature, deviceId) {
  console.log('[Fingerprint] Attempting fingerprint login');
  try {
    const url = buildUrl('/mobile/login/fingerprint');
    console.log('[Fingerprint] POST', url);
    const response = await client.post(url, {
      public_key: publicKey,
      signature: signature,
      device_id: deviceId
    });
    console.log('[Fingerprint] Login response:', response.data);
    return response.data;
  } catch (error) {
    console.log('[Fingerprint] Login error:', error?.response?.data || error?.message);
    throw error;
  }
}

