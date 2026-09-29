import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootApp, type TestApp } from './helpers';

let t: TestApp;
beforeAll(async () => {
  t = await bootApp({ THROTTLE_DISABLED: 'false' });
});
afterAll(() => t.app.close());

describe('rate limiting', () => {
  it('limits login attempts to 10 per minute per client', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await t.http().post('/v1/auth/login').send({ email: `nobody${i}@example.org`, password: 'wrong password 123' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });
});
