import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Env } from './config/env';

export async function createApp(env: Env): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env), {
    logger: env.NODE_ENV === 'test' ? ['error'] : ['log', 'warn', 'error'],
  });
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.use(helmet());
  app.enableCors({
    origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : false,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();
  // BigInt ids (audit log) serialise as strings.
  (BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (this: bigint) {
    return this.toString();
  };
  return app;
}
