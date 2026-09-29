import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/v1';

/** Refreshes the admin session when the short-lived access cookie has expired. */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/login')) return NextResponse.next();
  const rt = req.cookies.get('tba_rt')?.value;
  if (!rt) return NextResponse.redirect(new URL('/login', req.url));
  if (req.cookies.get('tba_at')) return NextResponse.next();

  const res = await fetch(`${API_URL}/admin/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  }).catch(() => null);
  if (!res?.ok) {
    const out = NextResponse.redirect(new URL('/login', req.url));
    out.cookies.delete('tba_rt');
    return out;
  }
  const t = (await res.json()) as { accessToken: string; accessTokenExpiresAt: string; refreshToken: string; refreshTokenExpiresAt: string };
  const headers = new Headers(req.headers);
  headers.set('cookie', `${req.headers.get('cookie') ?? ''}; tba_at=${t.accessToken}`);
  const out = NextResponse.next({ request: { headers } });
  const secure = process.env.NODE_ENV === 'production';
  out.cookies.set('tba_at', t.accessToken, { httpOnly: true, secure, sameSite: 'strict', path: '/', expires: new Date(t.accessTokenExpiresAt) });
  out.cookies.set('tba_rt', t.refreshToken, { httpOnly: true, secure, sameSite: 'strict', path: '/', expires: new Date(t.refreshTokenExpiresAt) });
  return out;
}

export const config = { runtime: 'nodejs', matcher: ['/((?!_next|favicon).*)'] };
