/**
 * Generates docs/LEGAL_TAX_CHECKLIST.md from the settings metadata so the list of
 * values the lawyer / tax adviser must confirm always matches the code.
 *   pnpm --filter @tb/config checklist
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultSettings, settingsMeta } from '../src/settings';

const get = (path: string): unknown =>
  path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], defaultSettings);

const groups: Record<string, string[]> = { legal: [], tax: [], privacy: [], business: [] };
for (const [path, meta] of Object.entries(settingsMeta)) {
  const value = JSON.stringify(get(path));
  groups[meta.review]!.push(`- [ ] \`${path}\` = \`${value}\`  \n  ${meta.note}`);
}

const titles: Record<string, string> = {
  legal: 'For the lawyer',
  tax: 'For the tax adviser',
  privacy: 'For the data protection officer',
  business: 'Business decisions',
};

const md = [
  '# Legal & tax settings checklist',
  '',
  '_Generated from `packages/config/src/settings.ts` — do not edit by hand; run `pnpm --filter @tb/config checklist`._',
  '',
  'Every value below is a placeholder or an assumption until confirmed. Values can be changed without code changes',
  'via `SETTINGS_JSON` (and, from phase 7, in the back-office).',
  '',
  ...Object.entries(groups).flatMap(([k, items]) => (items.length ? [`## ${titles[k]}`, '', ...items, ''] : [])),
  '## Additional items not yet expressed as settings',
  '',
  '- [ ] Wording of the agent disclosure (`legal.agentDisclosure` in all 7 languages) and of the onboarding notice.',
  '- [ ] Placeholder AGB, privacy policy, Impressum and dispute-resolution texts (seeded as version `2026-09-draft`).',
  '- [ ] Recording terms acceptance for Sign in with Apple/Google (the app shows terms before the provider sheet; the API logs the versions current at sign-up).',
  '- [ ] Whether registration may reveal that an email address already has an account (currently: yes, "email already registered").',
  '- [ ] Retention periods for `records` schema data after account deletion (bookings, invoices, audit log).',
  '- [ ] Service fee schedule (€1.00 / €0.50 / €0.10 per ticket, max €1.00 per booking, gross incl. 19 % VAT → net €0.84 / €0.42 / €0.08): confirm the VAT treatment, especially for cross-border tickets, and the fee refund policy.',
  '- [ ] Gender-inclusive forms in German UI texts ("Reisende*r").',
  '- [ ] Assumed merchant-of-record / hosted-payment flags per sales channel (see operators.json → salesChannels).',
  '',
].join('\n');

const out = resolve(__dirname, '../../../docs/LEGAL_TAX_CHECKLIST.md');
writeFileSync(out, md);
console.log(`Wrote ${out}`);
