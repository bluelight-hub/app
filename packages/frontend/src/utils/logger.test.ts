import { createConsola } from 'consola';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock for consola
vi.mock('consola', () => ({
  createConsola: vi.fn().mockImplementation((config) => ({
    ...config,
    // Add any other properties or methods that might be used
  })),
}));

describe('Logger', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Clear mock before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env.NODE_ENV = originalEnv;
  });

  it('should create logger with level 5 in development environment', async () => {
    // Arrange
    process.env.NODE_ENV = 'development';

    // Act
    // We need to reimport the module to trigger the evaluation with the new env
    vi.resetModules();
    await import('./logger');

    // Assert
    expect(createConsola).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 5,
      }),
    );
  });

  it('should create logger with level 3 in production environment', async () => {
    // Arrange
    process.env.NODE_ENV = 'production';

    // Act
    // We need to reimport the module to trigger the evaluation with the new env
    vi.resetModules();
    await import('./logger');

    // Assert
    expect(createConsola).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 3,
      }),
    );
  });
});
