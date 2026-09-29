import { Controller, Get, Module, Param, Query } from '@nestjs/common';
import { ZodPipe } from '../common/zod';
import { operatorQuerySchema, ReferenceService, type OperatorQuery } from './reference.service';

/** Public reference data: operators, tariff associations and sales channels. */
@Controller('reference')
export class ReferenceController {
  constructor(private readonly reference: ReferenceService) {}

  @Get('operators')
  operators(@Query(new ZodPipe(operatorQuerySchema)) query: OperatorQuery) {
    return this.reference.operators(query);
  }

  @Get('operators/:slug')
  operator(@Param('slug') slug: string) {
    return this.reference.operator(slug);
  }

  @Get('tariff-associations')
  tariffAssociations() {
    return this.reference.tariffAssociations();
  }

  @Get('sales-channels')
  salesChannels() {
    return this.reference.salesChannels();
  }
}

@Module({ controllers: [ReferenceController], providers: [ReferenceService], exports: [ReferenceService] })
export class ReferenceModule {}
