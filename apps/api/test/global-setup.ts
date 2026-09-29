import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Prepares the test database (TEST_DATABASE_URL) non-destructively: applies pending
 * migrations and runs the idempotent seed. Tests create uniquely named data, so the
 * suite can run repeatedly against the same database without wiping it.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@localhost:5432/tb_test?schema=app';
  if (!/test/.test(url)) throw new Error(`Refusing to use a non-test database: ${url}`);
  const env = { ...process.env, DATABASE_URL: url, SEED_ADMIN_PASSWORD: 'admin test passphrase', NODE_ENV: 'test' };
  const db = resolve(__dirname, '../../../packages/db');
  execSync('npx prisma migrate deploy', { cwd: db, env, stdio: 'pipe' });
  execSync('npx tsx src/seed.ts', { cwd: db, env, stdio: 'pipe' });
  process.env.DATABASE_URL = url;
}
