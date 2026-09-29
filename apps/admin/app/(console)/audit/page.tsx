import Link from 'next/link';
import { adminApi, ApiRequestError, hasRole, type AdminMe } from '@/lib/api';

export const metadata = { title: 'Audit log' };

interface AuditRow {
  id: string;
  occurredAt: string;
  actorType: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  data: unknown;
  hash: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string; entityId?: string; before?: string; verify?: string }>;
}) {
  const sp = await searchParams;
  const me = await adminApi<AdminMe>('/admin/me');
  if (!hasRole(me, 'SUPPORT', 'FINANCE', 'OPS')) {
    return <p role="alert" className="alert">Your role does not allow viewing the audit log.</p>;
  }
  const qs = new URLSearchParams({ limit: '50' });
  for (const k of ['action', 'entityType', 'entityId', 'before'] as const) if (sp[k]) qs.set(k, sp[k]!);
  const data = await adminApi<{ items: AuditRow[]; nextBefore: string | null }>(`/admin/audit?${qs}`);

  type Verification = { ok: boolean; checked: number; firstBrokenId: string | null; reason: string | null };
  let verification: Verification | null = null;
  if (sp.verify && hasRole(me, 'SUPER_ADMIN')) {
    verification = await adminApi<Verification>('/admin/audit/verify').catch((e: unknown) => {
      if (e instanceof ApiRequestError) return null;
      throw e;
    });
  }

  return (
    <>
      <h1>Audit log</h1>
      <p className="muted">Append-only and hash-chained. Rows cannot be changed or deleted (enforced by the database).</p>
      {hasRole(me, 'SUPER_ADMIN') ? (
        <p>
          <Link href="/audit?verify=1">Verify hash chain</Link>
        </p>
      ) : null}
      {verification ? (
        <p role="status" className={verification.ok ? 'ok' : 'alert'}>
          {verification.ok
            ? `Chain intact — ${verification.checked} events verified.`
            : `Chain BROKEN at event ${verification.firstBrokenId}: ${verification.reason}`}
        </p>
      ) : null}
      <form className="filters" role="search">
        <label>
          Action prefix
          <input name="action" defaultValue={sp.action} placeholder="auth., admin., user." />
        </label>
        <label>
          Entity type
          <input name="entityType" defaultValue={sp.entityType} placeholder="User, Organisation…" />
        </label>
        <label>
          Entity id
          <input name="entityId" defaultValue={sp.entityId} />
        </label>
        <button type="submit" className="primary">
          Filter
        </button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Time (UTC)</th>
              <th scope="col">Actor</th>
              <th scope="col">Action</th>
              <th scope="col">Entity</th>
              <th scope="col">Data</th>
              <th scope="col">Hash</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((e) => (
              <tr key={e.id}>
                <td>{e.id}</td>
                <td className="small nowrap">{e.occurredAt.replace('T', ' ').slice(0, 19)}</td>
                <td className="small">
                  {e.actorType}
                  {e.actorId ? <div className="muted mono">{e.actorId}</div> : null}
                </td>
                <td>
                  <code>{e.action}</code>
                </td>
                <td className="small">
                  {e.entityType}
                  <div className="muted mono">{e.entityId}</div>
                </td>
                <td>
                  <pre className="json">{JSON.stringify(e.data, null, 1)}</pre>
                </td>
                <td className="mono small" title={e.hash}>
                  {e.hash.slice(0, 10)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.nextBefore ? (
        <p>
          <Link href={`/audit?${new URLSearchParams({ ...Object.fromEntries(qs), before: data.nextBefore })}`}>Older →</Link>
        </p>
      ) : null}
    </>
  );
}
