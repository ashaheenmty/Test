import type { ReactNode } from 'react';
import type { SupportedLocale } from '@tb/i18n';
import { errorMessage, translator } from '@/lib/i18n';

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Renders ?error= / ?notice= feedback from server actions as live regions. */
export function Feedback({ locale, searchParams }: { locale: SupportedLocale; searchParams: SearchParams }) {
  const t = translator(locale);
  const error = errorMessage(locale, first(searchParams.error));
  const noticeKey = first(searchParams.notice);
  const notice = noticeKey && /^[a-z]+\.[a-zA-Z]+$/.test(noticeKey) ? t(noticeKey) : null;
  return (
    <>
      {error ? (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      ) : null}
      {notice && notice !== noticeKey ? (
        <p role="status" className="alert alert-success">
          {notice}
        </p>
      ) : null}
    </>
  );
}

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Card({ children, title, as: As = 'section' }: { children: ReactNode; title?: string; as?: 'section' | 'div' }) {
  return (
    <As className="card" aria-label={title}>
      {title ? <h2 className="card-title">{title}</h2> : null}
      {children}
    </As>
  );
}

export { first };
export type { SearchParams };
