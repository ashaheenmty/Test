# Durch Deutschland — multi-operator transport booking (agent model)

Consumer app (iOS/Android + web) and back-office for searching, booking and managing public-transport tickets in Germany and Europe. The company acts as a **ticket agent (Vermittler)**: tickets are sold in the name and on behalf of the operators, never resold.

> Brand: **Durch Deutschland**. The legal entity details (legal form, address, register, VAT ID) in the Impressum and invoices are still placeholders (see [docs/LEGAL_TAX_CHECKLIST.md](docs/LEGAL_TAX_CHECKLIST.md)).
>
> This is an **internal development version**: no real operator, timetable or login-provider accounts are connected; everything external is mocked.

**Status: phase 1 (foundation) complete.** See [docs/BRIEF.md](docs/BRIEF.md) for the full brief and phase plan, and [docs/OPEN_DECISIONS.md](docs/OPEN_DECISIONS.md) for the questions waiting on you.

## Repository layout

```
apps/
  api/      NestJS REST API (/v1): auth, profile, saved travellers, reference data, legal pages, admin
  web/      Next.js consumer web app (server-rendered, 7 languages, RTL, dark mode)       :3000
  admin/    Next.js back-office (operators, audit log; more in phase 7)                    :3001
  mobile/   Expo / React Native app (iOS, Android; web preview)                            :8081
  worker/   BullMQ worker (nightly audit-chain verification; real-time/notifications later)
packages/
  domain/   Shared types, enums, zod validation, Money (integer cents), canonical JSON
  config/   Legal / tax / business settings with review metadata (→ checklist)
  i18n/     de (default), en, fr, ar (RTL), es, ru, zh-Hans · ICU messages · formatters
  ui/       Design tokens (light/dark) verified against WCAG 2.2 AA contrast
  db/       Prisma schema + migrations, operator master-list importer, seed, audit hash chain
data/operators/
  Germany_Transport_Providers.xlsx   ← source of truth you provided
  operators.json                     ← normalised import (committed, used by the seed)
docs/       Brief, phase-1 proposal, legal/tax checklist, open decisions
```

## Quick start

Requirements: Node 22, pnpm 10, Docker.

```bash
cp .env.example .env            # then replace the secrets (instructions inside)
cp .env packages/db/.env
docker compose up -d            # Postgres 16, Redis, Mailpit (mail UI :8025), MinIO
pnpm install                    # also generates the Prisma client
pnpm db:migrate                 # apply migrations
pnpm db:seed                    # 164 operators, 43 tariff associations, legal pages, admin + demo user
pnpm build

pnpm --filter @tb/api dev       # http://localhost:4000/v1/health
pnpm --filter @tb/web dev       # http://localhost:3000
pnpm --filter @tb/admin dev     # http://localhost:3001
pnpm --filter @tb/mobile start  # Expo dev server (scan the QR code with Expo Go / a dev build)
pnpm --filter @tb/worker dev
```

Demo logins (development seed only):

| App | Email | Password |
|---|---|---|
| Web / mobile | `anna@example.com` | `demo passphrase 2026` |
| Back-office | `admin@example.com` | value of `SEED_ADMIN_PASSWORD` (printed by the seed if unset) |

## Tests

```bash
pnpm test                 # unit tests (all packages)
pnpm test:integration     # API + DB against PostgreSQL (TEST_DATABASE_URL, never wiped)
pnpm typecheck
pnpm --filter @tb/web test:e2e   # Playwright (mobile + desktop, incl. axe WCAG 2.2 AA) — needs API + web running
```

What is covered in phase 1:

- **Domain:** money arithmetic and allocation without lost cents, VAT split, password policy.
- **i18n:**
  - all 7 locales have identical keys;
  - every message is valid ICU and uses the same variables as the German source;
  - plural rules (including Arabic and Russian) and RTL are checked.
- **UI tokens:** 40 colour pairs checked against WCAG AA contrast (4.5:1 for text, 3:1 for controls) in light and dark mode.
- **DB:**
  - Prisma enums stay in sync with the shared domain enums;
  - operator import: merging duplicates, status overrides, tariff resolution;
  - the audit hash chain detects tampering and deletion;
  - the database triggers reject UPDATE, DELETE and TRUNCATE on the audit log.
- **API:**
  - registration, login, account lockout and rate limiting;
  - refresh-token rotation with reuse detection, logout, password reset and email verification;
  - Apple/Google sign-in (mock tokens), including account-takeover protection;
  - encrypted personal fields;
  - reference-data filters, legal-page language fallback, admin role checks and the audit trail.
- **Web end-to-end:**
  - registration → profile → traveller → language → sign-out → sign-in;
  - silent session refresh, open-redirect protection, RTL, dark mode;
  - axe WCAG checks on every page;
  - no horizontal scrolling on phones.

## Architecture notes (phase 1)

- **Agent model in the data model.** Each booked leg records the *carrier* (operator), the *sales channel* and the *tariff* separately. A `TicketContract` is one contract of carriage and may span several legs and carriers, e.g. under the Deutschlandtarif (DTV). Its `THROUGH` / `SEPARATE` kind drives the rules of Regulation (EU) 2021/782.
- **Two database schemas.**
  - `app` holds accounts, profiles, reference data and configuration; users can delete their data here.
  - `records` holds bookings, payments, documents and the audit log. It is legally retained and never cascade-deleted from a user account.
  - Offers, operator documents, acknowledgements and the audit log are append-only, enforced by database triggers.
  - Issued invoices cannot be deleted or have their amounts changed.
- **Audit log:** each entry is SHA-256 hash-chained to the previous one. Verify it with `GET /v1/admin/audit/verify`, from the back-office, or via the nightly worker job.
- **Authentication:**
  - passwords hashed with argon2id;
  - 15-minute access JWTs, with separate secrets for customers and admins;
  - rotating refresh tokens, stored hashed, where reuse revokes the whole session family;
  - account lockout after 10 failed logins, plus per-IP rate limits.
  - Web tokens live only in httpOnly cookies; mobile tokens in the Keychain / Keystore.
- **Personal data:** date of birth and discount-card numbers are encrypted in the application with AES-256-GCM. Each value is bound to its row, and the key ID allows key rotation.
- **i18n:** strings, emails and legal pages exist per language. Arabic uses right-to-left layout: the web uses CSS logical properties, and React Native uses `I18nManager` plus a reload. Arabic dates use Latin digits (open decision).

## Service fee

Charged once per ticket (contract of carriage), gross incl. VAT, by the highest transport tier on that ticket:

| Tier | Transport modes | Fee |
|---|---|---|
| Long-distance trains | ICE/IC/EC, FlixTrain, night and car trains | €1.00 |
| Between cities | Regional trains (RE/RB/IRE), rack and heritage railways | €0.50 |
| Buses and city transport | Bus and long-distance coach, S-Bahn, U-Bahn, tram, Stadtbahn, ferry | €0.10 |

**Booking cap:** the total service fee of any booking is at most **€1.00**. Example: U-Bahn + ICE + U-Bahn as three tickets = €0.10 + €1.00 + €0.10 = €1.20 → **€1.00**; three regional tickets = €1.50 → **€1.00**. On our invoice the fee is **one line per booking**.

The amounts and the cap are `ServiceFeeRule` rows (seeded, editable later in the back-office). The mode → tier mapping is in `packages/domain/src/service-fee.ts`. `GET /v1/pricing/service-fees` lists the schedule and `POST /v1/pricing/service-fee/quote` prices a set of tickets.

## Operator master list

`pnpm operators:import` converts the spreadsheet into `data/operators/operators.json`. A test fails if the two drift apart. The importer:

- merges operators listed once per state: 265 rows → **164 operators** (e.g. ODEG with 4 states, Die Länderbahn with its alex/trilex/vogtlandbahn brands);
- maps the DB S-Bahn brands in the city tab to the right DB Regio unit;
- resolves every city's tariff association (Schwerin is "—" in the sheet);
- applies explicit status corrections relative to 27 Sep 2026:
  - **SJ** → inactive (its Stockholm role ended in Aug 2026);
  - **Abellio Mitteldeutschland** → needs review;
  - **Mobility inside** → discontinued.

Sales-channel attributes (merchant of record, hosted payment, through-ticket support, adapter key) and channel coverage are **assumptions** until you have contracts. They are labelled as such in the data and the back-office.

## Local development without Docker

Any PostgreSQL 16 and Redis 7 work. Point `DATABASE_URL`, `TEST_DATABASE_URL` and `REDIS_URL` at them.
