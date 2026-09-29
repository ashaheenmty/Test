import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@tb/db';
import { bootApp, legalVersions, registerUser, uniqueEmail, type TestApp } from './helpers';

let t: TestApp;
const prisma = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@localhost:5432/tb_test?schema=app' });

beforeAll(async () => {
  t = await bootApp();
});
afterAll(async () => {
  await t.app.close();
  await prisma.$disconnect();
});

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const lastMailLink = (to: string) => {
  const mail = [...t.mailer.outbox].reverse().find((m) => m.to === to);
  const token = mail && /token=([A-Za-z0-9_-]+)/.exec(mail.text)?.[1];
  if (!token) throw new Error(`No mail with token for ${to}`);
  return { mail: mail!, token };
};

describe('health', () => {
  it('responds', async () => {
    const res = await t.http().get('/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('registration & login', () => {
  it('registers, returns tokens, records acceptance in the audit log and sends a localised verification mail', async () => {
    const { email, tokens } = await registerUser(t, { locale: 'fr' });
    expect(tokens.accessToken).toBeTruthy();
    const me = await t.http().get('/v1/me').set(auth(tokens.accessToken)).expect(200);
    expect(me.body).toMatchObject({ email, emailVerified: false, locale: 'fr', firstName: 'Lea', lastName: 'Becker' });

    const events = await prisma.auditEvent.findMany({ where: { entityId: me.body.id, action: 'user.registered' } });
    expect(events).toHaveLength(1);
    expect(events[0]!.data).toMatchObject({ acceptedAgentTerms: { version: '2026-09-draft' } });

    const { mail, token } = lastMailLink(email);
    expect(mail.subject).toBe('Veuillez confirmer votre adresse e-mail');
    expect(mail.text).toContain(`http://web.test/fr/verify-email?token=${token}`);

    await t.http().post('/v1/auth/verify-email').send({ token }).expect(204);
    await t.http().post('/v1/auth/verify-email').send({ token }).expect(400); // single use
    const after = await t.http().get('/v1/me').set(auth(tokens.accessToken)).expect(200);
    expect(after.body.emailVerified).toBe(true);
  });

  it('rejects outdated legal versions, weak passwords and duplicate emails', async () => {
    const base = { email: uniqueEmail(), password: 'a long enough passphrase', firstName: 'A', lastName: 'B' };
    const outdated = await t
      .http()
      .post('/v1/auth/register')
      .send({ ...base, acceptedAgentTermsVersion: 'old', acceptedPrivacyPolicyVersion: 'old' })
      .expect(409);
    expect(outdated.body.error.code).toBe('legal.outdatedVersion');

    const weak = await t
      .http()
      .post('/v1/auth/register')
      .send({ ...base, password: 'short', ...(await legalVersions(t)) })
      .expect(400);
    expect(weak.body.error.details[0]).toMatchObject({ path: 'password', message: 'password.tooShort' });

    const { email } = await registerUser(t);
    const dup = await t
      .http()
      .post('/v1/auth/register')
      .send({ ...base, email: email.toUpperCase(), ...(await legalVersions(t)) })
      .expect(409);
    expect(dup.body.error.code).toBe('auth.emailTaken');
  });

  it('logs in with correct credentials only', async () => {
    const { email, password } = await registerUser(t);
    await t.http().post('/v1/auth/login').send({ email, password }).expect(200);
    const bad = await t.http().post('/v1/auth/login').send({ email, password: 'wrong password!!' }).expect(401);
    expect(bad.body.error.code).toBe('auth.invalidCredentials');
    const unknown = await t.http().post('/v1/auth/login').send({ email: 'nobody@example.org', password: 'whatever12345' }).expect(401);
    expect(unknown.body.error.code).toBe('auth.invalidCredentials');
  });

  it('locks the account after 10 failed attempts', async () => {
    const { email, password } = await registerUser(t);
    for (let i = 0; i < 10; i++) {
      await t.http().post('/v1/auth/login').send({ email, password: `wrong-${i}-password` }).expect(401);
    }
    const locked = await t.http().post('/v1/auth/login').send({ email, password }).expect(429);
    expect(locked.body.error.code).toBe('auth.rateLimited');
  });

  it('rejects missing, malformed and admin tokens on customer routes', async () => {
    await t.http().get('/v1/me').expect(401);
    await t.http().get('/v1/me').set(auth('not-a-jwt')).expect(401);
    const admin = await t.http().post('/v1/admin/auth/login').send({ email: 'admin@example.com', password: 'admin test passphrase' }).expect(200);
    await t.http().get('/v1/me').set(auth(admin.body.accessToken)).expect(401);
  });
});

describe('refresh token rotation', () => {
  it('rotates, detects reuse and revokes the family', async () => {
    const { tokens } = await registerUser(t);
    const r1 = await t.http().post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(200);
    expect(r1.body.refreshToken).not.toBe(tokens.refreshToken);

    // Replaying the rotated token = theft signal → whole family revoked.
    await t.http().post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
    await t.http().post('/v1/auth/refresh').send({ refreshToken: r1.body.refreshToken }).expect(401);
    const reuse = await prisma.auditEvent.count({ where: { action: 'auth.refresh_reuse_detected' } });
    expect(reuse).toBeGreaterThan(0);
  });

  it('logout revokes the session', async () => {
    const { tokens } = await registerUser(t);
    await t.http().post('/v1/auth/logout').send({ refreshToken: tokens.refreshToken }).expect(204);
    await t.http().post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
  });
});

describe('password reset', () => {
  it('does not reveal whether an account exists, and resets + revokes sessions', async () => {
    await t.http().post('/v1/auth/password/forgot').send({ email: 'ghost@example.org' }).expect(202);
    const { email, tokens } = await registerUser(t);
    await t.http().post('/v1/auth/password/forgot').send({ email }).expect(202);
    const { mail, token } = lastMailLink(email);
    expect(mail.subject).toBe('Passwort zurücksetzen');

    await t.http().post('/v1/auth/password/reset').send({ token, password: 'my brand new passphrase' }).expect(204);
    await t.http().post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
    await t.http().post('/v1/auth/login').send({ email, password: 'my brand new passphrase' }).expect(200);
    await t.http().post('/v1/auth/password/reset').send({ token, password: 'another passphrase!' }).expect(400);
  });
});

describe('Sign in with Apple / Google (mock tokens)', () => {
  it('creates an account on first sign-in and reuses it afterwards', async () => {
    const email = uniqueEmail();
    const sub = `g-${Date.now()}`;
    const first = await t.http().post('/v1/auth/oauth/google').send({ idToken: `mock.google.${sub}.${email}`, locale: 'es', firstName: 'Ana', lastName: 'Ruiz' }).expect(200);
    expect(first.body.created).toBe(true);
    const second = await t.http().post('/v1/auth/oauth/google').send({ idToken: `mock.google.${sub}.${email}` }).expect(200);
    expect(second.body.created).toBe(false);
    const me = await t.http().get('/v1/me').set(auth(second.body.accessToken)).expect(200);
    expect(me.body).toMatchObject({ email, emailVerified: true, locale: 'es', firstName: 'Ana' });
  });

  it('linking to an unverified password account removes the unverified password (takeover protection)', async () => {
    const { email, password } = await registerUser(t);
    await t.http().post('/v1/auth/oauth/apple').send({ idToken: `mock.apple.a-${Date.now()}.${email}` }).expect(200);
    await t.http().post('/v1/auth/login').send({ email, password }).expect(401);
  });

  it('rejects tokens for the wrong provider', async () => {
    await t.http().post('/v1/auth/oauth/apple').send({ idToken: 'mock.google.x.y@example.org' }).expect(401);
    await t.http().post('/v1/auth/oauth/facebook').send({ idToken: 'mock.facebook.x.y@example.org' }).expect(404);
  });
});

describe('profile & saved travellers', () => {
  it('updates language/theme and manages passengers with encrypted date of birth', async () => {
    const { tokens } = await registerUser(t);
    const h = auth(tokens.accessToken);
    const patched = await t.http().patch('/v1/me').set(h).send({ locale: 'ar', theme: 'DARK' }).expect(200);
    expect(patched.body).toMatchObject({ locale: 'ar', theme: 'DARK' });
    await t.http().patch('/v1/me').set(h).send({ locale: 'xx' }).expect(400);

    const created = await t
      .http()
      .post('/v1/me/passengers')
      .set(h)
      .send({
        firstName: 'Mia',
        lastName: 'Becker',
        dateOfBirth: '2015-03-02',
        discountCards: [{ type: 'BAHNCARD_25', travelClass: 'SECOND', number: '7081 1234 5678 9012', validUntil: '2027-01-31' }],
      })
      .expect(201);
    expect(created.body).toMatchObject({ dateOfBirth: '2015-03-02', discountCards: [{ type: 'BAHNCARD_25', number: '7081 1234 5678 9012' }] });

    const raw = await prisma.passenger.findUniqueOrThrow({ where: { id: created.body.id }, include: { discountCards: true } });
    expect(raw.dateOfBirthEnc).toMatch(/^t1\./);
    expect(raw.dateOfBirthEnc).not.toContain('2015');
    expect(raw.discountCards[0]!.numberEnc).not.toContain('7081');

    const list = await t.http().get('/v1/me/passengers').set(h).expect(200);
    expect(list.body.map((p: { firstName: string }) => p.firstName)).toEqual(['Lea', 'Mia']);

    // Another user cannot touch it.
    const other = await registerUser(t);
    await t.http().delete(`/v1/me/passengers/${created.body.id}`).set(auth(other.tokens.accessToken)).expect(404);
    await t.http().delete(`/v1/me/passengers/${created.body.id}`).set(h).expect(204);
  });
});

describe('reference data (imported operator master list)', () => {
  it('lists and filters operators', async () => {
    const all = await t.http().get('/v1/reference/operators?pageSize=200').expect(200);
    expect(all.body.total).toBe(164);

    const bavaria = await t.http().get('/v1/reference/operators?region=DE-BY&segment=REGIONAL&pageSize=200').expect(200);
    const names = bavaria.body.items.map((o: { name: string }) => o.name);
    expect(names).toEqual(expect.arrayContaining(['DB Regio Bayern', 'agilis', 'Die Länderbahn']));

    const byBrand = await t.http().get('/v1/reference/operators?q=alex').expect(200);
    expect(byBrand.body.items.map((o: { slug: string }) => o.slug)).toContain('die-laenderbahn');

    const inactive = await t.http().get('/v1/reference/operators?status=INACTIVE').expect(200);
    expect(inactive.body.items.map((o: { name: string }) => o.name)).toEqual(['SJ']);
  });

  it('shows an operator with its cities and sales channels', async () => {
    const db = await t.http().get('/v1/reference/operators/db-fernverkehr').expect(200);
    expect(db.body.salesChannels.map((c: { code: string }) => c.code)).toEqual(
      expect.arrayContaining(['db-vertrieb', 'osdm-open-sales-distribution-model']),
    );
    const bvg = await t.http().get('/v1/reference/operators/bvg').expect(200);
    expect(bvg.body.cities).toEqual([{ city: 'Berlin', tariff: 'VBB' }]);
    await t.http().get('/v1/reference/operators/nope').expect(404);
  });

  it('lists tariff associations and sales channels', async () => {
    const tariffs = await t.http().get('/v1/reference/tariff-associations').expect(200);
    expect(tariffs.body).toHaveLength(43);
    const channels = await t.http().get('/v1/reference/sales-channels').expect(200);
    expect(channels.body.find((c: { code: string }) => c.code === 'mobility-inside').status).toBe('DISCONTINUED');
  });
});

describe('service fee', () => {
  it('lists the active fee schedule', async () => {
    const res = await t.http().get('/v1/pricing/service-fees').expect(200);
    expect(res.body.map((r: { kind: string; category: string; amountMinor: number }) => [r.kind, r.category, r.amountMinor])).toEqual([
      ['FIXED_PER_TICKET', 'LONG_DISTANCE_RAIL', 100],
      ['BOOKING_CAP', null, 100],
      ['FIXED_PER_TICKET', 'INTERCITY_REGIONAL', 50],
      ['FIXED_PER_TICKET', 'LOCAL_AND_BUS', 10],
    ]);
  });

  it('quotes per ticket and caps every booking at €1.00', async () => {
    const single = await t
      .http()
      .post('/v1/pricing/service-fee/quote')
      .send({
        tickets: [
          { modes: ['REGIONAL_RAIL'], operators: ['db-regio-bayern'], fareMinor: 2380 },
          { modes: ['REGIONAL_RAIL'], operators: ['db-regio-bayern'], fareMinor: 1990 },
          { modes: ['REGIONAL_RAIL'], operators: ['db-regio-bayern'], fareMinor: 1590 },
        ],
      })
      .expect(200);
    expect(single.body).toMatchObject({ total: { amountMinor: 100, currency: 'EUR' }, operatorCount: 1, cappedFrom: { amountMinor: 150 } });

    const multi = await t
      .http()
      .post('/v1/pricing/service-fee/quote')
      .send({
        tickets: [
          { modes: ['U_BAHN'], operators: ['bvg'], fareMinor: 380 },
          { modes: ['HIGH_SPEED_RAIL'], operators: ['db-fernverkehr'], fareMinor: 7990 },
          { modes: ['U_BAHN'], operators: ['mvg'], fareMinor: 390 },
        ],
      })
      .expect(200);
    expect(multi.body).toMatchObject({ total: { amountMinor: 100 }, operatorCount: 3, cappedFrom: { amountMinor: 120 } });

    await t.http().post('/v1/pricing/service-fee/quote').send({ tickets: [{ modes: ['ROCKET'], operators: ['x'], fareMinor: 1 }] }).expect(400);
    await t.http().post('/v1/pricing/service-fee/quote').send({ tickets: [{ modes: ['BUS'], fareMinor: 1 }] }).expect(400);
  });
});

describe('legal documents', () => {
  it('serves versioned documents per language with German fallback', async () => {
    const ar = await t.http().get('/v1/legal/impressum?locale=ar').expect(200);
    expect(ar.body).toMatchObject({ locale: 'ar', title: 'بيانات الناشر', version: '2026-09-draft' });
    expect(ar.body.body).toContain('PLACEHOLDER Reisevermittlung GmbH');
    const fallback = await t.http().get('/v1/legal/agent-terms?locale=xx').expect(200);
    expect(fallback.body.locale).toBe('de');
    await t.http().get('/v1/legal/conditions-of-carriage').expect(404);
  });
});

describe('admin back-office', () => {
  async function adminToken(roles: ('SUPER_ADMIN' | 'SUPPORT' | 'OPS' | 'CONTENT' | 'FINANCE')[]) {
    const email = `${roles.join('-').toLowerCase()}-${Date.now()}@example.com`;
    const argon2 = await import('argon2');
    await prisma.adminUser.create({
      data: { email, name: 'Test', roles, passwordHash: await argon2.default.hash('admin passphrase 123') },
    });
    const res = await t.http().post('/v1/admin/auth/login').send({ email, password: 'admin passphrase 123' }).expect(200);
    return res.body.accessToken as string;
  }

  it('enforces roles', async () => {
    const content = await adminToken(['CONTENT']);
    await t.http().get('/v1/admin/me').set(auth(content)).expect(200);
    await t.http().get('/v1/admin/audit').set(auth(content)).expect(403);
    await t.http().patch('/v1/admin/operators/sj').set(auth(content)).send({ status: 'ACTIVE' }).expect(403);
    await t.http().get('/v1/admin/audit/verify').set(auth(await adminToken(['SUPPORT']))).expect(403);
  });

  it('rejects customer tokens', async () => {
    const { tokens } = await registerUser(t);
    await t.http().get('/v1/admin/me').set(auth(tokens.accessToken)).expect(401);
  });

  it('updates an operator with an audit trail and verifies the chain', async () => {
    const ops = await adminToken(['OPS']);
    const res = await t.http().patch('/v1/admin/operators/abellio-rail-mitteldeutschland').set(auth(ops)).send({ status: 'ACTIVE' }).expect(200);
    expect(res.body.status).toBe('ACTIVE');

    const support = await adminToken(['SUPPORT']);
    const log = await t.http().get('/v1/admin/audit?action=admin.operator_updated').set(auth(support)).expect(200);
    expect(log.body.items[0].data).toMatchObject({ before: { status: 'NEEDS_REVIEW' }, after: { status: 'ACTIVE' } });

    const superAdmin = await adminToken(['SUPER_ADMIN']);
    const verify = await t.http().get('/v1/admin/audit/verify').set(auth(superAdmin)).expect(200);
    expect(verify.body).toMatchObject({ ok: true });
    expect(verify.body.checked).toBeGreaterThan(10);
  });
});
