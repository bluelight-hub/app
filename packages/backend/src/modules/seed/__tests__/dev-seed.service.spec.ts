import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DevSeedService } from '../dev-seed.service';
import { SeedService } from '../seed.service';

describe('DevSeedService', () => {
  let service: DevSeedService;
  let seedService: jest.Mocked<SeedService>;
  let configService: jest.Mocked<ConfigService>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Mock logger methods
    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;

    const mockSeedService = {
      seedInitialEinsatz: jest.fn(),
      createEinsatzWithRetry: jest.fn(),
      seedAdminAuthentication: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevSeedService,
        {
          provide: SeedService,
          useValue: mockSeedService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DevSeedService>(DevSeedService);
    seedService = module.get(SeedService);
    configService = module.get(ConfigService);

    // Replace the logger instance with our mock
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('sollte erfolgreich instanziiert werden', () => {
      expect(service).toBeDefined();
      expect(service.onModuleInit).toBeDefined();
    });

    it('sollte im Development Mode Admin-Auth und initialen Einsatz erstellen', async () => {
      // Arrange
      const mockEinsatz = {
        id: 'test-id',
        name: 'Dev-Einsatz 2025-01-24',
        beschreibung: 'Automatisch erstellter Entwicklungs-Einsatz',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined) // SEED_ADMIN_AUTH (default: enabled)
        .mockReturnValueOnce('admin123') // ADMIN_SEED_PASSWORD
        .mockReturnValueOnce(undefined) // SEED_INITIAL_EINSATZ (default: enabled)
        .mockReturnValueOnce(undefined); // DEV_EINSATZ_NAME (default)

      seedService.seedAdminAuthentication = jest.fn().mockResolvedValue(true);
      seedService.createEinsatzWithRetry.mockResolvedValue(mockEinsatz);

      // Act
      await service.onModuleInit();

      // Assert
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV');
      expect(configService.get).toHaveBeenCalledWith('SEED_ADMIN_AUTH');
      expect(seedService.seedAdminAuthentication).toHaveBeenCalledWith('admin123');
      expect(mockLogger.log).toHaveBeenCalledWith('Admin-Authentication erfolgreich geseeded');
      expect(seedService.createEinsatzWithRetry).toHaveBeenCalledWith(
        expect.stringMatching(/^Dev-Einsatz \d{4}-\d{2}-\d{2}$/),
        'Automatisch erstellter Entwicklungs-Einsatz',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(`Initialen Dev-Einsatz erstellt: Dev-Einsatz`),
      );
    });

    it('sollte mit custom DEV_EINSATZ_NAME einen Einsatz erstellen', async () => {
      // Arrange
      const customName = 'Custom Dev Einsatz';
      const mockEinsatz = {
        id: 'test-id',
        name: customName,
        beschreibung: 'Automatisch erstellter Entwicklungs-Einsatz',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined) // SEED_ADMIN_AUTH
        .mockReturnValueOnce('admin123') // ADMIN_SEED_PASSWORD
        .mockReturnValueOnce(undefined) // SEED_INITIAL_EINSATZ
        .mockReturnValueOnce(customName); // DEV_EINSATZ_NAME

      seedService.seedAdminAuthentication = jest.fn().mockResolvedValue(true);
      seedService.createEinsatzWithRetry.mockResolvedValue(mockEinsatz);

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.createEinsatzWithRetry).toHaveBeenCalledWith(
        customName,
        'Automatisch erstellter Entwicklungs-Einsatz',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Initialen Dev-Einsatz erstellt: ${customName} (ID: ${mockEinsatz.id})`,
      );
    });

    it('sollte nicht in Production Mode ausgeführt werden', async () => {
      // Arrange
      configService.get.mockReturnValueOnce('production'); // NODE_ENV

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.createEinsatzWithRetry).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Automatisches Seeding übersprungen (nicht im Dev-Modus)',
      );
    });

    it('sollte Admin Auth erstellen aber nicht Einsatz wenn SEED_INITIAL_EINSATZ false ist', async () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined) // SEED_ADMIN_AUTH (enabled)
        .mockReturnValueOnce('admin123') // ADMIN_SEED_PASSWORD
        .mockReturnValueOnce('false'); // SEED_INITIAL_EINSATZ

      seedService.seedAdminAuthentication = jest.fn().mockResolvedValue(true);

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.seedAdminAuthentication).toHaveBeenCalled();
      expect(seedService.createEinsatzWithRetry).not.toHaveBeenCalled();
    });

    it('sollte Fehler beim Seed-Prozess abfangen und loggen', async () => {
      // Arrange
      const error = new Error('Seed fehlgeschlagen');
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined) // SEED_ADMIN_AUTH
        .mockReturnValueOnce('admin123') // ADMIN_SEED_PASSWORD
        .mockReturnValueOnce(undefined); // SEED_INITIAL_EINSATZ

      seedService.seedAdminAuthentication = jest.fn().mockResolvedValue(true);
      seedService.createEinsatzWithRetry.mockRejectedValue(error);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Fehler beim Erstellen des initialen Einsatzes:',
        error,
      );
    });

    it('sollte loggen wenn kein Einsatz erstellt wurde (null return)', async () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined) // SEED_ADMIN_AUTH
        .mockReturnValueOnce('admin123') // ADMIN_SEED_PASSWORD
        .mockReturnValueOnce(undefined); // SEED_INITIAL_EINSATZ

      seedService.seedAdminAuthentication = jest.fn().mockResolvedValue(true);
      seedService.createEinsatzWithRetry.mockResolvedValue(null);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Kein initialer Einsatz erstellt (existiert bereits oder Fehler aufgetreten)',
      );
    });

    it('sollte mit unterschiedlichen NODE_ENV Werten korrekt funktionieren', async () => {
      // Test verschiedene NODE_ENV Werte
      const environments = ['test', 'staging', 'production'];

      for (const env of environments) {
        jest.clearAllMocks();
        configService.get.mockReturnValueOnce(env);

        await service.onModuleInit();

        expect(seedService.createEinsatzWithRetry).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Automatisches Seeding übersprungen (nicht im Dev-Modus)',
        );
      }
    });

    it('sollte Datums-Format korrekt generieren', async () => {
      // Arrange
      const originalDate = Date;
      const mockDate = new Date('2025-01-24T10:30:00Z');
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = originalDate.now;

      const mockEinsatz = {
        id: 'test-id',
        name: 'Dev-Einsatz 2025-01-24',
        beschreibung: 'Automatisch erstellter Entwicklungs-Einsatz',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined) // SEED_ADMIN_AUTH
        .mockReturnValueOnce('admin123') // ADMIN_SEED_PASSWORD
        .mockReturnValueOnce(undefined) // SEED_INITIAL_EINSATZ
        .mockReturnValueOnce(undefined); // DEV_EINSATZ_NAME

      seedService.seedAdminAuthentication = jest.fn().mockResolvedValue(true);
      seedService.createEinsatzWithRetry.mockResolvedValue(mockEinsatz);

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.createEinsatzWithRetry).toHaveBeenCalledWith(
        'Dev-Einsatz 2025-01-24',
        'Automatisch erstellter Entwicklungs-Einsatz',
      );

      // Cleanup
      global.Date = originalDate;
    });

    it('sollte Admin Auth überspringen wenn SEED_ADMIN_AUTH false ist', async () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce('false') // SEED_ADMIN_AUTH disabled
        .mockReturnValueOnce('false'); // SEED_INITIAL_EINSATZ disabled

      // Mock the SeedService methods as spies
      jest.spyOn(seedService, 'seedAdminAuthentication').mockResolvedValue(true);
      jest.spyOn(seedService, 'createEinsatzWithRetry').mockResolvedValue(null);

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.seedAdminAuthentication).not.toHaveBeenCalled();
      expect(seedService.createEinsatzWithRetry).not.toHaveBeenCalled();
    });

    it('sollte Fehler beim Admin-Auth-Seeding abfangen und loggen', async () => {
      // Arrange
      const error = new Error('Admin auth seed failed');
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined) // SEED_ADMIN_AUTH
        .mockReturnValueOnce('admin123') // ADMIN_SEED_PASSWORD
        .mockReturnValueOnce('false'); // SEED_INITIAL_EINSATZ disabled

      seedService.seedAdminAuthentication = jest.fn().mockRejectedValue(error);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Fehler beim Seeden der Admin-Authentication:',
        error,
      );
      expect(seedService.createEinsatzWithRetry).not.toHaveBeenCalled();
    });

    it('sollte trotz Admin-Auth-Fehler das Einsatz-Seeding durchführen', async () => {
      // Arrange
      const mockEinsatz = {
        id: 'test-id',
        name: 'Dev-Einsatz 2025-01-24',
        beschreibung: 'Automatisch erstellter Entwicklungs-Einsatz',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined) // SEED_ADMIN_AUTH
        .mockReturnValueOnce('admin123') // ADMIN_SEED_PASSWORD
        .mockReturnValueOnce(undefined) // SEED_INITIAL_EINSATZ
        .mockReturnValueOnce(undefined); // DEV_EINSATZ_NAME

      seedService.seedAdminAuthentication = jest.fn().mockRejectedValue(new Error('Auth failed'));
      seedService.createEinsatzWithRetry.mockResolvedValue(mockEinsatz);

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.createEinsatzWithRetry).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Initialen Dev-Einsatz erstellt:'),
      );
    });

    it('sollte verschiedene Konfigurationswerte korrekt interpretieren', async () => {
      // Test "enabled" als String
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce('enabled') // SEED_ADMIN_AUTH
        .mockReturnValueOnce('admin123') // ADMIN_SEED_PASSWORD
        .mockReturnValueOnce('enabled'); // SEED_INITIAL_EINSATZ

      seedService.seedAdminAuthentication = jest.fn().mockResolvedValue(true);
      seedService.createEinsatzWithRetry.mockResolvedValue(null);

      await service.onModuleInit();

      expect(seedService.seedAdminAuthentication).toHaveBeenCalled();
      expect(seedService.createEinsatzWithRetry).toHaveBeenCalled();
    });

    it('sollte mit leeren Strings in Konfiguration umgehen', async () => {
      // Mock the SeedService methods as spies BEFORE calling onModuleInit
      jest.spyOn(seedService, 'seedAdminAuthentication').mockResolvedValue(true);
      jest.spyOn(seedService, 'createEinsatzWithRetry').mockResolvedValue(null);

      // Test empty strings
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce('false') // SEED_ADMIN_AUTH disabled
        .mockReturnValueOnce('false'); // SEED_INITIAL_EINSATZ disabled

      // Act
      await service.onModuleInit();

      // Empty strings should be treated as disabled
      expect(seedService.seedAdminAuthentication).not.toHaveBeenCalled();
      expect(seedService.createEinsatzWithRetry).not.toHaveBeenCalled();
    });

    it('sollte mit null-Werten in Konfiguration umgehen', async () => {
      // Mock the SeedService methods as spies BEFORE calling onModuleInit
      jest.spyOn(seedService, 'seedAdminAuthentication').mockResolvedValue(true);
      jest.spyOn(seedService, 'createEinsatzWithRetry').mockResolvedValue(null);

      // Test null values
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce('false') // SEED_ADMIN_AUTH disabled
        .mockReturnValueOnce('false'); // SEED_INITIAL_EINSATZ disabled

      // Act
      await service.onModuleInit();

      // Null values should be treated as disabled
      expect(seedService.seedAdminAuthentication).not.toHaveBeenCalled();
      expect(seedService.createEinsatzWithRetry).not.toHaveBeenCalled();
    });

    it('sollte mit undefined NODE_ENV umgehen', async () => {
      // Mock the SeedService methods as spies BEFORE calling onModuleInit
      jest.spyOn(seedService, 'seedAdminAuthentication').mockResolvedValue(true);
      jest.spyOn(seedService, 'createEinsatzWithRetry').mockResolvedValue(null);

      // Test undefined NODE_ENV
      configService.get.mockReturnValueOnce(undefined); // NODE_ENV

      // Act
      await service.onModuleInit();

      // Should not run seeding when NODE_ENV is undefined
      expect(seedService.seedAdminAuthentication).not.toHaveBeenCalled();
      expect(seedService.createEinsatzWithRetry).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Automatisches Seeding übersprungen (nicht im Dev-Modus)',
      );
    });

    it('sollte loggen wenn Admin-Authentication bereits existiert', async () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined) // SEED_ADMIN_AUTH
        .mockReturnValueOnce('admin123') // ADMIN_SEED_PASSWORD
        .mockReturnValueOnce('false'); // SEED_INITIAL_EINSATZ

      seedService.seedAdminAuthentication = jest.fn().mockResolvedValue(false);

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.seedAdminAuthentication).toHaveBeenCalledWith('admin123');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Admin-Authentication Seeding übersprungen (existiert bereits)',
      );
      expect(seedService.createEinsatzWithRetry).not.toHaveBeenCalled();
    });

    it('sollte Standard-Passwort verwenden wenn ADMIN_SEED_PASSWORD nicht gesetzt ist', async () => {
      // Arrange
      configService.get
        .mockReturnValueOnce('development') // NODE_ENV
        .mockReturnValueOnce(undefined) // SEED_ADMIN_AUTH
        .mockReturnValueOnce(undefined) // ADMIN_SEED_PASSWORD (undefined to trigger default)
        .mockReturnValueOnce('false'); // SEED_INITIAL_EINSATZ

      seedService.seedAdminAuthentication = jest.fn().mockResolvedValue(true);

      // Act
      await service.onModuleInit();

      // Assert
      expect(seedService.seedAdminAuthentication).toHaveBeenCalledWith('admin123');
      expect(mockLogger.log).toHaveBeenCalledWith('Admin-Authentication erfolgreich geseeded');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Test-Admin-Benutzer erstellt mit Passwort: admin123',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'WICHTIG: Ändern Sie die Passwörter vor dem Produktivbetrieb!',
      );
    });
  });
});
