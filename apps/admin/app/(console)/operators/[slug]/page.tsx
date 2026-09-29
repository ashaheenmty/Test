import Link from 'next/link';
import { OrganisationStatus } from '@tb/domain';
import { adminApi, hasRole, type AdminMe } from '@/lib/api';
import { updateOperatorAction } from '../../../actions';

interface OperatorDetail {
  slug: string;
  name: string;
  legalName: string;
  country: string;
  groupName: string | null;
  status: string;
  notes: string | null;
  brands: string[];
  modes: string[];
  segments: string[];
  serviceTypes: string | null;
  coverage: string | null;
  ownSalesChannel: string | null;
  regions: { type: string; code: string; description: string | null }[];
  salesChannels: { code: string; name: string; kind: string }[];
  cities: { city: string; tariff: string | null }[];
}

export default async function OperatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const [o, me] = await Promise.all([
    adminApi<OperatorDetail>(`/reference/operators/${encodeURIComponent(slug)}`),
    adminApi<AdminMe>('/admin/me'),
  ]);
  const canEdit = hasRole(me, 'OPS');

  return (
    <>
      <p>
        <Link href="/operators">← Operators</Link>
      </p>
      <h1>{o.name}</h1>
      {sp.saved ? <p role="status" className="ok">Saved — change recorded in the audit log.</p> : null}
      {sp.error ? <p role="alert" className="alert">Update failed: {sp.error}</p> : null}
      <dl className="kv">
        <dt>Legal name</dt>
        <dd>
          {o.legalName} <span className="muted">(unverified)</span>
        </dd>
        <dt>Country / group</dt>
        <dd>
          {o.country}
          {o.groupName ? ` · ${o.groupName}` : ''}
        </dd>
        <dt>Brands</dt>
        <dd>{o.brands.join(', ') || '—'}</dd>
        <dt>Segments</dt>
        <dd>{o.segments.join(', ')}</dd>
        <dt>Modes</dt>
        <dd>{o.modes.join(', ')}</dd>
        <dt>Service types</dt>
        <dd>{o.serviceTypes ?? '—'}</dd>
        <dt>Own sales channel</dt>
        <dd>{o.ownSalesChannel ?? '—'}</dd>
        <dt>Sold via (our channels)</dt>
        <dd>{o.salesChannels.map((c) => `${c.name} (${c.kind})`).join('; ') || 'No channel yet'}</dd>
        <dt>Cities</dt>
        <dd>{o.cities.map((c) => `${c.city}${c.tariff ? ` (${c.tariff})` : ''}`).join(', ') || '—'}</dd>
      </dl>
      <h2>Regions</h2>
      <ul>
        {o.regions.map((r) => (
          <li key={`${r.type}-${r.code}`}>
            <strong>{r.type}</strong> {r.type === 'INTERNATIONAL_ROUTE' ? r.description : r.code}
            {r.type !== 'INTERNATIONAL_ROUTE' && r.description ? <span className="muted"> — {r.description}</span> : null}
          </li>
        ))}
      </ul>
      <h2>Status</h2>
      <form action={updateOperatorAction} className="stack narrow">
        <input type="hidden" name="slug" value={o.slug} />
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={o.status} disabled={!canEdit}>
          {OrganisationStatus.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={5} defaultValue={o.notes ?? ''} disabled={!canEdit} />
        {canEdit ? (
          <button type="submit" className="primary">
            Save
          </button>
        ) : (
          <p className="muted">Requires the OPS role.</p>
        )}
      </form>
    </>
  );
}
