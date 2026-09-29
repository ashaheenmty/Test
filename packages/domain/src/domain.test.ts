import { describe, expect, it } from 'vitest';
import {
  add,
  allocate,
  applyBasisPoints,
  canonicalJson,
  formatMoney,
  money,
  passwordSchema,
  registerSchema,
  splitGross,
  sum,
} from './index';

describe('money', () => {
  it('rejects fractional minor units', () => {
    expect(() => money(10.5)).toThrow(RangeError);
  });

  it('refuses to mix currencies', () => {
    expect(() => add(money(100, 'EUR'), money(100, 'CHF'))).toThrow(TypeError);
  });

  it('sums', () => {
    expect(sum([money(199), money(1), money(4900)]).amountMinor).toBe(5100);
  });

  it('applies basis points with half-away-from-zero rounding', () => {
    expect(applyBasisPoints(money(1999), 500).amountMinor).toBe(100); // 99.95 -> 100
    expect(applyBasisPoints(money(-1999), 500).amountMinor).toBe(-100);
  });

  it('allocates without losing cents', () => {
    const parts = allocate(money(100), [1, 1, 1]);
    expect(parts.map((p) => p.amountMinor)).toEqual([34, 33, 33]);
    expect(sum(parts).amountMinor).toBe(100);
    const weighted = allocate(money(1001), [8990, 450, 1250]);
    expect(sum(weighted).amountMinor).toBe(1001);
  });

  it('splits gross into net and VAT (19 %)', () => {
    const { net, vat } = splitGross(money(119), 1900);
    expect(net.amountMinor).toBe(100);
    expect(vat.amountMinor).toBe(19);
    const odd = splitGross(money(199), 1900);
    expect(odd.net.amountMinor + odd.vat.amountMinor).toBe(199);
  });

  it('formats per locale', () => {
    expect(formatMoney(money(12345), 'de')).toMatch(/123,45\s?€/);
    expect(formatMoney(money(12345), 'en')).toBe('€123.45');
  });
});

describe('canonicalJson', () => {
  it('is independent of key order and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 1, e: 2 }] }, x: undefined })).toBe(
      canonicalJson({ a: { c: [3, { e: 2, f: 1 }], d: 2 }, b: 1 }),
    );
  });
  it('serialises dates as ISO strings', () => {
    expect(canonicalJson({ t: new Date('2026-01-01T00:00:00Z') })).toBe('{"t":"2026-01-01T00:00:00.000Z"}');
  });
});

describe('validation schemas', () => {
  it('enforces password length', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('a sufficiently long passphrase').success).toBe(true);
  });

  it('normalises email and defaults locale to German', () => {
    const r = registerSchema.parse({
      email: '  Anna@Example.DE ',
      password: 'correct horse battery',
      firstName: 'Anna',
      lastName: 'Schmidt',
      acceptedAgentTermsVersion: '2026-09',
      acceptedPrivacyPolicyVersion: '2026-09',
    });
    expect(r.email).toBe('anna@example.de');
    expect(r.locale).toBe('de');
  });
});
