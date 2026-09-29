import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Application-level encryption for sensitive personal fields (date of birth,
 * discount-card numbers). AES-256-GCM with a random 96-bit IV per value.
 *
 * Format: "<keyId>.<iv b64url>.<tag b64url>.<ciphertext b64url>"
 * The key id makes key rotation possible: new values use the first key, old
 * values stay decryptable as long as their key remains configured.
 *
 * In production the keys should come from a KMS / secret manager.
 */
export class FieldCrypto {
  private readonly keys = new Map<string, Buffer>();
  private readonly activeKeyId: string;

  constructor(config: string) {
    const entries = config.split(',').map((e) => e.trim()).filter(Boolean);
    if (entries.length === 0) throw new Error('FIELD_ENCRYPTION_KEYS is empty');
    for (const entry of entries) {
      const [id, b64] = entry.split(':');
      if (!id || !b64 || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`Invalid key entry "${id ?? ''}"`);
      const key = Buffer.from(b64, 'base64');
      if (key.length !== 32) throw new Error(`Key "${id}" must be 32 bytes (base64)`);
      this.keys.set(id, key);
    }
    this.activeKeyId = entries[0]!.split(':')[0]!;
  }

  encrypt(plaintext: string, aad = ''): string {
    const key = this.keys.get(this.activeKeyId)!;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(aad));
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [this.activeKeyId, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.');
  }

  decrypt(value: string, aad = ''): string {
    const [keyId, iv, tag, ct] = value.split('.');
    const key = keyId ? this.keys.get(keyId) : undefined;
    if (!key || !iv || !tag || ct === undefined) throw new Error('Unreadable encrypted value');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
  }

  encryptOptional(v: string | undefined | null, aad = ''): string | null {
    return v ? this.encrypt(v, aad) : null;
  }

  decryptOptional(v: string | undefined | null, aad = ''): string | null {
    return v ? this.decrypt(v, aad) : null;
  }
}
