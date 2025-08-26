import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Cleaning up test environment...');

  // Only stop containers if they were started (not in CI)
  if (!process.env.CI) {
    const postgresContainer = (global as unknown as Record<string, unknown>).__POSTGRES_CONTAINER__;
    const redisContainer = (global as unknown as Record<string, unknown>).__REDIS_CONTAINER__;

    try {
      if (postgresContainer) {
        console.log('🛑 Stopping PostgreSQL container...');
        await postgresContainer.stop();
      }

      if (redisContainer) {
        console.log('🛑 Stopping Redis container...');
        await redisContainer.stop();
      }

      console.log('✅ Test containers stopped successfully');
    } catch (error) {
      console.error('⚠️ Error stopping containers:', error);
      // Don't throw - cleanup should be best effort
    }
  } else {
    console.log('ℹ️ Running in CI - containers managed by GitHub Actions');
  }
}

export default globalTeardown;
