import type { ServiceFeeCategory, ServiceFeeKind, TransportMode } from './enums';
import { applyBasisPoints, money, sum, type CurrencyCode, type Money } from './money';

/**
 * Service fee (our intermediation fee, charged to the traveller on top of the fare).
 *
 * Business rule (decided 2026-10): the fee depends on the kind of transport —
 *   long-distance trains            €1.00
 *   between cities (regional rail)  €0.50
 *   buses and city transport        €0.10
 * It is charged once per ticket (contract of carriage), not per passenger; a ticket
 * covering several modes uses its highest tier. The total fee of any booking is capped
 * (€1.00). On our invoice the fee is shown as a single line per booking.
 * Amounts are gross (incl. VAT).
 * The amounts themselves live in ServiceFeeRule rows so they can change without code.
 */

/** Tier for each transport mode. OPEN DECISION flagged: coaches (FlixBus) count as "bus". */
export const FEE_CATEGORY_BY_MODE: Record<TransportMode, ServiceFeeCategory> = {
  HIGH_SPEED_RAIL: 'LONG_DISTANCE_RAIL',
  LONG_DISTANCE_RAIL: 'LONG_DISTANCE_RAIL',
  NIGHT_TRAIN: 'LONG_DISTANCE_RAIL',
  CAR_TRAIN: 'LONG_DISTANCE_RAIL',
  REGIONAL_RAIL: 'INTERCITY_REGIONAL',
  RACK_RAILWAY: 'INTERCITY_REGIONAL',
  HERITAGE_RAIL: 'INTERCITY_REGIONAL',
  S_BAHN: 'LOCAL_AND_BUS',
  U_BAHN: 'LOCAL_AND_BUS',
  TRAM: 'LOCAL_AND_BUS',
  STADTBAHN: 'LOCAL_AND_BUS',
  BUS: 'LOCAL_AND_BUS',
  COACH: 'LOCAL_AND_BUS',
  FERRY: 'LOCAL_AND_BUS',
  FUNICULAR: 'LOCAL_AND_BUS',
  SUSPENSION_RAILWAY: 'LOCAL_AND_BUS',
  OTHER: 'LOCAL_AND_BUS',
};

const RANK: Record<ServiceFeeCategory, number> = { LONG_DISTANCE_RAIL: 3, INTERCITY_REGIONAL: 2, LOCAL_AND_BUS: 1 };

export function feeCategoryFor(modes: readonly TransportMode[]): ServiceFeeCategory {
  if (modes.length === 0) throw new RangeError('A ticket needs at least one leg');
  return modes.map((m) => FEE_CATEGORY_BY_MODE[m]).reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
}

export interface FeeRule {
  id: string;
  kind: ServiceFeeKind;
  category: ServiceFeeCategory | null;
  amountMinor: number | null;
  percentBp: number | null;
  minMinor: number | null;
  maxMinor: number | null;
  priority: number;
  active: boolean;
}

export interface FeeTicket {
  /** Modes of the legs this ticket (contract of carriage) covers. */
  modes: TransportMode[];
  /** Carrier operators (ids or slugs) of the legs this ticket covers. */
  operators: string[];
  fare: Money;
}

export interface FeeLine {
  ticketIndex: number | null;
  category: ServiceFeeCategory | null;
  ruleId: string;
  amount: Money;
}

export interface FeeQuote {
  total: Money;
  /**
   * Per-ticket breakdown for internal use (commission, analytics). Customer-facing
   * documents show only `total` as one line per booking.
   */
  lines: FeeLine[];
  /** Number of distinct operators in the booking. */
  operatorCount: number;
  /** Sum of the per-ticket fees before the booking cap; set only when the cap reduced it. */
  cappedFrom: Money | null;
}

function pickRule(rules: FeeRule[], kinds: ServiceFeeKind[], category: ServiceFeeCategory | null): FeeRule | undefined {
  return rules
    .filter((r) => r.active && kinds.includes(r.kind) && (r.category === null || r.category === category))
    // Specific tier beats "any tier"; then higher priority wins.
    .sort((a, b) => Number(b.category !== null) - Number(a.category !== null) || b.priority - a.priority)[0];
}

function clamp(m: Money, rule: FeeRule): Money {
  let v = m.amountMinor;
  if (rule.minMinor !== null) v = Math.max(v, rule.minMinor);
  if (rule.maxMinor !== null) v = Math.min(v, rule.maxMinor);
  return money(v, m.currency);
}

/** Computes the service fee for a booking made of one or more tickets. */
export function quoteServiceFee(tickets: FeeTicket[], rules: FeeRule[], currency: CurrencyCode = 'EUR'): FeeQuote {
  const lines: FeeLine[] = [];
  tickets.forEach((ticket, i) => {
    const category = feeCategoryFor(ticket.modes);
    const rule = pickRule(rules, ['FIXED_PER_TICKET', 'FIXED_PER_LEG', 'PERCENT'], category);
    if (!rule) return;
    let amount: Money;
    if (rule.kind === 'FIXED_PER_TICKET') amount = money(rule.amountMinor ?? 0, currency);
    else if (rule.kind === 'FIXED_PER_LEG') amount = money((rule.amountMinor ?? 0) * ticket.modes.length, currency);
    else amount = applyBasisPoints(ticket.fare, rule.percentBp ?? 0);
    lines.push({ ticketIndex: i, category, ruleId: rule.id, amount: clamp(amount, rule) });
  });
  const perBooking = pickRule(rules, ['FIXED_PER_BOOKING'], null);
  if (perBooking) lines.push({ ticketIndex: null, category: null, ruleId: perBooking.id, amount: money(perBooking.amountMinor ?? 0, currency) });

  const operatorCount = new Set(tickets.flatMap((t) => t.operators)).size;
  const uncapped = sum(lines.map((l) => l.amount), currency);
  const cap = pickRule(rules, ['BOOKING_CAP'], null);
  if (cap && cap.amountMinor !== null && uncapped.amountMinor > cap.amountMinor) {
    return { total: money(cap.amountMinor, currency), lines, operatorCount, cappedFrom: uncapped };
  }
  return { total: uncapped, lines, operatorCount, cappedFrom: null };
}
