import 'server-only';
import { loadSettings } from '@tb/config';
import { getT, isSupportedLocale, DEFAULT_LOCALE, type SupportedLocale } from '@tb/i18n';
import { notFound } from 'next/navigation';

export const settings = loadSettings();
export const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? settings.brand.name;

export function resolveLocale(value: string): SupportedLocale {
  if (!isSupportedLocale(value)) notFound();
  return value;
}

export function translator(locale: SupportedLocale) {
  return getT(locale, { brand: BRAND });
}

/** Maps API error codes (e.g. "auth.invalidCredentials") to a translated message. */
export function errorMessage(locale: SupportedLocale, code: string | undefined): string | null {
  if (!code) return null;
  const t = translator(locale);
  const special: Record<string, string> = {
    'validation.failed': 'common.errorGeneric',
    'legal.outdatedVersion': 'common.errorGeneric',
    'auth.invalidOrExpiredLink': 'common.errorGeneric',
  };
  const key = special[code] ?? code;
  const msg = t(key);
  return msg === key ? t('common.errorGeneric') : msg;
}

export { DEFAULT_LOCALE, type SupportedLocale };
