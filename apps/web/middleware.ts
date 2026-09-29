import { NextResponse, type NextRequest } from 'next/server';
import { matchLocale, SUPPORTED_LOCALES } from '@tb/i18n';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/v1';
const LOCALE_COOKIE = 'tb_locale';
const ACCESS_COOKIE = 'tb_at';
const REFRESH_COOKIE = 'tb_rt';

/**
 * 1. Redirects locale-less paths to /<locale>/… (cookie → Accept-Language → German).
 * 2. Silently refreshes an expired session using the httpOnly refresh cookie.
 * 3. Exposes the current path to server components (for the language switcher).
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split('/')[1] ?? '';

  if (!(SUPPORTED_LOCALES as readonly string[]).includes(first)) {
    const preferred = req.cookies.get(LOCALE_COOKIE)?.value;
    const locale = preferred && (SUPPORTED_LOCALES as readonly string[]).includes(preferred)
      ? preferred
      : matchLocale(req.headers.get('accept-language'));
    return NextResponse.redirect(new URL(`/${locale}${pathname === '/' ? '' : pathname}${search}`, req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname.slice(first.length + 1) || '/');

  let refreshed: { accessToken: string; accessTokenExpiresAt: string; refreshToken: string; refreshTokenExpiresAt: string } | null = null;
  let refreshFailed = false;
  const rt = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!req.cookies.get(ACCESS_COOKIE) && rt) {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': req.headers.get('user-agent') ?? 'tb-web' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (res.ok) refreshed = await res.json();
      else refreshFailed = res.status === 401;
    } catch {
      // API unreachable: continue signed-out for this request.
    }
    if (refreshed) {
      // Make the new access token visible to server components in this same request.
      const cookieHeader = req.headers.get('cookie') ?? '';
      requestHeaders.set('cookie', `${cookieHeader}; ${ACCESS_COOKIE}=${refreshed.accessToken}`);
    }
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (req.cookies.get(LOCALE_COOKIE)?.value !== first) {
    res.cookies.set(LOCALE_COOKIE, first, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  }
  const secure = process.env.NODE_ENV === 'production';
  if (refreshed) {
    res.cookies.set(ACCESS_COOKIE, refreshed.accessToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', expires: new Date(refreshed.accessTokenExpiresAt) });
    res.cookies.set(REFRESH_COOKIE, refreshed.refreshToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', expires: new Date(refreshed.refreshTokenExpiresAt) });
  } else if (refreshFailed) {
    res.cookies.delete(REFRESH_COOKIE);
  }
  return res;
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next|favicon|icon|robots.txt|.*\\.[a-z0-9]+$).*)'],
};
