import { randomBytes } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from '../src/bootstrap';
import { loadEnv } from '../src/config/env';
import { MailerService } from '../src/mail/mailer.service';

export const testEnv = (overrides: Record<string, string> = {}) =>
  loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@localhost:5432/tb_test?schema=app',
    JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdef0123',
    JWT_ADMIN_SECRET: 'test-admin-secret-0123456789abcdef01234',
    FIELD_ENCRYPTION_KEYS: `t1:${randomBytes(32).toString('base64')}`,
    AUTH_OAUTH_MOCK: 'true',
    APP_WEB_URL: 'http://web.test',
    THROTTLE_DISABLED: 'true',
    ...overrides,
  });

export async function bootApp(overrides: Record<string, string> = {}) {
  process.env.DATABASE_URL = testEnv().DATABASE_URL;
  const app = await createApp(testEnv(overrides));
  await app.init();
  return { app, http: () => request(app.getHttpServer()), mailer: app.get(MailerService) };
}

export type TestApp = Awaited<ReturnType<typeof bootApp>>;

export async function legalVersions(t: TestApp) {
  const res = await t.http().get('/v1/legal/versions?locale=de').expect(200);
  return {
    acceptedAgentTermsVersion: res.body.AGENT_TERMS.version as string,
    acceptedPrivacyPolicyVersion: res.body.PRIVACY_POLICY.version as string,
  };
}

let counter = 0;
export function uniqueEmail() {
  counter += 1;
  return `user${Date.now()}${counter}@example.org`;
}

export async function registerUser(t: TestApp, overrides: Record<string, unknown> = {}) {
  const email = uniqueEmail();
  const password = 'a long enough passphrase';
  const res = await t
    .http()
    .post('/v1/auth/register')
    .send({ email, password, firstName: 'Lea', lastName: 'Becker', ...(await legalVersions(t)), ...overrides })
    .expect(201);
  return { email, password, tokens: res.body as { accessToken: string; refreshToken: string } };
}

export { NestExpressApplication };
