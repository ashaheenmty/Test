import { Card, Feedback, Field, type SearchParams } from '@/components/ui';
import { resolveLocale, translator } from '@/lib/i18n';
import { forgotPasswordAction } from '../actions';

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = translator(locale);
  return (
    <div className="narrow stack">
      <h1>{t('auth.resetTitle')}</h1>
      <Feedback locale={locale} searchParams={await searchParams} />
      <Card as="div">
        <form action={forgotPasswordAction} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <Field id="email" label={t('auth.email')}>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <button type="submit" className="button button-primary button-block">
            {t('auth.sendResetLink')}
          </button>
        </form>
      </Card>
    </div>
  );
}
