export const FONTS = {
  /** Formal / editorial — Playfair Display */
  formal: 'PlayfairDisplay_400Regular',
  /** Handwriting feel — Caveat */
  handwriting: 'Caveat_400Regular',
  /** Clean modern UI — Inter (default UI font) */
  modern: 'Inter_400Regular',
  /** Warm readable serif — Roboto Serif (default entry body font) */
  robotoSerif: 'RobotoSerif_400Regular',
} as const;

export type FontKey = keyof typeof FONTS;

/** Font shown in the UI chrome (header, labels, buttons). */
export const DEFAULT_UI_FONT: FontKey = 'modern';

/** Font used for journal entry body text. */
export const DEFAULT_ENTRY_FONT: FontKey = 'robotoSerif';

export const FONT_STORAGE_KEY = 'echo_font';

export const FONT_OPTIONS: { key: FontKey; label: string }[] = [
  { key: 'modern',      label: 'Modern'      },
  { key: 'robotoSerif', label: 'Serif'        },
  { key: 'formal',      label: 'Formal'       },
  { key: 'handwriting', label: 'Handwriting'  },
];

/**
 * Per-font size multiplier for entry body text. Caveat (handwriting) has a
 * much smaller apparent x-height than the other fonts at the same point
 * size, so it needs to be scaled up to read as the same size.
 */
export const FONT_SIZE_SCALE: Record<FontKey, number> = {
  modern: 1,
  robotoSerif: 1,
  formal: 1,
  handwriting: 1.3,
};

/** Scales a base point size by the active entry font's size multiplier. */
export function scaledFontSize(key: FontKey, base: number): number {
  return Math.round(base * FONT_SIZE_SCALE[key]);
}
