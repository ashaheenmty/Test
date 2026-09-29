import Link from 'next/link';
import { OperatorSegment, OrganisationStatus } from '@tb/domain';
import { adminApi } from '@/lib/api';

export const metadata = { title: 'Operators' };

interface OperatorRow {
  slug: string;
  name: string;
  country: string;
  status: string;
  segments: string[];
  modes: string[];
  brands: string[];
  regions: { type: string; code: string }[];
  salesChannels: { code: string; name: string }[];
}

type Search = { q?: string; segment?: string; region?: string; status?: string; page?: string };

export default async function OperatorsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const qs = new URLSearchParams({ pageSize: '50', page: String(page) });
  for (const k of ['q', 'segment', 'region', 'status'] as const) if (sp[k]) qs.set(k, sp[k]!);
  const data = await adminApi<{ total: number; items: OperatorRow[] }>(`/admin/operators?${qs}`);
  const pages = Math.max(1, Math.ceil(data.total / 50));
  const link = (p: number) => {
    const next = new URLSearchParams(qs);
    next.set('page', String(p));
    next.delete('pageSize');
    return `/operators?${next}`;
  };

  return (
    <>
      <h1>Operators ({data.total})</h1>
      <p className="muted">
        Imported from the operator master list (data/operators). Legal names are not yet verified; sales-channel coverage
        marked “ASSUMPTION” until contracts exist.
      </p>
      <form className="filters" role="search">
        <label>
          Search
          <input name="q" defaultValue={sp.q} placeholder="Name, group or exact brand (e.g. alex)" />
        </label>
        <label>
          Segment
          <select name="segment" defaultValue={sp.segment ?? ''}>
            <option value="">All</option>
            {OperatorSegment.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Region
          <input name="region" defaultValue={sp.region} placeholder="DE-BY, AT, Berlin…" />
        </label>
        <label>
          Status
          <select name="status" defaultValue={sp.status ?? ''}>
            <option value="">All</option>
            {OrganisationStatus.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary">
          Filter
        </button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Operator</th>
              <th scope="col">Country</th>
              <th scope="col">Status</th>
              <th scope="col">Segments</th>
              <th scope="col">Modes</th>
              <th scope="col">Regions</th>
              <th scope="col">Sales channels</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => (
              <tr key={o.slug}>
                <td>
                  <Link href={`/operators/${o.slug}`}>{o.name}</Link>
                  {o.brands.length ? <div className="muted small">{o.brands.join(', ')}</div> : null}
                </td>
                <td>{o.country}</td>
                <td>
                  <span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span>
                </td>
                <td className="small">{o.segments.join(', ')}</td>
                <td className="small">{o.modes.join(', ')}</td>
                <td className="small">
                  {o.regions
                    .filter((r) => r.type !== 'INTERNATIONAL_ROUTE')
                    .map((r) => r.code)
                    .join(', ')}
                </td>
                <td className="small">{o.salesChannels.map((c) => c.code).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="pager" aria-label="Pagination">
        {page > 1 ? <Link href={link(page - 1)}>← Previous</Link> : <span />}
        <span>
          Page {page} of {pages}
        </span>
        {page < pages ? <Link href={link(page + 1)}>Next →</Link> : <span />}
      </nav>
    </>
  );
}
