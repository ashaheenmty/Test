import { createHash } from 'node:crypto';
import { canonicalJson } from '@tb/domain';
import { Prisma, type AuditActorType, type AuditEvent, type PrismaClient } from '@prisma/client';

/**
 * Append-only, hash-chained audit log.
 *
 * hash_n = sha256(hash_{n-1} || canonicalJson(event_n))
 *
 * Any modification or deletion of an earlier row breaks every later hash, which
 * verifyAuditChain() detects. The database additionally rejects UPDATE/DELETE/TRUNCATE
 * on records."AuditEvent" via trigger (see the initial migration).
 */

export const GENESIS_HASH = '0'.repeat(64);

/** Arbitrary constant used for pg_advisory_xact_lock to serialise appends. */
const AUDIT_LOCK_KEY = 727_001;

export interface AuditInput {
  actorType: AuditActorType;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  data?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export interface HashableAuditEvent extends AuditInput {
  occurredAt: Date;
}

export function computeAuditHash(prevHash: string, event: HashableAuditEvent): string {
  const payload = canonicalJson({
    occurredAt: event.occurredAt,
    actorType: event.actorType,
    actorId: event.actorId ?? null,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    data: event.data ?? {},
    ip: event.ip ?? null,
    userAgent: event.userAgent ?? null,
  });
  return createHash('sha256').update(prevHash).update(payload).digest('hex');
}

type Tx = Prisma.TransactionClient;

async function appendInTx(tx: Tx, input: AuditInput): Promise<AuditEvent> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_LOCK_KEY})`;
  const last = await tx.auditEvent.findFirst({ orderBy: { id: 'desc' }, select: { hash: true } });
  const prevHash = last?.hash ?? GENESIS_HASH;
  const occurredAt = new Date();
  const event: HashableAuditEvent = { ...input, occurredAt };
  return tx.auditEvent.create({
    data: {
      occurredAt,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      data: (input.data ?? {}) as Prisma.InputJsonValue,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      prevHash,
      hash: computeAuditHash(prevHash, event),
    },
  });
}

/**
 * Appends an audit event. Pass a transaction client to make the audit entry
 * part of the same transaction as the business change it records.
 */
export async function appendAuditEvent(db: PrismaClient | Tx, input: AuditInput): Promise<AuditEvent> {
  if ('$transaction' in db) {
    return (db as PrismaClient).$transaction((tx) => appendInTx(tx, input));
  }
  return appendInTx(db as Tx, input);
}

export interface ChainVerification {
  ok: boolean;
  checked: number;
  firstBrokenId: string | null;
  reason: string | null;
}

export function verifyEvents(
  events: Pick<
    AuditEvent,
    'id' | 'occurredAt' | 'actorType' | 'actorId' | 'action' | 'entityType' | 'entityId' | 'data' | 'ip' | 'userAgent' | 'prevHash' | 'hash'
  >[],
  startHash = GENESIS_HASH,
): ChainVerification {
  let prev = startHash;
  let checked = 0;
  for (const e of events) {
    if (e.prevHash !== prev) {
      return { ok: false, checked, firstBrokenId: e.id.toString(), reason: 'prevHash does not match previous event' };
    }
    const expected = computeAuditHash(prev, {
      occurredAt: e.occurredAt,
      actorType: e.actorType,
      actorId: e.actorId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      data: e.data as Record<string, unknown>,
      ip: e.ip,
      userAgent: e.userAgent,
    });
    if (expected !== e.hash) {
      return { ok: false, checked, firstBrokenId: e.id.toString(), reason: 'hash does not match content' };
    }
    prev = e.hash;
    checked++;
  }
  return { ok: true, checked, firstBrokenId: null, reason: null };
}

/** Streams the whole chain in batches and verifies it. */
export async function verifyAuditChain(db: PrismaClient, batchSize = 1000): Promise<ChainVerification> {
  let cursor: bigint | undefined;
  let prev = GENESIS_HASH;
  let total = 0;
  for (;;) {
    const batch = await db.auditEvent.findMany({
      where: cursor === undefined ? {} : { id: { gt: cursor } },
      orderBy: { id: 'asc' },
      take: batchSize,
    });
    if (batch.length === 0) break;
    const result = verifyEvents(batch, prev);
    if (!result.ok) return { ...result, checked: total + result.checked };
    total += result.checked;
    prev = batch[batch.length - 1]!.hash;
    cursor = batch[batch.length - 1]!.id;
  }
  return { ok: true, checked: total, firstBrokenId: null, reason: null };
}
