import { Global, Injectable, Module } from '@nestjs/common';
import { appendAuditEvent, verifyAuditChain, type AuditInput, type Prisma } from '@tb/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Records an audit event, optionally inside the caller's transaction. */
  record(input: AuditInput, tx?: Prisma.TransactionClient) {
    return appendAuditEvent(tx ?? this.prisma, input);
  }

  verify() {
    return verifyAuditChain(this.prisma);
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
