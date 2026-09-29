import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, Feedback, Field, first, type SearchParams } from '@/components/ui';
import { resolveLocale, translator } from '@/lib/i18n';
import { loginAction } from '../actions';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: translator(resolveLocale((await params).locale))('auth.signInTitle') };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = translator(locale);
  return (
    <div className="narrow stack">
      <h1>{t('auth.signInTitle')}</h1>
      <Feedback locale={locale} searchParams={sp} />
      <Card as="div">
        <form action={loginAction} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={first(sp.next) ?? ''} />
          <Field id="email" label={t('auth.email')}>
            <input id="email" name="email" type="email" autoComplete="email" required defaultValue={first(sp.email)} />
          </Field>
          <Field id="password" label={t('auth.password')}>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <button type="submit" className="button button-primary button-block">
            {t('auth.submitSignIn')}
          </button>
        </form>
        <p>
          <Link href={`/${locale}/forgot-password`}>{t('auth.forgotPassword')}</Link>
        </p>
        <div className="divider">
          <span>{t('auth.or')}</span>
        </div>
        {/* Native Apple/Google sign-in lives in the mobile app; web SDK integration needs client IDs (see open decisions). */}
        <div className="stack-sm">
          <button type="button" className="button button-block" disabled>
            {t('auth.continueWithApple')}
          </button>
          <button type="button" className="button button-block" disabled>
            {t('auth.continueWithGoogle')}
          </button>
        </div>
      </Card>
      <p>
        {t('auth.noAccount')} <Link href={`/${locale}/register`}>{t('auth.registerTitle')}</Link>
      </p>
    </div>
  );
}
