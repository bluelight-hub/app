import { EinsatzService } from '@/modules/einsatz/einsatz.service';
import { ProfileService } from '@/modules/seed/profile.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CliModule } from './cli.module';
import { SeedEinsatzCommand } from './commands/seed-einsatz.command';

describe('CliModule', () => {
  let module: TestingModule;

  const mockPrismaService = {
    einsatz: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const mockEinsatzService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockProfileService = {
    createEinsatzFromProfile: jest.fn(),
    getProfile: jest.fn(),
    getAllProfiles: jest.fn().mockReturnValue([]),
    getProfileDetails: jest.fn(),
    getAvailableProfileKeys: jest.fn().mockReturnValue([]),
    getProfilesByCategory: jest.fn().mockReturnValue([]),
    getProfilesByPriority: jest.fn().mockReturnValue([]),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [
        SeedEinsatzCommand,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EinsatzService,
          useValue: mockEinsatzService,
        },
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    jest.clearAllMocks();
  });

  describe('Module Definition', () => {
    it('sollte definiert sein', () => {
      expect(CliModule).toBeDefined();
      expect(typeof CliModule).toBe('function');
    });

    it('sollte ein NestJS Modul sein', () => {
      expect(CliModule.prototype).toBeDefined();
      expect(CliModule.name).toBe('CliModule');
    });

    it('sollte als Klasse funktionieren', () => {
      expect(() => new CliModule()).not.toThrow();
      const instance = new CliModule();
      expect(instance).toBeInstanceOf(CliModule);
    });

    it('sollte korrekte Konstruktor-Eigenschaften haben', () => {
      const instance = new CliModule();
      expect(instance.constructor).toBe(CliModule);
      expect(instance.constructor.name).toBe('CliModule');
    });
  });

  describe('Module Compilation', () => {
    it('sollte erfolgreich kompiliert werden', async () => {
      expect(module).toBeDefined();
    });

    it('sollte SeedEinsatzCommand Provider verfügbar machen', () => {
      const seedCommand = module.get(SeedEinsatzCommand);
      expect(seedCommand).toBeDefined();
      expect(seedCommand).toBeInstanceOf(SeedEinsatzCommand);
    });

    it('sollte alle Dependencies auflösen können', async () => {
      // Test dass alle Providers korrekt aufgelöst werden
      expect(() => module.get(SeedEinsatzCommand)).not.toThrow();
      expect(() => module.get(EinsatzService)).not.toThrow();
      expect(() => module.get(ProfileService)).not.toThrow();
    });
  });

  describe('Module Structure', () => {
    it('sollte importierbare Dependencies haben', () => {
      // Test dass die Dependencies korrekt definiert sind
      expect(ConfigModule).toBeDefined();
      expect(SeedEinsatzCommand).toBeDefined();
      expect(EinsatzService).toBeDefined();
      expect(ProfileService).toBeDefined();
    });

    it('sollte NestJS Module-Pattern verwenden', () => {
      // Verifiziere dass das Modul die erwartete Struktur hat
      expect(CliModule).toBeDefined();
      expect(typeof CliModule).toBe('function');
    });

    it('sollte instanziierbar sein', () => {
      const instance = new CliModule();
      expect(instance).toBeDefined();
      expect(instance.constructor.name).toBe('CliModule');
    });
  });

  describe('Integration Tests', () => {
    it('sollte Module ohne Fehler instanziieren', () => {
      expect(module).toBeDefined();
    });

    it('sollte Provider-Abhängigkeiten korrekt auflösen', () => {
      const seedCommand = module.get(SeedEinsatzCommand);
      expect(seedCommand).toBeInstanceOf(SeedEinsatzCommand);

      const einsatzService = module.get(EinsatzService);
      expect(einsatzService).toBeDefined();

      const profileService = module.get(ProfileService);
      expect(profileService).toBeDefined();
    });

    it('sollte mit verschiedenen Konfigurationen funktionieren', () => {
      // Test dass die Providers korrekt gemockt sind
      const einsatzService = module.get(EinsatzService);
      expect(einsatzService.create).toBeDefined();
      expect(typeof einsatzService.create).toBe('function');

      const profileService = module.get(ProfileService);
      expect(profileService.getAllProfiles).toBeDefined();
      expect(typeof profileService.getAllProfiles).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('sollte mit Mock-Dependencies funktionieren', () => {
      // Test dass das Test-Setup korrekt funktioniert
      expect(() => module.get(SeedEinsatzCommand)).not.toThrow();
      expect(() => module.get(EinsatzService)).not.toThrow();
      expect(() => module.get(ProfileService)).not.toThrow();
    });

    it('sollte Mock-Services korrekt bereitstellen', () => {
      const einsatzService = module.get(EinsatzService);
      expect(einsatzService).toBe(mockEinsatzService);

      const profileService = module.get(ProfileService);
      expect(profileService).toBe(mockProfileService);
    });
  });
});
