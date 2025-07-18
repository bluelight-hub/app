import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtStrategy } from './strategies';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LoginAttemptController } from './controllers/login-attempt.controller';
import { SecurityController } from './controllers/security.controller';
import { ThreatRuleController } from './controllers/threat-rule.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionValidationService } from './services/permission-validation.service';
import { SessionCleanupService } from './services/session-cleanup.service';
import { LoginAttemptService } from './services/login-attempt.service';
import { SecurityAlertService } from './services/security-alert.service';
import { SecurityMetricsService } from './services/security-metrics.service';
import { SecurityLogService } from './services/security-log.service';
import { SuspiciousActivityService } from './services/suspicious-activity.service';
import { GeoIpService } from './services/geo-ip.service';
import { IpAllowlistGuard } from './guards/ip-allowlist.guard';
import { RuleEngineService } from './rules/rule-engine.service';
import { RuleRepositoryService } from './rules/rule-repository.service';
import { SessionModule } from '../session/session.module';
import { NotificationModule } from '../notification/notification.module';
import { SecurityAlertServiceV2 } from './services/security-alert-v2.service';

/**
 * Authentication module that provides JWT-based authentication for the application.
 * Configures JWT tokens, authentication strategies, and exports authentication services.
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    EventEmitterModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // No default signOptions - we handle expiration in the payload
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    forwardRef(() => SessionModule),
    forwardRef(() => NotificationModule),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    PrismaService,
    PermissionValidationService,
    SessionCleanupService,
    LoginAttemptService,
    SecurityAlertService,
    SecurityAlertServiceV2,
    SecurityMetricsService,
    SecurityLogService,
    SuspiciousActivityService,
    GeoIpService,
    IpAllowlistGuard,
    RuleEngineService,
    RuleRepositoryService,
  ],
  controllers: [AuthController, LoginAttemptController, SecurityController, ThreatRuleController],
  exports: [
    AuthService,
    JwtModule,
    PermissionValidationService,
    SessionCleanupService,
    LoginAttemptService,
    SecurityMetricsService,
    SecurityLogService,
    SuspiciousActivityService,
    GeoIpService,
    RuleEngineService,
    RuleRepositoryService,
  ],
})
export class AuthModule {}
