/**
 * Capacitor Module Exports
 *
 * Native iOS/Android capabilities for Golf Ryder Cup App.
 */

export {
  nativeBridge,
  useNative,
  getNativeInfo,
  isNative,
  isPluginAvailable,
  type NativeInfo,
  type HapticImpactStyle,
  type HapticNotificationType,
  type PushNotificationHandler,
} from './nativeBridge';

export {
  useCapacitorInit,
  useCapacitorPush,
} from './useCapacitorInit';

// Re-export Capacitor core for direct access if needed
export { Capacitor } from '@capacitor/core';
