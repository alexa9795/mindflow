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
  mood: {
    1: '#E06C75',
    2: '#E0A45E',
    3: '#D6C77E',
    4: '#8FBF8A',
    5: '#6FB89A',
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
  mood: {
    1: '#C26A5C',
    2: '#CF9355',
    3: '#C9A94E',
    4: '#7FA86A',
    5: '#5E8C6A',
  },
};

export const THEMES: Record<string, Theme> = {
  softDark,
  warmNeutral,
};

export const DEFAULT_THEME_ID = 'warmNeutral';

export const THEME_STORAGE_KEY = 'echo_theme';
