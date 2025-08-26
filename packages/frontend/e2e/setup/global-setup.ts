import { exec } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { config } from '@dotenvx/dotenvx';
import type { FullConfig } from '@playwright/test';
import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer } from 'testcontainers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

// Load test environment variables
config({ path: path.join(__dirname, '../../.env.test') });

let postgresContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting test containers...');

  // Only start containers if not in CI (CI uses services)
  if (!process.env.CI) {
    try {
      // Start PostgreSQL container
      console.log('📦 Starting PostgreSQL container...');
      postgresContainer = await new GenericContainer('postgres:15')
        .withEnvironment({
          POSTGRES_DB: 'bluelight_test',
          POSTGRES_USER: 'testuser',
          POSTGRES_PASSWORD: 'testpass',
        })
        .withExposedPorts(5432)
        .withHealthCheck({
          test: ['CMD-SHELL', 'pg_isready -U testuser'],
          interval: 10000,
          timeout: 5000,
          retries: 5,
        })
        .start();

      const pgPort = postgresContainer.getMappedPort(5432);
      const pgHost = postgresContainer.getHost();

      // Start Redis container
      console.log('📦 Starting Redis container...');
      redisContainer = await new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .withHealthCheck({
          test: ['CMD', 'redis-cli', 'ping'],
          interval: 10000,
          timeout: 5000,
          retries: 5,
        })
        .start();

      const redisPort = redisContainer.getMappedPort(6379);
      const redisHost = redisContainer.getHost();

      // Set environment variables for the backend
      process.env.DATABASE_URL = `postgresql://testuser:testpass@${pgHost}:${pgPort}/bluelight_test`;
      process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;

      console.log('✅ Test containers started successfully');
      console.log(`📍 PostgreSQL: ${pgHost}:${pgPort}`);
      console.log(`📍 Redis: ${redisHost}:${redisPort}`);

      // Run Prisma migrations
      console.log('🔄 Running database migrations...');
      await execAsync('pnpm --filter @bluelight-hub/backend prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });

      // Seed database with test data (use test-specific seed)
      console.log('🌱 Seeding test database...');
      await execAsync('pnpm --filter @bluelight-hub/backend ts-node prisma/seed.test.ts', {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
          NODE_ENV: 'test',
        },
      });

      console.log('✅ Database setup complete');
    } catch (error) {
      console.error('❌ Failed to start test containers:', error);
      throw error;
    }
  } else {
    console.log('ℹ️ Running in CI - using GitHub Actions services');
    // CI environment variables should be set by GitHub Actions
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bluelight_test';
    process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  }

  // Store container references for teardown
  (global as unknown as Record<string, unknown>).__POSTGRES_CONTAINER__ = postgresContainer;
  (global as unknown as Record<string, unknown>).__REDIS_CONTAINER__ = redisContainer;
}

export default globalSetup;
