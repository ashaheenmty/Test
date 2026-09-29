import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Settings } from '@tb/config';
import type { AuthTokens, LoginInput, RegisterInput } from '@tb/domain';
import type { EmailTokenPurpose, Prisma, User } from '@tb/db';
import { getT, isSupportedLocale, DEFAULT_LOCALE, type SupportedLocale } from '@tb/i18n';
import { AuditService } from '../audit/audit.service';
import { ApiError } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { ENV, type Env } from '../config/env';
import { SETTINGS } from '../config/settings.provider';
import { LegalService } from '../legal/legal.service';
import { MailerService } from '../mail/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import type { OAuthProvider } from './oauth-verifier';
import { OAuthVerifier } from './oauth-verifier';
import { PasswordService } from './password.service';
import { randomToken, sha256, TokenService } from './token.service';

const MAX_FAILED_LOGINS = 10;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly oauth: OAuthVerifier,
    private readonly legal: LegalService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
    @Inject(SETTINGS) private readonly settings: Settings,
  ) {}

  private strip(tokens: AuthTokens & { refreshTokenId?: string }): AuthTokens {
    const { refreshTokenId: _, ...rest } = tokens;
    return rest;
  }

  async register(input: RegisterInput, meta: RequestMeta): Promise<AuthTokens> {
    const versions = await this.legal.currentVersions(input.locale);
    if (
      input.acceptedAgentTermsVersion !== versions.AGENT_TERMS.version ||
      input.acceptedPrivacyPolicyVersion !== versions.PRIVACY_POLICY.version
    ) {
      throw new ApiError(HttpStatus.CONFLICT, 'legal.outdatedVersion', 'Accepted legal versions are not current', versions);
    }
    if (await this.prisma.user.findUnique({ where: { email: input.email } })) {
      // OPEN DECISION: this reveals that the address is registered (usability vs. enumeration).
      throw new ApiError(HttpStatus.CONFLICT, 'auth.emailTaken');
    }
    const passwordHash = await this.passwords.hash(input.password);
    const { user, tokens } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          locale: input.locale,
          passengers: {
            create: { firstName: input.firstName, lastName: input.lastName, email: input.email, isAccountHolder: true },
          },
        },
      });
      await this.audit.record(
        {
          actorType: 'USER',
          actorId: user.id,
          action: 'user.registered',
          entityType: 'User',
          entityId: user.id,
          data: {
            method: 'password',
            acceptedAgentTerms: versions.AGENT_TERMS,
            acceptedPrivacyPolicy: versions.PRIVACY_POLICY,
            locale: input.locale,
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
        tx,
      );
      const tokens = await this.tokens.issue({ type: 'USER', userId: user.id }, { userAgent: meta.userAgent, tx });
      return { user, tokens };
    });
    await this.sendEmailToken(user, 'VERIFY_EMAIL', input.firstName);
    return this.strip(tokens);
  }

  async login(input: LoginInput, meta: RequestMeta): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      await this.passwords.verify(null, input.password);
      throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, 'auth.rateLimited');
    }
    const ok = user && user.status === 'ACTIVE' && (await this.passwords.verify(user.passwordHash, input.password));
    if (!user || !ok) {
      if (user) {
        const failed = user.failedLogins + 1;
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLogins: failed >= MAX_FAILED_LOGINS ? 0 : failed,
            lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
          },
        });
        await this.audit.record({
          actorType: 'SYSTEM',
          action: failed >= MAX_FAILED_LOGINS ? 'auth.account_locked' : 'auth.login_failed',
          entityType: 'User',
          entityId: user.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
      } else {
        await this.passwords.verify(null, input.password);
      }
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidCredentials');
    }
    if (user.failedLogins > 0 || user.lockedUntil) {
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    }
    await this.audit.record({
      actorType: 'USER',
      actorId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      data: { method: 'password' },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return this.strip(await this.tokens.issue({ type: 'USER', userId: user.id }, { userAgent: meta.userAgent }));
  }

  async oauthLogin(
    provider: OAuthProvider,
    input: { idToken: string; locale?: SupportedLocale; firstName?: string; lastName?: string },
    meta: RequestMeta,
  ): Promise<AuthTokens & { created: boolean }> {
    const identity = await this.oauth.verify(provider, input.idToken);
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: { provider_subject: { provider: identity.provider, subject: identity.subject } },
      include: { user: true },
    });

    let user: User;
    let created = false;
    if (existingIdentity) {
      user = existingIdentity.user;
    } else {
      if (!identity.email || !identity.emailVerified) {
        throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.emailNotVerifiedByProvider');
      }
      const byEmail = await this.prisma.user.findUnique({ where: { email: identity.email } });
      user = await this.prisma.$transaction(async (tx) => {
        if (byEmail) {
          // Link to the existing account. If its email was never verified, somebody else may have
          // registered it: drop the unverified password and sessions so only the provider owner keeps access.
          const takeoverRisk = !byEmail.emailVerifiedAt;
          if (takeoverRisk) await this.tokens.revokeAllForUser(byEmail.id, tx);
          await tx.authIdentity.create({
            data: { userId: byEmail.id, provider: identity.provider, subject: identity.subject, email: identity.email },
          });
          const linked = await tx.user.update({
            where: { id: byEmail.id },
            data: { emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(), ...(takeoverRisk ? { passwordHash: null } : {}) },
          });
          await this.audit.record(
            {
              actorType: 'USER',
              actorId: byEmail.id,
              action: 'auth.identity_linked',
              entityType: 'User',
              entityId: byEmail.id,
              data: { provider: identity.provider, clearedUnverifiedPassword: takeoverRisk },
              ip: meta.ip,
              userAgent: meta.userAgent,
            },
            tx,
          );
          return linked;
        }
        created = true;
        const locale = input.locale ?? DEFAULT_LOCALE;
        const versions = await this.legal.currentVersions(locale);
        const createdUser = await tx.user.create({
          data: {
            email: identity.email!,
            emailVerifiedAt: new Date(),
            locale,
            identities: { create: { provider: identity.provider, subject: identity.subject, email: identity.email } },
            passengers:
              input.firstName && input.lastName
                ? { create: { firstName: input.firstName, lastName: input.lastName, email: identity.email, isAccountHolder: true } }
                : undefined,
          },
        });
        await this.audit.record(
          {
            actorType: 'USER',
            actorId: createdUser.id,
            action: 'user.registered',
            entityType: 'User',
            entityId: createdUser.id,
            // OPEN DECISION (legal): the client must show terms/privacy before the provider sheet;
            // acceptance is recorded here with the versions current at sign-up.
            data: { method: identity.provider, acceptedAgentTerms: versions.AGENT_TERMS, acceptedPrivacyPolicy: versions.PRIVACY_POLICY },
            ip: meta.ip,
            userAgent: meta.userAgent,
          },
          tx,
        );
        return createdUser;
      });
    }
    if (user.status !== 'ACTIVE') throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidCredentials');
    await this.audit.record({
      actorType: 'USER',
      actorId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      data: { method: identity.provider },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    const tokens = await this.tokens.issue({ type: 'USER', userId: user.id }, { userAgent: meta.userAgent });
    return { ...this.strip(tokens), created };
  }

  refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
    return this.tokens.rotate(refreshToken, 'USER', meta.userAgent).then(({ principalId: _, ...t }) => t);
  }

  logout(refreshToken: string) {
    return this.tokens.revokeByToken(refreshToken);
  }

  // ─── Email verification & password reset ───

  private async sendEmailToken(user: User, purpose: EmailTokenPurpose, name?: string) {
    const token = randomToken();
    const minutes = this.settings.auth.emailTokenTtlMinutes;
    await this.prisma.emailToken.create({
      data: { userId: user.id, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + minutes * 60_000) },
    });
    const locale = isSupportedLocale(user.locale) ? user.locale : DEFAULT_LOCALE;
    const t = getT(locale, { brand: this.settings.brand.name });
    const path = purpose === 'VERIFY_EMAIL' ? 'verify-email' : 'reset-password';
    const link = `${this.env.APP_WEB_URL}/${locale}/${path}?token=${token}`;
    const holder =
      name ??
      (await this.prisma.passenger.findFirst({ where: { userId: user.id, isAccountHolder: true } }))?.firstName ??
      '';
    const prefix = purpose === 'VERIFY_EMAIL' ? 'email.verify' : 'email.reset';
    await this.mailer.send({
      to: user.email,
      subject: t(`${prefix}Subject`),
      text: t(`${prefix}Body`, { name: holder, link, minutes }),
    });
  }

  private async consumeEmailToken(token: string, purpose: EmailTokenPurpose, tx: Prisma.TransactionClient) {
    const row = await tx.emailToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt < new Date()) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'auth.invalidOrExpiredLink');
    }
    const claimed = await tx.emailToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count === 0) throw new ApiError(HttpStatus.BAD_REQUEST, 'auth.invalidOrExpiredLink');
    return row;
  }

  async verifyEmail(token: string) {
    await this.prisma.$transaction(async (tx) => {
      const row = await this.consumeEmailToken(token, 'VERIFY_EMAIL', tx);
      await tx.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } });
      await this.audit.record(
        { actorType: 'USER', actorId: row.userId, action: 'user.email_verified', entityType: 'User', entityId: row.userId },
        tx,
      );
    });
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.emailVerifiedAt) await this.sendEmailToken(user, 'VERIFY_EMAIL');
  }

  /** Always succeeds silently so the endpoint cannot be used to discover accounts. */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.status === 'ACTIVE') await this.sendEmailToken(user, 'RESET_PASSWORD');
  }

  async resetPassword(token: string, password: string, meta: RequestMeta) {
    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction(async (tx) => {
      const row = await this.consumeEmailToken(token, 'RESET_PASSWORD', tx);
      await tx.user.update({
        where: { id: row.userId },
        // A reset link proves control of the mailbox, so the address counts as verified.
        data: { passwordHash, failedLogins: 0, lockedUntil: null, emailVerifiedAt: new Date() },
      });
      await this.tokens.revokeAllForUser(row.userId, tx);
      await this.audit.record(
        {
          actorType: 'USER',
          actorId: row.userId,
          action: 'auth.password_reset',
          entityType: 'User',
          entityId: row.userId,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
        tx,
      );
    });
  }
}
