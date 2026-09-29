/**
 * Background worker (BullMQ on Redis).
 *
 * Phase 1: nightly verification of the hash-chained audit log.
 * Later phases add: real-time watcher per active booking (phase 5), push/email
 * notifications, operator document fetching and PDF rendering (phase 4),
 * monthly settlement runs (phase 7).
 */
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { appendAuditEvent, PrismaClient, verifyAuditChain } from '@tb/db';

const QUEUE = 'maintenance';
const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
};

const prisma = new PrismaClient();
const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), service: 'worker', msg, ...extra }));

async function verifyAudit() {
  const result = await verifyAuditChain(prisma);
  await appendAuditEvent(prisma, {
    actorType: 'SYSTEM',
    action: result.ok ? 'audit.chain_verified' : 'audit.chain_broken',
    entityType: 'AuditLog',
    entityId: 'chain',
    data: { ...result },
  });
  if (!result.ok) log('AUDIT CHAIN BROKEN — investigate immediately', { ...result, level: 'error' });
  return result;
}

async function main() {
  const queue = new Queue(QUEUE, { connection });
  // Every night at 03:17 Europe/Berlin (off the hour to spread load).
  await queue.upsertJobScheduler('audit-verify-nightly', { pattern: '17 3 * * *', tz: 'Europe/Berlin' }, { name: 'audit-verify' });

  const worker = new Worker(
    QUEUE,
    async (job) => {
      if (job.name === 'audit-verify') return verifyAudit();
      throw new Error(`Unknown job ${job.name}`);
    },
    { connection, concurrency: 1 },
  );
  worker.on('completed', (job, result) => log('job completed', { job: job.name, result }));
  worker.on('failed', (job, err) => log('job failed', { job: job?.name, error: err.message, level: 'error' }));

  if (process.argv.includes('--run-now')) {
    await queue.add('audit-verify', {});
  }
  log('worker started', { queue: QUEUE, redis: redisUrl.host });

  const shutdown = async () => {
    await worker.close();
    await queue.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
