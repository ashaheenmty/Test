import { describe, expect, it } from 'vitest';
import { feeCategoryFor, money, quoteServiceFee, type FeeRule } from './index';

const rule = (id: string, category: FeeRule['category'], amountMinor: number, extra: Partial<FeeRule> = {}): FeeRule => ({
  id,
  kind: 'FIXED_PER_TICKET',
  category,
  amountMinor,
  percentBp: null,
  minMinor: null,
  maxMinor: null,
  priority: 0,
  active: true,
  ...extra,
});

// The fee schedule decided for the internal version.
const RULES = [rule('ld', 'LONG_DISTANCE_RAIL', 100), rule('ic', 'INTERCITY_REGIONAL', 50), rule('local', 'LOCAL_AND_BUS', 10)];
const CAP = rule('cap', null, 100, { kind: 'MULTI_OPERATOR_BOOKING_CAP' });
const fare = money(2990);

describe('fee category', () => {
  it('uses the highest tier on a ticket', () => {
    expect(feeCategoryFor(['U_BAHN'])).toBe('LOCAL_AND_BUS');
    expect(feeCategoryFor(['REGIONAL_RAIL', 'BUS'])).toBe('INTERCITY_REGIONAL');
    expect(feeCategoryFor(['S_BAHN', 'HIGH_SPEED_RAIL', 'REGIONAL_RAIL'])).toBe('LONG_DISTANCE_RAIL');
    expect(() => feeCategoryFor([])).toThrow();
  });
});

describe('service fee schedule', () => {
  it('charges €1.00 for a long-distance train ticket', () => {
    expect(quoteServiceFee([{ operators: ['op'], modes: ['HIGH_SPEED_RAIL'], fare }], RULES).total.amountMinor).toBe(100);
    expect(quoteServiceFee([{ operators: ['op'], modes: ['NIGHT_TRAIN'], fare }], RULES).total.amountMinor).toBe(100);
  });

  it('charges €0.50 between cities and €0.10 for buses and city transport', () => {
    expect(quoteServiceFee([{ operators: ['op'], modes: ['REGIONAL_RAIL'], fare }], RULES).total.amountMinor).toBe(50);
    expect(quoteServiceFee([{ operators: ['op'], modes: ['U_BAHN'], fare }], RULES).total.amountMinor).toBe(10);
    expect(quoteServiceFee([{ operators: ['op'], modes: ['TRAM'], fare }], RULES).total.amountMinor).toBe(10);
    expect(quoteServiceFee([{ operators: ['op'], modes: ['COACH'], fare }], RULES).total.amountMinor).toBe(10);
  });

  it('charges once per ticket, so separate tickets from one operator add up', () => {
    const q = quoteServiceFee(
      [
        { operators: ['db-regio-bayern'], modes: ['REGIONAL_RAIL'], fare: money(2380) },
        { operators: ['db-regio-bayern'], modes: ['REGIONAL_RAIL'], fare: money(1990) },
        { operators: ['db-regio-bayern'], modes: ['S_BAHN'], fare: money(390) },
      ],
      [...RULES, CAP],
    );
    expect(q.total.amountMinor).toBe(110);
    expect(q.cappedFrom).toBeNull();
  });

  it('caps the booking at €1.00 when more than one operator is involved', () => {
    // U-Bahn (BVG) → ICE (DB) → U-Bahn (MVG) as three separate tickets: 0.10 + 1.00 + 0.10 → capped
    const q = quoteServiceFee(
      [
        { operators: ['bvg'], modes: ['U_BAHN'], fare: money(380) },
        { operators: ['db-fernverkehr'], modes: ['HIGH_SPEED_RAIL'], fare: money(7990) },
        { operators: ['mvg'], modes: ['U_BAHN'], fare: money(390) },
      ],
      [...RULES, CAP],
    );
    expect(q.operatorCount).toBe(3);
    expect(q.total.amountMinor).toBe(100);
    expect(q.cappedFrom?.amountMinor).toBe(120);
    expect(q.lines.at(-1)).toMatchObject({ ruleId: 'cap', amount: { amountMinor: -20 } });
    expect(q.lines.reduce((a, l) => a + l.amount.amountMinor, 0)).toBe(100);
  });

  it('applies the cap to a single ticket covering several operators', () => {
    // e.g. one Deutschlandtarif ticket covering an RE (DB Regio) and an RB (agilis)
    const q = quoteServiceFee(
      [{ operators: ['db-regio-bayern', 'agilis'], modes: ['REGIONAL_RAIL'], fare: money(2990) }],
      [...RULES, CAP],
    );
    expect(q.total.amountMinor).toBe(50); // below the cap, unchanged
    const two = quoteServiceFee(
      [
        { operators: ['db-fernverkehr', 'sncf-voyageurs'], modes: ['HIGH_SPEED_RAIL'], fare: money(9990) },
        { operators: ['bvg'], modes: ['BUS'], fare: money(380) },
      ],
      [...RULES, CAP],
    );
    expect(two.total.amountMinor).toBe(100);
  });

  it('does not cap bookings without a cap rule (rule is configurable)', () => {
    const q = quoteServiceFee(
      [
        { operators: ['bvg'], modes: ['U_BAHN'], fare: money(380) },
        { operators: ['db-fernverkehr'], modes: ['HIGH_SPEED_RAIL'], fare: money(7990) },
        { operators: ['mvg'], modes: ['U_BAHN'], fare: money(390) },
      ],
      RULES,
    );
    expect(q.total.amountMinor).toBe(120);
    expect(q.lines.map((l) => [l.ticketIndex, l.ruleId])).toEqual([
      [0, 'local'],
      [1, 'ld'],
      [2, 'local'],
    ]);
  });

  it('a through-ticket covering several modes pays the highest tier once', () => {
    expect(quoteServiceFee([{ operators: ['op'], modes: ['HIGH_SPEED_RAIL', 'REGIONAL_RAIL', 'S_BAHN'], fare }], RULES).total.amountMinor).toBe(100);
  });

  it('ignores inactive rules and supports per-booking, per-leg and percentage models', () => {
    expect(quoteServiceFee([{ operators: ['op'], modes: ['U_BAHN'], fare }], [rule('x', null, 99, { active: false })]).total.amountMinor).toBe(0);
    expect(quoteServiceFee([{ operators: ['op'], modes: ['BUS'], fare }], [rule('b', null, 199, { kind: 'FIXED_PER_BOOKING' })]).total.amountMinor).toBe(199);
    expect(quoteServiceFee([{ operators: ['op'], modes: ['BUS', 'TRAM'], fare }], [rule('l', null, 20, { kind: 'FIXED_PER_LEG' })]).total.amountMinor).toBe(40);
    const pct = rule('p', null, 0, { kind: 'PERCENT', percentBp: 500, minMinor: 50, maxMinor: 300 });
    expect(quoteServiceFee([{ operators: ['op'], modes: ['BUS'], fare: money(300) }], [pct]).total.amountMinor).toBe(50);
    expect(quoteServiceFee([{ operators: ['op'], modes: ['BUS'], fare: money(10_000) }], [pct]).total.amountMinor).toBe(300);
  });

  it('prefers a tier-specific rule over a catch-all rule', () => {
    const q = quoteServiceFee([{ operators: ['op'], modes: ['REGIONAL_RAIL'], fare }], [rule('any', null, 999, { priority: 10 }), ...RULES]);
    expect(q.total.amountMinor).toBe(50);
  });
});
