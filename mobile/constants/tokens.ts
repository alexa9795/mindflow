/**
 * Design tokens — shared spacing, radius, and elevation scales.
 * Presentation layer only; import these instead of hardcoding magic numbers
 * so spacing stays consistent across screens.
 */

/** Base-4 spacing scale. */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Corner radius scale. */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

/** Cross-platform elevation presets (iOS shadow + Android elevation). */
export const ELEVATION = {
  /** Subtle lift for cards. */
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  /** Pronounced lift for floating elements (FAB, modals). */
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

/** Standard motion timing (ms) for entrance/press animations. */
export const DURATION = {
  fast: 120,
  base: 220,
  slow: 360,
} as const;
