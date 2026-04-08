import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_ENTRY_FONT,
  FONT_STORAGE_KEY,
  FontKey,
} from '../constants/fonts';
import { DEFAULT_MOOD_SET_ID, MOOD_SET_STORAGE_KEY } from '../constants/moods';
import { DEFAULT_THEME_ID, Theme, THEME_STORAGE_KEY, THEMES } from '../constants/themes';

interface SettingsContextType {
  theme: Theme;
  setThemeById: (id: string) => Promise<void>;
  entryFont: FontKey;
  setEntryFont: (key: FontKey) => Promise<void>;
  moodSetId: string;
  setMoodSetId: (id: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(THEMES[DEFAULT_THEME_ID]);
  const [entryFont, setEntryFontState] = useState<FontKey>(DEFAULT_ENTRY_FONT);
  const [moodSetId, setMoodSetIdState] = useState(DEFAULT_MOOD_SET_ID);

  // Load persisted settings on mount
  useEffect(() => {
    void (async () => {
      const [savedTheme, savedFont, savedMoodSet] = await Promise.all([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        AsyncStorage.getItem(FONT_STORAGE_KEY),
        AsyncStorage.getItem(MOOD_SET_STORAGE_KEY),
      ]);
      if (savedTheme && THEMES[savedTheme]) setTheme(THEMES[savedTheme]);
      if (savedFont) setEntryFontState(savedFont as FontKey);
      if (savedMoodSet) setMoodSetIdState(savedMoodSet);
    })();
  }, []);

  const setThemeById = useCallback(async (id: string) => {
    if (!THEMES[id]) return;
    setTheme(THEMES[id]);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
  }, []);

  const setEntryFont = useCallback(async (key: FontKey) => {
    setEntryFontState(key);
    await AsyncStorage.setItem(FONT_STORAGE_KEY, key);
  }, []);

  const setMoodSetId = useCallback(async (id: string) => {
    setMoodSetIdState(id);
    await AsyncStorage.setItem(MOOD_SET_STORAGE_KEY, id);
  }, []);

  return (
    <SettingsContext.Provider
      value={{ theme, setThemeById, entryFont, setEntryFont, moodSetId, setMoodSetId }}
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
