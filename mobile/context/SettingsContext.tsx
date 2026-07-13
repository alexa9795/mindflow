import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  DEFAULT_ENTRY_FONT,
  FONT_STORAGE_KEY,
  FontKey,
} from '../constants/fonts';
import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_STORAGE_KEY } from '../constants/locales';
import { DEFAULT_MOOD_SET_ID, MOOD_SET_STORAGE_KEY } from '../constants/moods';
import {
  DEFAULT_THEME_ID,
  SYSTEM_DARK_THEME_ID,
  SYSTEM_LIGHT_THEME_ID,
  SYSTEM_THEME_ID,
  Theme,
  THEME_STORAGE_KEY,
  THEMES,
} from '../constants/themes';
import i18n from '../i18n';

interface SettingsContextType {
  theme: Theme;
  /** Raw selection: a theme id, or SYSTEM_THEME_ID to follow the OS appearance. */
  themeMode: string;
  setThemeById: (id: string) => Promise<void>;
  entryFont: FontKey;
  setEntryFont: (key: FontKey) => Promise<void>;
  moodSetId: string;
  setMoodSetId: (id: string) => Promise<void>;
  locale: string;
  setLocale: (code: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<string>(DEFAULT_THEME_ID);
  const [entryFont, setEntryFontState] = useState<FontKey>(DEFAULT_ENTRY_FONT);
  const [moodSetId, setMoodSetIdState] = useState(DEFAULT_MOOD_SET_ID);
  const [locale, setLocaleState] = useState(i18n.language || DEFAULT_LOCALE);
  const systemScheme = useColorScheme();

  // Load persisted settings on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(FONT_STORAGE_KEY),
      AsyncStorage.getItem(MOOD_SET_STORAGE_KEY),
      AsyncStorage.getItem(LOCALE_STORAGE_KEY),
    ]).then(([savedTheme, savedFont, savedMoodSet, savedLocale]) => {
      if (savedTheme && (savedTheme === SYSTEM_THEME_ID || THEMES[savedTheme])) setThemeMode(savedTheme);
      if (savedFont) setEntryFontState(savedFont as FontKey);
      if (savedMoodSet) setMoodSetIdState(savedMoodSet);
      if (isSupportedLocale(savedLocale) && savedLocale !== i18n.language) {
        setLocaleState(savedLocale);
        void i18n.changeLanguage(savedLocale);
      }
    }).catch((e) => console.error('Failed to load settings:', e));
  }, []);

  const theme =
    themeMode === SYSTEM_THEME_ID
      ? THEMES[systemScheme === 'dark' ? SYSTEM_DARK_THEME_ID : SYSTEM_LIGHT_THEME_ID]
      : THEMES[themeMode] ?? THEMES[DEFAULT_THEME_ID];

  const setThemeById = useCallback(async (id: string) => {
    if (id !== SYSTEM_THEME_ID && !THEMES[id]) return;
    setThemeMode(id);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, id).catch((e) => console.error('Failed to save theme:', e));
  }, []);

  const setEntryFont = useCallback(async (key: FontKey) => {
    setEntryFontState(key);
    await AsyncStorage.setItem(FONT_STORAGE_KEY, key).catch((e) => console.error('Failed to save font:', e));
  }, []);

  const setMoodSetId = useCallback(async (id: string) => {
    setMoodSetIdState(id);
    await AsyncStorage.setItem(MOOD_SET_STORAGE_KEY, id).catch((e) => console.error('Failed to save mood set:', e));
  }, []);

  const setLocale = useCallback(async (code: string) => {
    if (!isSupportedLocale(code)) return;
    setLocaleState(code);
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, code).catch((e) => console.error('Failed to save locale:', e));
  }, []);

  return (
    <SettingsContext.Provider
      value={{ theme, themeMode, setThemeById, entryFont, setEntryFont, moodSetId, setMoodSetId, locale, setLocale }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
