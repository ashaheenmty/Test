# Phase 1 proposal: folder structure & data model

Status: **approved and implemented** (phase 1). Kept for reference; see README.md for the current state.

Sources: `docs/BRIEF.md` (your build prompt) and `data/operators/Germany_Transport_Providers.xlsx` (265 rows across 7 tabs).

---

## 1. What the operator list changes in the design

The spreadsheet shows that **the company that runs the train or bus, the company that sells the ticket, and the tariff the fare comes from are often three different parties**:

| Case from the list | Carrier (runs the vehicle) | Seller / channel | Tariff |
|---|---|---|---|
| ICE Berlin → Munich | DB Fernverkehr | DB Vertrieb | DB long-distance |
| RE in NRW run by National Express | National Express Rail | DB Vertrieb | Deutschlandtarif (DTV), all regional operators on one ticket |
| U-Bahn in Berlin | BVG | VBB, or an ÖPNV API such as Mobilitybox | VBB Verbund tariff |
| Nightjet Munich → Rome | ÖBB | ÖBB hosted page (operator is merchant of record) | ÖBB/NRT |
| FlixTrain / FlixBus | Flix SE | Flix partner API | Flix |

So each booked leg stores **carrier + seller channel + tariff** separately. A "ticket contract" (one contract of carriage) can cover several legs and several carriers, which is how a DTV through-ticket works. This is also what drives the EU 2021/782 through-ticket vs separate-ticket flag.

Other points from the list that affect the model:
- **Operators change at every timetable change (June/December)** because states tender regional contracts. Operator ↔ region/line assignments therefore get `validFrom` / `validTo` dates.
- **Operators appear many times** (DB Regio units, ODEG, metronom, etc. are listed per state). The import removes the duplicates to one operator record linked to several regions. The 265 rows should reduce to about 150–170 distinct organisations.
- **Some rows are already out of date as of today (27 Sep 2026).** SJ's Berlin–Stockholm role ended in Aug 2026 and is imported as inactive, succeeded by RDC. Mobility inside was discontinued and is imported as a channel with `status = discontinued`. Abellio Mitteldeutschland is flagged "check contracts".
- **Aggregators (Trainline, Omio, Rail Europe)** are imported as possible *wholesale distributors*, not as carriers.

## 2. Stack (as suggested in the brief, with three choices to confirm)

- pnpm workspaces + Turborepo monorepo, TypeScript everywhere
- Mobile: Expo (React Native). Web: Next.js. Admin: Next.js. API: NestJS. Workers: NestJS standalone.
- PostgreSQL 16 + Redis (BullMQ queues), Docker Compose for local development
- **ORM: Prisma** ← to confirm
- **Auth: self-hosted** (email + password/magic link, Sign in with Apple, Google OAuth; JWT + refresh tokens, argon2). No paid auth vendor. ← to confirm
- i18next with ICU; locales de (default), en, fr, ar (RTL), es, ru, zh-Hans
- Stripe Connect (test mode) behind a `PaymentProvider` interface so it can be swapped for Adyen for Platforms
- PDFs: server-side HTML templates → PDF (Playwright/Chromium). Maps: MapLibre + OSM.
- Tests: Vitest (unit/integration), Playwright (web e2e), Maestro later for mobile e2e

## 3. Folder structure

```
apps/
  mobile/        Expo app (iOS + Android)
  web/           Next.js consumer web app
  admin/         Next.js back-office (role-based)
  api/           NestJS REST API (auth, search, checkout, bookings, documents, help)
  worker/        NestJS workers: real-time watcher, push, booking orchestration retries,
                 PDF rendering, monthly settlement jobs
packages/
  domain/        Shared types + zod schemas, Money, fee rules, connection-buffer rules,
                 through/separate-ticket logic (pure TS, heavily unit-tested)
  adapters/      SalesAdapter interface (OSDM-shaped) + mock adapters:
                   db-vertrieb (FV, DTV regional, D-Ticket), flix (train+bus),
                   osdm-generic (SNCF/ÖBB/SBB/ČD/PKP day trains), verbund-oepnv (Mobilitybox-style),
                   hosted-operator (Nightjet, European Sleeper: operator merchant-of-record path),
                   wholesale (Distribusion/Trainline-style)
  timetable/     GTFS import, RAPTOR journey planner, GTFS-RT / DB real-time adapters
  payments/      PaymentProvider interface, Stripe Connect implementation, reconciliation
  documents/     Invoice module (tax rules, numbering, templates per language), trip-summary PDF
  i18n/          Locale files (7 languages, incl. legal texts & document templates), RTL helpers
  ui/            Design tokens (light/dark, WCAG AA contrast) + shared components
  db/            Prisma schema, migrations, seed (demo data + operator master-list import)
  config/        tsconfig/eslint presets; legal/tax settings schema with defaults
data/
  operators/     Germany_Transport_Providers.xlsx (source of truth) → generated operators.json
docs/            BRIEF, README, adapter interface, integration guide, legal/tax checklist, open decisions
docker-compose.yml   postgres, redis, mailpit (local email), minio (S3-compatible document storage)
.env.example
```

## 4. Data model (entity summary)

**Reference data (seeded from your spreadsheet)**
- `Organisation`: any legal party (operator, Verbund, distributor, PSP) with legal name, country, parent group, VAT ID.
- `Operator` (carrier role): brands, modes (ICE/RE/S-Bahn/tram/bus/night/heritage…), `status`, notes
- `OperatorRegion`: operator ↔ federal state or city, with `validFrom`/`validTo`
- `TariffAssociation` (Verbund, DTV, Deutschland-Ticket) plus `CityTransitArea` (city → operators → Verbund)
- `SalesChannel`: DB Vertrieb, Flix API, OSDM partner, Mobilitybox, FAIRTIQ, wholesale, operator shop. Fields: `merchantOfRecord` (us-as-agent | operator | distributor), `hostedPaymentRequired`, `throughTicketSupport`, languages, refund rules, status.
- `ChannelCoverage`: which channel can sell which operator/tariff
- `Contract`: agency/distribution agreement with commission rules (percentage/fixed/tiered, per product) and validity dates
- `TermsVersion`: conditions of carriage or our own terms. Fields: owner, language, version, URL, content hash, `effectiveFrom`.
- `Station`: multilingual names, IBNR/UIC/GTFS ids, geo location

**Users & profile**
- `User`, `Passenger` (saved travellers), `DiscountCard` (BahnCard etc.), `PaymentMethodRef` (PSP token only), `CompanyInvoiceProfile` (company name + VAT ID), `Consent` (analytics etc., off by default), `DeviceToken`

**Booking (the agent model)**
- `OfferSnapshot`: the priced offer as returned by the adapter, stored unchanged (JSON + hash)
- `Booking` (order): user, status, totals, locale, idempotency key
- `TicketContract`: **one contract of carriage**, with seller channel, tariff, `kind = through | separate`, merchant of record, and operator T&C version accepted
- `BookingLeg`: carrier operator, stations, times, train number, class, seat, and the `TicketContract` it belongs to
- `Ticket`: barcode (QR/Aztec) payload and validity, available offline
- `Acknowledgement`: separate-ticket notice, per-leg T&C acceptance, and the data-transfer notice, each with timestamp, IP and device
- `AuditEvent`: **append-only, hash-chained** (each row hashes the previous one) for bookings, refunds and admin actions

**Money**
- `ServiceFeeRule` (fixed / % / per leg / zero, scoped by channel/product)
- `Payment` (PSP, mode `platform_split` | `operator_hosted`), `Transfer` (fare → operator/distributor connected account), `Refund` (operator refund and our fee refund stored separately)
- `Commission` (expected vs. confirmed per booking and contract), `Settlement` + `SettlementLine` (monthly per counterparty, with discrepancies)

**Documents**
- `OperatorDocument`: original ticket or invoice file, never altered (stored in S3/MinIO with a SHA-256 hash)
- `ServiceFeeInvoice`: gapless sequential number per series and year, covering the fee only, issued in the traveller's or company's name
- `TripSummary`: bundled PDF, marked "not a tax invoice for the fare"
- `InvoiceTemplate` / `TaxRule`: per language and country, editable in the admin tool

**Trips, real-time, help, admin**
- `Itinerary`, `ItineraryItem` (booked leg | hotel/note/link only), `ItineraryShare` (read-only token)
- `RealtimeWatch`, `Notification`
- `SupportCase` (routed to `us` or to the `operator`, with a pre-filled claim payload), `CompensationClaim`
- `AdminUser` + `Role`, `LegalPage` (Impressum, AGB, privacy, dispute resolution; versioned and translated), `TranslationOverride`
- `Processor` / `ProcessingActivity`: generated from config for your data protection officer
- Retention: booking and tax records sit in a separate, access-restricted schema so deleting an account does not destroy records you are legally required to keep

## 5. Decisions needed from you before Phase 1 code

1. **Stack OK?** Use the stack from your brief, with Prisma and pnpm/Turborepo.
2. **Auth:** self-hosted (free, recommended) or a managed provider (Auth0, Clerk, etc.; paid)?
3. **Mock coverage:** import all 265 rows as reference data, but have the mocks actually sell only for representative channels: DB Vertrieb, Flix, OSDM (SNCF/ÖBB/ČD), VBB/MVV/HVV via an ÖPNV API, and Nightjet/European Sleeper on the hosted page. OK?
4. **Brand name / company legal details** for the Impressum and invoices. Placeholders are used until you provide them.
