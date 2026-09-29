import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Fragment, type ReactNode } from 'react';
import { formatDate } from '@tb/i18n';
import { api, ApiRequestError } from '@/lib/api';
import { resolveLocale, translator } from '@/lib/i18n';

const DOCS = ['impressum', 'agent-terms', 'privacy-policy', 'dispute-resolution-notice'] as const;

interface LegalDoc {
  locale: string;
  version: string;
  title: string;
  body: string | null;
  effectiveFrom: string;
}

/** Minimal, escape-by-default Markdown subset (headings, quotes, paragraphs, line breaks). */
function renderMarkdown(md: string): ReactNode[] {
  return md.split(/\n{2,}/).map((block, i) => {
    const lines = block.split('\n');
    const withBreaks = (ls: string[]) =>
      ls.map((l, j) => (
        <Fragment key={j}>
          {j > 0 ? <br /> : null}
          {l}
        </Fragment>
      ));
    if (block.startsWith('# ')) return null; // title rendered separately
    if (block.startsWith('## ')) return <h2 key={i}>{block.slice(3)}</h2>;
    if (block.startsWith('> ')) return <blockquote key={i}>{withBreaks(lines.map((l) => l.replace(/^> ?/, '')))}</blockquote>;
    return <p key={i}>{withBreaks(lines)}</p>;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; doc: string }> }): Promise<Metadata> {
  const { locale: raw, doc } = await params;
  const t = translator(resolveLocale(raw));
  const keys: Record<string, string> = {
    impressum: 'legal.impressum',
    'agent-terms': 'legal.terms',
    'privacy-policy': 'legal.privacy',
    'dispute-resolution-notice': 'legal.disputeResolution',
  };
  return keys[doc] ? { title: t(keys[doc]) } : {};
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale: raw, doc } = await params;
  const locale = resolveLocale(raw);
  if (!(DOCS as readonly string[]).includes(doc)) notFound();
  const t = translator(locale);
  let data: LegalDoc;
  try {
    data = await api<LegalDoc>(`/legal/${doc}?locale=${locale}`, { auth: false });
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) notFound();
    throw e;
  }
  return (
    <article className="prose narrow" lang={data.locale}>
      <h1>{data.title}</h1>
      <p className="muted small">{t('legal.version', { version: data.version, date: formatDate(data.effectiveFrom, locale) })}</p>
      {renderMarkdown(data.body ?? '')}
    </article>
  );
}
