import { Card, Feedback, first, type SearchParams } from '@/components/ui';
import { resolveLocale, translator } from '@/lib/i18n';
import { verifyEmailAction } from '../actions';

/**
 * Landing page of the verification email. Verification happens on an explicit
 * POST (button), so mail-security link scanners that prefetch the URL cannot
 * consume the single-use token before the user clicks.
 */
export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = translator(locale);
  const sp = await searchParams;
  const token = first(sp.token) ?? '';
  return (
    <div className="narrow stack">
      <h1>{t('auth.email')}</h1>
      <Feedback locale={locale} searchParams={sp} />
      {token ? (
        <Card as="div">
          <form action={verifyEmailAction} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="button button-primary button-block">
              {t('common.continue')}
            </button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
