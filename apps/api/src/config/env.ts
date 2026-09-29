import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const list = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []));

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z.string().url(),
    /** HMAC secret for customer access tokens (≥ 32 chars). */
    JWT_ACCESS_SECRET: z.string().min(32),
    /** Separate secret for back-office tokens so a leaked app secret cannot mint admin tokens. */
    JWT_ADMIN_SECRET: z.string().min(32),
    /**
     * Field-encryption keys, comma-separated "keyId:base64(32 bytes)". The first key encrypts;
     * all keys decrypt (rotation).
     */
    FIELD_ENCRYPTION_KEYS: z.string().min(10),
    APP_WEB_URL: z.string().url().default('http://localhost:3000'),
    CORS_ORIGINS: list,
    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string().default('Durch Deutschland <no-reply@example.com>'),
    /** Accept mock Apple/Google ID tokens ("mock.<provider>.<sub>.<email>"). Never in production. */
    AUTH_OAUTH_MOCK: bool,
    APPLE_CLIENT_IDS: list,
    GOOGLE_CLIENT_IDS: list,
    TRUST_PROXY: bool,
    /** Disables rate limiting (integration tests only; rejected in production). */
    THROTTLE_DISABLED: bool,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.AUTH_OAUTH_MOCK) {
      ctx.addIssue({ code: 'custom', path: ['AUTH_OAUTH_MOCK'], message: 'must be off in production' });
    }
    if (env.NODE_ENV === 'production' && env.THROTTLE_DISABLED) {
      ctx.addIssue({ code: 'custom', path: ['THROTTLE_DISABLED'], message: 'must be off in production' });
    }
    if (env.JWT_ACCESS_SECRET === env.JWT_ADMIN_SECRET) {
      ctx.addIssue({ code: 'custom', path: ['JWT_ADMIN_SECRET'], message: 'must differ from JWT_ACCESS_SECRET' });
    }
  });

export type Env = z.infer<typeof envSchema>;

export const ENV = Symbol('ENV');

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}
