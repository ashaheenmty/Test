import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.controller';
import { AuditModule } from './audit/audit.service';
import { AuthModule } from './auth/auth.module';
import { ApiExceptionFilter } from './common/errors';
import { ENV, type Env } from './config/env';
import { SETTINGS, settingsProvider } from './config/settings.provider';
import { CryptoModule } from './crypto/crypto.module';
import { HealthModule } from './health/health.controller';
import { LegalModule } from './legal/legal.controller';
import { MailModule } from './mail/mailer.service';
import { PricingModule } from './pricing/pricing.controller';
import { PrismaModule } from './prisma/prisma.service';
import { ReferenceModule } from './reference/reference.controller';
import { UsersModule } from './users/users.controller';

@Module({})
class ConfigModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: ConfigModule,
      global: true,
      providers: [{ provide: ENV, useValue: env }, settingsProvider],
      exports: [ENV, SETTINGS],
    };
  }
}

@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(env),
        // Default: 120 requests/minute per IP; auth endpoints are stricter (see @Throttle).
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
          skipIf: () => env.THROTTLE_DISABLED,
        }),
        PrismaModule,
        AuditModule,
        MailModule,
        CryptoModule,
        AuthModule,
        UsersModule,
        ReferenceModule,
        LegalModule,
        PricingModule,
        AdminModule,
        HealthModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    };
  }
}
