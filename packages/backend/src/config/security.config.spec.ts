import { helmetConfig, corsConfig, cookieConfig, refreshCookieConfig } from './security.config';

describe('Security Config', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
  });

  describe('helmetConfig', () => {
    it('should have correct helmet configuration', () => {
      expect(helmetConfig).toBeDefined();
      expect(helmetConfig.contentSecurityPolicy).toBeDefined();
      expect(helmetConfig.contentSecurityPolicy?.directives?.defaultSrc).toEqual(["'self'"]);
      expect(helmetConfig.hidePoweredBy).toBe(true);
      expect(helmetConfig.hsts?.maxAge).toBe(31536000);
      expect(helmetConfig.hsts?.includeSubDomains).toBe(true);
      expect(helmetConfig.hsts?.preload).toBe(true);
      expect(helmetConfig.frameguard?.action).toBe('deny');
      expect(helmetConfig.xssFilter).toBe(true);
    });
  });

  describe('corsConfig', () => {
    it('should have development configuration with allowed origins from env', () => {
      process.env.ALLOWED_ORIGINS = 'http://example.com,http://test.com';

      // Re-import to get fresh config
      jest.resetModules();
      const { corsConfig: freshCorsConfig } = require('./security.config');

      expect(freshCorsConfig.development.origin).toEqual([
        ['http://example.com', 'http://test.com'],
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:5174',
      ]);
    });

    it('should have development configuration without allowed origins', () => {
      delete process.env.ALLOWED_ORIGINS;

      // Re-import to get fresh config
      jest.resetModules();
      const { corsConfig: freshCorsConfig } = require('./security.config');

      expect(freshCorsConfig.development.origin).toEqual([
        false,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:5174',
      ]);
    });

    it('should have production configuration with allowed origins', () => {
      process.env.ALLOWED_ORIGINS = 'https://prod.example.com';

      // Re-import to get fresh config
      jest.resetModules();
      const { corsConfig: freshCorsConfig } = require('./security.config');

      expect(freshCorsConfig.production.origin).toEqual(['https://prod.example.com']);
    });

    it('should have production configuration without allowed origins', () => {
      delete process.env.ALLOWED_ORIGINS;

      // Re-import to get fresh config
      jest.resetModules();
      const { corsConfig: freshCorsConfig } = require('./security.config');

      expect(freshCorsConfig.production.origin).toBe(false);
    });

    it('should have correct methods and headers', () => {
      expect(corsConfig.development.credentials).toBe(true);
      expect(corsConfig.development.methods).toEqual([
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS',
      ]);
      expect(corsConfig.development.allowedHeaders).toEqual([
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
      ]);
      expect(corsConfig.development.exposedHeaders).toEqual(['X-Total-Count']);

      expect(corsConfig.production.credentials).toBe(true);
      expect(corsConfig.production.methods).toEqual([
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS',
      ]);
    });
  });

  describe('cookieConfig', () => {
    it('should have secure cookies in production', () => {
      process.env.NODE_ENV = 'production';

      // Re-import to get fresh config
      jest.resetModules();
      const { cookieConfig: freshCookieConfig } = require('./security.config');

      expect(freshCookieConfig.httpOnly).toBe(true);
      expect(freshCookieConfig.secure).toBe(true);
      expect(freshCookieConfig.sameSite).toBe('strict');
      expect(freshCookieConfig.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
      expect(freshCookieConfig.path).toBe('/');
    });

    it('should have non-secure cookies in development', () => {
      process.env.NODE_ENV = 'development';

      // Re-import to get fresh config
      jest.resetModules();
      const { cookieConfig: freshCookieConfig } = require('./security.config');

      expect(freshCookieConfig.httpOnly).toBe(true);
      expect(freshCookieConfig.secure).toBe(false);
      expect(freshCookieConfig.sameSite).toBe('strict');
    });

    it('should have non-secure cookies when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      // Re-import to get fresh config
      jest.resetModules();
      const { cookieConfig: freshCookieConfig } = require('./security.config');

      expect(freshCookieConfig.secure).toBe(false);
    });
  });

  describe('refreshCookieConfig', () => {
    it('should extend cookieConfig with longer maxAge and specific path', () => {
      expect(refreshCookieConfig.httpOnly).toBe(cookieConfig.httpOnly);
      expect(refreshCookieConfig.secure).toBe(cookieConfig.secure);
      expect(refreshCookieConfig.sameSite).toBe(cookieConfig.sameSite);
      expect(refreshCookieConfig.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
      expect(refreshCookieConfig.path).toBe('/api/auth/refresh');
    });

    it('should have secure refresh cookies in production', () => {
      process.env.NODE_ENV = 'production';

      // Re-import to get fresh config
      jest.resetModules();
      const { refreshCookieConfig: freshRefreshCookieConfig } = require('./security.config');

      expect(freshRefreshCookieConfig.secure).toBe(true);
    });

    it('should have non-secure refresh cookies in development', () => {
      process.env.NODE_ENV = 'development';

      // Re-import to get fresh config
      jest.resetModules();
      const { refreshCookieConfig: freshRefreshCookieConfig } = require('./security.config');

      expect(freshRefreshCookieConfig.secure).toBe(false);
    });
  });
});
