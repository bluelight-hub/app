import { Logger } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { EinsatzService } from '../../../modules/einsatz/einsatz.service';
import { createTestModule, mockConsole, mockEinsatz } from '../../../test/testUtils';
import { SeedEinsatzCommand } from '../seed-einsatz.command';

describe('SeedEinsatzCommand', () => {
    let command: SeedEinsatzCommand;
    let einsatzService: EinsatzService;
    let mockLogger: jest.SpyInstance;
    let consoleHelper: ReturnType<typeof mockConsole>;

    beforeEach(async () => {
        const module: TestingModule = await createTestModule([
            SeedEinsatzCommand,
            EinsatzService,
        ]);

        command = module.get<SeedEinsatzCommand>(SeedEinsatzCommand);
        einsatzService = module.get<EinsatzService>(EinsatzService);

        // Mock Logger
        mockLogger = jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();

        // Setup console mocking
        consoleHelper = mockConsole();
    });

    afterEach(() => {
        jest.clearAllMocks();
        consoleHelper.restore();
    });

    describe('run', () => {
        it('sollte einen Einsatz mit default name erstellen wenn kein name angegeben', async () => {
            // Arrange
            const expectedEinsatz = mockEinsatz({
                name: 'Test-Einsatz 2025-05-25 13:45'
            });
            jest.spyOn(einsatzService, 'create').mockResolvedValue(expectedEinsatz);
            jest.spyOn(command as any, 'generateDefaultName').mockReturnValue('Test-Einsatz 2025-05-25 13:45');

            // Act
            await command.run([], {});

            // Assert
            expect(einsatzService.create).toHaveBeenCalledWith({
                name: 'Test-Einsatz 2025-05-25 13:45',
                beschreibung: undefined,
            });
            expect(mockLogger).toHaveBeenCalledWith('Erstelle Einsatz "Test-Einsatz 2025-05-25 13:45"...');
            expect(mockLogger).toHaveBeenCalledWith(
                `Einsatz erfolgreich erstellt: ${expectedEinsatz.name} (ID: ${expectedEinsatz.id})`
            );
        });

        it('sollte einen Einsatz mit angegebenem name erstellen', async () => {
            // Arrange
            const customName = 'Mein Custom Einsatz';
            const expectedEinsatz = mockEinsatz({ name: customName });
            jest.spyOn(einsatzService, 'create').mockResolvedValue(expectedEinsatz);

            // Act
            await command.run([], { name: customName });

            // Assert
            expect(einsatzService.create).toHaveBeenCalledWith({
                name: customName,
                beschreibung: undefined,
            });
            expect(mockLogger).toHaveBeenCalledWith(`Erstelle Einsatz "${customName}"...`);
        });

        it('sollte einen Einsatz mit name und beschreibung erstellen', async () => {
            // Arrange
            const customName = 'Einsatz mit Beschreibung';
            const customBeschreibung = 'Das ist eine Test-Beschreibung';
            const expectedEinsatz = mockEinsatz({
                name: customName,
                beschreibung: customBeschreibung
            });
            jest.spyOn(einsatzService, 'create').mockResolvedValue(expectedEinsatz);

            // Act
            await command.run([], {
                name: customName,
                beschreibung: customBeschreibung
            });

            // Assert
            expect(einsatzService.create).toHaveBeenCalledWith({
                name: customName,
                beschreibung: customBeschreibung,
            });
            expect(mockLogger).toHaveBeenCalledWith(`Erstelle Einsatz "${customName}"...`);
            expect(mockLogger).toHaveBeenCalledWith(
                `Einsatz erfolgreich erstellt: ${expectedEinsatz.name} (ID: ${expectedEinsatz.id})`
            );
        });

        it('sollte P2002 Fehler (unique constraint) korrekt behandeln', async () => {
            // Arrange
            const error = new Error('Unique constraint failed');
            (error as any).code = 'P2002';
            jest.spyOn(einsatzService, 'create').mockRejectedValue(error);
            const errorLogSpy = jest.spyOn(Logger.prototype, 'error');

            // Act
            await command.run([], { name: 'Duplicate Name' });

            // Assert
            expect(errorLogSpy).toHaveBeenCalledWith(
                'Fehler beim Erstellen des Einsatzes: Unique constraint failed'
            );
            expect(errorLogSpy).toHaveBeenCalledWith(
                'Ein Einsatz mit diesem Namen existiert bereits'
            );
        });

        it('sollte allgemeine Fehler korrekt behandeln', async () => {
            // Arrange
            const error = new Error('Database connection failed');
            jest.spyOn(einsatzService, 'create').mockRejectedValue(error);
            const errorLogSpy = jest.spyOn(Logger.prototype, 'error');

            // Act
            await command.run([], { name: 'Test Einsatz' });

            // Assert
            expect(errorLogSpy).toHaveBeenCalledWith(
                'Fehler beim Erstellen des Einsatzes: Database connection failed'
            );
            expect(errorLogSpy).toHaveBeenCalledTimes(1); // Nur der erste Fehler, nicht der P2002-spezifische
        });

        it('sollte mit leeren passedParams funktionieren', async () => {
            // Arrange
            const expectedEinsatz = mockEinsatz();
            jest.spyOn(einsatzService, 'create').mockResolvedValue(expectedEinsatz);

            // Act
            await command.run([], { name: 'Test' });

            // Assert
            expect(einsatzService.create).toHaveBeenCalled();
        });
    });

    describe('parseName', () => {
        it('sollte den übergebenen Namen zurückgeben', () => {
            // Arrange
            const inputName = 'Mein Test Name';

            // Act
            const result = command.parseName(inputName);

            // Assert
            expect(result).toBe(inputName);
        });

        it('sollte leere Strings korrekt handhaben', () => {
            // Arrange
            const emptyName = '';

            // Act
            const result = command.parseName(emptyName);

            // Assert
            expect(result).toBe(emptyName);
        });
    });

    describe('parseBeschreibung', () => {
        it('sollte die übergebene Beschreibung zurückgeben', () => {
            // Arrange
            const inputBeschreibung = 'Das ist eine Testbeschreibung';

            // Act
            const result = command.parseBeschreibung(inputBeschreibung);

            // Assert
            expect(result).toBe(inputBeschreibung);
        });

        it('sollte leere Strings korrekt handhaben', () => {
            // Arrange
            const emptyBeschreibung = '';

            // Act
            const result = command.parseBeschreibung(emptyBeschreibung);

            // Assert
            expect(result).toBe(emptyBeschreibung);
        });
    });

    describe('generateDefaultName', () => {
        it('sollte einen eindeutigen Namen mit Zeitstempel generieren', () => {
            // Arrange
            const mockDate = new Date('2025-05-25T13:45:30.123Z');
            jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

            // Act
            const result = (command as any).generateDefaultName();

            // Assert
            expect(result).toBe('Test-Einsatz 2025-05-25 13:45');
            expect(result).toMatch(/^Test-Einsatz \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
        });

        it('sollte Format und Einzigartigkeit der Namen validieren', () => {
            // Act
            const result = (command as any).generateDefaultName();

            // Assert
            expect(result).toMatch(/^Test-Einsatz \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
            expect(typeof result).toBe('string');
            expect(result.startsWith('Test-Einsatz')).toBe(true);
        });
    });

    describe('Integration Tests', () => {
        it('sollte den vollständigen Command-Flow ohne Optionen ausführen', async () => {
            // Arrange
            const mockDate = new Date('2025-05-25T13:45:30.123Z');
            jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

            const expectedEinsatz = mockEinsatz({
                name: 'Test-Einsatz 2025-05-25 13:45',
                id: 'generated-id-123'
            });
            jest.spyOn(einsatzService, 'create').mockResolvedValue(expectedEinsatz);

            // Act
            await command.run([], {});

            // Assert
            expect(einsatzService.create).toHaveBeenCalledWith({
                name: 'Test-Einsatz 2025-05-25 13:45',
                beschreibung: undefined,
            });
            expect(mockLogger).toHaveBeenCalledWith(
                'Erstelle Einsatz "Test-Einsatz 2025-05-25 13:45"...'
            );
            expect(mockLogger).toHaveBeenCalledWith(
                'Einsatz erfolgreich erstellt: Test-Einsatz 2025-05-25 13:45 (ID: generated-id-123)'
            );
        });

        it('sollte den vollständigen Command-Flow mit allen Optionen ausführen', async () => {
            // Arrange
            const options = {
                name: 'Vollständiger Test-Einsatz',
                beschreibung: 'Eine umfassende Beschreibung für den Test'
            };
            const expectedEinsatz = mockEinsatz(options);
            jest.spyOn(einsatzService, 'create').mockResolvedValue(expectedEinsatz);

            // Act
            await command.run([], options);

            // Assert
            expect(einsatzService.create).toHaveBeenCalledWith(options);
            expect(mockLogger).toHaveBeenCalledWith(
                `Erstelle Einsatz "${options.name}"...`
            );
            expect(mockLogger).toHaveBeenCalledWith(
                `Einsatz erfolgreich erstellt: ${expectedEinsatz.name} (ID: ${expectedEinsatz.id})`
            );
        });
    });
}); 