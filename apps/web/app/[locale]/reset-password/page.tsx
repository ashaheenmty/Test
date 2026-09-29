import { Card, Feedback, Field, first, type SearchParams } from '@/components/ui';
import { resolveLocale, translator } from '@/lib/i18n';
import { resetPasswordAction } from '../actions';

export default async function ResetPasswordPage({
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
      <h1>{t('auth.resetTitle')}</h1>
      <Feedback locale={locale} searchParams={sp} />
      <Card as="div">
        <form action={resetPasswordAction} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="token" value={first(sp.token) ?? ''} />
          <Field id="password" label={t('auth.newPassword')} hint={t('auth.passwordHint')}>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} aria-describedby="password-hint" />
          </Field>
          <button type="submit" className="button button-primary button-block">
            {t('common.save')}
          </button>
        </form>
      </Card>
    </div>
  );
}
