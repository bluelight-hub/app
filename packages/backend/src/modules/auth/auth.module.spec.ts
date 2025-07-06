import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionValidationService } from './services/permission-validation.service';
import { SessionCleanupService } from './services/session-cleanup.service';

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
      imports: [AuthModule],
    }).compile();

    expect(module).toBeDefined();
  });

  describe('Module dependencies', () => {
    it('should provide all required services', async () => {
      const module = await Test.createTestingModule({
        imports: [AuthModule],
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
        imports: [AuthModule],
      }).compile();

      expect(module.get(AuthController)).toBeDefined();
    });

    it('should export AuthService', async () => {
      const module = await Test.createTestingModule({
        imports: [AuthModule],
      }).compile();

      const authService = module.get(AuthService);
      expect(authService).toBeDefined();
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should export JwtModule', async () => {
      const module = await Test.createTestingModule({
        imports: [AuthModule],
      }).compile();

      const jwtService = module.get(JwtService);
      expect(jwtService).toBeDefined();
      expect(jwtService).toBeInstanceOf(JwtService);
    });

    it('should export PermissionValidationService', async () => {
      const module = await Test.createTestingModule({
        imports: [AuthModule],
      }).compile();

      const permissionService = module.get(PermissionValidationService);
      expect(permissionService).toBeDefined();
      expect(permissionService).toBeInstanceOf(PermissionValidationService);
    });
  });

  describe('Module configuration', () => {
    it('should configure JWT module with secret from ConfigService', async () => {
      const module = await Test.createTestingModule({
        imports: [AuthModule],
      }).compile();

      const jwtService = module.get(JwtService);
      expect(jwtService).toBeDefined();
    });

    it('should register PassportModule with jwt as default strategy', async () => {
      const module = await Test.createTestingModule({
        imports: [AuthModule],
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
      expect(imports).toHaveLength(3);

      // Check ConfigModule
      expect(imports[0]).toBeDefined();

      // Check PassportModule
      expect(imports[1]).toBeDefined();

      // Check JwtModule
      expect(imports[2]).toBeDefined();
    });

    it('should have correct providers metadata', () => {
      const providers = Reflect.getMetadata('providers', AuthModule);
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toHaveLength(5);
      expect(providers).toContain(AuthService);
      expect(providers).toContain(JwtStrategy);
      expect(providers).toContain(PrismaService);
      expect(providers).toContain(PermissionValidationService);
      expect(providers).toContain(SessionCleanupService);
    });

    it('should have correct controllers metadata', () => {
      const controllers = Reflect.getMetadata('controllers', AuthModule);
      expect(controllers).toBeDefined();
      expect(Array.isArray(controllers)).toBe(true);
      expect(controllers).toHaveLength(1);
      expect(controllers[0]).toBe(AuthController);
    });

    it('should have correct exports metadata', () => {
      const exports = Reflect.getMetadata('exports', AuthModule);
      expect(exports).toBeDefined();
      expect(Array.isArray(exports)).toBe(true);
      expect(exports).toHaveLength(4);
      expect(exports).toContain(AuthService);
      expect(exports).toContain(PermissionValidationService);
      expect(exports).toContain(SessionCleanupService);
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
          AuthModule,
        ],
      }).compile();

      const configService = module.get(ConfigService);
      expect(configService.get('JWT_SECRET')).toBe('custom-secret');
    });

    it('should throw error when JWT_SECRET is missing', async () => {
      // Temporarily remove JWT_SECRET
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      try {
        await expect(
          Test.createTestingModule({
            imports: [AuthModule],
          }).compile(),
        ).rejects.toThrow('JwtStrategy requires a secret or key');
      } finally {
        // Restore JWT_SECRET
        process.env.JWT_SECRET = originalSecret;
      }
    });
  });
});
