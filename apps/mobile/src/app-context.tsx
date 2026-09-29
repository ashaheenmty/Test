import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nManager, Platform, useColorScheme } from 'react-native';
import type { MeResponse, ThemePreference } from '@tb/domain';
import { createI18n, isRtl, isSupportedLocale, matchLocale, type SupportedLocale } from '@tb/i18n';
import { colors, type ColorTokens } from '@tb/ui';
import { api, hasSession } from './api';
import { storage } from './storage';

export const BRAND = process.env.EXPO_PUBLIC_BRAND_NAME ?? 'Umsteiger';
const LOCALE_KEY = 'tb.locale';
const THEME_KEY = 'tb.theme';

interface AppState {
  ready: boolean;
  locale: SupportedLocale;
  onboarded: boolean;
  t: (key: string, vars?: Record<string, unknown>) => string;
  c: ColorTokens;
  theme: ThemePreference;
  me: MeResponse | null;
  setLocale: (l: SupportedLocale) => Promise<void>;
  setTheme: (t: ThemePreference) => Promise<void>;
  refreshMe: () => Promise<void>;
  setMe: (me: MeResponse | null) => void;
}

const Ctx = createContext<AppState | null>(null);

/**
 * Right-to-left layout is a process-wide native setting in React Native: switching
 * between Arabic and an LTR language requires a reload of the JS bundle.
 */
async function applyDirection(locale: SupportedLocale) {
  const rtl = isRtl(locale);
  if (Platform.OS === 'web') {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    return;
  }
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    await Updates.reloadAsync().catch(() => undefined);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState<SupportedLocale>('de');
  const [onboarded, setOnboarded] = useState(false);
  const [theme, setThemeState] = useState<ThemePreference>('SYSTEM');
  const [me, setMe] = useState<MeResponse | null>(null);

  const refreshMe = useCallback(async () => {
    if (!(await hasSession())) return setMe(null);
    try {
      setMe(await api.me());
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await storage.get(LOCALE_KEY);
      const initial = isSupportedLocale(stored) ? stored : matchLocale(getLocales().map((l) => l.languageTag));
      setLocaleState(initial);
      setOnboarded(Boolean(stored));
      const th = await storage.get(THEME_KEY);
      if (th === 'LIGHT' || th === 'DARK' || th === 'SYSTEM') setThemeState(th);
      await applyDirection(initial);
      await refreshMe();
      setReady(true);
    })();
  }, [refreshMe]);

  const setLocale = useCallback(async (l: SupportedLocale) => {
    await storage.set(LOCALE_KEY, l);
    setOnboarded(true);
    setLocaleState(l);
    await api.updateMe({ locale: l }).catch(() => undefined);
    await applyDirection(l);
  }, []);

  const setTheme = useCallback(async (value: ThemePreference) => {
    await storage.set(THEME_KEY, value);
    setThemeState(value);
    await api.updateMe({ theme: value }).catch(() => undefined);
  }, []);

  const value = useMemo<AppState>(() => {
    const i18n = createI18n(locale, { defaultVariables: { brand: BRAND } });
    const scheme = theme === 'SYSTEM' ? (system === 'dark' ? 'dark' : 'light') : theme === 'DARK' ? 'dark' : 'light';
    return {
      ready,
      locale,
      onboarded,
      t: (key, vars) => i18n.t(key, vars as Record<string, string>),
      c: colors[scheme],
      theme,
      me,
      setLocale,
      setTheme,
      refreshMe,
      setMe,
    };
  }, [ready, locale, onboarded, theme, system, me, setLocale, setTheme, refreshMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
