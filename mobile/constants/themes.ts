/** Five-step mood ramp, indexed by mood_score 1–5 (rough → great). */
export interface MoodRamp {
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
}

export interface Theme {
  id: string;
  name: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  /** Softer accent for inactive/secondary interactive states. */
  accentMuted: string;
  border: string;
  /** Destructive action colour (delete, sign out) */
  destructive: string;
  /** Positive / streak / improvement colour. */
  success: string;
  /** Per-mood colours used for chips, accent strips, charts. */
  mood: MoodRamp;
  /** Whether status bar / system chrome should render light-on-dark content. */
  isDark: boolean;
}

export const softDark: Theme = {
  id: 'softDark',
  name: 'Night',
  background: '#141414',
  surface: '#1F1F1F',
  text: '#EDEDED',
  textSecondary: '#9A9A9A',
  accent: '#C9B79C',
  accentMuted: '#6E6256',
  border: '#2E2E2E',
  destructive: '#F87171',
  success: '#7FB89A',
  isDark: true,
  mood: {
    1: '#FF5C66',
    2: '#FF9F40',
    3: '#F2D03D',
    4: '#5FDD7E',
    5: '#2EE6B8',
  },
};

export const warmNeutral: Theme = {
  id: 'warmNeutral',
  name: 'Warm',
  background: '#EDE8E0',
  surface: '#F5F1EC',
  text: '#2C2418',
  textSecondary: '#7A6F63',
  accent: '#A65A3A',
  accentMuted: '#C9B7A4',
  border: '#D6CFC4',
  destructive: '#C0392B',
  success: '#5E8C6A',
  isDark: false,
  mood: {
    1: '#E14B3F',
    2: '#F08A24',
    3: '#E0B400',
    4: '#4FA84A',
    5: '#1FA37E',
  },
};

export const THEMES: Record<string, Theme> = {
  softDark,
  warmNeutral,
};

export const DEFAULT_THEME_ID = 'warmNeutral';

export const THEME_STORAGE_KEY = 'echo_theme';

/** Pseudo-theme id: follow the OS light/dark setting instead of a fixed theme. */
export const SYSTEM_THEME_ID = 'system';

/** Theme used when system scheme resolves to light. */
export const SYSTEM_LIGHT_THEME_ID = 'warmNeutral';

/** Theme used when system scheme resolves to dark. */
export const SYSTEM_DARK_THEME_ID = 'softDark';
