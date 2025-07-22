// Set test environment
process.env.NODE_ENV = 'test';

// Mock des Loggers
jest.mock(
  '@/logger/consola.logger',
  () => ({
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  }),
  { virtual: true },
);

// Andere globale Mocks können hier hinzugefügt werden

// Global afterEach hook to clean up timers
afterEach(() => {
  jest.clearAllTimers();
});

// Global afterAll hook to ensure clean teardown
afterAll(() => {
  jest.useRealTimers();
});
