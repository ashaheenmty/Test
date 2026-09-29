import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { ApiError } from '../common/errors';
import { ENV, type Env } from '../config/env';

export type OAuthProvider = 'apple' | 'google';

export interface VerifiedIdentity {
  provider: 'APPLE' | 'GOOGLE';
  subject: string;
  email: string | null;
  emailVerified: boolean;
}

const PROVIDERS = {
  apple: { issuers: ['https://appleid.apple.com'], jwks: 'https://appleid.apple.com/auth/keys' },
  google: {
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    jwks: 'https://www.googleapis.com/oauth2/v3/certs',
  },
} as const;

/**
 * Verifies Sign in with Apple / Google ID tokens obtained natively on the device
 * (or via the web SDKs). The API never sees the user's provider password.
 */
@Injectable()
export class OAuthVerifier {
  private readonly jwks = new Map<OAuthProvider, JWTVerifyGetKey>();

  constructor(@Inject(ENV) private readonly env: Env) {}

  async verify(provider: OAuthProvider, idToken: string): Promise<VerifiedIdentity> {
    const upper = provider === 'apple' ? 'APPLE' : 'GOOGLE';
    if (this.env.AUTH_OAUTH_MOCK && idToken.startsWith('mock.')) {
      // mock.<provider>.<subject>.<email>  (subject must not contain dots; the email may)
      const [, p, subject, ...rest] = idToken.split('.');
      const email = rest.join('.');
      if (p !== provider || !subject || !email) throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');
      return { provider: upper, subject, email: decodeURIComponent(email).toLowerCase(), emailVerified: true };
    }

    const audiences = provider === 'apple' ? this.env.APPLE_CLIENT_IDS : this.env.GOOGLE_CLIENT_IDS;
    if (audiences.length === 0) throw new ApiError(HttpStatus.SERVICE_UNAVAILABLE, 'auth.providerNotConfigured');
    let jwks = this.jwks.get(provider);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(PROVIDERS[provider].jwks));
      this.jwks.set(provider, jwks);
    }
    try {
      const { payload } = await jwtVerify(idToken, jwks, {
        issuer: [...PROVIDERS[provider].issuers],
        audience: audiences,
      });
      const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
      const verified = payload.email_verified === true || payload.email_verified === 'true';
      return { provider: upper, subject: payload.sub!, email, emailVerified: Boolean(email && verified) };
    } catch {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');
    }
  }
}
