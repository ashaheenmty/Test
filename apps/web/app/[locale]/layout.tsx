import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { dir, LOCALES, SUPPORTED_LOCALES } from '@tb/i18n';
import { colors, themeStylesheet } from '@tb/ui';
import { BRAND, resolveLocale, settings, translator } from '@/lib/i18n';
import { getMe } from '@/lib/me';
import { THEME_COOKIE } from '@/lib/session';
import { logoutAction, setLanguageAction, setThemeAction } from './actions';
import '../globals.css';

// Every page depends on the visitor's session, language and theme cookies.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = translator(locale);
  return { title: { default: BRAND, template: `%s · ${BRAND}` }, description: t('onboarding.tagline') };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: colors.light.background },
    { media: '(prefers-color-scheme: dark)', color: colors.dark.background },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = translator(locale);
  const me = await getMe();
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  const path = (await headers()).get('x-pathname') ?? '/';
  const dataTheme = theme === 'light' || theme === 'dark' ? theme : undefined;

  return (
    <html lang={locale} dir={dir(locale)} data-theme={dataTheme}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStylesheet() }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          {t('common.skipToContent')}
        </a>
        <header className="site-header">
          <div className="container header-inner">
            <Link href={`/${locale}`} className="brand" aria-label={BRAND}>
              <span className="brand-mark" aria-hidden="true">⇄</span>
              {BRAND}
            </Link>
            <nav aria-label={t('nav.mainNavigation')} className="main-nav">
              <Link href={`/${locale}`} aria-current={path === '/' ? 'page' : undefined}>
                {t('nav.home')}
              </Link>
              <Link href={`/${locale}/bookings`} aria-current={path === '/bookings' ? 'page' : undefined}>
                {t('nav.bookings')}
              </Link>
              {me ? (
                <Link href={`/${locale}/profile`} aria-current={path === '/profile' ? 'page' : undefined}>
                  {t('nav.profile')}
                </Link>
              ) : (
                <Link href={`/${locale}/login`} className="button button-small">
                  {t('nav.signIn')}
                </Link>
              )}
            </nav>
            <form action={setLanguageAction} className="lang-switch">
              <input type="hidden" name="path" value={path} />
              <label className="visually-hidden" htmlFor="lang-select">
                {t('common.language')}
              </label>
              <select id="lang-select" name="target" defaultValue={locale}>
                {SUPPORTED_LOCALES.map((l) => (
                  <option key={l} value={l} lang={l}>
                    {LOCALES[l].nativeName}
                  </option>
                ))}
              </select>
              <button type="submit" className="button button-small button-quiet">
                {t('common.continue')}
              </button>
            </form>
          </div>
        </header>

        <main id="main" className="container" tabIndex={-1}>
          {children}
        </main>

        <footer className="site-footer">
          <div className="container">
            <p className="agent-disclosure">{t('legal.agentDisclosure', { company: settings.agentCompany.legalName })}</p>
            <nav aria-label={t('legal.impressum')} className="footer-links">
              <Link href={`/${locale}/legal/impressum`}>{t('legal.impressum')}</Link>
              <Link href={`/${locale}/legal/agent-terms`}>{t('legal.terms')}</Link>
              <Link href={`/${locale}/legal/privacy-policy`}>{t('legal.privacy')}</Link>
              <Link href={`/${locale}/legal/dispute-resolution-notice`}>{t('legal.disputeResolution')}</Link>
            </nav>
            <div className="footer-row">
              <form action={setThemeAction} className="theme-switch">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="path" value={path} />
                <fieldset>
                  <legend>{t('theme.label')}</legend>
                  {(['system', 'light', 'dark'] as const).map((v) => (
                    <button
                      key={v}
                      type="submit"
                      name="theme"
                      value={v}
                      className="chip"
                      aria-pressed={(dataTheme ?? 'system') === v}
                    >
                      {t(`theme.${v}`)}
                    </button>
                  ))}
                </fieldset>
              </form>
              {me ? (
                <form action={logoutAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit" className="button button-small button-quiet">
                    {t('nav.signOut')}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
