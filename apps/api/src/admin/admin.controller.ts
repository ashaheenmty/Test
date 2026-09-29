import { Body, Controller, Get, HttpCode, HttpStatus, Module, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { loginSchema, OrganisationStatus, refreshSchema, type AdminRole, type LoginInput } from '@tb/domain';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AdminAuthGuard, CurrentAdmin, Roles } from '../auth/guards';
import { PasswordService } from '../auth/password.service';
import { TokenService, type AdminClaims } from '../auth/token.service';
import { ApiError } from '../common/errors';
import { Meta, type RequestMeta } from '../common/request-meta';
import { ZodPipe } from '../common/zod';
import { PrismaService } from '../prisma/prisma.service';
import { ReferenceModule } from '../reference/reference.controller';
import { operatorQuerySchema, ReferenceService, type OperatorQuery } from '../reference/reference.service';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  private roles = async (id: string): Promise<AdminRole[]> => {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin?.active) throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');
    return admin.roles;
  };

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body(new ZodPipe(loginSchema)) body: LoginInput, @Meta() meta: RequestMeta) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: body.email } });
    const ok = admin?.active && (await this.passwords.verify(admin.passwordHash, body.password));
    if (!admin || !ok) {
      if (!admin) await this.passwords.verify(null, body.password);
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidCredentials');
    }
    await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: admin.id,
      action: 'admin.login',
      entityType: 'AdminUser',
      entityId: admin.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    const { refreshTokenId: _, ...tokens } = await this.tokens.issue(
      { type: 'ADMIN', adminUserId: admin.id, roles: admin.roles },
      { userAgent: meta.userAgent },
    );
    return { ...tokens, admin: { id: admin.id, email: admin.email, name: admin.name, roles: admin.roles } };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body(new ZodPipe(refreshSchema)) body: { refreshToken: string }, @Meta() meta: RequestMeta) {
    const { principalId: _, ...tokens } = await this.tokens.rotate(body.refreshToken, 'ADMIN', meta.userAgent, this.roles);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body(new ZodPipe(refreshSchema)) body: { refreshToken: string }) {
    await this.tokens.revokeByToken(body.refreshToken);
  }
}

const auditQuerySchema = z.object({
  entityType: z.string().max(60).optional(),
  entityId: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  before: z.coerce.bigint().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const operatorPatchSchema = z.object({
  status: z.enum(OrganisationStatus).optional(),
  notes: z.string().max(4000).nullable().optional(),
});

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly reference: ReferenceService,
  ) {}

  @Get('me')
  async me(@CurrentAdmin() admin: AdminClaims) {
    const row = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: admin.sub } });
    return { id: row.id, email: row.email, name: row.name, roles: row.roles };
  }

  @Get('audit')
  @Roles('SUPPORT', 'FINANCE', 'OPS')
  async auditLog(@Query(new ZodPipe(auditQuerySchema)) q: z.infer<typeof auditQuerySchema>) {
    const rows = await this.prisma.auditEvent.findMany({
      where: {
        ...(q.entityType ? { entityType: q.entityType } : {}),
        ...(q.entityId ? { entityId: q.entityId } : {}),
        ...(q.action ? { action: { startsWith: q.action } } : {}),
        ...(q.before ? { id: { lt: q.before } } : {}),
      },
      orderBy: { id: 'desc' },
      take: q.limit,
    });
    return {
      items: rows.map((r) => ({ ...r, id: r.id.toString() })),
      nextBefore: rows.length === q.limit ? rows[rows.length - 1]!.id.toString() : null,
    };
  }

  @Get('audit/verify')
  @Roles('SUPER_ADMIN')
  verify() {
    return this.audit.verify();
  }

  @Get('operators')
  operators(@Query(new ZodPipe(operatorQuerySchema)) query: OperatorQuery) {
    return this.reference.operators(query);
  }

  @Patch('operators/:slug')
  @Roles('OPS')
  async updateOperator(
    @CurrentAdmin() admin: AdminClaims,
    @Param('slug') slug: string,
    @Body(new ZodPipe(operatorPatchSchema)) body: z.infer<typeof operatorPatchSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const org = await this.prisma.organisation.findUnique({ where: { slug } });
    if (!org) throw new ApiError(HttpStatus.NOT_FOUND, 'operator.notFound');
    await this.prisma.$transaction(async (tx) => {
      await tx.organisation.update({ where: { id: org.id }, data: body });
      await this.audit.record(
        {
          actorType: 'ADMIN',
          actorId: admin.sub,
          action: 'admin.operator_updated',
          entityType: 'Organisation',
          entityId: org.id,
          data: { before: { status: org.status, notes: org.notes }, after: body },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
        tx,
      );
    });
    return this.reference.operator(slug);
  }
}

@Module({ imports: [ReferenceModule], controllers: [AdminAuthController, AdminController] })
export class AdminModule {}
