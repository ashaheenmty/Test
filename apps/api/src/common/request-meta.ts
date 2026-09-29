import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

/** Client IP and user agent for audit records and acknowledgements. */
export const Meta = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestMeta => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return {
    ip: req.ip ?? null,
    userAgent: req.headers['user-agent']?.slice(0, 500) ?? null,
  };
});
