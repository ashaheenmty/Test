import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { ENV, type Env } from '../config/env';

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends transactional email via SMTP (SMTP_URL, e.g. Mailpit locally).
 * Without SMTP_URL mails are logged (dev) and kept in an in-memory outbox (tests).
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger('Mailer');
  private readonly transport: Transporter | null;
  readonly outbox: OutgoingMail[] = [];

  constructor(@Inject(ENV) private readonly env: Env) {
    this.transport = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;
  }

  async send(mail: OutgoingMail): Promise<void> {
    if (this.env.NODE_ENV !== 'production') {
      this.outbox.push(mail);
      if (this.outbox.length > 100) this.outbox.shift();
    }
    if (!this.transport) {
      if (this.env.NODE_ENV === 'development') {
        this.logger.log(`[mail to ${mail.to}] ${mail.subject}\n${mail.text}`);
      }
      return;
    }
    await this.transport.sendMail({ from: this.env.MAIL_FROM, ...mail });
  }
}

@Global()
@Module({ providers: [MailerService], exports: [MailerService] })
export class MailModule {}
