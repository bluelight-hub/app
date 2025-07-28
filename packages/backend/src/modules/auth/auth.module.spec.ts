import { AuthModule } from './auth.module';

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

  describe('Module metadata using Reflect', () => {
    it('should have correct imports metadata', () => {
      const imports = Reflect.getMetadata('imports', AuthModule);
      expect(imports).toBeDefined();
      expect(Array.isArray(imports)).toBe(true);
      expect(imports).toHaveLength(11); // ConfigModule, HttpModule, EventEmitterModule, PassportModule, JwtModule, ThrottlerModule, RedisModule, BullModule, SessionModule, NotificationModule, SecurityLogModule
    });

    it('should have correct providers metadata', () => {
      const providers = Reflect.getMetadata('providers', AuthModule);
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toHaveLength(24); // All providers including LogAccessInterceptor, SecurityLogService, and SecurityLogHashService
    });

    it('should have correct controllers metadata', () => {
      const controllers = Reflect.getMetadata('controllers', AuthModule);
      expect(controllers).toBeDefined();
      expect(Array.isArray(controllers)).toBe(true);
      expect(controllers).toHaveLength(4); // AuthController, LoginAttemptController, SecurityController, ThreatRuleController
    });

    it('should have correct exports metadata', () => {
      const exports = Reflect.getMetadata('exports', AuthModule);
      expect(exports).toBeDefined();
      expect(Array.isArray(exports)).toBe(true);
      expect(exports).toHaveLength(18); // All exports including LogAccessInterceptor
    });
  });
});
