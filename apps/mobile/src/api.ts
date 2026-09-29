import type { AuthTokens, MeResponse, PassengerInput } from '@tb/domain';
import { storage } from './storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const ACCESS = 'tb.accessToken';
const REFRESH = 'tb.refreshToken';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

async function raw<T>(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'common.errorGeneric');
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => ({}))) as { error?: { code: string } };
  if (!res.ok) throw new ApiError(res.status, json.error?.code ?? 'common.errorGeneric');
  return json as T;
}

export async function saveTokens(t: AuthTokens) {
  await storage.set(ACCESS, t.accessToken);
  await storage.set(REFRESH, t.refreshToken);
}

export async function clearTokens() {
  await storage.remove(ACCESS);
  await storage.remove(REFRESH);
}

export async function hasSession() {
  return Boolean(await storage.get(REFRESH));
}

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    const rt = await storage.get(REFRESH);
    if (!rt) return false;
    try {
      await saveTokens(await raw<AuthTokens>('/auth/refresh', { body: { refreshToken: rt } }));
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await clearTokens();
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Authenticated call with one transparent refresh on 401. */
export async function authed<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  try {
    return await raw<T>(path, { ...init, token: await storage.get(ACCESS) });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && (await refresh())) {
      return raw<T>(path, { ...init, token: await storage.get(ACCESS) });
    }
    throw e;
  }
}

export const api = {
  legalVersions: (locale: string) =>
    raw<{ AGENT_TERMS: { version: string }; PRIVACY_POLICY: { version: string } }>(`/legal/versions?locale=${locale}`),
  login: async (email: string, password: string) => saveTokens(await raw<AuthTokens>('/auth/login', { body: { email, password } })),
  register: async (body: Record<string, unknown>) => saveTokens(await raw<AuthTokens>('/auth/register', { body })),
  logout: async () => {
    const rt = await storage.get(REFRESH);
    if (rt) await raw('/auth/logout', { body: { refreshToken: rt } }).catch(() => undefined);
    await clearTokens();
  },
  me: () => authed<MeResponse>('/me'),
  updateMe: (body: Partial<Pick<MeResponse, 'locale' | 'theme'>>) => authed<MeResponse>('/me', { method: 'PATCH', body }),
  passengers: () =>
    authed<{ id: string; firstName: string; lastName: string; isAccountHolder: boolean; dateOfBirth: string | null }[]>('/me/passengers'),
  addPassenger: (body: Partial<PassengerInput>) => authed('/me/passengers', { body }),
  deletePassenger: (id: string) => authed(`/me/passengers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
