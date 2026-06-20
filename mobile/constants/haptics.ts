import * as Haptics from 'expo-haptics';

/**
 * Thin wrappers around expo-haptics. Each is fire-and-forget and never throws —
 * haptics are a non-critical enhancement, so failures (e.g. unsupported device)
 * are swallowed silently.
 */

/** Light tap — selection changes (mood pick, toggle). */
export function tapLight(): void {
  Haptics.selectionAsync().catch(() => {});
}

/** Medium tap — primary button presses (send reply). */
export function tapMedium(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Success notification — entry saved, streak milestone. */
export function notifySuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
