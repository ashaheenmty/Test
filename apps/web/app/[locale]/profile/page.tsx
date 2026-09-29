import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { formatDate, LOCALES, SUPPORTED_LOCALES } from '@tb/i18n';
import { Card, Feedback, Field, type SearchParams } from '@/components/ui';
import { api } from '@/lib/api';
import { resolveLocale, translator } from '@/lib/i18n';
import { getMe } from '@/lib/me';
import {
  addPassengerAction,
  deletePassengerAction,
  resendVerificationAction,
  setLanguageAction,
  setThemeAction,
} from '../actions';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: translator(resolveLocale((await params).locale))('profile.title') };
}

interface PassengerView {
  id: string;
  firstName: string;
  lastName: string;
  isAccountHolder: boolean;
  dateOfBirth: string | null;
  discountCards: { id: string; type: string }[];
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = translator(locale);
  const me = await getMe();
  if (!me) redirect(`/${locale}/login?next=/${locale}/profile`);
  const passengers = await api<PassengerView[]>('/me/passengers');

  return (
    <div className="stack-lg">
      <h1>{me.firstName ? t('profile.greeting', { name: me.firstName }) : t('profile.title')}</h1>
      <Feedback locale={locale} searchParams={await searchParams} />

      <Card title={t('profile.personalData')}>
        <dl className="kv">
          <dt>{t('auth.email')}</dt>
          <dd>
            <bdi>{me.email}</bdi>
            {!me.emailVerified ? (
              <form action={resendVerificationAction} className="inline-form">
                <input type="hidden" name="locale" value={locale} />
                <span className="badge badge-notice">{t('profile.emailNotVerified')}</span>{' '}
                <button type="submit" className="link-button">
                  {t('auth.sendResetLink')}
                </button>
              </form>
            ) : null}
          </dd>
        </dl>
      </Card>

      <Card title={t('profile.passengers')}>
        {passengers.length === 0 ? <p className="muted">{t('profile.noPassengers')}</p> : null}
        <ul className="list">
          {passengers.map((p) => (
            <li key={p.id} className="list-item">
              <div>
                <strong>
                  <bdi>
                    {p.firstName} {p.lastName}
                  </bdi>
                </strong>
                {p.dateOfBirth ? (
                  <span className="muted small">
                    {' · '}
                    {t('profile.dateOfBirth')}: {formatDate(`${p.dateOfBirth}T12:00:00Z`, locale)}
                  </span>
                ) : null}
              </div>
              {!p.isAccountHolder ? (
                <form action={deletePassengerAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="button button-small button-quiet" aria-label={`${t('common.delete')}: ${p.firstName} ${p.lastName}`}>
                    {t('common.delete')}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        <details className="disclosure">
          <summary>{t('profile.addPassenger')}</summary>
          <form action={addPassengerAction} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <div className="row">
              <Field id="p-first" label={t('auth.firstName')}>
                <input id="p-first" name="firstName" required maxLength={100} autoComplete="off" />
              </Field>
              <Field id="p-last" label={t('auth.lastName')}>
                <input id="p-last" name="lastName" required maxLength={100} autoComplete="off" />
              </Field>
              <Field id="p-dob" label={t('profile.dateOfBirth')}>
                <input id="p-dob" name="dateOfBirth" type="date" max={new Date().toISOString().slice(0, 10)} />
              </Field>
            </div>
            <button type="submit" className="button button-primary">
              {t('common.save')}
            </button>
          </form>
        </details>
      </Card>

      <Card title={t('common.language')}>
        <form action={setLanguageAction} className="row align-end">
          <input type="hidden" name="path" value="/profile" />
          <Field id="profile-lang" label={t('common.language')}>
            <select id="profile-lang" name="target" defaultValue={locale}>
              {SUPPORTED_LOCALES.map((l) => (
                <option key={l} value={l} lang={l}>
                  {LOCALES[l].nativeName}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" className="button">
            {t('common.save')}
          </button>
        </form>
      </Card>

      <Card title={t('theme.label')}>
        <form action={setThemeAction} className="row">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="path" value="/profile" />
          {(['SYSTEM', 'LIGHT', 'DARK'] as const).map((v) => (
            <button key={v} type="submit" name="theme" value={v} className="chip" aria-pressed={me.theme === v}>
              {t(`theme.${v.toLowerCase()}`)}
            </button>
          ))}
        </form>
      </Card>

      <Card title={t('profile.privacy')}>
        <ul className="list">
          <li className="list-item">
            <span>{t('profile.paymentMethods')}</span>
            <span className="badge">{t('common.comingSoon')}</span>
          </li>
          <li className="list-item">
            <span>{t('profile.companyInvoice')}</span>
            <span className="badge">{t('common.comingSoon')}</span>
          </li>
          <li className="list-item">
            <span>{t('profile.dataExport')}</span>
            <span className="badge">{t('common.comingSoon')}</span>
          </li>
          <li className="list-item">
            <span>{t('profile.deleteAccount')}</span>
            <span className="badge">{t('common.comingSoon')}</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
