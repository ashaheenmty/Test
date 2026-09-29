import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, Feedback, Field, first, type SearchParams } from '@/components/ui';
import { api } from '@/lib/api';
import { resolveLocale, translator } from '@/lib/i18n';
import { registerAction } from '../actions';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: translator(resolveLocale((await params).locale))('auth.registerTitle') };
}

type Versions = { AGENT_TERMS: { version: string }; PRIVACY_POLICY: { version: string } };

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = translator(locale);
  const versions = await api<Versions>(`/legal/versions?locale=${locale}`, { auth: false });

  return (
    <div className="narrow stack">
      <h1>{t('auth.registerTitle')}</h1>
      <Feedback locale={locale} searchParams={sp} />
      <Card as="div">
        <form action={registerAction} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="agentTermsVersion" value={versions.AGENT_TERMS.version} />
          <input type="hidden" name="privacyVersion" value={versions.PRIVACY_POLICY.version} />
          <div className="row">
            <Field id="firstName" label={t('auth.firstName')}>
              <input id="firstName" name="firstName" autoComplete="given-name" required maxLength={100} defaultValue={first(sp.firstName)} />
            </Field>
            <Field id="lastName" label={t('auth.lastName')}>
              <input id="lastName" name="lastName" autoComplete="family-name" required maxLength={100} defaultValue={first(sp.lastName)} />
            </Field>
          </div>
          <Field id="email" label={t('auth.email')}>
            <input id="email" name="email" type="email" autoComplete="email" required defaultValue={first(sp.email)} />
          </Field>
          <Field id="password" label={t('auth.password')} hint={t('auth.passwordHint')}>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
              aria-describedby="password-hint"
            />
          </Field>
          <div className="checkbox">
            <input id="acceptTerms" name="acceptTerms" type="checkbox" required />
            <label htmlFor="acceptTerms">
              {t('auth.acceptTerms')}{' '}
              <span className="links">
                (<Link href={`/${locale}/legal/agent-terms`} target="_blank">{t('legal.terms')}</Link>,{' '}
                <Link href={`/${locale}/legal/privacy-policy`} target="_blank">{t('legal.privacy')}</Link>)
              </span>
            </label>
          </div>
          <button type="submit" className="button button-primary button-block">
            {t('auth.submitRegister')}
          </button>
        </form>
      </Card>
      <p>
        {t('auth.haveAccount')} <Link href={`/${locale}/login`}>{t('nav.signIn')}</Link>
      </p>
    </div>
  );
}
