// @ts-nocheck
import { corsOriginHandler, isCorsOriginAllowed } from './security.config';

const invokeCorsOriginHandler = (origin: string | undefined): Promise<boolean | undefined> =>
  new Promise((resolve, reject) => {
    corsOriginHandler(origin, (err, allow) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(allow);
    });
  });

describe('security.config CORS origin policy', () => {
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
  const originalAllowedOriginPatterns = process.env.ALLOWED_ORIGIN_PATTERNS;

  beforeEach(() => {
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.ALLOWED_ORIGIN_PATTERNS;
  });

  afterAll(() => {
    if (originalAllowedOrigins === undefined) {
      delete process.env.ALLOWED_ORIGINS;
    } else {
      process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
    }

    if (originalAllowedOriginPatterns === undefined) {
      delete process.env.ALLOWED_ORIGIN_PATTERNS;
    } else {
      process.env.ALLOWED_ORIGIN_PATTERNS = originalAllowedOriginPatterns;
    }
  });

  it('allows localhost origins by default', () => {
    expect(isCorsOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isCorsOriginAllowed('http://127.0.0.1:3000')).toBe(true);
  });

  it('blocks unknown external origins by default', () => {
    expect(isCorsOriginAllowed('https://evil.example')).toBe(false);
  });

  it('allows explicitly configured origins', () => {
    process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';

    expect(isCorsOriginAllowed('https://app.example.com')).toBe(true);
    expect(isCorsOriginAllowed('https://admin.example.com')).toBe(true);
  });

  it('allows configured regex patterns', () => {
    process.env.ALLOWED_ORIGIN_PATTERNS = '^https://[\\w-]+\\.bluelight-hub-app\\.pages\\.dev$';

    expect(isCorsOriginAllowed('https://preview-123.bluelight-hub-app.pages.dev')).toBe(true);
  });

  it('allows all origins with wildcard ALLOWED_ORIGINS', () => {
    process.env.ALLOWED_ORIGINS = '*';

    expect(isCorsOriginAllowed('https://arbitrary.example')).toBe(true);
  });

  it('allows requests without Origin header', () => {
    expect(isCorsOriginAllowed(undefined)).toBe(true);
  });

  it('corsOriginHandler delegates to shared policy', async () => {
    const allowed = await invokeCorsOriginHandler('http://localhost:4173');
    const denied = await invokeCorsOriginHandler('https://evil.example');

    expect(allowed).toBe(true);
    expect(denied).toBe(false);
  });
});
