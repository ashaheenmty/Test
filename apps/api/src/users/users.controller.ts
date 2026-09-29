import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  passengerSchema,
  updateProfileSchema,
  type MeResponse,
  type PassengerInput,
  type SupportedLocale,
  type ThemePreference,
} from '@tb/domain';
import type { DiscountCard, Passenger } from '@tb/db';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, UserAuthGuard } from '../auth/guards';
import type { UserClaims } from '../auth/token.service';
import { ApiError } from '../common/errors';
import { ZodPipe } from '../common/zod';
import { FieldCrypto } from '../crypto/field-crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PassengersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldCrypto,
  ) {}

  /** AAD binds each encrypted field to its row and purpose so values cannot be swapped between rows. */
  private aad = (kind: string, id: string) => `${kind}:${id}`;

  present(p: Passenger & { discountCards: DiscountCard[] }) {
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      isAccountHolder: p.isAccountHolder,
      dateOfBirth: this.crypto.decryptOptional(p.dateOfBirthEnc, this.aad('passenger.dob', p.id)),
      discountCards: p.discountCards.map((c) => ({
        id: c.id,
        type: c.type,
        travelClass: c.travelClass,
        number: this.crypto.decryptOptional(c.numberEnc, this.aad('card.number', c.id)),
        validUntil: c.validUntil?.toISOString().slice(0, 10) ?? null,
      })),
    };
  }

  list(userId: string) {
    return this.prisma.passenger
      .findMany({
        where: { userId },
        include: { discountCards: true },
        orderBy: [{ isAccountHolder: 'desc' }, { createdAt: 'asc' }],
      })
      .then((ps) => ps.map((p) => this.present(p)));
  }

  private async writeCards(tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0], passengerId: string, cards: PassengerInput['discountCards']) {
    await tx.discountCard.deleteMany({ where: { passengerId } });
    for (const c of cards) {
      const row = await tx.discountCard.create({
        data: {
          passengerId,
          type: c.type,
          travelClass: c.travelClass ?? null,
          validUntil: c.validUntil ? new Date(`${c.validUntil}T00:00:00Z`) : null,
        },
      });
      if (c.number) {
        await tx.discountCard.update({
          where: { id: row.id },
          data: { numberEnc: this.crypto.encrypt(c.number, this.aad('card.number', row.id)) },
        });
      }
    }
  }

  async upsert(userId: string, input: PassengerInput, id?: string) {
    return this.prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.passenger.findFirst({ where: { id, userId } });
        if (!existing) throw new ApiError(HttpStatus.NOT_FOUND, 'passenger.notFound');
      }
      if (input.isAccountHolder) {
        await tx.passenger.updateMany({ where: { userId, isAccountHolder: true, NOT: id ? { id } : undefined }, data: { isAccountHolder: false } });
      }
      const base = {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? null,
        isAccountHolder: input.isAccountHolder,
      };
      const p = id
        ? await tx.passenger.update({ where: { id }, data: base })
        : await tx.passenger.create({ data: { ...base, userId } });
      await tx.passenger.update({
        where: { id: p.id },
        data: { dateOfBirthEnc: this.crypto.encryptOptional(input.dateOfBirth, this.aad('passenger.dob', p.id)) },
      });
      await this.writeCards(tx, p.id, input.discountCards);
      return this.present(await tx.passenger.findUniqueOrThrow({ where: { id: p.id }, include: { discountCards: true } }));
    });
  }

  async remove(userId: string, id: string) {
    const { count } = await this.prisma.passenger.deleteMany({ where: { id, userId } });
    if (count === 0) throw new ApiError(HttpStatus.NOT_FOUND, 'passenger.notFound');
  }
}

@Controller('me')
@UseGuards(UserAuthGuard)
export class MeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passengers: PassengersService,
    private readonly audit: AuditService,
  ) {}

  private async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { passengers: { where: { isAccountHolder: true }, take: 1 } },
    });
    if (!user || user.status !== 'ACTIVE') throw new ApiError(HttpStatus.UNAUTHORIZED, 'auth.invalidToken');
    const holder = user.passengers[0];
    return {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      locale: user.locale as SupportedLocale,
      theme: user.theme as ThemePreference,
      firstName: holder?.firstName ?? null,
      lastName: holder?.lastName ?? null,
    };
  }

  @Get()
  get(@CurrentUser() user: UserClaims) {
    return this.me(user.sub);
  }

  @Patch()
  async update(
    @CurrentUser() user: UserClaims,
    @Body(new ZodPipe(updateProfileSchema)) body: { locale?: SupportedLocale; theme?: ThemePreference },
  ) {
    await this.prisma.user.update({ where: { id: user.sub }, data: body });
    return this.me(user.sub);
  }

  @Get('passengers')
  list(@CurrentUser() user: UserClaims) {
    return this.passengers.list(user.sub);
  }

  @Post('passengers')
  async create(@CurrentUser() user: UserClaims, @Body(new ZodPipe(passengerSchema)) body: PassengerInput) {
    const p = await this.passengers.upsert(user.sub, body);
    await this.audit.record({ actorType: 'USER', actorId: user.sub, action: 'passenger.created', entityType: 'Passenger', entityId: p.id });
    return p;
  }

  @Put('passengers/:id')
  async update_(
    @CurrentUser() user: UserClaims,
    @Param('id') id: string,
    @Body(new ZodPipe(passengerSchema)) body: PassengerInput,
  ) {
    const p = await this.passengers.upsert(user.sub, body, id);
    await this.audit.record({ actorType: 'USER', actorId: user.sub, action: 'passenger.updated', entityType: 'Passenger', entityId: id });
    return p;
  }

  @Delete('passengers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: UserClaims, @Param('id') id: string) {
    await this.passengers.remove(user.sub, id);
    await this.audit.record({ actorType: 'USER', actorId: user.sub, action: 'passenger.deleted', entityType: 'Passenger', entityId: id });
  }
}

@Module({ controllers: [MeController], providers: [PassengersService] })
export class UsersModule {}
