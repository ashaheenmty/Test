import {
  createParamDecorator,
  HttpStatus,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminRole } from '@tb/domain';
import type { Request } from 'express';
import { ApiError } from '../common/errors';
import { TokenService, type AdminClaims, type UserClaims } from './token.service';

type AuthedRequest = Request & { user?: UserClaims; admin?: AdminClaims };

function bearer(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.missingToken');
  return header.slice(7);
}

/** Requires a valid customer access token. */
@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    req.user = await this.tokens.verifyAccess<UserClaims>(bearer(req), 'USER');
    if (req.user.typ !== 'user') throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');
    return true;
  }
}

export const ROLES_KEY = 'adminRoles';
/** Restricts a back-office route to the given roles (SUPER_ADMIN always passes). */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

/** Requires a valid back-office token and, if @Roles() is set, one of the roles. */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const claims = await this.tokens.verifyAccess<AdminClaims>(bearer(req), 'ADMIN');
    if (claims.typ !== 'admin') throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');
    req.admin = claims;
    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (required?.length && !claims.roles.includes('SUPER_ADMIN') && !required.some((r) => claims.roles.includes(r))) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'auth.forbidden');
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UserClaims => ctx.switchToHttp().getRequest<AuthedRequest>().user!,
);

export const CurrentAdmin = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AdminClaims => ctx.switchToHttp().getRequest<AuthedRequest>().admin!,
);
