'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminApi, ADMIN_ACCESS, ADMIN_REFRESH, ApiRequestError } from '@/lib/api';

interface Tokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

const secure = process.env.NODE_ENV === 'production';

export async function loginAction(fd: FormData) {
  let tokens: Tokens;
  try {
    tokens = await adminApi<Tokens>('/admin/auth/login', {
      body: { email: String(fd.get('email') ?? ''), password: String(fd.get('password') ?? '') },
    });
  } catch (e) {
    redirect(`/login?error=${e instanceof ApiRequestError ? e.code : 'error'}`);
  }
  const jar = await cookies();
  jar.set(ADMIN_ACCESS, tokens.accessToken, { httpOnly: true, secure, sameSite: 'strict', path: '/', expires: new Date(tokens.accessTokenExpiresAt) });
  jar.set(ADMIN_REFRESH, tokens.refreshToken, { httpOnly: true, secure, sameSite: 'strict', path: '/', expires: new Date(tokens.refreshTokenExpiresAt) });
  redirect('/operators');
}

export async function logoutAction() {
  const jar = await cookies();
  const rt = jar.get(ADMIN_REFRESH)?.value;
  if (rt) await adminApi('/admin/auth/logout', { body: { refreshToken: rt } }).catch(() => undefined);
  jar.delete(ADMIN_ACCESS);
  jar.delete(ADMIN_REFRESH);
  redirect('/login');
}

export async function updateOperatorAction(fd: FormData) {
  const slug = String(fd.get('slug') ?? '');
  const status = String(fd.get('status') ?? '');
  const notes = String(fd.get('notes') ?? '');
  try {
    await adminApi(`/admin/operators/${encodeURIComponent(slug)}`, { method: 'PATCH', body: { status, notes: notes || null } });
  } catch (e) {
    redirect(`/operators/${slug}?error=${e instanceof ApiRequestError ? e.code : 'error'}`);
  }
  revalidatePath(`/operators/${slug}`);
  redirect(`/operators/${slug}?saved=1`);
}
