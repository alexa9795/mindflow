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
