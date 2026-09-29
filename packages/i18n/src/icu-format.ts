import { IntlMessageFormat } from 'intl-messageformat';
import type { i18n as I18nInstance } from 'i18next';

/**
 * Minimal i18next "i18nFormat" plugin that formats messages with ICU MessageFormat.
 *
 * Replaces i18next-icu, whose ESM build default-imports the CommonJS entry of
 * intl-messageformat and therefore silently falls back to raw strings when loaded
 * by Node's native module loader (Next.js server externals, Vitest). Using the named
 * export works in every runtime (Node, Next.js, Metro/React Native).
 */
export class IcuFormat {
  static readonly type = 'i18nFormat' as const;
  readonly type = 'i18nFormat' as const;
  private cache = new Map<string, IntlMessageFormat>();
  private intlLocale: (lng: string) => string = (l) => l;

  constructor(opts: { intlLocale?: (lng: string) => string } = {}) {
    if (opts.intlLocale) this.intlLocale = opts.intlLocale;
  }

  init(i18next: I18nInstance) {
    i18next.on('languageChanged', () => this.cache.clear());
  }

  parse(res: string, options: Record<string, unknown>, lng: string, ns: string, key: string): string {
    const cacheKey = `${lng}\u0000${ns}\u0000${key}\u0000${res}`;
    let fmt = this.cache.get(cacheKey);
    try {
      if (!fmt) {
        fmt = new IntlMessageFormat(res, this.intlLocale(lng), undefined, { ignoreTag: true });
        this.cache.set(cacheKey, fmt);
      }
      return String(fmt.format(options as Record<string, string | number>));
    } catch {
      // A missing variable or malformed message must never break a page; show the raw text.
      return res;
    }
  }

  addLookupKeys(finalKeys: string[]) {
    return finalKeys;
  }
}
