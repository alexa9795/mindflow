export interface SupportedLocale {
  code: string;
  /** English name, used only for the ⚪ nice-to-have native-review notes / logs. */
  label: string;
  /** Name shown in the language picker, in that language itself. */
  nativeLabel: string;
  /** BCP 47 tag passed to Intl-backed calls like toLocaleDateString. */
  bcp47: string;
}

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', bcp47: 'en-US' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', bcp47: 'fr-FR' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', bcp47: 'es-ES' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', bcp47: 'de-DE' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', bcp47: 'it-IT' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', bcp47: 'pt-PT' },
];

export const DEFAULT_LOCALE = 'en';
export const LOCALE_STORAGE_KEY = 'mindflow_locale';

const LOCALE_CODES = new Set(SUPPORTED_LOCALES.map((l) => l.code));

export function isSupportedLocale(code: string | null | undefined): code is string {
  return !!code && LOCALE_CODES.has(code);
}

export function bcp47ForLocale(code: string): string {
  return SUPPORTED_LOCALES.find((l) => l.code === code)?.bcp47 ?? 'en-US';
}
