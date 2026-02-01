import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { helmetConfig, swaggerHelmetConfig } from '../config/security.config';
import { AppModule } from '../../app.module';

describe('Security Headers (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'INTEGRATION_ENCRYPTION_KEY') return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
          if (key === 'ADMIN_JWT_SECRET') return 'test-secret';
          return defaultValue;
        }),
        getOrThrow: jest.fn((key: string) => {
          if (key === 'INTEGRATION_ENCRYPTION_KEY') return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
          if (key === 'ADMIN_JWT_SECRET') return 'test-secret';
          throw new Error(`Config key ${key} not found`);
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Replicate the conditional helmet logic from main.ts
    const strictHelmetMiddleware = helmet(helmetConfig);
    const swaggerHelmetMiddleware = helmet(swaggerHelmetConfig);

    app.use((req: Request, res: Response, next: NextFunction) => {
      const isSwaggerPath = req.url === '/api' || req.url === '/api/' || req.url.startsWith('/api-json') || (req.url.startsWith('/api/') && !req.url.startsWith('/api/v-'));

      if (isSwaggerPath) {
        return swaggerHelmetMiddleware(req, res, next);
      }
      return strictHelmetMiddleware(req, res, next);
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should apply strict CSP to API routes', async () => {
    const response = await request(app.getHttpServer()).get('/api/v-alpha/health');

    expect(response.headers['content-security-policy']).toBeDefined();
    const csp = response.headers['content-security-policy'];

    // Strict CSP should NOT contain 'unsafe-inline'
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).toContain("default-src 'self'");

    // Cross-Origin-Embedder-Policy should be 'require-corp' (which is what helmet(true) sets)
    expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
  });

  it('should apply permissive CSP to Swagger UI routes', async () => {
    // Mocking the swagger paths
    const paths = ['/api', '/api/', '/api-json'];

    for (const path of paths) {
      const response = await request(app.getHttpServer()).get(path);

      expect(response.headers['content-security-policy']).toBeDefined();
      const csp = response.headers['content-security-policy'];

      // Swagger CSP SHOULD contain 'unsafe-inline'
      expect(csp).toContain("'unsafe-inline'");

      // Cross-Origin-Embedder-Policy should be disabled (undefined or not 'require-corp')
      expect(response.headers['cross-origin-embedder-policy']).toBeUndefined();
    }
  });

  it('should distinguish between Swagger UI and versioned API even if they share a prefix', async () => {
    // This path looks like swagger but is actually the API
    const response = await request(app.getHttpServer()).get('/api/v-alpha/einsatz');

    const csp = response.headers['content-security-policy'];
    expect(csp).not.toContain("'unsafe-inline'");
  });
});
