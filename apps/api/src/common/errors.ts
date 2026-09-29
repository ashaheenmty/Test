import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';

/**
 * Error codes are stable identifiers the clients translate (e.g. auth.invalidCredentials).
 * Messages are for developers only and never contain personal data.
 */
export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: string,
    message = code,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof ApiError) {
      const body = exception.getResponse() as { code: string; message: string; details?: unknown };
      res.status(exception.getStatus()).json({ error: body });
      return;
    }
    if (exception instanceof ThrottlerException) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({ error: { code: 'auth.rateLimited', message: 'Too many requests' } });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      res.status(status).json({ error: { code: `http.${status}`, message: exception.message } });
      return;
    }
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: { code: 'common.errorGeneric', message: 'Internal error' } });
  }
}
