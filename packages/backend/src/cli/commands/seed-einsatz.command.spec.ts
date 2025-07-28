import { Test, TestingModule } from '@nestjs/testing';
import { SeedEinsatzCommand } from './seed-einsatz.command';
import { EinsatzService } from '@/modules/einsatz/einsatz.service';
import { ProfileService } from '@/modules/seed/profile.service';
import { Logger } from '@nestjs/common';
import { SeedProfile, DRKEinsatzCategory } from '@/modules/seed/profiles';

describe('SeedEinsatzCommand', () => {
  let command: SeedEinsatzCommand;
  let einsatzService: jest.Mocked<EinsatzService>;
  let profileService: jest.Mocked<ProfileService>;
  let loggerSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const mockProfile: SeedProfile = {
    key: 'manv',
    name: 'MANV Test',
    description: 'Massenanfall von Verletzten',
    einsatz: {
      name: 'MANV Großschadenslage',
      beschreibung: 'Schwerer Verkehrsunfall mit mehreren verletzten Personen',
    },
    metadata: {
      category: DRKEinsatzCategory.MANV,
      priority: 'critical' as const,
      estimatedPersonsAffected: 50,
      estimatedDurationHours: 8,
      requiredResources: ['RTW', 'NEF', 'KTW'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedEinsatzCommand,
        {
          provide: EinsatzService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: ProfileService,
          useValue: {
            createEinsatzFromProfile: jest.fn(),
            getProfile: jest.fn(),
            getAllProfiles: jest.fn(),
            getProfileDetails: jest.fn(),
            getAvailableProfileKeys: jest.fn(),
            getProfilesByCategory: jest.fn(),
            getProfilesByPriority: jest.fn(),
          },
        },
      ],
    }).compile();

    command = module.get<SeedEinsatzCommand>(SeedEinsatzCommand);
    einsatzService = module.get(EinsatzService);
    profileService = module.get(ProfileService);

    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should show profile list when list option is set', async () => {
      profileService.getAllProfiles.mockReturnValue([mockProfile] as SeedProfile[]);

      await command.run([], { list: true });

      expect(profileService.getAllProfiles).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('\n📋 Verfügbare DRK-Profile:');
      expect(loggerSpy).toHaveBeenCalledWith(`🔹 ${mockProfile.key}: ${mockProfile.name}`);
    });

    it('should show profile info when info option is set', async () => {
      profileService.getProfileDetails.mockReturnValue('Detailed profile information');

      await command.run([], { info: 'manv' });

      expect(profileService.getProfileDetails).toHaveBeenCalledWith('manv');
      expect(loggerSpy).toHaveBeenCalledWith('Detailed profile information');
    });

    it('should handle non-existent profile info', async () => {
      profileService.getProfileDetails.mockReturnValue(null);
      profileService.getAvailableProfileKeys.mockReturnValue(['manv', 'sanitaetsdienst']);

      await command.run([], { info: 'invalid' });

      expect(errorSpy).toHaveBeenCalledWith('❌ Profil "invalid" nicht gefunden.');
      expect(loggerSpy).toHaveBeenCalledWith('manv, sanitaetsdienst');
    });

    it('should show filtered profiles by category', async () => {
      profileService.getProfilesByCategory.mockReturnValue([mockProfile] as SeedProfile[]);

      await command.run([], { category: 'manv' });

      expect(profileService.getProfilesByCategory).toHaveBeenCalledWith('manv');
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Gefilterte DRK-Profile'));
    });

    it('should handle empty category filter results', async () => {
      profileService.getProfilesByCategory.mockReturnValue([]);

      await command.run([], { category: 'invalid' });

      expect(errorSpy).toHaveBeenCalledWith('❌ Keine Profile für Kategorie "invalid" gefunden.');
    });

    it('should show filtered profiles by priority', async () => {
      profileService.getProfilesByPriority.mockReturnValue([mockProfile] as SeedProfile[]);
      profileService.getAllProfiles.mockReturnValue([mockProfile] as SeedProfile[]);

      await command.run([], { priority: 'critical' });

      expect(profileService.getProfilesByPriority).toHaveBeenCalledWith('critical');
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Gefilterte DRK-Profile'));
    });

    it('should handle empty priority filter results', async () => {
      profileService.getProfilesByPriority.mockReturnValue([]);

      await command.run([], { priority: 'invalid' });

      expect(errorSpy).toHaveBeenCalledWith('❌ Keine Profile für Priorität "invalid" gefunden.');
    });

    it('should create einsatz from profile', async () => {
      const mockEinsatz = {
        id: '123',
        name: 'Test MANV',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      profileService.createEinsatzFromProfile.mockResolvedValue(mockEinsatz);
      profileService.getProfile.mockReturnValue(mockProfile);

      await command.run([], { profile: 'manv' });

      expect(profileService.createEinsatzFromProfile).toHaveBeenCalledWith('manv');
      expect(loggerSpy).toHaveBeenCalledWith('✅ DRK-Einsatz erfolgreich erstellt:');
      expect(loggerSpy).toHaveBeenCalledWith(`   Name: ${mockEinsatz.name}`);
      expect(loggerSpy).toHaveBeenCalledWith(`   ID: ${mockEinsatz.id}`);
    });

    it('should handle error when creating einsatz from invalid profile', async () => {
      profileService.createEinsatzFromProfile.mockRejectedValue(new Error('Profil nicht gefunden'));
      profileService.getAllProfiles.mockReturnValue([mockProfile] as SeedProfile[]);

      await command.run([], { profile: 'invalid' });

      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Fehler beim Erstellen des Einsatzes aus Profil: Profil nicht gefunden',
      );
      expect(loggerSpy).toHaveBeenCalledWith('\n📋 Verfügbare DRK-Profile:');
    });

    it('should create custom einsatz with provided name', async () => {
      const mockEinsatz = {
        id: '123',
        name: 'Custom Einsatz',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      einsatzService.create.mockResolvedValue(mockEinsatz);

      await command.run([], { name: 'Custom Einsatz', beschreibung: 'Test description' });

      expect(einsatzService.create).toHaveBeenCalledWith({
        name: 'Custom Einsatz',
        beschreibung: 'Test description',
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        `✅ Einsatz erfolgreich erstellt: ${mockEinsatz.name} (ID: ${mockEinsatz.id})`,
      );
    });

    it('should create custom einsatz with generated name', async () => {
      const mockEinsatz = {
        id: '123',
        name: 'Test-Einsatz 2024-01-01 10:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      einsatzService.create.mockResolvedValue(mockEinsatz);

      await command.run([]);

      expect(einsatzService.create).toHaveBeenCalledWith({
        name: expect.stringContaining('Test-Einsatz'),
        beschreibung: undefined,
      });
    });

    it('should handle duplicate einsatz error', async () => {
      const error = new Error('Duplicate entry');
      (error as any).code = 'P2002';
      einsatzService.create.mockRejectedValue(error);

      await command.run([], { name: 'Duplicate' });

      expect(errorSpy).toHaveBeenCalledWith('Ein Einsatz mit diesem Namen existiert bereits');
    });

    it('should handle general errors', async () => {
      const error = new Error('General error');
      einsatzService.create.mockRejectedValue(error);

      await command.run([], { name: 'Test' });

      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Fehler beim Erstellen des Einsatzes: General error',
      );
    });
  });

  describe('option parsers', () => {
    it('should parse name option', () => {
      const result = command.parseName('Test Name');
      expect(result).toBe('Test Name');
    });

    it('should parse beschreibung option', () => {
      const result = command.parseBeschreibung('Test Description');
      expect(result).toBe('Test Description');
    });

    it('should parse profile option', () => {
      const result = command.parseProfile('manv');
      expect(result).toBe('manv');
    });

    it('should parse profile option with different value', () => {
      const result = command.parseProfile('sanitaetsdienst');
      expect(result).toBe('sanitaetsdienst');
    });

    it('should parse list option', () => {
      const result = command.parseList();
      expect(result).toBe(true);
    });

    it('should parse info option', () => {
      const result = command.parseInfo('manv');
      expect(result).toBe('manv');
    });

    it('should parse info option with different value', () => {
      const result = command.parseInfo('betreuung');
      expect(result).toBe('betreuung');
    });

    it('should parse category option', () => {
      const result = command.parseCategory('rettungsdienst');
      expect(result).toBe('rettungsdienst');
    });

    it('should parse category option with different value', () => {
      const result = command.parseCategory('katastrophenschutz');
      expect(result).toBe('katastrophenschutz');
    });

    it('should parse priority option', () => {
      const result = command.parsePriority('high');
      expect(result).toBe('high');
    });

    it('should parse priority option with different value', () => {
      const result = command.parsePriority('critical');
      expect(result).toBe('critical');
    });
  });

  describe('edge cases and additional coverage', () => {
    it('should handle when createEinsatzFromProfile returns null', async () => {
      profileService.createEinsatzFromProfile.mockResolvedValue(null);
      profileService.getProfile.mockReturnValue(mockProfile);

      await command.run([], { profile: 'manv' });

      expect(profileService.createEinsatzFromProfile).toHaveBeenCalledWith('manv');
      expect(loggerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('✅ DRK-Einsatz erfolgreich erstellt:'),
      );
    });

    it('should handle general error in run method', async () => {
      const error = new Error('Unexpected error');
      profileService.getAllProfiles.mockImplementation(() => {
        throw error;
      });

      await command.run([], { list: true });

      expect(errorSpy).toHaveBeenCalledWith('Fehler beim Ausführen des Befehls: Unexpected error');
    });

    it('should handle both category and priority filters with empty results', async () => {
      profileService.getProfilesByCategory.mockReturnValue([mockProfile] as SeedProfile[]);
      profileService.getProfilesByPriority.mockReturnValue([]);

      await command.run([], { category: 'manv', priority: 'low' });

      expect(errorSpy).toHaveBeenCalledWith('❌ Keine Profile für Priorität "low" gefunden.');
    });

    it('should handle when profile has no metadata in creation log', async () => {
      const mockEinsatz = {
        id: '123',
        name: 'Test Einsatz',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      profileService.createEinsatzFromProfile.mockResolvedValue(mockEinsatz);
      profileService.getProfile.mockReturnValue(null);

      await command.run([], { profile: 'test' });

      expect(loggerSpy).toHaveBeenCalledWith('✅ DRK-Einsatz erfolgreich erstellt:');
      expect(loggerSpy).toHaveBeenCalledWith(`   Name: ${mockEinsatz.name}`);
      expect(loggerSpy).toHaveBeenCalledWith(`   ID: ${mockEinsatz.id}`);
    });

    it('should handle error that does not include "nicht gefunden" in message', async () => {
      profileService.createEinsatzFromProfile.mockRejectedValue(new Error('Connection timeout'));

      await command.run([], { profile: 'manv' });

      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Fehler beim Erstellen des Einsatzes aus Profil: Connection timeout',
      );
      expect(loggerSpy).not.toHaveBeenCalledWith('\n📋 Verfügbare DRK-Profile:');
    });

    it('should handle error with different error code in createCustomEinsatz', async () => {
      const error = new Error('Validation error');
      (error as any).code = 'P2003';
      einsatzService.create.mockRejectedValue(error);

      await command.run([], { name: 'Test' });

      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Fehler beim Erstellen des Einsatzes: Validation error',
      );
      expect(errorSpy).not.toHaveBeenCalledWith('Ein Einsatz mit diesem Namen existiert bereits');
    });

    it('should handle P2002 error code without name in createCustomEinsatz', async () => {
      const error = new Error('Database error');
      (error as any).code = 'P2002';
      einsatzService.create.mockRejectedValue(error);

      await command.run([]);

      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Fehler beim Erstellen des Einsatzes: Database error',
      );
      expect(errorSpy).toHaveBeenCalledWith('Ein Einsatz mit diesem Namen existiert bereits');
    });
  });

  describe('private methods', () => {
    it('should generate default name with current timestamp', () => {
      const generateDefaultName = (command as any).generateDefaultName.bind(command);
      const name = generateDefaultName();

      expect(name).toMatch(/^Test-Einsatz \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should show all profiles in list', async () => {
      const sanitaetsdienstProfile: SeedProfile = {
        ...mockProfile,
        key: 'sanitaetsdienst',
        metadata: {
          ...mockProfile.metadata,
          category: DRKEinsatzCategory.SANITAETSDIENST,
        },
      };
      const profiles = [mockProfile, sanitaetsdienstProfile];
      profileService.getAllProfiles.mockReturnValue(profiles as SeedProfile[]);

      await command.run([], { list: true });

      expect(loggerSpy).toHaveBeenCalledWith('💡 Verwendung:');
      expect(loggerSpy).toHaveBeenCalledWith('   npm run cli -- seed:einsatz --profile=<key>');
    });

    it('should show filtered profiles by both category and priority', async () => {
      const mockProfiles = [mockProfile];
      profileService.getAllProfiles.mockReturnValue(mockProfiles as SeedProfile[]);
      profileService.getProfilesByCategory.mockReturnValue(mockProfiles as SeedProfile[]);
      profileService.getProfilesByPriority.mockReturnValue(mockProfiles as SeedProfile[]);

      await command.run([], { category: 'manv', priority: 'critical' });

      expect(profileService.getProfilesByCategory).toHaveBeenCalledWith('manv');
      expect(profileService.getProfilesByPriority).toHaveBeenCalledWith('critical');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gefilterte DRK-Profile (manv Kategorien, critical Prioritäten)'),
      );
    });

    it('should handle successful einsatz creation from profile', async () => {
      const mockEinsatz = {
        id: '123',
        name: 'Test MANV Einsatz',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      profileService.createEinsatzFromProfile.mockResolvedValue(mockEinsatz);
      profileService.getProfile.mockReturnValue({
        ...mockProfile,
        name: 'MANV Großschadenslage',
        metadata: {
          ...mockProfile.metadata,
          estimatedPersonsAffected: 100,
        },
      });

      await command.run([], { profile: 'manv' });

      expect(profileService.createEinsatzFromProfile).toHaveBeenCalledWith('manv');
      expect(loggerSpy).toHaveBeenCalledWith('   Betroffene Personen: 100');
    });

    it('should only show profile list and return early when list is true', async () => {
      const showProfileListSpy = jest.spyOn(command as any, 'showProfileList');
      profileService.getAllProfiles.mockReturnValue([mockProfile] as SeedProfile[]);

      await command.run([], { list: true });

      expect(showProfileListSpy).toHaveBeenCalled();
      expect(einsatzService.create).not.toHaveBeenCalled();
      expect(profileService.createEinsatzFromProfile).not.toHaveBeenCalled();
    });

    it('should only show profile info and return early when info is set', async () => {
      const showProfileInfoSpy = jest.spyOn(command as any, 'showProfileInfo');
      profileService.getProfileDetails.mockReturnValue('Details');

      await command.run([], { info: 'manv' });

      expect(showProfileInfoSpy).toHaveBeenCalledWith('manv');
      expect(einsatzService.create).not.toHaveBeenCalled();
      expect(profileService.createEinsatzFromProfile).not.toHaveBeenCalled();
    });

    it('should only show filtered profiles and return early when category or priority is set', async () => {
      const showFilteredProfilesSpy = jest.spyOn(command as any, 'showFilteredProfiles');
      profileService.getProfilesByCategory.mockReturnValue([mockProfile] as SeedProfile[]);

      await command.run([], { category: 'manv' });

      expect(showFilteredProfilesSpy).toHaveBeenCalledWith('manv', undefined);
      expect(einsatzService.create).not.toHaveBeenCalled();
      expect(profileService.createEinsatzFromProfile).not.toHaveBeenCalled();
    });

    it('should show profiles when error message contains "nicht gefunden"', async () => {
      const showProfileListSpy = jest.spyOn(command as any, 'showProfileList');
      profileService.createEinsatzFromProfile.mockRejectedValue(
        new Error('Profil "xyz" nicht gefunden'),
      );
      profileService.getAllProfiles.mockReturnValue([mockProfile] as SeedProfile[]);

      await command.run([], { profile: 'xyz' });

      expect(showProfileListSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('\n📋 Verfügbare DRK-Profile:');
    });

    it('should show profile with metadata details in filtered list', async () => {
      const profileWithFullMetadata: SeedProfile = {
        key: 'sanitaetsdienst',
        name: 'Sanitätsdienst',
        description: 'Sanitätsdienst bei Großveranstaltung',
        einsatz: {
          name: 'Sanitätsdienst Großveranstaltung',
          beschreibung: 'Sanitätsdienst für Konzert mit 5000 Besuchern',
        },
        metadata: {
          category: DRKEinsatzCategory.SANITAETSDIENST,
          priority: 'medium' as const,
          estimatedPersonsAffected: 1000,
          estimatedDurationHours: 12,
          requiredResources: ['San-Hilfsstelle', 'RTW', 'KTW'],
        },
      };
      profileService.getAllProfiles.mockReturnValue([profileWithFullMetadata] as SeedProfile[]);

      const showProfileListSpy = jest.spyOn(command as any, 'showProfileList');
      await command.run([], { list: true });

      expect(showProfileListSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('   Personen: 1000 | Dauer: 12h');
    });

    it('should handle showProfileInfo with details', async () => {
      const showProfileInfoSpy = jest.spyOn(command as any, 'showProfileInfo');
      profileService.getProfileDetails.mockReturnValue(
        'Detaillierte Profil-Informationen\nmit mehreren Zeilen',
      );

      await command.run([], { info: 'manv' });

      expect(showProfileInfoSpy).toHaveBeenCalledWith('manv');
      expect(loggerSpy).toHaveBeenCalledWith('\n📋 DRK-Profil Details:');
      expect(loggerSpy).toHaveBeenCalledWith('=====================================');
      expect(loggerSpy).toHaveBeenCalledWith('\n💡 Einsatz erstellen:');
      expect(loggerSpy).toHaveBeenCalledWith('   npm run cli -- seed:einsatz --profile=manv');
    });

    it('should show filtered profiles with description', async () => {
      const profileWithDescription: SeedProfile = {
        ...mockProfile,
        description: 'Detaillierte Beschreibung des Profils',
      };
      profileService.getAllProfiles.mockReturnValue([profileWithDescription] as SeedProfile[]);
      profileService.getProfilesByPriority.mockReturnValue([
        profileWithDescription,
      ] as SeedProfile[]);

      await command.run([], { priority: 'high' });

      expect(loggerSpy).toHaveBeenCalledWith(
        `🔹 ${profileWithDescription.key}: ${profileWithDescription.name}`,
      );
      expect(loggerSpy).toHaveBeenCalledWith(`   ${profileWithDescription.description}`);
    });
  });
});
