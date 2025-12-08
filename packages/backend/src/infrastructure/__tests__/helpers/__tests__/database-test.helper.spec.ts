/**
 * Unit Tests für Database Test Helper.
 *
 * Diese Tests validieren das Verhalten der skipIfNoDatabase() Funktion:
 * 1. Skip wenn DATABASE_URL nicht gesetzt ist
 * 2. Skip wenn Database Connection fehlschlägt
 * 3. Success wenn Database Connection erfolgreich ist
 *
 * **Test Strategy:**
 * - Mocked Environment Variables (process.env.DATABASE_URL)
 * - Mocked PrismaClient für controlled test scenarios
 * - Console.warn Mock für Warning-Verification
 * - Given-When-Then BDD Style
 */

import { skipIfNoDatabase } from '../database-test.helper';

// Type for mocked PrismaClient instance
interface MockPrismaClient {
  $queryRaw: jest.Mock;
  $disconnect: jest.Mock;
}

// Mock PrismaClient BEFORE imports
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        $queryRaw: jest.fn(),
        $disconnect: jest.fn(),
      };
    }),
  };
});

describe('Database Test Helper - skipIfNoDatabase()', () => {
  const originalEnv = process.env;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset environment and mocks
    jest.resetModules();
    process.env = { ...originalEnv };
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  // ========================================
  // AC1: Skip wenn DATABASE_URL nicht gesetzt
  // ========================================

  /**
   * Test 1: Skip wenn DATABASE_URL nicht gesetzt ist.
   *
   * **Business Rule:** Tests sollen nicht fehlschlagen wenn keine DB konfiguriert ist
   * **Use Case:** macOS Development ohne lokale PostgreSQL Installation
   */
  it('should return false when DATABASE_URL is not set', async () => {
    // Given: No DATABASE_URL in environment
    delete process.env.DATABASE_URL;

    // When: Check database availability
    const result = await skipIfNoDatabase();

    // Then: Returns false (tests should be skipped)
    expect(result).toBe(false);

    // And: Warning logged to console
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL not set'));
  });

  /**
   * Test 2: Skip wenn DATABASE_URL ist empty string.
   *
   * **Business Rule:** Leerer String ist gleichbedeutend mit "nicht gesetzt"
   */
  it('should return false when DATABASE_URL is empty string', async () => {
    // Given: Empty DATABASE_URL
    process.env.DATABASE_URL = '';

    // When: Check database availability
    const result = await skipIfNoDatabase();

    // Then: Returns false (falsy empty string)
    expect(result).toBe(false);

    // And: Warning logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL not set'));
  });

  // ========================================
  // AC2: Skip wenn Connection fehlschlägt
  // ========================================

  /**
   * Test 3: Skip wenn Database Connection fehlschlägt.
   *
   * **Business Rule:** Tests sollen graceful skippen bei Connection-Fehler
   * **Use Case:** PostgreSQL Service läuft nicht auf Development Machine
   */
  it('should return false when database connection fails', async () => {
    // Given: DATABASE_URL ist gesetzt, aber Connection schlägt fehl
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    // Mock PrismaClient.$queryRaw to throw error
    const { PrismaClient } = await import('@prisma/client');
    const mockQueryRaw = jest.fn().mockRejectedValue(new Error('Connection refused'));
    const mockDisconnect = jest.fn().mockResolvedValue(undefined);

    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
      () =>
        ({
          $queryRaw: mockQueryRaw,
          $disconnect: mockDisconnect,
        }) as MockPrismaClient,
    );

    // When: Check database availability
    const result = await skipIfNoDatabase();

    // Then: Returns false (tests should be skipped)
    expect(result).toBe(false);

    // And: Warning logged with error details
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Database connection failed'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Connection refused'));

    // And: PrismaClient cleanup called
    expect(mockDisconnect).toHaveBeenCalled();
  });

  /**
   * Test 4: Skip bei Connection Timeout.
   *
   * **Business Rule:** 5s Timeout verhindert hängende Tests
   * **Pattern:** Promise.race() mit timeout fallback
   */
  it('should return false when database connection times out', async () => {
    // Given: DATABASE_URL gesetzt, aber Connection hängt
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    // Mock PrismaClient.$queryRaw to hang (never resolves)
    const { PrismaClient } = await import('@prisma/client');
    const mockQueryRaw = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          // Never resolves - simulates hanging connection
          setTimeout(resolve, 10000); // 10s (longer than 5s timeout)
        }),
    );
    const mockDisconnect = jest.fn().mockResolvedValue(undefined);

    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
      () =>
        ({
          $queryRaw: mockQueryRaw,
          $disconnect: mockDisconnect,
        }) as MockPrismaClient,
    );

    // When: Check database availability
    const result = await skipIfNoDatabase();

    // Then: Returns false after timeout
    expect(result).toBe(false);

    // And: Warning logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Database connection failed'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('timeout'));

    // And: Cleanup called
    expect(mockDisconnect).toHaveBeenCalled();
  }, 10000); // Test timeout: 10s

  // ========================================
  // AC3: Success wenn Connection funktioniert
  // ========================================

  /**
   * Test 5: Return true wenn Database verfügbar ist.
   *
   * **Business Rule:** Tests laufen normal wenn DB verfügbar
   * **Use Case:** CI/CD oder lokales Docker PostgreSQL Setup
   */
  it('should return true when database connection succeeds', async () => {
    // Given: DATABASE_URL gesetzt und Connection erfolgreich
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    // Mock successful PrismaClient connection
    const { PrismaClient } = await import('@prisma/client');
    const mockQueryRaw = jest.fn().mockResolvedValue([{ result: 1 }]);
    const mockDisconnect = jest.fn().mockResolvedValue(undefined);

    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
      () =>
        ({
          $queryRaw: mockQueryRaw,
          $disconnect: mockDisconnect,
        }) as MockPrismaClient,
    );

    // When: Check database availability
    const result = await skipIfNoDatabase();

    // Then: Returns true (tests should run)
    expect(result).toBe(true);

    // And: No warning logged
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    // And: PrismaClient cleanup called
    expect(mockDisconnect).toHaveBeenCalled();
  });

  // ========================================
  // ADDITIONAL TESTS: EDGE CASES
  // ========================================

  /**
   * Test 6: PrismaClient cleanup auch bei Fehler.
   *
   * **Business Rule:** Resource Cleanup ist immer garantiert (finally block)
   * **Pattern:** finally { await prisma.$disconnect() }
   */
  it('should always cleanup PrismaClient even on error', async () => {
    // Given: DATABASE_URL gesetzt aber Connection fehlschlägt
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    const { PrismaClient } = await import('@prisma/client');
    const mockQueryRaw = jest.fn().mockRejectedValue(new Error('Test error'));
    const mockDisconnect = jest.fn().mockResolvedValue(undefined);

    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
      () =>
        ({
          $queryRaw: mockQueryRaw,
          $disconnect: mockDisconnect,
        }) as MockPrismaClient,
    );

    // When: Check database availability
    await skipIfNoDatabase();

    // Then: Disconnect ALWAYS called (finally block)
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
