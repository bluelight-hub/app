import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from '../profile.service';
import { DRKEinsatzCategory, ProfileUtils, SeedProfile } from '../profiles';
import { SeedService } from '../seed.service';

/**
 * Tests für den ProfileService.
 * Stellt sicher, dass alle Profil-Operationen korrekt funktionieren.
 */
describe('ProfileService', () => {
  let service: ProfileService;
  let seedService: jest.Mocked<SeedService>;
  let loggerSpy: jest.SpyInstance;

  const mockEinsatz = {
    id: 'mock-id',
    name: 'Test Einsatz',
    beschreibung: 'Test Beschreibung',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProfile: SeedProfile = {
    key: 'test-profile',
    name: 'Test Profil',
    description: 'Test Beschreibung',
    einsatz: {
      name: 'Test Einsatz',
      beschreibung: 'Test Einsatz Beschreibung',
    },
    metadata: {
      category: DRKEinsatzCategory.RETTUNGSDIENST,
      estimatedPersonsAffected: 10,
      estimatedDurationHours: 2,
      priority: 'medium',
      requiredResources: ['ELW1', 'LF20'],
    },
  };

  beforeEach(async () => {
    const mockSeedService = {
      createEinsatzWithRetry: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: SeedService,
          useValue: mockSeedService,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    seedService = module.get(SeedService);
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEinsatzFromProfile', () => {
    beforeEach(() => {
      jest.spyOn(ProfileUtils, 'getProfileByKey').mockReturnValue(mockProfile);
      jest.spyOn(ProfileUtils, 'getAvailableKeys').mockReturnValue(['test-profile']);
    });

    it('sollte Einsatz erfolgreich aus Profil erstellen', async () => {
      seedService.createEinsatzWithRetry.mockResolvedValue(mockEinsatz);

      const result = await service.createEinsatzFromProfile('test-profile');

      expect(result).toEqual(mockEinsatz);
      expect(seedService.createEinsatzWithRetry).toHaveBeenCalledWith(
        mockProfile.einsatz.name,
        mockProfile.einsatz.beschreibung,
      );
      expect(loggerSpy).toHaveBeenCalledWith('Erstelle Einsatz aus Profil: test-profile');
      expect(loggerSpy).toHaveBeenCalledWith('Verwende Profil: Test Profil');
    });

    it('sollte Fehler werfen bei unbekanntem Profil', async () => {
      jest.spyOn(ProfileUtils, 'getProfileByKey').mockReturnValue(undefined);

      await expect(service.createEinsatzFromProfile('unknown-profile')).rejects.toThrow(
        "Profil 'unknown-profile' nicht gefunden. Verfügbare Profile: test-profile",
      );
    });

    it('sollte Fehler weiterleiten wenn SeedService fehlschlägt', async () => {
      const error = new Error('Seed service error');
      seedService.createEinsatzWithRetry.mockRejectedValue(error);

      await expect(service.createEinsatzFromProfile('test-profile')).rejects.toThrow(error);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        "Fehler beim Erstellen des Einsatzes aus Profil 'test-profile':",
        error,
      );
    });

    it('sollte Debug-Informationen loggen wenn Einsatz erstellt wurde', async () => {
      seedService.createEinsatzWithRetry.mockResolvedValue(mockEinsatz);

      await service.createEinsatzFromProfile('test-profile');

      expect(Logger.prototype.debug).toHaveBeenCalledWith('Profile-Metadaten:', {
        category: mockProfile.metadata.category,
        estimatedPersonsAffected: mockProfile.metadata.estimatedPersonsAffected,
        estimatedDurationHours: mockProfile.metadata.estimatedDurationHours,
        priority: mockProfile.metadata.priority,
        requiredResources: mockProfile.metadata.requiredResources.length,
      });
    });
  });

  describe('getAllProfiles', () => {
    it('sollte alle Profile zurückgeben', () => {
      const mockProfiles = [mockProfile];
      jest.spyOn(ProfileUtils, 'getAllProfiles').mockReturnValue(mockProfiles);

      const result = service.getAllProfiles();

      expect(result).toEqual(mockProfiles);
      expect(ProfileUtils.getAllProfiles).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('sollte spezifisches Profil zurückgeben', () => {
      jest.spyOn(ProfileUtils, 'getProfileByKey').mockReturnValue(mockProfile);

      const result = service.getProfile('test-profile');

      expect(result).toEqual(mockProfile);
      expect(ProfileUtils.getProfileByKey).toHaveBeenCalledWith('test-profile');
    });
  });

  describe('getProfilesByCategory', () => {
    it('sollte Profile nach Kategorie filtern', () => {
      const mockProfiles = [mockProfile];
      jest.spyOn(ProfileUtils, 'getProfilesByCategory').mockReturnValue(mockProfiles);

      const result = service.getProfilesByCategory(DRKEinsatzCategory.RETTUNGSDIENST);

      expect(result).toEqual(mockProfiles);
      expect(ProfileUtils.getProfilesByCategory).toHaveBeenCalledWith(
        DRKEinsatzCategory.RETTUNGSDIENST,
      );
    });
  });

  describe('getProfilesByPriority', () => {
    it('sollte Profile nach Priorität filtern', () => {
      const mockProfiles = [mockProfile];
      jest.spyOn(ProfileUtils, 'getProfilesByPriority').mockReturnValue(mockProfiles);

      const result = service.getProfilesByPriority('medium');

      expect(result).toEqual(mockProfiles);
      expect(ProfileUtils.getProfilesByPriority).toHaveBeenCalledWith('medium');
    });
  });

  describe('isValidProfileKey', () => {
    it('sollte Validität von Profil-Schlüssel prüfen', () => {
      jest.spyOn(ProfileUtils, 'isValidProfileKey').mockReturnValue(true);

      const result = service.isValidProfileKey('test-profile');

      expect(result).toBe(true);
      expect(ProfileUtils.isValidProfileKey).toHaveBeenCalledWith('test-profile');
    });
  });

  describe('getAvailableProfileKeys', () => {
    it('sollte verfügbare Profil-Schlüssel zurückgeben', () => {
      const mockKeys = ['profile1', 'profile2'];
      jest.spyOn(ProfileUtils, 'getAvailableKeys').mockReturnValue(mockKeys);

      const result = service.getAvailableProfileKeys();

      expect(result).toEqual(mockKeys);
      expect(ProfileUtils.getAvailableKeys).toHaveBeenCalled();
    });
  });

  describe('getFormattedProfileList', () => {
    it('sollte formatierte Liste aller Profile zurückgeben', () => {
      const mockProfiles = [mockProfile];
      jest.spyOn(ProfileUtils, 'getAllProfiles').mockReturnValue(mockProfiles);

      const result = service.getFormattedProfileList();

      expect(result).toBe('test-profile: Test Profil (rettungsdienst, medium priority)');
    });
  });

  describe('getProfileDetails', () => {
    it('sollte detaillierte Profil-Informationen zurückgeben', () => {
      jest.spyOn(ProfileUtils, 'getProfileByKey').mockReturnValue(mockProfile);

      const result = service.getProfileDetails('test-profile');

      expect(result).toContain('Profil: Test Profil');
      expect(result).toContain('Kategorie: rettungsdienst');
      expect(result).toContain('Einsatz: Test Einsatz');
      expect(result).toContain('Betroffene Personen: 10');
      expect(result).toContain('Geschätzte Dauer: 2h');
      expect(result).toContain('Priorität: medium');
      expect(result).toContain('Benötigte Ressourcen: ELW1, LF20');
    });

    it('sollte null zurückgeben für unbekanntes Profil', () => {
      jest.spyOn(ProfileUtils, 'getProfileByKey').mockReturnValue(undefined);

      const result = service.getProfileDetails('unknown-profile');

      expect(result).toBeNull();
    });
  });

  describe('searchProfiles', () => {
    it('sollte Profile nach Name durchsuchen', () => {
      const mockProfiles = [mockProfile];
      jest.spyOn(ProfileUtils, 'getAllProfiles').mockReturnValue(mockProfiles);

      const result = service.searchProfiles('Test');

      expect(result).toEqual([mockProfile]);
    });

    it('sollte Case-insensitive suchen', () => {
      const mockProfiles = [mockProfile];
      jest.spyOn(ProfileUtils, 'getAllProfiles').mockReturnValue(mockProfiles);

      const result = service.searchProfiles('test');

      expect(result).toEqual([mockProfile]);
    });

    it('sollte in verschiedenen Feldern suchen', () => {
      const mockProfiles = [mockProfile];
      jest.spyOn(ProfileUtils, 'getAllProfiles').mockReturnValue(mockProfiles);

      // Suche in Beschreibung
      expect(service.searchProfiles('Beschreibung')).toEqual([mockProfile]);
      // Suche in Einsatz-Name
      expect(service.searchProfiles('Einsatz')).toEqual([mockProfile]);
      // Suche in Kategorie
      expect(service.searchProfiles('rettungsdienst')).toEqual([mockProfile]);
    });

    it('sollte leeres Array zurückgeben bei keinen Treffern', () => {
      const mockProfiles = [mockProfile];
      jest.spyOn(ProfileUtils, 'getAllProfiles').mockReturnValue(mockProfiles);

      const result = service.searchProfiles('NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('getRecommendedProfiles', () => {
    beforeEach(() => {
      jest.spyOn(ProfileUtils, 'getAllProfiles').mockReturnValue([mockProfile]);
    });

    it('sollte alle Profile zurückgeben ohne Kriterien', () => {
      const result = service.getRecommendedProfiles();

      expect(result).toEqual([mockProfile]);
    });

    it('sollte nach maximaler Personenanzahl filtern', () => {
      const result = service.getRecommendedProfiles({ maxPersonsAffected: 15 });

      expect(result).toEqual([mockProfile]);

      const resultFiltered = service.getRecommendedProfiles({ maxPersonsAffected: 5 });
      expect(resultFiltered).toEqual([]);
    });

    it('sollte nach maximaler Dauer filtern', () => {
      const result = service.getRecommendedProfiles({ maxDurationHours: 3 });

      expect(result).toEqual([mockProfile]);

      const resultFiltered = service.getRecommendedProfiles({ maxDurationHours: 1 });
      expect(resultFiltered).toEqual([]);
    });

    it('sollte nach Kategorie filtern', () => {
      const result = service.getRecommendedProfiles({
        category: DRKEinsatzCategory.RETTUNGSDIENST,
      });

      expect(result).toEqual([mockProfile]);

      const resultFiltered = service.getRecommendedProfiles({
        category: DRKEinsatzCategory.KATASTROPHENSCHUTZ,
      });
      expect(resultFiltered).toEqual([]);
    });

    it('sollte nach Priorität filtern', () => {
      const result = service.getRecommendedProfiles({ priority: 'medium' });

      expect(result).toEqual([mockProfile]);

      const resultFiltered = service.getRecommendedProfiles({ priority: 'high' });
      expect(resultFiltered).toEqual([]);
    });

    it('sollte mit mehreren Kriterien filtern', () => {
      const result = service.getRecommendedProfiles({
        maxPersonsAffected: 15,
        maxDurationHours: 3,
        category: DRKEinsatzCategory.RETTUNGSDIENST,
        priority: 'medium',
      });

      expect(result).toEqual([mockProfile]);
    });
  });
});
