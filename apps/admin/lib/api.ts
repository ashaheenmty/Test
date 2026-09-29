import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const API_URL = process.env.API_URL ?? 'http://localhost:4000/v1';
export const ADMIN_ACCESS = 'tba_at';
export const ADMIN_REFRESH = 'tba_rt';

export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

/** Back-office API call using the admin token from the httpOnly cookie. Redirects to login on 401. */
export async function adminApi<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const token = init.token ?? (await cookies()).get(ADMIN_ACCESS)?.value;
  const h = await headers();
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'User-Agent': h.get('user-agent') ?? 'tb-admin',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => ({}))) as { error?: { code: string } };
  if (res.status === 401 && !path.startsWith('/admin/auth')) redirect('/login');
  if (!res.ok) throw new ApiRequestError(res.status, json.error?.code ?? `http.${res.status}`);
  return json as T;
}

export interface AdminMe {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export const hasRole = (me: AdminMe, ...roles: string[]) =>
  me.roles.includes('SUPER_ADMIN') || roles.some((r) => me.roles.includes(r));
