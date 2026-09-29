import { HttpStatus, Injectable } from '@nestjs/common';
import { OperatorSegment, OrganisationStatus } from '@tb/domain';
import type { Prisma } from '@tb/db';
import { z } from 'zod';
import { ApiError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

export const operatorQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  segment: z.enum(OperatorSegment).optional(),
  /** ISO 3166-2 state (DE-BY), country (AT) or city name. */
  region: z.string().trim().max(60).optional(),
  status: z.enum(OrganisationStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type OperatorQuery = z.infer<typeof operatorQuerySchema>;

const operatorInclude = {
  organisation: true,
  regions: { orderBy: [{ regionType: 'asc' }, { regionCode: 'asc' }] },
  coverages: { include: { salesChannel: { select: { code: true, name: true, kind: true, status: true } } } },
} satisfies Prisma.OperatorInclude;

type OperatorRow = Prisma.OperatorGetPayload<{ include: typeof operatorInclude }>;

@Injectable()
export class ReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  presentOperator(o: OperatorRow) {
    return {
      slug: o.organisation.slug,
      name: o.organisation.displayName,
      legalName: o.organisation.legalName,
      country: o.organisation.country,
      groupName: o.organisation.groupName,
      status: o.organisation.status,
      notes: o.organisation.notes,
      brands: o.brands,
      modes: o.modes,
      segments: o.segments,
      serviceTypes: o.serviceTypes,
      coverage: o.coverage,
      ownSalesChannel: o.ownSalesChannel,
      regions: o.regions.map((r) => ({ type: r.regionType, code: r.regionCode, description: r.description })),
      salesChannels: o.coverages.map((c) => c.salesChannel),
    };
  }

  async operators(query: OperatorQuery) {
    const where: Prisma.OperatorWhereInput = {
      ...(query.segment ? { segments: { has: query.segment } } : {}),
      ...(query.region ? { regions: { some: { regionCode: { equals: query.region, mode: 'insensitive' } } } } : {}),
      organisation: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                { displayName: { contains: query.q, mode: 'insensitive' } },
                { legalName: { contains: query.q, mode: 'insensitive' } },
                { groupName: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    };
    if (query.q) {
      // Brands are a text[]; match exact brand names too (e.g. "alex", "Nightjet").
      where.OR = [{ organisation: where.organisation }, { brands: { has: query.q } }];
      delete where.organisation;
      if (query.status) where.AND = [{ organisation: { status: query.status } }];
    }
    const [total, rows] = await Promise.all([
      this.prisma.operator.count({ where }),
      this.prisma.operator.findMany({
        where,
        include: operatorInclude,
        orderBy: { organisation: { displayName: 'asc' } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { total, page: query.page, pageSize: query.pageSize, items: rows.map((r) => this.presentOperator(r)) };
  }

  async operator(slug: string) {
    const row = await this.prisma.operator.findFirst({
      where: { organisation: { slug } },
      include: { ...operatorInclude, cityAreas: { include: { cityArea: { include: { tariffAssociation: true } } } } },
    });
    if (!row) throw new ApiError(HttpStatus.NOT_FOUND, 'operator.notFound');
    return {
      ...this.presentOperator(row),
      cities: row.cityAreas.map((c) => ({ city: c.cityArea.city, tariff: c.cityArea.tariffAssociation?.shortName ?? null })),
    };
  }

  tariffAssociations() {
    return this.prisma.tariffAssociation
      .findMany({ include: { cityAreas: { select: { city: true } } }, orderBy: { shortName: 'asc' } })
      .then((ts) =>
        ts.map((t) => ({ shortName: t.shortName, fullName: t.fullName, area: t.area, kind: t.kind, cities: t.cityAreas.map((c) => c.city) })),
      );
  }

  salesChannels() {
    return this.prisma.salesChannel
      .findMany({ include: { coverages: true }, orderBy: { name: 'asc' } })
      .then((cs) =>
        cs.map((c) => ({
          code: c.code,
          name: c.name,
          kind: c.kind,
          status: c.status,
          merchantOfRecord: c.merchantOfRecord,
          hostedPaymentRequired: c.hostedPaymentRequired,
          throughTicketSupport: c.throughTicketSupport,
          adapterKey: c.adapterKey,
          coverageDescription: c.coverageDescription,
          relevance: c.relevance,
          coverageCount: c.coverages.length,
        })),
      );
  }
}
