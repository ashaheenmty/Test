import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FieldCrypto } from './field-crypto';

const key = () => randomBytes(32).toString('base64');

describe('FieldCrypto', () => {
  const k1 = key();
  const crypto = new FieldCrypto(`v1:${k1}`);

  it('round-trips and uses a fresh IV each time', () => {
    const a = crypto.encrypt('1990-05-17', 'passenger:1');
    const b = crypto.encrypt('1990-05-17', 'passenger:1');
    expect(a).not.toBe(b);
    expect(a.startsWith('v1.')).toBe(true);
    expect(crypto.decrypt(a, 'passenger:1')).toBe('1990-05-17');
  });

  it('detects tampering', () => {
    const [id, iv, tag, ct] = crypto.encrypt('secret').split('.');
    const flipped = Buffer.from(ct!, 'base64url');
    flipped[0]! ^= 1;
    expect(() => crypto.decrypt([id, iv, tag, flipped.toString('base64url')].join('.'))).toThrow();
  });

  it('binds ciphertext to its context (AAD)', () => {
    const v = crypto.encrypt('x', 'passenger:1');
    expect(() => crypto.decrypt(v, 'passenger:2')).toThrow();
  });

  it('supports key rotation', () => {
    const old = crypto.encrypt('keep me');
    const rotated = new FieldCrypto(`v2:${key()},v1:${k1}`);
    expect(rotated.decrypt(old)).toBe('keep me');
    expect(rotated.encrypt('new').startsWith('v2.')).toBe(true);
  });

  it('rejects short keys', () => {
    expect(() => new FieldCrypto(`v1:${randomBytes(16).toString('base64')}`)).toThrow(/32 bytes/);
  });
});
