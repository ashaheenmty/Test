import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import * as domain from '@tb/domain';
import { computeAuditHash, GENESIS_HASH, verifyEvents } from './audit';
import { normaliseWorkbook, slugify, type NormalisedData } from './operators/normalise';
import { readWorkbook } from './operators/read-workbook';

const root = resolve(__dirname, '../../..');

describe('Prisma enums match @tb/domain enums', () => {
  const schema = readFileSync(resolve(__dirname, '../prisma/schema.prisma'), 'utf8');
  const prismaEnums = new Map<string, string[]>();
  for (const m of schema.matchAll(/enum (\w+) \{([^}]*)\}/g)) {
    prismaEnums.set(
      m[1]!,
      m[2]!
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('@@') && !l.startsWith('//')),
    );
  }
  const shared = Object.entries(domain).filter(
    ([name, value]) => Array.isArray(value) && prismaEnums.has(name),
  ) as [string, string[]][];

  it('finds the shared enums', () => {
    expect(shared.map(([n]) => n).sort()).toEqual(
      [
        'AdminRole',
        'BookingStatus',
        'ConsentPurpose',
        'DiscountCardType',
        'LegalDocumentType',
        'MerchantOfRecord',
        'OperatorSegment',
        'OrganisationStatus',
        'SalesChannelKind',
        'ServiceFeeCategory',
        'ServiceFeeKind',
        'ThemePreference',
        'TicketContractKind',
        'TransportMode',
        'TravelClass',
      ].sort(),
    );
  });

  it.each(shared)('%s', (name, values) => {
    expect(values).toEqual(prismaEnums.get(name));
  });
});

describe('audit hash chain', () => {
  const base = {
    actorType: 'SYSTEM' as const,
    actorId: null,
    action: 'test.event',
    entityType: 'Test',
    entityId: '1',
    ip: null,
    userAgent: null,
  };

  function chain(n: number) {
    const events = [];
    let prev = GENESIS_HASH;
    for (let i = 0; i < n; i++) {
      const e = { ...base, id: BigInt(i + 1), occurredAt: new Date(1_700_000_000_000 + i), data: { i, nested: { b: 1, a: 2 } } };
      const hash = computeAuditHash(prev, e);
      events.push({ ...e, prevHash: prev, hash });
      prev = hash;
    }
    return events;
  }

  it('verifies an intact chain', () => {
    expect(verifyEvents(chain(5))).toMatchObject({ ok: true, checked: 5 });
  });

  it('is independent of JSON key order', () => {
    const a = computeAuditHash(GENESIS_HASH, { ...base, occurredAt: new Date(0), data: { x: 1, y: 2 } });
    const b = computeAuditHash(GENESIS_HASH, { ...base, occurredAt: new Date(0), data: { y: 2, x: 1 } });
    expect(a).toBe(b);
  });

  it('detects tampered content', () => {
    const events = chain(5);
    events[2] = { ...events[2]!, data: { i: 999, nested: { a: 2, b: 1 } } };
    expect(verifyEvents(events)).toMatchObject({ ok: false, firstBrokenId: '3', reason: 'hash does not match content' });
  });

  it('detects deleted events', () => {
    const events = chain(5);
    events.splice(1, 1);
    expect(verifyEvents(events)).toMatchObject({ ok: false, firstBrokenId: '3' });
  });
});

describe('operator master-list import', () => {
  let data: NormalisedData;
  beforeAll(async () => {
    const wb = await readWorkbook(resolve(root, 'data/operators/Germany_Transport_Providers.xlsx'));
    data = normaliseWorkbook(wb, new Date('2026-09-27T00:00:00Z'));
  });

  const op = (name: string) => data.operators.find((o) => o.slug === slugify(name));

  it('imports without warnings', () => {
    expect(data.warnings).toEqual([]);
  });

  it('de-duplicates operators listed once per state', () => {
    const slugs = data.operators.map((o) => o.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(data.operators.length).toBeGreaterThanOrEqual(150);
    expect(data.operators.length).toBeLessThanOrEqual(175);
    expect(op('ODEG')!.regions.filter((r) => r.type === 'FEDERAL_STATE').map((r) => r.code).sort()).toEqual([
      'DE-BB',
      'DE-BE',
      'DE-MV',
      'DE-SN',
    ]);
  });

  it('merges spelling variants and keeps brands', () => {
    const laenderbahn = op('Die Länderbahn')!;
    expect(laenderbahn.brands).toEqual(expect.arrayContaining(['alex', 'trilex', 'vogtlandbahn']));
    expect(op('Hessische Landesbahn')!.brands).toContain('HLB');
    expect(op('Albtal-Verkehrs-Gesellschaft')!.regions.map((r) => r.code)).toEqual(
      expect.arrayContaining(['DE-BW', 'DE-RP', 'Karlsruhe', 'Heilbronn']),
    );
    expect(op('ÖBB')!.groupName).not.toMatch(/^\+/);
    expect(op('ÖBB')!.notes).toContain('Partners: MÁV, HŽPP, etc.');
    expect(op('ÖBB')!.segments).toEqual(expect.arrayContaining(['NIGHT', 'CROSS_BORDER', 'REGIONAL']));
    expect(op('SNCF Voyageurs')!.brands).toEqual(expect.arrayContaining(['TGV INOUI', 'TER Grand Est']));
    expect(op('DB Fernverkehr')!.brands).toContain('Sylt Shuttle');
    expect(op('DB Sylt Shuttle')).toBeUndefined();
  });

  it('maps DB S-Bahn brands in the city tab to the right DB Regio unit', () => {
    const munich = data.cityTransit.find((c) => c.city === 'Munich')!;
    expect(munich.operatorSlugs).toEqual(['mvg', 'db-regio-bayern']);
    expect(munich.tariffShortName).toBe('MVV');
  });

  it('applies status overrides for outdated rows', () => {
    expect(op('SJ')!.status).toBe('INACTIVE');
    expect(op('Abellio Rail Mitteldeutschland')!.status).toBe('NEEDS_REVIEW');
    const mi = data.salesChannels.find((c) => c.code === 'mobility-inside')!;
    expect(mi.status).toBe('DISCONTINUED');
    expect(mi.adapterKey).toBeNull();
  });

  it('resolves every city tariff association', () => {
    const unresolved = data.cityTransit.filter((c) => !c.tariffShortName).map((c) => c.city);
    expect(unresolved).toEqual(['Schwerin']); // listed as "—" in the sheet
    expect(data.cityTransit.find((c) => c.city === 'Karlsruhe')!.tariffNote).toMatch(/VPE Pforzheim/);
  });

  it('classifies tariffs and sales channels', () => {
    expect(data.tariffAssociations.find((t) => t.shortName.startsWith('Deutschlandtarif'))!.kind).toBe('NATIONAL_TARIFF');
    expect(data.tariffAssociations.find((t) => t.shortName === 'Deutschland-Ticket')!.kind).toBe('NATIONAL_PASS');
    expect(data.salesChannels.find((c) => c.code === 'db-vertrieb')).toMatchObject({
      kind: 'NATIONAL_RETAILER',
      adapterKey: 'mock-db-vertrieb',
      throughTicketSupport: true,
    });
    expect(data.salesChannels.find((c) => c.code === 'operator-direct-shops')).toMatchObject({
      merchantOfRecord: 'OPERATOR',
      hostedPaymentRequired: true,
    });
  });

  it('every operator has at least one mode and region', () => {
    for (const o of data.operators) {
      expect(o.modes.length, o.name).toBeGreaterThan(0);
      expect(o.regions.length, o.name).toBeGreaterThan(0);
    }
  });

  it('matches the committed operators.json (run `pnpm operators:import` after changing the workbook)', () => {
    const committed = JSON.parse(readFileSync(resolve(root, 'data/operators/operators.json'), 'utf8')) as NormalisedData;
    expect(committed.operators).toEqual(data.operators);
    expect(committed.cityTransit).toEqual(data.cityTransit);
    expect(committed.salesChannels).toEqual(data.salesChannels);
  });
});
