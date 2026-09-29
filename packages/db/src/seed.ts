/**
 * Idempotent seed: reference data from data/operators/operators.json, our own
 * legal documents (placeholders), fee/tax configuration, an admin user and — in
 * non-production environments — a demo customer.
 *
 *   pnpm db:seed
 */
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import argon2 from 'argon2';
import { loadSettings } from '@tb/config';
import { SUPPORTED_LOCALES } from '@tb/domain';
import { getT } from '@tb/i18n';
import { PrismaClient, type LegalDocumentType, type Prisma } from '@prisma/client';
import { appendAuditEvent } from './audit';
import type { NormalisedData } from './operators/normalise';

const prisma = new PrismaClient();
const settings = loadSettings();
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const LEGAL_VERSION = '2026-09-draft';

/** Channel → operators / tariffs it can sell. ASSUMPTIONS for mock adapters until contracts exist. */
const COVERAGE: Record<string, { operators?: string[]; tariffs?: string[] }> = {
  'db-vertrieb': {
    operators: ['db-fernverkehr'],
    tariffs: ['deutschlandtarif-dtv', 'deutschland-ticket'],
  },
  'flix-partner-affiliate-api': { operators: ['flixtrain', 'flixbus'] },
  'osdm-open-sales-distribution-model': { operators: ['db-fernverkehr', 'oebb', 'sbb'] },
  'operator-direct-shops': {
    operators: ['eurostar', 'sncf-voyageurs', 'oebb', 'european-sleeper', 'snaelltaget', 'govolta', 'ceske-drahy', 'pkp-intercity'],
  },
  'mobilitybox-tracsis': { tariffs: ['vbb', 'mvv', 'hvv'] },
};

async function seedReferenceData(data: NormalisedData) {
  // Our own organisation (the agent).
  const agent = settings.agentCompany;
  await prisma.organisation.upsert({
    where: { slug: 'agent' },
    create: {
      slug: 'agent',
      legalName: agent.legalName,
      displayName: settings.brand.name,
      country: agent.country,
      vatId: agent.vatId,
      roles: ['AGENT'],
    },
    update: { legalName: agent.legalName, displayName: settings.brand.name, vatId: agent.vatId },
  });

  for (const op of data.operators) {
    const org = await prisma.organisation.upsert({
      where: { slug: op.slug },
      create: {
        slug: op.slug,
        legalName: op.name,
        displayName: op.name,
        country: op.country,
        groupName: op.groupName,
        roles: ['OPERATOR'],
        status: op.status,
        notes: [op.statusReason, ...op.notes].filter(Boolean).join('\n') || null,
        source: { sheets: op.sources, legalNameVerified: false } as unknown as Prisma.InputJsonValue,
      },
      update: {
        displayName: op.name,
        country: op.country,
        groupName: op.groupName,
        status: op.status,
        notes: [op.statusReason, ...op.notes].filter(Boolean).join('\n') || null,
        source: { sheets: op.sources, legalNameVerified: false } as unknown as Prisma.InputJsonValue,
      },
    });
    const operator = await prisma.operator.upsert({
      where: { organisationId: org.id },
      create: {
        organisationId: org.id,
        brands: op.brands,
        modes: op.modes,
        segments: op.segments,
        serviceTypes: op.serviceTypes.join('; ') || null,
        coverage: op.coverage.join('; ') || null,
        ownSalesChannel: op.ownSalesChannel,
      },
      update: {
        brands: op.brands,
        modes: op.modes,
        segments: op.segments,
        serviceTypes: op.serviceTypes.join('; ') || null,
        coverage: op.coverage.join('; ') || null,
        ownSalesChannel: op.ownSalesChannel,
      },
    });
    for (const r of op.regions) {
      await prisma.operatorRegion.upsert({
        where: { operatorId_regionType_regionCode: { operatorId: operator.id, regionType: r.type, regionCode: r.code } },
        create: { operatorId: operator.id, regionType: r.type, regionCode: r.code, description: r.description },
        update: { description: r.description },
      });
    }
  }

  for (const t of data.tariffAssociations) {
    const org = await prisma.organisation.upsert({
      where: { slug: `tariff-${t.slug}` },
      create: {
        slug: `tariff-${t.slug}`,
        legalName: t.fullName,
        displayName: t.shortName,
        country: 'DE',
        roles: ['TARIFF_ASSOCIATION'],
        source: { sheets: [t.source], legalNameVerified: false } as unknown as Prisma.InputJsonValue,
      },
      update: { legalName: t.fullName, displayName: t.shortName },
    });
    await prisma.tariffAssociation.upsert({
      where: { shortName: t.shortName },
      create: { organisationId: org.id, shortName: t.shortName, fullName: t.fullName, area: t.area, kind: t.kind },
      update: { fullName: t.fullName, area: t.area, kind: t.kind },
    });
  }

  const tariffBySlug = new Map(
    (await prisma.tariffAssociation.findMany({ include: { organisation: true } })).map((t) => [
      t.organisation.slug.replace(/^tariff-/, ''),
      t,
    ]),
  );
  const tariffByShort = new Map([...tariffBySlug.values()].map((t) => [t.shortName, t]));
  const operatorBySlug = new Map(
    (await prisma.operator.findMany({ include: { organisation: true } })).map((o) => [o.organisation.slug, o]),
  );

  for (const c of data.cityTransit) {
    const tariff = c.tariffShortName ? tariffByShort.get(c.tariffShortName) : undefined;
    const area = await prisma.cityTransitArea.upsert({
      where: { city: c.city },
      create: { city: c.city, state: c.state, modes: c.modes, tariffAssociationId: tariff?.id, tariffNote: c.tariffNote },
      update: { state: c.state, modes: c.modes, tariffAssociationId: tariff?.id ?? null, tariffNote: c.tariffNote },
    });
    for (const slug of c.operatorSlugs) {
      const op = operatorBySlug.get(slug);
      if (!op) throw new Error(`City ${c.city}: unknown operator ${slug}`);
      await prisma.cityTransitOperator.upsert({
        where: { cityAreaId_operatorId: { cityAreaId: area.id, operatorId: op.id } },
        create: { cityAreaId: area.id, operatorId: op.id },
        update: {},
      });
    }
  }

  for (const ch of data.salesChannels) {
    const channel = await prisma.salesChannel.upsert({
      where: { code: ch.code },
      create: {
        code: ch.code,
        name: ch.name,
        kind: ch.kind,
        merchantOfRecord: ch.merchantOfRecord,
        hostedPaymentRequired: ch.hostedPaymentRequired,
        throughTicketSupport: ch.throughTicketSupport,
        adapterKey: ch.adapterKey,
        coverageDescription: ch.coverage,
        relevance: [ch.relevance, ...ch.assumptions].filter(Boolean).join('\n') || null,
        status: ch.status,
        languages: [],
      },
      update: {
        name: ch.name,
        kind: ch.kind,
        merchantOfRecord: ch.merchantOfRecord,
        hostedPaymentRequired: ch.hostedPaymentRequired,
        throughTicketSupport: ch.throughTicketSupport,
        adapterKey: ch.adapterKey,
        coverageDescription: ch.coverage,
        relevance: [ch.relevance, ...ch.assumptions].filter(Boolean).join('\n') || null,
        status: ch.status,
      },
    });
    const cov = COVERAGE[ch.code];
    if (!cov) continue;
    await prisma.channelCoverage.deleteMany({ where: { salesChannelId: channel.id } });
    await prisma.channelCoverage.createMany({
      data: [
        ...(cov.operators ?? []).map((slug) => {
          const op = operatorBySlug.get(slug);
          if (!op) throw new Error(`Coverage ${ch.code}: unknown operator ${slug}`);
          return { salesChannelId: channel.id, operatorId: op.id, productScope: 'ASSUMPTION – confirm by contract' };
        }),
        ...(cov.tariffs ?? []).map((slug) => {
          const t = tariffBySlug.get(slug);
          if (!t) throw new Error(`Coverage ${ch.code}: unknown tariff ${slug}`);
          return { salesChannelId: channel.id, tariffAssociationId: t.id, productScope: 'ASSUMPTION – confirm by contract' };
        }),
      ],
    });
  }
}

function legalBody(type: LegalDocumentType, locale: (typeof SUPPORTED_LOCALES)[number]): { title: string; body: string } {
  const t = getT(locale, { brand: settings.brand.name });
  const titleKey: Partial<Record<LegalDocumentType, string>> = {
    AGENT_TERMS: 'legal.terms',
    PRIVACY_POLICY: 'legal.privacy',
    IMPRESSUM: 'legal.impressum',
    DISPUTE_RESOLUTION_NOTICE: 'legal.disputeResolution',
  };
  const title = t(titleKey[type]!);
  const a = settings.agentCompany;
  const lines = [`# ${title}`, '', `> ${t('legal.placeholderBody')}`, ''];
  if (type === 'IMPRESSUM') {
    lines.push(
      a.legalName,
      `${a.street}, ${a.postalCode} ${a.city}`,
      `${a.registerCourt}, ${a.registerNumber}`,
      `USt-IdNr.: ${a.vatId}`,
      `Geschäftsführung: ${a.managingDirectors.join(', ')}`,
      `E-Mail: ${a.email} · Tel.: ${a.phone}`,
    );
  }
  if (type === 'AGENT_TERMS') lines.push(t('legal.agentDisclosure', { company: a.legalName }));
  return { title, body: lines.join('\n') };
}

async function seedLegalDocuments() {
  const agentOrg = await prisma.organisation.findUniqueOrThrow({ where: { slug: 'agent' } });
  const types: LegalDocumentType[] = ['AGENT_TERMS', 'PRIVACY_POLICY', 'IMPRESSUM', 'DISPUTE_RESOLUTION_NOTICE'];
  for (const documentType of types) {
    for (const locale of SUPPORTED_LOCALES) {
      const { title, body } = legalBody(documentType, locale);
      await prisma.legalDocumentVersion.upsert({
        where: {
          organisationId_documentType_locale_version: {
            organisationId: agentOrg.id,
            documentType,
            locale,
            version: LEGAL_VERSION,
          },
        },
        create: {
          ownerKind: 'AGENT',
          organisationId: agentOrg.id,
          documentType,
          locale,
          version: LEGAL_VERSION,
          title,
          body,
          contentHash: sha256(body),
          effectiveFrom: new Date('2026-09-01T00:00:00Z'),
        },
        update: { title, body, contentHash: sha256(body) },
      });
    }
  }
}

async function seedConfiguration() {
  // Service fee schedule (decided 2026-10): per ticket, by transport tier, gross incl. VAT.
  const feeRules = [
    { id: 'fee-long-distance', name: 'Long-distance trains: €1.00 per ticket', kind: 'FIXED_PER_TICKET' as const, category: 'LONG_DISTANCE_RAIL' as const, amountMinor: 100, active: true },
    { id: 'fee-intercity', name: 'Between cities (regional rail): €0.50 per ticket', kind: 'FIXED_PER_TICKET' as const, category: 'INTERCITY_REGIONAL' as const, amountMinor: 50, active: true },
    { id: 'fee-local-bus', name: 'Buses and city transport: €0.10 per ticket', kind: 'FIXED_PER_TICKET' as const, category: 'LOCAL_AND_BUS' as const, amountMinor: 10, active: true },
  ];
  for (const r of feeRules) {
    const { id, ...data } = r;
    await prisma.serviceFeeRule.upsert({
      where: { id },
      create: { id, ...data, validFrom: new Date('2026-01-01T00:00:00Z') },
      update: data,
    });
  }
  // Retire the phase-1 placeholder rules.
  await prisma.serviceFeeRule.updateMany({
    where: { id: { in: ['fee-default-zero', 'fee-example-fixed'] } },
    data: { active: false, validTo: new Date() },
  });
  await prisma.taxRule.upsert({
    where: { id: 'tax-service-fee-de' },
    create: {
      id: 'tax-service-fee-de',
      scope: 'SERVICE_FEE',
      countryCode: 'DE',
      rateBp: settings.serviceFee.vatRateBp,
      validFrom: new Date('2026-01-01T00:00:00Z'),
    },
    update: { rateBp: settings.serviceFee.vatRateBp },
  });
}

async function seedUsers() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(12).toString('base64url');
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        name: 'Administrator',
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        roles: ['SUPER_ADMIN'],
      },
    });
    console.log(`Admin user ${adminEmail} created${process.env.SEED_ADMIN_PASSWORD ? '' : ` with password: ${password}`}`);
  }

  if (process.env.NODE_ENV === 'production') return;
  const demoEmail = 'anna@example.com';
  if (await prisma.user.findUnique({ where: { email: demoEmail } })) return;
  const user = await prisma.user.create({
    data: {
      email: demoEmail,
      emailVerifiedAt: new Date(),
      passwordHash: await argon2.hash('demo passphrase 2026', { type: argon2.argon2id }),
      locale: 'de',
      passengers: {
        create: [
          { firstName: 'Anna', lastName: 'Schmidt', isAccountHolder: true, email: demoEmail },
          { firstName: 'Jonas', lastName: 'Schmidt' },
        ],
      },
    },
  });
  console.log(`Demo user ${demoEmail} / "demo passphrase 2026" created (${user.id})`);
}

async function main() {
  const data = JSON.parse(
    readFileSync(resolve(__dirname, '../../../data/operators/operators.json'), 'utf8'),
  ) as NormalisedData;
  await seedReferenceData(data);
  await seedLegalDocuments();
  await seedConfiguration();
  await seedUsers();
  await appendAuditEvent(prisma, {
    actorType: 'SYSTEM',
    action: 'seed.completed',
    entityType: 'System',
    entityId: 'seed',
    data: { operators: data.operators.length, importedAt: data.importedAt },
  });
  const counts = {
    organisations: await prisma.organisation.count(),
    operators: await prisma.operator.count(),
    tariffAssociations: await prisma.tariffAssociation.count(),
    cityAreas: await prisma.cityTransitArea.count(),
    salesChannels: await prisma.salesChannel.count(),
    legalDocuments: await prisma.legalDocumentVersion.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
