import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

const { ScreenPinning } = NativeModules;
const emitter = ScreenPinning && new NativeEventEmitter(ScreenPinning);

const isSupported = Platform.OS === 'android';

const start = async () => {
  if (!isSupported || !ScreenPinning?.start) return false;
  try {
    await ScreenPinning.start();
    return true;
  } catch (e) {
    return false;
  }
};

const stop = async () => {
  if (!isSupported || !ScreenPinning?.stop) return false;
  try {
    await ScreenPinning.stop();
    return true;
  } catch (e) {
    return false;
  }
};

const ensure = async (retries = 2, delayMs = 300) => {
  if (!isSupported || !ScreenPinning?.ensure) return false;
  for (let i = 0; i <= retries; i++) {
    try {
      const ok = await ScreenPinning.ensure();
      if (ok) return true;
    } catch {}
    if (i < retries) await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
};

const isPinned = async () => {
  if (!isSupported || !ScreenPinning?.isPinned) return false;
  try {
    return await ScreenPinning.isPinned();
  } catch {
    return false;
  }
};

const openSecuritySettings = async () => {
  if (!isSupported || !ScreenPinning?.openSecuritySettings) return false;
  try {
    await ScreenPinning.openSecuritySettings();
    return true;
  } catch {
    return false;
  }
};

const showCustomPinningOverlay = async () => {
  if (!isSupported || !ScreenPinning?.showCustomPinningOverlay) return false;
  try {
    await ScreenPinning.showCustomPinningOverlay();
    return true;
  } catch (e) {
    return false;
  }
};

const hideCustomPinningOverlay = async () => {
  if (!isSupported || !ScreenPinning?.hideCustomPinningOverlay) return false;
  try {
    await ScreenPinning.hideCustomPinningOverlay();
    return true;
  } catch (e) {
    return false;
  }
};

const startSystemOverlayMonitor = async () => {
  if (!isSupported || !ScreenPinning?.startSystemOverlayMonitor) return false;
  try {
    await ScreenPinning.startSystemOverlayMonitor();
    return true;
  } catch (e) {
    return false;
  }
};

const stopSystemOverlayMonitor = async () => {
  if (!isSupported || !ScreenPinning?.stopSystemOverlayMonitor) return false;
  try {
    await ScreenPinning.stopSystemOverlayMonitor();
    return true;
  } catch (e) {
    return false;
  }
};

const dismissSystemOverlay = async () => {
  if (!isSupported || !ScreenPinning?.dismissSystemOverlay) return false;
  try {
    await ScreenPinning.dismissSystemOverlay();
    return true;
  } catch (e) {
    return false;
  }
};

const enableSecureFlag = async () => {
  if (!isSupported || !ScreenPinning?.enableSecureFlag) return false;
  try {
    await ScreenPinning.enableSecureFlag();
    return true;
  } catch (e) {
    return false;
  }
};

const disableSecureFlag = async () => {
  if (!isSupported || !ScreenPinning?.disableSecureFlag) return false;
  try {
    await ScreenPinning.disableSecureFlag();
    return true;
  } catch (e) {
    return false;
  }
};

export default { start, stop, ensure, isPinned, isSupported, openSecuritySettings, showCustomPinningOverlay, hideCustomPinningOverlay, startSystemOverlayMonitor, stopSystemOverlayMonitor, dismissSystemOverlay, enableSecureFlag, disableSecureFlag };

export const subscribePinState = (handler) => {
  if (!isSupported || !emitter) return { remove: () => {} };
  const sub = emitter.addListener('ScreenPinningState', (event) => {
    handler?.(!!event?.pinned);
  });
  return sub;
};

export const subscribeCustomOverlayAction = (handler) => {
  if (!isSupported || !emitter) return { remove: () => {} };
  const sub = emitter.addListener('CustomOverlayAction', (event) => {
    handler?.(event?.action);
  });
  return sub;
};

export const subscribeSystemOverlayAction = (handler) => {
  if (!isSupported || !emitter) return { remove: () => {} };
  const sub = emitter.addListener('SystemOverlayAction', (event) => {
    handler?.(event?.action);
  });
  return sub;
};



