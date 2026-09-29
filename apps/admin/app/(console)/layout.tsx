import Link from 'next/link';
import type { ReactNode } from 'react';
import { adminApi, type AdminMe } from '@/lib/api';
import { logoutAction } from '../actions';

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const me = await adminApi<AdminMe>('/admin/me');
  return (
    <div className="console">
      <header className="topbar">
        <strong>Back-office</strong>
        <nav aria-label="Sections">
          <Link href="/operators">Operators</Link>
          <Link href="/audit">Audit log</Link>
          <span className="muted" title="Coming in later phases">
            Bookings · Refunds · Contracts · Settlements · Content
          </span>
        </nav>
        <div className="who">
          <span>
            {me.name} <span className="muted">({me.roles.join(', ')})</span>
          </span>
          <form action={logoutAction}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
