import Link from 'next/link';
import { Card } from '@/components/ui';
import { resolveLocale, translator } from '@/lib/i18n';

export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const t = translator(locale);
  return (
    <div className="stack">
      <h1>{t('bookings.title')}</h1>
      <Card as="div">
        <p className="muted">{t('bookings.empty')}</p>
        <Link href={`/${locale}`} className="button button-primary">
          {t('home.search')}
        </Link>
      </Card>
    </div>
  );
}
