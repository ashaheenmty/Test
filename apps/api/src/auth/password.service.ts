import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

/**
 * argon2id with OWASP-recommended parameters (19 MiB, t=2, p=1).
 * A pre-computed dummy hash keeps login timing identical for unknown accounts.
 */
@Injectable()
export class PasswordService {
  private readonly options = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
  private dummyHash: Promise<string> | null = null;

  hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  async verify(hash: string | null | undefined, password: string): Promise<boolean> {
    if (!hash) {
      this.dummyHash ??= this.hash('dummy password for timing equalisation');
      await argon2.verify(await this.dummyHash, password).catch(() => false);
      return false;
    }
    return argon2.verify(hash, password).catch(() => false);
  }
}
