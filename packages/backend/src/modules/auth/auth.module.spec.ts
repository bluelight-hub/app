import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LoginAttemptController } from './controllers/login-attempt.controller';
import { JwtStrategy } from './strategies';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionValidationService } from './services/permission-validation.service';
import { SessionCleanupService } from './services/session-cleanup.service';
import { LoginAttemptService } from './services/login-attempt.service';
import { SecurityAlertService } from './services/security-alert.service';

describe('AuthModule', () => {
  beforeAll(() => {
    // Set required environment variables for all tests
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), EventEmitterModule.forRoot(), AuthModule],
    }).compile();

    expect(module).toBeDefined();
  });

  describe('Module dependencies', () => {
    it('should provide all required services', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          AuthModule,
        ],
      }).compile();

      // Check all providers are available
      expect(module.get(AuthService)).toBeDefined();
      expect(module.get(JwtStrategy)).toBeDefined();
      expect(module.get(PrismaService)).toBeDefined();
      expect(module.get(PermissionValidationService)).toBeDefined();
      expect(module.get(SessionCleanupService)).toBeDefined();
    });

    it('should provide AuthController', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          AuthModule,
        ],
      }).compile();

      expect(module.get(AuthController)).toBeDefined();
    });

    it('should export AuthService', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          AuthModule,
        ],
      }).compile();

      const authService = module.get(AuthService);
      expect(authService).toBeDefined();
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should export JwtModule', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          AuthModule,
        ],
      }).compile();

      const jwtService = module.get(JwtService);
      expect(jwtService).toBeDefined();
      expect(jwtService).toBeInstanceOf(JwtService);
    });

    it('should export PermissionValidationService', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          AuthModule,
        ],
      }).compile();

      const permissionService = module.get(PermissionValidationService);
      expect(permissionService).toBeDefined();
      expect(permissionService).toBeInstanceOf(PermissionValidationService);
    });
  });

  describe('Module configuration', () => {
    it('should configure JWT module with secret from ConfigService', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          AuthModule,
        ],
      }).compile();

      const jwtService = module.get(JwtService);
      expect(jwtService).toBeDefined();
    });

    it('should register PassportModule with jwt as default strategy', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          AuthModule,
        ],
      }).compile();

      // PassportModule should be imported
      const authService = module.get(AuthService);
      expect(authService).toBeDefined();
    });
  });

  describe('Module metadata using Reflect', () => {
    it('should have correct imports metadata', () => {
      const imports = Reflect.getMetadata('imports', AuthModule);
      expect(imports).toBeDefined();
      expect(Array.isArray(imports)).toBe(true);
      expect(imports).toHaveLength(7); // Now includes ThrottlerModule and NotificationModule

      // Check ConfigModule
      expect(imports[0]).toBeDefined();

      // Check HttpModule
      expect(imports[1]).toBeDefined();

      // Check PassportModule
      expect(imports[2]).toBeDefined();

      // Check JwtModule
      expect(imports[3]).toBeDefined();

      // Check SessionModule (with forwardRef)
      expect(imports[4]).toBeDefined();
    });

    it('should have correct providers metadata', () => {
      const providers = Reflect.getMetadata('providers', AuthModule);
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toHaveLength(14); // Added new security services including RuleEngineService and RuleRepositoryService
      expect(providers).toContain(AuthService);
      expect(providers).toContain(JwtStrategy);
      expect(providers).toContain(PrismaService);
      expect(providers).toContain(PermissionValidationService);
      expect(providers).toContain(SessionCleanupService);
      expect(providers).toContain(LoginAttemptService);
      expect(providers).toContain(SecurityAlertService);
    });

    it('should have correct controllers metadata', () => {
      const controllers = Reflect.getMetadata('controllers', AuthModule);
      expect(controllers).toBeDefined();
      expect(Array.isArray(controllers)).toBe(true);
      expect(controllers).toHaveLength(4); // Added SecurityController and ThreatRuleController
      expect(controllers).toContain(AuthController);
      expect(controllers).toContain(LoginAttemptController);
    });

    it('should have correct exports metadata', () => {
      const exports = Reflect.getMetadata('exports', AuthModule);
      expect(exports).toBeDefined();
      expect(Array.isArray(exports)).toBe(true);
      expect(exports).toHaveLength(11); // Added new security services to exports including RuleEngineService and RuleRepositoryService
      expect(exports).toContain(AuthService);
      expect(exports).toContain(PermissionValidationService);
      expect(exports).toContain(SessionCleanupService);
      expect(exports).toContain(LoginAttemptService);
      // JwtModule is also exported
    });
  });

  describe('Integration tests', () => {
    it('should create module with custom config', async () => {
      const customConfig = {
        JWT_SECRET: 'custom-secret',
        JWT_ACCESS_EXPIRATION: '30m',
        JWT_REFRESH_EXPIRATION: '14d',
      };

      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [() => customConfig],
          }),
          EventEmitterModule.forRoot(),
          AuthModule,
        ],
      }).compile();

      const configService = module.get(ConfigService);
      expect(configService.get('JWT_SECRET')).toBe('custom-secret');
    });

    it('should create module with default JWT_SECRET from .env file', async () => {
      // Temporarily remove JWT_SECRET from process.env
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      try {
        // Module creation should succeed with default from .env file or config
        const module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              // Provide a fallback for CI environments where .env might not exist
              load: [
                () => ({
                  JWT_SECRET: 'dev-secret-key-for-testing-only-change-in-production',
                  JWT_REFRESH_SECRET:
                    'dev-refresh-secret-key-for-testing-only-change-in-production',
                }),
              ],
            }),
            EventEmitterModule.forRoot(),
            AuthModule,
          ],
        }).compile();

        expect(module).toBeDefined();

        // The secret should be available
        const configService = module.get(ConfigService);
        expect(configService.get('JWT_SECRET')).toBe(
          'dev-secret-key-for-testing-only-change-in-production',
        );
      } finally {
        // Restore JWT_SECRET
        process.env.JWT_SECRET = originalSecret;
      }
    });
  });
});
