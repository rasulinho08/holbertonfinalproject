import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics are a no-op on web and must never throw — a failed vibration should
 * not break a button press.
 */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(fn: () => Promise<unknown>) {
  if (!enabled) return;
  fn().catch(() => {});
}

/** Light tap — buttons, chips, tab switches. */
export const tap = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** Medium — committing an action (add to shelf, add to cart). */
export const bump = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

export const success = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const warn = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

export const fail = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));

/** Selection tick — sliders, steppers, segmented controls. */
export const select = () => safe(() => Haptics.selectionAsync());
