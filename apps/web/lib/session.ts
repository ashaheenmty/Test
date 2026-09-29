import 'server-only';
import { cookies } from 'next/headers';
import type { AuthTokens } from '@tb/domain';

export const ACCESS_COOKIE = 'tb_at';
export const REFRESH_COOKIE = 'tb_rt';
export const LOCALE_COOKIE = 'tb_locale';
export const THEME_COOKIE = 'tb_theme';

const secure = process.env.NODE_ENV === 'production';

/** Tokens live only in httpOnly cookies — never readable by page JavaScript. */
export async function storeTokens(tokens: AuthTokens) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: new Date(tokens.accessTokenExpiresAt),
  });
  jar.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: new Date(tokens.refreshTokenExpiresAt),
  });
}

export async function clearTokens() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function accessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function refreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}
