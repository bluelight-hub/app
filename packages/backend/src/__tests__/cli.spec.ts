import { CommandFactory } from 'nest-commander';

// Mock dependencies
jest.mock('nest-commander');
jest.mock('../logger/consola.logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock problematische CLI Commands
jest.mock('../cli/commands/seed-einsatz.command', () => ({
  SeedEinsatzCommand: jest.fn(),
}));

jest.mock('../cli/commands/seed-import.command', () => ({
  SeedImportCommand: jest.fn(),
}));

jest.mock('../cli/commands/seed-admin.command', () => ({
  SeedAdminCommand: jest.fn(),
}));

/**
 * Tests für die CLI Bootstrap-Funktion.
 * Testet den Start und Fehlerbehandlung der CLI.
 */
describe('CLI Bootstrap', () => {
  let mockApp: any;
  let originalExit: (code?: number) => never;

  beforeEach(() => {
    // Mock process.exit to prevent actual exit
    originalExit = process.exit;
    process.exit = jest.fn() as any;

    // Mock app with close method
    mockApp = {
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original process.exit
    process.exit = originalExit;
    jest.resetModules();
  });

  it('sollte CLI erfolgreich starten und schließen', async () => {
    // Mock successful CommandFactory.runWithoutClosing
    (CommandFactory.runWithoutClosing as jest.Mock).mockResolvedValue(mockApp);

    // Import und execute bootstrap
    await import('../cli');

    // Wait for async operations
    await new Promise((resolve) => setImmediate(resolve));

    expect(CommandFactory.runWithoutClosing).toHaveBeenCalledWith(
      expect.any(Function), // CliModule
      { logger: ['log', 'error', 'warn'] },
    );
    expect(mockApp.close).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('sollte Fehler behandeln und mit Code 1 beenden', async () => {
    const error = new Error('Test CLI error');

    // Mock failed CommandFactory.runWithoutClosing
    (CommandFactory.runWithoutClosing as jest.Mock).mockRejectedValue(error);

    // Import und execute bootstrap - verwende dynamischen Import
    await import('../cli');

    // Warte bis alle async operations abgeschlossen sind
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('sollte Fehler beim App-Schließen behandeln', async () => {
    const closeError = new Error('Close error');
    mockApp.close.mockRejectedValue(closeError);

    // Mock successful CommandFactory.runWithoutClosing but failing close
    (CommandFactory.runWithoutClosing as jest.Mock).mockResolvedValue(mockApp);

    // Import und execute bootstrap
    await import('../cli');

    // Warte bis alle async operations abgeschlossen sind
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
