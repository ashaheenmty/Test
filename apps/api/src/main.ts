import { Logger } from '@nestjs/common';
import { createApp } from './bootstrap';
import { loadEnv } from './config/env';

async function main() {
  const env = loadEnv();
  const app = await createApp(env);
  await app.listen(env.PORT);
  Logger.log(`API listening on http://localhost:${env.PORT}/v1`, 'Bootstrap');
}

void main();
