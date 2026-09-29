# Open decisions (after phase 1)

Items marked **before phase 2** block or shape the next phase. The legal/tax items are also in [LEGAL_TAX_CHECKLIST.md](LEGAL_TAX_CHECKLIST.md).

## Product & brand

1. **Brand name and company details.** Everything uses the placeholder "Umsteiger" and a placeholder GmbH. They are configurable via `NEXT_PUBLIC_BRAND_NAME`, `EXPO_PUBLIC_BRAND_NAME` and `SETTINGS_JSON`.
2. **German form of address.** The UI uses informal "du" and gender-inclusive "Reisende*r". Alternatives are formal "Sie" and neutral wording.
3. **Service fee.** The seed has an active **zero** fee and an inactive example of €1.99 per booking. Choose the model: fixed, percentage, per leg, or none.
4. **Arabic digits.** Dates and numbers use Latin digits, matching station displays. Switch to Arabic-Indic digits?
5. **Back-office language.** It is English in phase 1. Is German needed?

## Technical (before phase 2)

6. **Station and timetable data source for phase 2.** My plan is DELFI's nationwide GTFS feed (via Mobilithek) plus DB's station data for multilingual names. Both are open data, with no cost, but they need a Mobilithek account. Is it OK to register and use them?
7. **Mobile navigation.** Phase 1 uses a minimal tab shell. I plan to introduce `expo-router` in phase 2.
8. **Sign in with Apple / Google.** The API side is done and tested with mock tokens. Real use needs an Apple Developer account (Services ID + key) and a Google Cloud OAuth client ID. That means a paid Apple Developer membership. Should I proceed when you have them?
9. **Hosting (EU).** Not needed yet. Candidates for later are a managed Postgres in Frankfurt (e.g. AWS RDS eu-central-1, Hetzner/IONOS managed DB) and a KMS for the field-encryption keys.
10. **Versions.** I pinned stable majors I could validate in this environment: Prisma 6.19, NestJS 11, Next.js 15.5, TypeScript 5.9, Vitest 3. Newer majors exist (Prisma 8 RC, NestJS 12, Next 16, TS 7). The mobile app uses Expo SDK 57 as generated. Upgrading is a separate task when you want it.

## Legal / privacy (see checklist)

11. **Account enumeration.** Registration currently says "email already registered". The alternative is a neutral message plus an email, which is more private but less friendly.
12. **Terms acceptance for Apple/Google sign-up.** The versions current at sign-up are logged; the app must show the terms before the provider sheet.
13. **Retention periods** for the `records` schema after account deletion (booking records, invoices, audit log).

## Known limitations of phase 1

- Journey search, checkout, payments, tickets, documents, real-time and itinerary are later phases. The UI shows them as "coming soon".
- **Account self-service.** Data export and account deletion are modelled but not exposed as endpoints yet (phase 8).
- **Operator data quality.**
  - Legal names are the display names from the sheet (flagged "unverified").
  - City-operator transport modes are derived from the city's mode list, so they are approximate.
- **Mobile testing.** The mobile app was checked by typecheck and by driving the Expo web export in a browser. It was **not** run on a physical iOS/Android device in this environment.
- **Admin list order.** The operator list sorts case-sensitively in this local database ("agilis" after "SWEG"). A German collation fixes this in production.
