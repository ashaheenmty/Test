/**
 * Money is always held in integer minor units (cents) to avoid floating-point
 * rounding. All arithmetic helpers refuse to mix currencies.
 */
export type CurrencyCode = 'EUR' | 'CHF' | 'CZK' | 'PLN' | 'DKK' | 'SEK' | 'GBP';

export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export function money(amountMinor: number, currency: CurrencyCode = 'EUR'): Money {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError(`Money amount must be an integer number of minor units, got ${amountMinor}`);
  }
  return { amountMinor, currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function sum(items: readonly Money[], currency: CurrencyCode = 'EUR'): Money {
  return items.reduce((acc, m) => add(acc, m), money(0, currency));
}

/** Multiplies by a rate in basis points (1 % = 100 bp), rounding half away from zero. */
export function applyBasisPoints(m: Money, basisPoints: number): Money {
  const raw = (m.amountMinor * basisPoints) / 10_000;
  return money(Math.sign(raw) * Math.round(Math.abs(raw)), m.currency);
}

/**
 * Splits an amount across weights without losing or inventing cents
 * (largest-remainder method). Used e.g. to spread a per-booking fee over legs.
 */
export function allocate(m: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) throw new RangeError('allocate() needs at least one weight');
  if (weights.some((w) => w < 0)) throw new RangeError('weights must be non-negative');
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) throw new RangeError('weights must not all be zero');

  const exact = weights.map((w) => (m.amountMinor * w) / total);
  const floored = exact.map((x) => Math.floor(x));
  let remainder = m.amountMinor - floored.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i]! += 1;
    remainder -= 1;
  }
  return floored.map((a) => money(a, m.currency));
}

/**
 * Splits a gross amount into net + VAT for a given rate (basis points).
 * VAT = gross - round(gross / (1 + rate)).
 */
export function splitGross(gross: Money, vatRateBp: number): { net: Money; vat: Money } {
  const net = Math.round((gross.amountMinor * 10_000) / (10_000 + vatRateBp));
  return { net: money(net, gross.currency), vat: money(gross.amountMinor - net, gross.currency) };
}

export function formatMoney(m: Money, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: m.currency }).format(
    m.amountMinor / 100,
  );
}
