import { Global, Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { FieldCrypto } from './field-crypto';

@Global()
@Module({
  providers: [{ provide: FieldCrypto, inject: [ENV], useFactory: (env: Env) => new FieldCrypto(env.FIELD_ENCRYPTION_KEYS) }],
  exports: [FieldCrypto],
})
export class CryptoModule {}
