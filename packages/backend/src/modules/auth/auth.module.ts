import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionValidationService } from './services/permission-validation.service';
import { SessionCleanupService } from './services/session-cleanup.service';
import { SessionModule } from '../session/session.module';

/**
 * Authentication module that provides JWT-based authentication for the application.
 * Configures JWT tokens, authentication strategies, and exports authentication services.
 */
@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // No default signOptions - we handle expiration in the payload
      }),
    }),
    forwardRef(() => SessionModule),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    PrismaService,
    PermissionValidationService,
    SessionCleanupService,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PermissionValidationService, SessionCleanupService],
})
export class AuthModule {}
