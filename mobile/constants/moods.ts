export type MoodLevel = 'very_bad' | 'bad' | 'neutral' | 'good' | 'great';

export interface MoodOption {
  level: MoodLevel;
  score: number; // 1–5 matching backend mood_score
  /** i18next key (moods.*) — resolve with t(mood.labelKey), not shown raw. */
  labelKey: string;
}

export interface MoodSet {
  id: string;
  name: string;
  moods: MoodOption[];
}

const MOOD_LABEL_KEYS: Record<MoodLevel, string> = {
  very_bad: 'moods.rough',
  bad: 'moods.low',
  neutral: 'moods.okay',
  good: 'moods.good',
  great: 'moods.great',
};

const MOOD_LEVELS: [MoodLevel, number][] = [
  ['very_bad', 1],
  ['bad', 2],
  ['neutral', 3],
  ['good', 4],
  ['great', 5],
];

function makeMoods(): MoodOption[] {
  return MOOD_LEVELS.map(([level, score]) => ({ level, score, labelKey: MOOD_LABEL_KEYS[level] }));
}

export const basicSet: MoodSet = {
  id: 'basic',
  name: 'Basic',
  moods: makeMoods(),
};

export const expressiveSet: MoodSet = {
  id: 'expressive',
  name: 'Expressive',
  moods: makeMoods(),
};

export const weatherSet: MoodSet = {
  id: 'weather',
  name: 'Weather',
  moods: makeMoods(),
};

export const MOOD_EMOJIS: Record<string, string[]> = {
  basic:      ['😔', '😕', '😐', '🙂', '😄'],
  expressive: ['😭', '🫤', '😌', '😁', '🥳'],
  weather:    ['⛈️', '☁️', '🌦️', '🌤️', '☀️'],
};

export const MOOD_SETS: Record<string, MoodSet> = {
  basic:      basicSet,
  expressive: expressiveSet,
  weather:    weatherSet,
};

export const DEFAULT_MOOD_SET_ID = 'basic';
export const MOOD_SET_STORAGE_KEY = 'mindflow_mood_set';
