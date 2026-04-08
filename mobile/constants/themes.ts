export interface Theme {
  id: string;
  name: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  border: string;
  /** Destructive action colour (delete, sign out) */
  destructive: string;
}

export const softDark: Theme = {
  id: 'softDark',
  name: 'Night',
  background: '#141414',
  surface: '#1F1F1F',
  text: '#EDEDED',
  textSecondary: '#9A9A9A',
  accent: '#EDEDED',
  border: '#2E2E2E',
  destructive: '#F87171',
};

export const warmNeutral: Theme = {
  id: 'warmNeutral',
  name: 'Warm',
  background: '#EDE8E0',
  surface: '#F5F1EC',
  text: '#2C2418',
  textSecondary: '#7A6F63',
  accent: '#5C4A32',
  border: '#D6CFC4',
  destructive: '#C0392B',
};

export const THEMES: Record<string, Theme> = {
  softDark,
  warmNeutral,
};

export const DEFAULT_THEME_ID = 'warmNeutral';

export const THEME_STORAGE_KEY = 'mindflow_theme';
