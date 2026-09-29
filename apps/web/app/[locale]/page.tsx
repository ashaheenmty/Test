import Link from 'next/link';
import { formatDate } from '@tb/i18n';
import { Card, Field } from '@/components/ui';
import { resolveLocale, translator } from '@/lib/i18n';
import { getMe } from '@/lib/me';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const t = translator(locale);
  const me = await getMe();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="stack-lg">
      <section className="hero">
        <h1>{me?.firstName ? t('profile.greeting', { name: me.firstName }) : t('home.title')}</h1>
        {!me ? <p className="lead">{t('onboarding.tagline')}</p> : null}
      </section>

      <Card title={t('home.title')}>
        {/* Journey search is wired up in phase 2; the form is final so layout/RTL/a11y can be reviewed now. */}
        <form className="search-form" aria-describedby="search-coming-soon" action={`/${locale}`}>
          <div className="od-pair">
            <Field id="from" label={t('home.from')}>
              <input id="from" name="from" autoComplete="off" placeholder="Berlin Hbf" />
            </Field>
            <button type="button" className="icon-button swap" aria-label={t('home.swap')} disabled>
              <span aria-hidden="true">⇅</span>
            </button>
            <Field id="to" label={t('home.to')}>
              <input id="to" name="to" autoComplete="off" placeholder="München Hbf" />
            </Field>
          </div>
          <div className="row">
            <Field id="date" label={t('home.date')}>
              <input id="date" name="date" type="date" defaultValue={today} min={today} />
            </Field>
            <Field id="time" label={t('home.time')}>
              <input id="time" name="time" type="time" defaultValue="08:00" />
            </Field>
            <Field id="pax" label={t('home.passengers', { count: 1 })}>
              <input id="pax" name="pax" type="number" min={1} max={9} defaultValue={1} inputMode="numeric" />
            </Field>
          </div>
          <button type="submit" className="button button-primary button-block" disabled>
            {t('home.search')}
          </button>
          <p id="search-coming-soon" className="hint">
            {t('home.searchComingSoon')}
          </p>
        </form>
      </Card>

      <Card title={t('home.upcomingTitle')}>
        <p className="muted">{t('home.upcomingEmpty')}</p>
        <p className="muted small">{formatDate(new Date(), locale, { dateStyle: 'full' })}</p>
      </Card>

      {!me ? (
        <Card>
          <p>{t('onboarding.agentNotice')}</p>
          <div className="row">
            <Link className="button button-primary" href={`/${locale}/register`}>
              {t('auth.registerTitle')}
            </Link>
            <Link className="button" href={`/${locale}/login`}>
              {t('nav.signIn')}
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
