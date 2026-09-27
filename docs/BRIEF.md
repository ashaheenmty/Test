# Build prompt: multi-operator transport booking app (agent model) — Germany & Europe

You are building a production-quality MVP of a consumer mobile app (plus a companion web app and an internal admin back-office) that lets a traveller search, book, pay for and manage tickets for **any kind of public transport within, to and from Germany**: long-distance trains, regional trains, S-Bahn, city transit (U-Bahn, tram, bus), cross-border and night trains, and long-distance coaches — all in one place, under one account.

**The company is a German-registered ticket agent (Vermittler), not a reseller.** It never buys tickets or sells transport in its own name. Every ticket is sold **in the name and on behalf of the operator** (or of a licensed wholesale distributor acting for the operator). The contract of carriage is always between the passenger and the operator. The company earns commission from operators/distributors and, optionally, a clearly disclosed service fee from the customer. This agent model must be reflected in the architecture, data model, payment flow, documents, texts and UI — see section 2.

Work in phases. At the end of every phase: run the tests, run the app, and give me a short summary of what works, what is mocked, and what I need to decide or provide. Ask me before any decision that is expensive to reverse (stack changes, data model changes, paid services). Where a rule below is legal or tax-related, implement it as **configurable** (feature flags, templates, settings) because my lawyer and tax adviser will refine it — and flag anything you are unsure about instead of guessing.

---

## 1. Core product requirements

1. **Easy, consumer-facing interface** — clean, calm, accessible, large tap targets, one-handed use, dark and light mode.
2. **Smart user experience** — remembers frequent routes, suggests cheapest / fastest / fewest changes, pre-fills passenger details, detects location for "from", suggests the Deutschland-Ticket when it is cheaper than single tickets.
3. **Booking in the fewest possible steps** — target: search → pick journey → pay → ticket in **3 screens**. Saved passengers, saved payment methods, Apple Pay / Google Pay one-tap.
4. **One centralized platform for every operator** — one search and one checkout, even when a journey mixes operators (e.g. BVG U-Bahn → DB ICE → SNCF TGV) and produces several tickets behind the scenes.
5. **Payment stays inside the app** — native in-app payment. If an operator requires its own payment page, open it **inside the app** (in-app browser sheet / WebView) and return automatically. Never send the user to an external browser.
6. **Real-time updates & notifications** — push alerts for delays, cancellations, platform changes, route changes, missed connections, boarding reminders; automatic alternative suggestions when a connection breaks.
7. **Itinerary builder** — multi-leg, multi-day trips on a timeline and map; non-booked items (hotel, notes); calendar export (.ics); read-only sharing.
8. **Documents in the traveller's name, whatever the operator** — see section 2.4.
9. **Booking history** — past, current and upcoming bookings with tickets, QR/Aztec codes and all documents, available offline and at any time; filters and search.
10. **Multi-language** — German (default), English, French, Arabic, Spanish, Russian, Simplified Chinese; full **right-to-left layout for Arabic**; all strings externalized (including legal texts and document templates); localized dates, times, currency, numbers.

---

## 2. Agent-model requirements (critical)

### 2.1 Transparency — who is the contract with
- Every offer, the checkout screen, every ticket and every document must clearly show **the operator (carrier) of each leg** and state that the company acts **as an agent on behalf of that operator**.
- At checkout, per leg, the user accepts **the operator's conditions of carriage** (link per operator and per language, versioned). Our own terms cover only the **intermediation service** (account, search, booking, service fee).
- Store an **audit record** per booking: operator, distributor, offer ID, operator T&C version accepted, our T&C version, price breakdown, timestamps, IP/device — immutable.
- Legal pages (Impressum, our T&Cs, privacy policy, consumer dispute-resolution notice) managed as versioned, translatable content.

### 2.2 Separate tickets vs. through-tickets (EU Regulation 2021/782)
- Every journey offer carries a flag: **through-ticket** (one contract across legs) or **separate tickets** (multiple contracts).
- If separate tickets, show a clear, unavoidable notice **before payment** explaining that each ticket is an independent contract and that passenger rights for missed connections apply per ticket. Require explicit acknowledgement and log it.
- Enforce configurable **minimum connection buffers** between separate-ticket legs; warn or block tight connections.
- Show which operator is responsible for refunds, compensation claims and assistance for each leg.

### 2.3 Payments — never hold customer money in our own account
- Use a **platform/marketplace payment setup** (start with Stripe Connect in test mode; keep the PSP swappable — e.g. Adyen for Platforms) so that:
  - the fare is collected **on behalf of the operator/distributor** and routed to them (or the distributor is the merchant of record), and
  - only our **commission / service fee** ends up with the company.
- Support a second path where the **operator or distributor is merchant of record** and payment happens on their hosted page opened inside the app.
- Price display: always show the **final total price** including any service fee, broken down per leg, before payment. Service fee is configurable (fixed, percentage, per leg, or zero).
- Multi-leg orchestration: reserve all legs → take payment → confirm all legs. If any leg fails, automatically **void/refund** the others and inform the user clearly. Idempotent operations and full reconciliation logging.
- Cancellations/refunds are requested **from the operator via its adapter**, following the operator's rules; the app shows the operator's refund amount and our fee refund policy separately.

### 2.4 Documents in the traveller's name
- **Operator documents are the tax documents for the fare.** Always fetch and store the operator's original ticket and any operator invoice/receipt (tickets can count as the VAT invoice for the fare). Never alter them.
- **Our own invoice covers only our service fee** (German VAT on our service), with its own sequential invoice numbering, issued to the traveller's name (optionally company name + VAT ID for business travel).
- **Trip summary / booking confirmation PDF** in the traveller's name that bundles everything: all legs, operators, fares, the operator documents attached, and our service-fee invoice — clearly labelled so it is not mistaken for the operator's tax invoice for the fare.
- Tax rates, invoice texts and layouts live in a configurable **invoice module** (per language, per country leg) so my tax adviser can adjust them without code changes.

### 2.5 Commission & settlement (back-office)
- Track expected commission per booking per operator/distributor contract (configurable rates and rules per contract).
- Monthly **settlement & reconciliation reports** per operator/distributor: bookings, cancellations, refunds, commission due, discrepancies. CSV/PDF export for my tax adviser.
- Admin back-office: search bookings, view audit trail, trigger operator cancellation/refund, manage operator contracts, T&C versions, service fees, content and translations; role-based access.

### 2.6 Customer service routing
- In-app help per booking that routes the request correctly: our service (account, app, fee) vs. **operator matters** (delays, compensation, refunds, lost property) with the right operator contact/claim form, pre-filled with booking data.
- Assist with passenger-rights compensation claims (e.g. delay compensation) by preparing the claim for the operator — the operator decides and pays.

### 2.7 Hotels and other travel items
- In the itinerary builder, hotels and other non-transport items are **notes/links only** — no booking or payment of non-transport services in this version (to avoid package-travel obligations). Keep the model extensible for later.

---

## 3. Architecture

- **Provider adapter pattern.** Each operator or distribution channel is a separate adapter behind one common interface, e.g.:
  `searchJourneys`, `getOffers`, `getConditionsOfCarriage`, `createReservation`, `confirmBooking`, `cancelBooking`, `requestRefund`, `getTicket`, `getOperatorDocuments`, `subscribeRealtime`, `getCommissionTerms`.
  Each adapter declares its capabilities: through-ticket support, who is merchant of record, in-app hosted payment needed or not, refund rules, languages.
- **Start with mock adapters.** I do not yet have commercial API access. Build realistic mocks (plausible timetables, prices, tickets, delays, failures, refunds) so the whole app works end-to-end now. Shape the interface to fit the real channels I will add later:
  - OSDM (Open Sales and Distribution Model) — model the interface on it
  - Rail wholesale distributors (e.g. Distribusion, Trainline Partner Solutions, Rail Europe)
  - Deutsche Bahn sales-agency channel (long-distance, Deutschlandtarif regional tickets, Deutschland-Ticket)
  - FlixTrain / FlixBus partner API
  - Local-transit ticketing per tariff association (Verbund), directly or via an ÖPNV ticketing API provider
  - Direct operator integrations (e.g. night-train operators), including the "hosted page inside the app" path
- **Timetable & real-time data** via their own adapters: GTFS / GTFS-Realtime for Germany (Mobilithek / DELFI) and DB real-time data where available — independent of which channel sold the ticket.
- **Journey planning is separate from selling**: plan from timetable data, then ask each relevant adapter to price and sell its legs.
- **Notifications** via APNs/FCM, driven by a background worker watching each active booking's real-time data.
- **Security & privacy (GDPR / BDSG / TDDDG)**:
  - data minimisation, purpose-bound processing, consent management for analytics/tracking (off by default)
  - user self-service data export and account deletion (with legally required retention of booking/tax records kept separately and access-restricted)
  - encrypted PII at rest, EU hosting by default, no card data on our servers (PSP tokens only)
  - record of processing activities and a list of all processors/data recipients (operators, distributors, PSP, push, email) generated from config, so I can hand it to my data protection officer
  - clear notice at checkout that passenger data is passed to the operator(s) to perform the contract of carriage
  - audit log for bookings, refunds, admin actions
- **Accessibility**: meet WCAG 2.2 AA across app and web (German BFSG requirements for e-commerce and passenger-transport ticketing), including screen readers, dynamic text size, contrast, and RTL.

## 4. Suggested stack (propose changes if you have strong reasons)

- Monorepo, TypeScript everywhere.
- Mobile: React Native with Expo (iOS + Android). Web: Next.js sharing UI logic and i18n. Admin back-office: Next.js.
- Backend: Node.js (NestJS), PostgreSQL, Redis (cache, queues), background workers.
- i18n: i18next with ICU message format; RTL tested on every screen.
- PDF generation server-side from templates (per language).
- Maps: MapLibre + OpenStreetMap tiles for development.
- Tests: unit (adapters, pricing, fees, invoice numbering, connection-buffer rules), integration (multi-leg booking with partial failure and refund), end-to-end (search → pay → ticket → cancel/refund).
- Docker Compose for local dev; seed script with demo data; `.env.example` listing every key.

## 5. Screens

Onboarding & language · Sign-up / login (email, Apple, Google) · Home (search + upcoming trip + live status) · Search results (cheapest / fastest / fewest changes; operator shown on each option; through-ticket vs separate-tickets badge) · Journey details (legs, operators, changes, platforms, live delays, CO₂) · Passengers & extras (seats, bike, class, discount cards like BahnCard) · Checkout (per-leg price, service fee, total, operator conditions of carriage, separate-ticket notice, one-tap pay) · Ticket wallet (offline QR/Aztec) · Live trip view · Itinerary builder (timeline + map) · Bookings (upcoming / current / past) · Booking detail (tickets, operator documents, our fee invoice, trip summary, cancel/refund, help routing) · Notifications centre · Profile (passengers, payment methods, company invoice details, language, privacy settings, data export/delete) · Admin back-office (bookings, audit trail, refunds, operator contracts, commission & settlement reports, fees, content/translations).

## 6. Phases

1. **Foundation** — monorepo, auth, data model (users, passengers, operators, distributors, contracts, T&C versions, itineraries, bookings, legs, offers, tickets, payments, payouts, commissions, documents, invoices, audit log, notifications), i18n with 7 languages + RTL, design system.
2. **Search & journey planning** — multilingual station search, GTFS journey planner, mock adapters with through-ticket and separate-ticket cases.
3. **Agent checkout & payments** — per-leg operator disclosure and T&C acceptance, separate-ticket notice, platform payments (Stripe Connect test mode), hosted-page-in-app path, multi-leg orchestration with partial-failure refunds, ticket wallet.
4. **Documents & history** — operator document storage, service-fee invoices, trip summary PDF, booking history, offline access.
5. **Real-time & notifications** — feed ingestion, alerts, alternative suggestions, help/claims routing to operators.
6. **Itinerary builder** — multi-day trips, map/timeline, calendar export, sharing.
7. **Back-office** — admin tools, commission tracking, monthly settlement & reconciliation reports.
8. **Hardening** — accessibility audit, performance, security review, GDPR features and processing records, full test pass, and a written **integration guide** listing exactly what I must obtain (agency/distribution contracts, API keys, merchant-of-record arrangements) to replace each mock adapter with a real one, plus a list of every legal/tax setting my lawyer and tax adviser must confirm.

## 7. What to deliver

Working code, a README with setup steps, adapter interface documentation, the integration guide, the legal/tax settings checklist, and a list of open decisions for me.

Start with phase 1. Before writing code, show me the proposed folder structure and data model in a short summary and wait for my OK.
