import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  forgotPasswordSchema,
  loginSchema,
  oauthSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
  type LoginInput,
  type RegisterInput,
} from '@tb/domain';
import type { z } from 'zod';
import { ApiError } from '../common/errors';
import { Meta, type RequestMeta } from '../common/request-meta';
import { ZodPipe } from '../common/zod';
import { AuthService } from './auth.service';
import { CurrentUser, UserAuthGuard } from './guards';
import type { UserClaims } from './token.service';

const STRICT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle(STRICT)
  register(@Body(new ZodPipe(registerSchema)) body: RegisterInput, @Meta() meta: RequestMeta) {
    return this.auth.register(body, meta);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  login(@Body(new ZodPipe(loginSchema)) body: LoginInput, @Meta() meta: RequestMeta) {
    return this.auth.login(body, meta);
  }

  @Post('oauth/:provider')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  oauth(
    @Param('provider') provider: string,
    @Body(new ZodPipe(oauthSchema)) body: z.infer<typeof oauthSchema>,
    @Meta() meta: RequestMeta,
  ) {
    if (provider !== 'apple' && provider !== 'google') throw new ApiError(HttpStatus.NOT_FOUND, 'auth.unknownProvider');
    return this.auth.oauthLogin(provider, body, meta);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body(new ZodPipe(refreshSchema)) body: { refreshToken: string }, @Meta() meta: RequestMeta) {
    return this.auth.refresh(body.refreshToken, meta);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body(new ZodPipe(refreshSchema)) body: { refreshToken: string }) {
    await this.auth.logout(body.refreshToken);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(STRICT)
  async verifyEmail(@Body(new ZodPipe(tokenSchema)) body: { token: string }) {
    await this.auth.verifyEmail(body.token);
  }

  @Post('verify-email/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(UserAuthGuard)
  async resend(@CurrentUser() user: UserClaims) {
    await this.auth.resendVerification(user.sub);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgot(@Body(new ZodPipe(forgotPasswordSchema)) body: { email: string }) {
    await this.auth.forgotPassword(body.email);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(STRICT)
  async reset(
    @Body(new ZodPipe(resetPasswordSchema)) body: { token: string; password: string },
    @Meta() meta: RequestMeta,
  ) {
    await this.auth.resetPassword(body.token, body.password, meta);
  }
}
