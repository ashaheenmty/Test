/**
 * Integration test against a real PostgreSQL (DATABASE_URL, migrated).
 * Verifies the append-only triggers and the hash chain end-to-end.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { appendAuditEvent, verifyAuditChain } from './audit';

const prisma = new PrismaClient();
afterAll(() => prisma.$disconnect());

describe('records.AuditEvent in PostgreSQL', () => {
  it('appends concurrently without forking the chain', async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        appendAuditEvent(prisma, {
          actorType: 'SYSTEM',
          action: 'test.concurrent',
          entityType: 'Test',
          entityId: String(i),
          data: { i },
        }),
      ),
    );
    const result = await verifyAuditChain(prisma, 7);
    expect(result.ok).toBe(true);
    expect(result.checked).toBeGreaterThanOrEqual(20);
  });

  it('rejects UPDATE, DELETE and TRUNCATE', async () => {
    const e = await appendAuditEvent(prisma, {
      actorType: 'SYSTEM',
      action: 'test.immutable',
      entityType: 'Test',
      entityId: 'x',
    });
    await expect(
      prisma.auditEvent.update({ where: { id: e.id }, data: { action: 'tampered' } }),
    ).rejects.toThrow(/append-only/);
    await expect(prisma.auditEvent.delete({ where: { id: e.id } })).rejects.toThrow(/append-only/);
    await expect(prisma.$executeRawUnsafe('TRUNCATE records."AuditEvent"')).rejects.toThrow(/append-only/);
  });
});
