import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtRefreshStrategy, JwtStrategy } from './strategies';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MfaController } from './controllers/mfa.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionValidationService } from './services/permission-validation.service';
import { MfaService } from './services/mfa.service';

/**
 * Authentication module that provides JWT-based authentication for the application.
 * Configures JWT tokens, authentication strategies, and exports authentication services.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // No default signOptions - we handle expiration in the payload
      }),
    }),
  ],
  providers: [
    AuthService,
    MfaService,
    JwtStrategy,
    JwtRefreshStrategy,
    PrismaService,
    PermissionValidationService,
  ],
  controllers: [AuthController, MfaController],
  exports: [AuthService, MfaService, JwtModule, PermissionValidationService],
})
export class AuthModule {}
