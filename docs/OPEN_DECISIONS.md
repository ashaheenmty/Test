# Open decisions (after phase 1)

Items marked **before phase 2** block or shape the next phase. The legal/tax items are also in [LEGAL_TAX_CHECKLIST.md](LEGAL_TAX_CHECKLIST.md).

## Decided (2026-10)

- **Brand:** "Durch Deutschland".
- **German form of address:** formal "Sie".
- **Service fee:** €1.00 long-distance trains, €0.50 between cities, €0.10 buses and city transport, charged once per ticket (not per passenger or leg); a ticket covering several modes pays its highest tier; coaches count as buses; S-Bahn counts as city transport; amounts include 19 % VAT. Every booking's fee is capped at €1.00 and shown as one invoice line per booking (see README → Service fee).
- **Timetable data and Apple/Google login:** not needed yet. This is an internal development version, so phase 2 uses bundled sample station and timetable data behind the same adapter interfaces.

## Product & brand (still open)

1. **Company legal details.** Legal form, address, commercial register, VAT ID and managing directors are still placeholders in the Impressum and invoices.
2. **Gender-inclusive forms** in German ("Reisende*r") — keep, or switch to neutral wording?
3. **Arabic digits.** Dates and numbers use Latin digits, matching station displays. Switch to Arabic-Indic digits?
4. **Back-office language.** It is English in phase 1. Is German needed?

## Technical (before phase 2)

5. **Station and timetable data (later).** For production, DELFI's nationwide GTFS feed (via Mobilithek) plus DB station data. Both are free open data but need a Mobilithek account. Deferred: phase 2 uses bundled sample data.
6. **Mobile navigation.** Phase 1 uses a minimal tab shell. I plan to introduce `expo-router` in phase 2.
7. **Sign in with Apple / Google (later stage).** The API side is done and tested with mock tokens. Real use needs an Apple Developer account (paid) and a Google Cloud OAuth client ID.
8. **Hosting (EU).** Not needed yet. Candidates for later are a managed Postgres in Frankfurt (e.g. AWS RDS eu-central-1, Hetzner/IONOS managed DB) and a KMS for the field-encryption keys.
9. **Versions.** I pinned stable majors I could validate in this environment: Prisma 6.19, NestJS 11, Next.js 15.5, TypeScript 5.9, Vitest 3. Newer majors exist (Prisma 8 RC, NestJS 12, Next 16, TS 7). The mobile app uses Expo SDK 57 as generated. Upgrading is a separate task when you want it.

## Legal / privacy (see checklist)

10. **Account enumeration.** Registration currently says "email already registered". The alternative is a neutral message plus an email, which is more private but less friendly.
11. **Terms acceptance for Apple/Google sign-up.** The versions current at sign-up are logged; the app must show the terms before the provider sheet.
12. **Retention periods** for the `records` schema after account deletion (booking records, invoices, audit log).

## Known limitations of phase 1

- Journey search, checkout, payments, tickets, documents, real-time and itinerary are later phases. The UI shows them as "coming soon".
- **Account self-service.** Data export and account deletion are modelled but not exposed as endpoints yet (phase 8).
- **Operator data quality.**
  - Legal names are the display names from the sheet (flagged "unverified").
  - City-operator transport modes are derived from the city's mode list, so they are approximate.
- **Mobile testing.** The mobile app was checked by typecheck and by driving the Expo web export in a browser. It was **not** run on a physical iOS/Android device in this environment.
- **Admin list order.** The operator list sorts case-sensitively in this local database ("agilis" after "SWEG"). A German collation fixes this in production.
