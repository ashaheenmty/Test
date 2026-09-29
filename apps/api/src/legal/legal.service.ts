import { HttpStatus, Injectable } from '@nestjs/common';
import type { LegalDocumentType } from '@tb/db';
import { DEFAULT_LOCALE, type SupportedLocale } from '@tb/i18n';
import { ApiError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

/** Our own legal documents (owner AGENT). Operator conditions of carriage come in phase 3. */
export const AGENT_DOCUMENT_TYPES: LegalDocumentType[] = [
  'AGENT_TERMS',
  'PRIVACY_POLICY',
  'IMPRESSUM',
  'DISPUTE_RESOLUTION_NOTICE',
];

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Current version in the requested language, falling back to German. */
  async current(documentType: LegalDocumentType, locale: SupportedLocale) {
    const now = new Date();
    for (const l of [locale, DEFAULT_LOCALE]) {
      const doc = await this.prisma.legalDocumentVersion.findFirst({
        where: { ownerKind: 'AGENT', documentType, locale: l, effectiveFrom: { lte: now } },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (doc) return doc;
    }
    throw new ApiError(HttpStatus.NOT_FOUND, 'legal.notFound');
  }

  async currentVersions(locale: SupportedLocale) {
    const [terms, privacy] = await Promise.all([
      this.current('AGENT_TERMS', locale),
      this.current('PRIVACY_POLICY', locale),
    ]);
    return {
      AGENT_TERMS: { id: terms.id, version: terms.version },
      PRIVACY_POLICY: { id: privacy.id, version: privacy.version },
    };
  }
}
