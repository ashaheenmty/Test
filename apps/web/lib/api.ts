import 'server-only';
import { headers } from 'next/headers';
import { accessToken } from './session';

export const API_URL = process.env.API_URL ?? 'http://localhost:4000/v1';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(code);
  }
}

/**
 * Server-side call to the API. Forwards the user's access token (from the httpOnly
 * cookie) and the client's user agent / IP for audit records.
 */
export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; auth?: boolean; token?: string } = {},
): Promise<T> {
  const h = await headers();
  const token = init.token ?? (init.auth === false ? undefined : await accessToken());
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'User-Agent': h.get('user-agent') ?? 'tb-web',
      ...(h.get('x-forwarded-for') ? { 'X-Forwarded-For': h.get('x-forwarded-for')! } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => ({}))) as { error?: { code: string; details?: unknown } };
  if (!res.ok) throw new ApiRequestError(res.status, json.error?.code ?? `http.${res.status}`, json.error?.details);
  return json as T;
}
