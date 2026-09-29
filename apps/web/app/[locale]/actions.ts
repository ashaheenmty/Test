'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthTokens, MeResponse } from '@tb/domain';
import { isSupportedLocale, DEFAULT_LOCALE, type SupportedLocale } from '@tb/i18n';
import { api, ApiRequestError } from '@/lib/api';
import { clearTokens, refreshToken, storeTokens, LOCALE_COOKIE, THEME_COOKIE } from '@/lib/session';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const localeOf = (fd: FormData): SupportedLocale => {
  const l = str(fd, 'locale');
  return isSupportedLocale(l) ? l : DEFAULT_LOCALE;
};
/** Only allow same-site relative redirects. */
const safeNext = (value: string, locale: string) =>
  /^\/(?!\/)[\w\-/]*$/.test(value) && !value.includes('//') ? value : `/${locale}`;

function fail(path: string, code: string, extra: Record<string, string> = {}): never {
  const qs = new URLSearchParams({ error: code, ...extra });
  redirect(`${path}?${qs.toString()}`);
}

export async function loginAction(fd: FormData) {
  const locale = localeOf(fd);
  const email = str(fd, 'email');
  let tokens: AuthTokens;
  try {
    tokens = await api<AuthTokens>('/auth/login', { body: { email, password: String(fd.get('password') ?? '') }, auth: false });
  } catch (e) {
    fail(`/${locale}/login`, e instanceof ApiRequestError ? e.code : 'common.errorGeneric', { email });
  }
  await storeTokens(tokens);
  redirect(safeNext(str(fd, 'next') || `/${locale}`, locale));
}

export async function registerAction(fd: FormData) {
  const locale = localeOf(fd);
  const keep = { email: str(fd, 'email'), firstName: str(fd, 'firstName'), lastName: str(fd, 'lastName') };
  if (fd.get('acceptTerms') !== 'on') fail(`/${locale}/register`, 'auth.mustAcceptTerms', keep);
  let tokens: AuthTokens;
  try {
    tokens = await api<AuthTokens>('/auth/register', {
      auth: false,
      body: {
        ...keep,
        password: String(fd.get('password') ?? ''),
        locale,
        acceptedAgentTermsVersion: str(fd, 'agentTermsVersion'),
        acceptedPrivacyPolicyVersion: str(fd, 'privacyVersion'),
      },
    });
  } catch (e) {
    let code = e instanceof ApiRequestError ? e.code : 'common.errorGeneric';
    if (code === 'validation.failed' && JSON.stringify((e as ApiRequestError).details).includes('password.tooShort')) {
      code = 'auth.passwordTooShort';
    }
    fail(`/${locale}/register`, code, keep);
  }
  await storeTokens(tokens);
  redirect(`/${locale}/profile?notice=auth.verifyEmailSent`);
}

export async function logoutAction(fd: FormData) {
  const locale = localeOf(fd);
  const rt = await refreshToken();
  if (rt) await api('/auth/logout', { body: { refreshToken: rt }, auth: false }).catch(() => undefined);
  await clearTokens();
  redirect(`/${locale}`);
}

export async function forgotPasswordAction(fd: FormData) {
  const locale = localeOf(fd);
  await api('/auth/password/forgot', { body: { email: str(fd, 'email') }, auth: false }).catch(() => undefined);
  redirect(`/${locale}/forgot-password?notice=auth.resetRequested`);
}

export async function resetPasswordAction(fd: FormData) {
  const locale = localeOf(fd);
  const token = str(fd, 'token');
  try {
    await api('/auth/password/reset', { body: { token, password: String(fd.get('password') ?? '') }, auth: false });
  } catch (e) {
    fail(`/${locale}/reset-password`, e instanceof ApiRequestError ? e.code : 'common.errorGeneric', { token });
  }
  await clearTokens();
  redirect(`/${locale}/login?notice=auth.passwordChanged`);
}

export async function verifyEmailAction(fd: FormData) {
  const locale = localeOf(fd);
  try {
    await api('/auth/verify-email', { body: { token: str(fd, 'token') }, auth: false });
  } catch (e) {
    fail(`/${locale}/verify-email`, e instanceof ApiRequestError ? e.code : 'common.errorGeneric');
  }
  redirect(`/${locale}/profile?notice=auth.emailVerified`);
}

export async function resendVerificationAction(fd: FormData) {
  const locale = localeOf(fd);
  await api('/auth/verify-email/resend', { method: 'POST' }).catch(() => undefined);
  redirect(`/${locale}/profile?notice=auth.verifyEmailSent`);
}

/** Changes language: stores the preference (cookie + profile) and reloads the page in that language. */
export async function setLanguageAction(fd: FormData) {
  const target = str(fd, 'target');
  if (!isSupportedLocale(target)) return;
  (await cookies()).set(LOCALE_COOKIE, target, { path: '/', sameSite: 'lax', maxAge: 31_536_000 });
  await api<MeResponse>('/me', { method: 'PATCH', body: { locale: target } }).catch(() => undefined);
  const path = str(fd, 'path');
  redirect(`/${target}${/^\/[\w\-/]*$/.test(path) && path !== '/' ? path : ''}`);
}

export async function setThemeAction(fd: FormData) {
  const theme = str(fd, 'theme').toUpperCase();
  if (!['SYSTEM', 'LIGHT', 'DARK'].includes(theme)) return;
  (await cookies()).set(THEME_COOKIE, theme.toLowerCase(), { path: '/', sameSite: 'lax', maxAge: 31_536_000 });
  await api('/me', { method: 'PATCH', body: { theme } }).catch(() => undefined);
  const locale = localeOf(fd);
  const path = str(fd, 'path');
  redirect(`/${locale}${/^\/[\w\-/]*$/.test(path) && path !== '/' ? path : ''}`);
}

export async function addPassengerAction(fd: FormData) {
  const locale = localeOf(fd);
  const dob = str(fd, 'dateOfBirth');
  try {
    await api('/me/passengers', {
      body: { firstName: str(fd, 'firstName'), lastName: str(fd, 'lastName'), ...(dob ? { dateOfBirth: dob } : {}) },
    });
  } catch (e) {
    fail(`/${locale}/profile`, e instanceof ApiRequestError ? e.code : 'common.errorGeneric');
  }
  redirect(`/${locale}/profile?notice=profile.saved`);
}

export async function deletePassengerAction(fd: FormData) {
  const locale = localeOf(fd);
  await api(`/me/passengers/${encodeURIComponent(str(fd, 'id'))}`, { method: 'DELETE' }).catch(() => undefined);
  redirect(`/${locale}/profile`);
}
