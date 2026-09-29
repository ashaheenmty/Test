import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LegalModule } from '../legal/legal.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminAuthGuard, UserAuthGuard } from './guards';
import { OAuthVerifier } from './oauth-verifier';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [JwtModule.register({}), LegalModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, OAuthVerifier, UserAuthGuard, AdminAuthGuard],
  exports: [TokenService, PasswordService, UserAuthGuard, AdminAuthGuard],
})
export class AuthModule {}
