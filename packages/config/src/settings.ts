import { z } from 'zod';

/**
 * Business, legal and tax settings.
 *
 * Every field tagged `review: 'legal' | 'tax'` must be confirmed by the
 * company's lawyer / tax adviser. The checklist in docs/LEGAL_TAX_CHECKLIST.md
 * is generated from this metadata (`pnpm --filter @tb/config checklist`).
 *
 * Values can be overridden via the SETTINGS_JSON environment variable (JSON
 * deep-merged over the defaults) and, from phase 7, from the admin back-office.
 */

export interface SettingMeta {
  review: 'legal' | 'tax' | 'business' | 'privacy';
  note: string;
}

export const settingsSchema = z.object({
  brand: z.object({
    name: z.string(),
    supportEmail: z.string().email(),
  }),
  agentCompany: z.object({
    legalName: z.string(),
    street: z.string(),
    postalCode: z.string(),
    city: z.string(),
    country: z.string().length(2),
    registerCourt: z.string(),
    registerNumber: z.string(),
    vatId: z.string(),
    managingDirectors: z.array(z.string()),
    email: z.string().email(),
    phone: z.string(),
  }),
  serviceFee: z.object({
    vatRateBp: z.number().int().min(0).max(10_000),
    refundableOnOperatorCancellation: z.boolean(),
  }),
  invoicing: z.object({
    serviceFeeSeries: z.string().regex(/^[A-Z]{2,6}$/),
    numberFormat: z.string(),
  }),
  separateTickets: z.object({
    minConnectionBufferMinutes: z.object({
      default: z.number().int().min(0),
      longDistanceToLongDistance: z.number().int().min(0),
      crossBorder: z.number().int().min(0),
      localTransit: z.number().int().min(0),
    }),
    blockBelowMinutes: z.number().int().min(0),
    requireExplicitAcknowledgement: z.literal(true),
  }),
  privacy: z.object({
    analyticsDefaultOn: z.literal(false),
    hostingRegion: z.enum(['eu-central', 'eu-west']),
    bookingRecordRetentionYears: z.number().int().min(1),
    invoiceRetentionYears: z.number().int().min(1),
  }),
  auth: z.object({
    accessTokenTtlSeconds: z.number().int().positive(),
    refreshTokenTtlDays: z.number().int().positive(),
    emailTokenTtlMinutes: z.number().int().positive(),
  }),
});

export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = {
  brand: { name: 'Durch Deutschland', supportEmail: 'support@example.com' },
  agentCompany: {
    legalName: 'PLACEHOLDER Reisevermittlung GmbH',
    street: 'Musterstraße 1',
    postalCode: '10115',
    city: 'Berlin',
    country: 'DE',
    registerCourt: 'Amtsgericht Charlottenburg',
    registerNumber: 'HRB 000000 B',
    vatId: 'DE000000000',
    managingDirectors: ['PLACEHOLDER'],
    email: 'info@example.com',
    phone: '+49 30 0000000',
  },
  serviceFee: { vatRateBp: 1900, refundableOnOperatorCancellation: true },
  invoicing: { serviceFeeSeries: 'SF', numberFormat: '{series}-{year}-{seq:6}' },
  separateTickets: {
    minConnectionBufferMinutes: {
      default: 20,
      longDistanceToLongDistance: 30,
      crossBorder: 45,
      localTransit: 10,
    },
    blockBelowMinutes: 5,
    requireExplicitAcknowledgement: true,
  },
  privacy: {
    analyticsDefaultOn: false,
    hostingRegion: 'eu-central',
    bookingRecordRetentionYears: 10,
    invoiceRetentionYears: 10,
  },
  auth: { accessTokenTtlSeconds: 900, refreshTokenTtlDays: 30, emailTokenTtlMinutes: 60 },
};

export const settingsMeta: Record<string, SettingMeta> = {
  'brand.name': { review: 'business', note: 'Decided: "Durch Deutschland". Check trademark availability before launch.' },
  agentCompany: { review: 'legal', note: 'Impressum data (§ 5 DDG). All values are placeholders.' },
  'serviceFee.vatRateBp': {
    review: 'tax',
    note: 'VAT on our intermediation fee. 19 % assumed for a German agent service to consumers; cross-border legs may change place of supply (§ 3b / § 3a UStG).',
  },
  'serviceFee.refundableOnOperatorCancellation': {
    review: 'legal',
    note: 'Whether our fee is refunded when the operator cancels; affects AGB and consumer-law fairness.',
  },
  'invoicing.numberFormat': {
    review: 'tax',
    note: 'Service-fee invoices need a unique sequential number (§ 14 Abs. 4 Nr. 4 UStG). Confirm series/format.',
  },
  'separateTickets.minConnectionBufferMinutes': {
    review: 'legal',
    note: 'Buffers for separate-ticket connections under Reg. (EU) 2021/782 Art. 12; business/UX default values.',
  },
  'separateTickets.blockBelowMinutes': {
    review: 'legal',
    note: 'Below this buffer, separate-ticket journeys are not offered at all.',
  },
  'privacy.bookingRecordRetentionYears': {
    review: 'tax',
    note: 'Retention for booking records (§ 147 AO / § 257 HGB: 6–10 years depending on document type; 8 years for Buchungsbelege since 2025 — confirm).',
  },
  'privacy.invoiceRetentionYears': {
    review: 'tax',
    note: 'Retention for issued invoices (§ 14b UStG). Confirm current period.',
  },
  'privacy.hostingRegion': { review: 'privacy', note: 'EU hosting by default (GDPR Chapter V).' },
};

function deepMerge<T>(base: T, override: unknown): T {
  if (override === null || typeof override !== 'object' || Array.isArray(override)) {
    return (override === undefined ? base : override) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    out[k] = deepMerge((base as Record<string, unknown>)[k], v);
  }
  return out as T;
}

export function loadSettings(env: Record<string, string | undefined> = process.env): Settings {
  const override = env.SETTINGS_JSON ? (JSON.parse(env.SETTINGS_JSON) as unknown) : {};
  return settingsSchema.parse(deepMerge(defaultSettings, override));
}
