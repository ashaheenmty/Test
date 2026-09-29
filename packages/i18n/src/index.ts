import i18next, { type i18n as I18nInstance, type TFunction } from 'i18next';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@tb/domain';
import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import ru from './locales/ru.json';
import zhHans from './locales/zh-Hans.json';
import { IcuFormat } from './icu-format';

export { SUPPORTED_LOCALES, type SupportedLocale };
export const DEFAULT_LOCALE: SupportedLocale = 'de';

export type Messages = typeof de;

export const resources: Record<SupportedLocale, Messages> = {
  de,
  en,
  fr,
  ar,
  es,
  ru,
  'zh-Hans': zhHans,
};

export interface LocaleMeta {
  code: SupportedLocale;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  /**
   * Locale passed to Intl.* formatters. Arabic uses Latin digits by default so that
   * train numbers, platforms and times match station displays.
   * OPEN DECISION: switch to 'ar' for Arabic-Indic digits if preferred.
   */
  intlLocale: string;
}

export const LOCALES: Record<SupportedLocale, LocaleMeta> = {
  de: { code: 'de', nativeName: 'Deutsch', dir: 'ltr', intlLocale: 'de-DE' },
  en: { code: 'en', nativeName: 'English', dir: 'ltr', intlLocale: 'en-GB' },
  fr: { code: 'fr', nativeName: 'Français', dir: 'ltr', intlLocale: 'fr-FR' },
  ar: { code: 'ar', nativeName: 'العربية', dir: 'rtl', intlLocale: 'ar-u-nu-latn' },
  es: { code: 'es', nativeName: 'Español', dir: 'ltr', intlLocale: 'es-ES' },
  ru: { code: 'ru', nativeName: 'Русский', dir: 'ltr', intlLocale: 'ru-RU' },
  'zh-Hans': { code: 'zh-Hans', nativeName: '简体中文', dir: 'ltr', intlLocale: 'zh-Hans-CN' },
};

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isRtl(locale: SupportedLocale): boolean {
  return LOCALES[locale].dir === 'rtl';
}

export function dir(locale: SupportedLocale): 'ltr' | 'rtl' {
  return LOCALES[locale].dir;
}

/**
 * Picks the best supported locale for an Accept-Language header or a list of
 * device locales (e.g. from expo-localization). Falls back to German.
 */
export function matchLocale(input: string | readonly string[] | null | undefined): SupportedLocale {
  const candidates = Array.isArray(input)
    ? input
    : String(input ?? '')
        .split(',')
        .map((part) => {
          const [tag, q] = part.trim().split(';q=');
          return { tag: tag ?? '', q: q ? Number(q) : 1 };
        })
        .filter((c) => c.tag)
        .sort((a, b) => b.q - a.q)
        .map((c) => c.tag);

  for (const raw of candidates) {
    const tag = raw.toLowerCase();
    if (tag.startsWith('zh')) {
      // Traditional-script regions are not supported yet; Simplified is the closest match.
      return 'zh-Hans';
    }
    const base = tag.split('-')[0];
    const hit = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === base);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}

/** Creates an isolated, synchronously-initialised i18next instance with ICU support. */
export function createI18n(
  locale: SupportedLocale,
  opts: { overrides?: Partial<Record<SupportedLocale, unknown>>; defaultVariables?: Record<string, string> } = {},
): I18nInstance {
  const instance = i18next.createInstance();
  const res = Object.fromEntries(
    SUPPORTED_LOCALES.map((l) => [
      l,
      { translation: opts.overrides?.[l] ? deepMerge(resources[l], opts.overrides[l]) : resources[l] },
    ]),
  );
  void instance.use(new IcuFormat({ intlLocale: (l) => (isSupportedLocale(l) ? LOCALES[l].intlLocale : l) })).init({
    resources: res,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    initAsync: false,
    returnNull: false,
    showSupportNotice: false,
    interpolation: { escapeValue: false, defaultVariables: opts.defaultVariables },
  });
  return instance;
}

const fixedCache = new Map<string, TFunction>();

/** Convenience translator for server-side use (emails, PDFs, server components). */
export function getT(locale: SupportedLocale, defaultVariables: Record<string, string> = {}): TFunction {
  const key = `${locale}:${JSON.stringify(defaultVariables)}`;
  let t = fixedCache.get(key);
  if (!t) {
    t = createI18n(locale, { defaultVariables }).t;
    fixedCache.set(key, t);
  }
  return t;
}

export function formatDate(
  date: Date | string,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  timeZone = 'Europe/Berlin',
): string {
  return new Intl.DateTimeFormat(LOCALES[locale].intlLocale, { timeZone, ...options }).format(
    typeof date === 'string' ? new Date(date) : date,
  );
}

export function formatTime(date: Date | string, locale: SupportedLocale, timeZone = 'Europe/Berlin'): string {
  return formatDate(date, locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, timeZone);
}

export function formatNumber(value: number, locale: SupportedLocale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALES[locale].intlLocale, options).format(value);
}

export function formatCurrency(amountMinor: number, currency: string, locale: SupportedLocale): string {
  return formatNumber(amountMinor / 100, locale, { style: 'currency', currency });
}

/** Flattens nested messages to dot-notation keys (used by tests and the admin translation editor). */
export function flattenMessages(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') out[key] = v;
      else Object.assign(out, flattenMessages(v, key));
    }
  }
  return out;
}

function deepMerge<T>(base: T, override: unknown): T {
  if (!override || typeof override !== 'object') return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = v && typeof v === 'object' && b && typeof b === 'object' ? deepMerge(b, v) : v;
  }
  return out as T;
}
