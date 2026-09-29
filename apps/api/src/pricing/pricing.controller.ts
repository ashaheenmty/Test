import { Body, Controller, Get, HttpCode, HttpStatus, Injectable, Module, Post } from '@nestjs/common';
import { quoteServiceFee, TransportMode, type FeeRule, type FeeTicket } from '@tb/domain';
import { z } from 'zod';
import { ZodPipe } from '../common/zod';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Service-fee rules valid now (amounts are gross, incl. VAT). */
  async activeRules(now = new Date()): Promise<(FeeRule & { name: string; currency: string })[]> {
    const rows = await this.prisma.serviceFeeRule.findMany({
      where: { active: true, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] },
      orderBy: [{ amountMinor: 'desc' }, { kind: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      category: r.category,
      amountMinor: r.amountMinor,
      percentBp: r.percentBp,
      minMinor: r.minMinor,
      maxMinor: r.maxMinor,
      priority: r.priority,
      active: r.active,
      currency: r.currency,
    }));
  }

  async quote(tickets: FeeTicket[]) {
    return quoteServiceFee(tickets, await this.activeRules());
  }
}

const quoteSchema = z.object({
  tickets: z
    .array(
      z.object({
        modes: z.array(z.enum(TransportMode)).min(1).max(20),
        /** Carrier operator slugs of the legs on this ticket. */
        operators: z.array(z.string().min(1).max(100)).min(1).max(20),
        fareMinor: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(20),
});

/** Public, so the fee can be shown transparently before checkout (final total price rule). */
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get('service-fees')
  async rules() {
    return (await this.pricing.activeRules()).map(({ id, name, kind, category, amountMinor, percentBp, currency }) => ({
      id,
      name,
      kind,
      category,
      amountMinor,
      percentBp,
      currency,
    }));
  }

  @Post('service-fee/quote')
  @HttpCode(HttpStatus.OK)
  quote(@Body(new ZodPipe(quoteSchema)) body: z.infer<typeof quoteSchema>) {
    return this.pricing.quote(
      body.tickets.map((t) => ({ modes: t.modes, operators: t.operators, fare: { amountMinor: t.fareMinor, currency: 'EUR' as const } })),
    );
  }
}

@Module({ controllers: [PricingController], providers: [PricingService], exports: [PricingService] })
export class PricingModule {}
