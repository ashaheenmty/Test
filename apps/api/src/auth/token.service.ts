import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Settings } from '@tb/config';
import type { AdminRole, AuthTokens } from '@tb/domain';
import type { PrincipalType, Prisma } from '@tb/db';
import { ApiError } from '../common/errors';
import { ENV, type Env } from '../config/env';
import { SETTINGS } from '../config/settings.provider';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export const ISSUER = 'tb-api';

export interface UserClaims {
  sub: string;
  typ: 'user';
}

export interface AdminClaims {
  sub: string;
  typ: 'admin';
  roles: AdminRole[];
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');

/**
 * Short-lived JWT access tokens + rotating opaque refresh tokens.
 * Refresh-token reuse (presenting an already-rotated token) revokes the whole
 * family — the standard mitigation for stolen refresh tokens.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
    @Inject(SETTINGS) private readonly settings: Settings,
  ) {}

  private secret(typ: PrincipalType) {
    return typ === 'ADMIN' ? this.env.JWT_ADMIN_SECRET : this.env.JWT_ACCESS_SECRET;
  }

  private audience(typ: PrincipalType) {
    return typ === 'ADMIN' ? 'admin' : 'app';
  }

  async issue(
    principal: { type: 'USER'; userId: string } | { type: 'ADMIN'; adminUserId: string; roles: AdminRole[] },
    opts: { familyId?: string; userAgent?: string | null; tx?: Prisma.TransactionClient } = {},
  ): Promise<AuthTokens & { refreshTokenId: string }> {
    const ttl = this.settings.auth.accessTokenTtlSeconds;
    const claims =
      principal.type === 'USER'
        ? { typ: 'user' as const }
        : { typ: 'admin' as const, roles: principal.roles };
    const sub = principal.type === 'USER' ? principal.userId : principal.adminUserId;
    const accessToken = await this.jwt.signAsync(claims, {
      subject: sub,
      secret: this.secret(principal.type),
      audience: this.audience(principal.type),
      issuer: ISSUER,
      expiresIn: ttl,
      algorithm: 'HS256',
    });

    const refreshToken = randomToken();
    const refreshExpires = new Date(Date.now() + this.settings.auth.refreshTokenTtlDays * 86_400_000);
    const row = await (opts.tx ?? this.prisma).refreshToken.create({
      data: {
        principalType: principal.type,
        userId: principal.type === 'USER' ? principal.userId : null,
        adminUserId: principal.type === 'ADMIN' ? principal.adminUserId : null,
        familyId: opts.familyId ?? randomUUID(),
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpires,
        userAgent: opts.userAgent ?? null,
      },
    });
    return {
      accessToken,
      accessTokenExpiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshExpires.toISOString(),
      refreshTokenId: row.id,
    };
  }

  async verifyAccess<T extends UserClaims | AdminClaims>(token: string, type: PrincipalType): Promise<T> {
    try {
      return await this.jwt.verifyAsync<T>(token, {
        secret: this.secret(type),
        audience: this.audience(type),
        issuer: ISSUER,
        algorithms: ['HS256'],
      });
    } catch {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');
    }
  }

  /** Rotates a refresh token. Returns the principal it belongs to plus new tokens. */
  async rotate(
    refreshToken: string,
    type: PrincipalType,
    userAgent: string | null,
    rolesFor?: (adminUserId: string) => Promise<AdminRole[]>,
  ): Promise<AuthTokens & { principalId: string }> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
    if (!row || row.principalType !== type) throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');

    if (row.revokedAt) {
      await this.revokeFamily(row.familyId);
      await this.audit.record({
        actorType: 'SYSTEM',
        action: 'auth.refresh_reuse_detected',
        entityType: type === 'USER' ? 'User' : 'AdminUser',
        entityId: (row.userId ?? row.adminUserId)!,
        data: { familyId: row.familyId },
      });
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');
    }
    if (row.expiresAt < new Date()) throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');

    // Mark as used first (conditional update) so two parallel refreshes cannot both succeed.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count === 0) {
      await this.revokeFamily(row.familyId);
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');
    }

    const principal =
      type === 'USER'
        ? ({ type: 'USER', userId: row.userId! } as const)
        : ({ type: 'ADMIN', adminUserId: row.adminUserId!, roles: await rolesFor!(row.adminUserId!) } as const);
    const next = await this.issue(principal, { familyId: row.familyId, userAgent });
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { replacedById: next.refreshTokenId } });
    const { refreshTokenId: _, ...tokens } = next;
    return { ...tokens, principalId: (row.userId ?? row.adminUserId)! };
  }

  async revokeByToken(refreshToken: string): Promise<void> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
    if (row) await this.revokeFamily(row.familyId);
  }

  revokeFamily(familyId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllForUser(userId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
