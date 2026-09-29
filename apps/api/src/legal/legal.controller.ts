import { Controller, Get, HttpStatus, Module, Param, Query } from '@nestjs/common';
import { LegalDocumentType } from '@tb/domain';
import { isSupportedLocale, DEFAULT_LOCALE } from '@tb/i18n';
import { ApiError } from '../common/errors';
import { AGENT_DOCUMENT_TYPES, LegalService } from './legal.service';

@Controller('legal')
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  @Get('versions')
  versions(@Query('locale') locale?: string) {
    return this.legal.currentVersions(isSupportedLocale(locale) ? locale : DEFAULT_LOCALE);
  }

  @Get(':type')
  async document(@Param('type') type: string, @Query('locale') locale?: string) {
    const docType = type.toUpperCase().replace(/-/g, '_') as LegalDocumentType;
    if (!LegalDocumentType.includes(docType) || !AGENT_DOCUMENT_TYPES.includes(docType)) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'legal.notFound');
    }
    const doc = await this.legal.current(docType, isSupportedLocale(locale) ? locale : DEFAULT_LOCALE);
    return {
      type: doc.documentType,
      locale: doc.locale,
      version: doc.version,
      title: doc.title,
      body: doc.body,
      effectiveFrom: doc.effectiveFrom,
      contentHash: doc.contentHash,
    };
  }
}

@Module({ controllers: [LegalController], providers: [LegalService], exports: [LegalService] })
export class LegalModule {}
