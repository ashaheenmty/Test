# Legal & tax settings checklist

_Generated from `packages/config/src/settings.ts` — do not edit by hand; run `pnpm --filter @tb/config checklist`._

Every value below is a placeholder or an assumption until confirmed. Values can be changed without code changes
via `SETTINGS_JSON` (and, from phase 7, in the back-office).

## For the lawyer

- [ ] `agentCompany` = `{"legalName":"PLACEHOLDER Reisevermittlung GmbH","street":"Musterstraße 1","postalCode":"10115","city":"Berlin","country":"DE","registerCourt":"Amtsgericht Charlottenburg","registerNumber":"HRB 000000 B","vatId":"DE000000000","managingDirectors":["PLACEHOLDER"],"email":"info@example.com","phone":"+49 30 0000000"}`  
  Impressum data (§ 5 DDG). All values are placeholders.
- [ ] `serviceFee.refundableOnOperatorCancellation` = `true`  
  Whether our fee is refunded when the operator cancels; affects AGB and consumer-law fairness.
- [ ] `separateTickets.minConnectionBufferMinutes` = `{"default":20,"longDistanceToLongDistance":30,"crossBorder":45,"localTransit":10}`  
  Buffers for separate-ticket connections under Reg. (EU) 2021/782 Art. 12; business/UX default values.
- [ ] `separateTickets.blockBelowMinutes` = `5`  
  Below this buffer, separate-ticket journeys are not offered at all.

## For the tax adviser

- [ ] `serviceFee.vatRateBp` = `1900`  
  VAT on our intermediation fee. 19 % assumed for a German agent service to consumers; cross-border legs may change place of supply (§ 3b / § 3a UStG).
- [ ] `invoicing.numberFormat` = `"{series}-{year}-{seq:6}"`  
  Service-fee invoices need a unique sequential number (§ 14 Abs. 4 Nr. 4 UStG). Confirm series/format.
- [ ] `invoicing.serviceFeeLines` = `"ONE_LINE_PER_BOOKING"`  
  Decided by the business: the (capped) service fee is one invoice line per booking. Confirm this satisfies § 14 Abs. 4 UStG (description of the service).
- [ ] `privacy.bookingRecordRetentionYears` = `10`  
  Retention for booking records (§ 147 AO / § 257 HGB: 6–10 years depending on document type; 8 years for Buchungsbelege since 2025 — confirm).
- [ ] `privacy.invoiceRetentionYears` = `10`  
  Retention for issued invoices (§ 14b UStG). Confirm current period.

## For the data protection officer

- [ ] `privacy.hostingRegion` = `"eu-central"`  
  EU hosting by default (GDPR Chapter V).

## Business decisions

- [ ] `brand.name` = `"Durch Deutschland"`  
  Decided: "Durch Deutschland". Check trademark availability before launch.

## Additional items not yet expressed as settings

- [ ] Wording of the agent disclosure (`legal.agentDisclosure` in all 7 languages) and of the onboarding notice.
- [ ] Placeholder AGB, privacy policy, Impressum and dispute-resolution texts (seeded as version `2026-09-draft`).
- [ ] Recording terms acceptance for Sign in with Apple/Google (the app shows terms before the provider sheet; the API logs the versions current at sign-up).
- [ ] Whether registration may reveal that an email address already has an account (currently: yes, "email already registered").
- [ ] Retention periods for `records` schema data after account deletion (bookings, invoices, audit log).
- [ ] Service fee schedule (€1.00 / €0.50 / €0.10 per ticket, max €1.00 per booking, gross incl. 19 % VAT → net €0.84 / €0.42 / €0.08): confirm the VAT treatment, especially for cross-border tickets, and the fee refund policy.
- [ ] Gender-inclusive forms in German UI texts ("Reisende*r").
- [ ] Assumed merchant-of-record / hosted-payment flags per sales channel (see operators.json → salesChannels).
