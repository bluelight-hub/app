import { DRK_SEED_PROFILES, DRKEinsatzCategory, ProfileUtils, SeedProfile } from '../profiles';

describe('DRK Seed Profiles', () => {
  describe('DRK_SEED_PROFILES', () => {
    it('should contain all expected profiles', () => {
      const expectedKeys = [
        'manv',
        'sanitaetsdienst',
        'katastrophenschutz',
        'betreuung',
        'rettungsdienst',
        'psnv',
        'ausbildung',
      ];
      const actualKeys = Object.keys(DRK_SEED_PROFILES);

      expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
      expect(actualKeys).toHaveLength(expectedKeys.length);
    });

    it('should have valid structure for each profile', () => {
      Object.values(DRK_SEED_PROFILES).forEach((profile) => {
        expect(profile).toHaveProperty('key');
        expect(profile).toHaveProperty('name');
        expect(profile).toHaveProperty('description');
        expect(profile).toHaveProperty('einsatz');
        expect(profile).toHaveProperty('metadata');

        expect(profile.einsatz).toHaveProperty('name');
        expect(profile.einsatz).toHaveProperty('beschreibung');

        expect(profile.metadata).toHaveProperty('category');
        expect(profile.metadata).toHaveProperty('estimatedPersonsAffected');
        expect(profile.metadata).toHaveProperty('estimatedDurationHours');
        expect(profile.metadata).toHaveProperty('requiredResources');
        expect(profile.metadata).toHaveProperty('priority');
      });
    });

    it('should have valid DRKEinsatzCategory for each profile', () => {
      const validCategories = Object.values(DRKEinsatzCategory);

      Object.values(DRK_SEED_PROFILES).forEach((profile) => {
        expect(validCategories).toContain(profile.metadata.category);
      });
    });

    it('should have valid priority for each profile', () => {
      const validPriorities = ['low', 'medium', 'high', 'critical'];

      Object.values(DRK_SEED_PROFILES).forEach((profile) => {
        expect(validPriorities).toContain(profile.metadata.priority);
      });
    });
  });

  describe('ProfileUtils', () => {
    describe('getAllProfiles', () => {
      it('should return all profiles', () => {
        const profiles = ProfileUtils.getAllProfiles();

        expect(profiles).toHaveLength(Object.keys(DRK_SEED_PROFILES).length);
        expect(profiles).toEqual(expect.arrayContaining(Object.values(DRK_SEED_PROFILES)));
      });
    });

    describe('getProfileByKey', () => {
      it('should return profile for valid key', () => {
        const profile = ProfileUtils.getProfileByKey('manv');

        expect(profile).toBeDefined();
        expect(profile?.key).toBe('manv');
        expect(profile?.name).toBe('MANV (Massenanfall von Verletzten)');
      });

      it('should return undefined for invalid key', () => {
        const profile = ProfileUtils.getProfileByKey('invalid-key');

        expect(profile).toBeUndefined();
      });
    });

    describe('getProfilesByCategory', () => {
      it('should return profiles for valid category', () => {
        const profiles = ProfileUtils.getProfilesByCategory(DRKEinsatzCategory.MANV);

        expect(profiles).toHaveLength(1);
        expect(profiles[0].metadata.category).toBe(DRKEinsatzCategory.MANV);
      });

      it('should return empty array for category with no profiles', () => {
        // Create a mock category that doesn't exist in profiles
        const profiles = ProfileUtils.getProfilesByCategory('non-existent' as DRKEinsatzCategory);

        expect(profiles).toHaveLength(0);
      });

      it('should return multiple profiles if category has multiple', () => {
        // Add a test to ensure it works with multiple profiles
        const sanitaetsProfiles = ProfileUtils.getProfilesByCategory(
          DRKEinsatzCategory.SANITAETSDIENST,
        );
        expect(sanitaetsProfiles.length).toBeGreaterThan(0);
        sanitaetsProfiles.forEach((profile) => {
          expect(profile.metadata.category).toBe(DRKEinsatzCategory.SANITAETSDIENST);
        });
      });
    });

    describe('getProfilesByPriority', () => {
      it('should return profiles for each priority level', () => {
        const priorities: Array<'low' | 'medium' | 'high' | 'critical'> = [
          'low',
          'medium',
          'high',
          'critical',
        ];

        priorities.forEach((priority) => {
          const profiles = ProfileUtils.getProfilesByPriority(priority);

          if (profiles.length > 0) {
            profiles.forEach((profile) => {
              expect(profile.metadata.priority).toBe(priority);
            });
          }
        });
      });

      it('should return correct profiles for critical priority', () => {
        const profiles = ProfileUtils.getProfilesByPriority('critical');

        expect(profiles).toHaveLength(1);
        expect(profiles[0].key).toBe('manv');
      });

      it('should return correct profiles for high priority', () => {
        const profiles = ProfileUtils.getProfilesByPriority('high');

        expect(profiles.length).toBeGreaterThan(0);
        profiles.forEach((profile) => {
          expect(profile.metadata.priority).toBe('high');
        });
      });
    });

    describe('isValidProfileKey', () => {
      it('should return true for valid keys', () => {
        const validKeys = [
          'manv',
          'sanitaetsdienst',
          'katastrophenschutz',
          'betreuung',
          'rettungsdienst',
          'psnv',
          'ausbildung',
        ];

        validKeys.forEach((key) => {
          expect(ProfileUtils.isValidProfileKey(key)).toBe(true);
        });
      });

      it('should return false for invalid keys', () => {
        expect(ProfileUtils.isValidProfileKey('invalid')).toBe(false);
        expect(ProfileUtils.isValidProfileKey('')).toBe(false);
        expect(ProfileUtils.isValidProfileKey('MANV')).toBe(false); // case sensitive
      });
    });

    describe('getAvailableKeys', () => {
      it('should return all profile keys', () => {
        const keys = ProfileUtils.getAvailableKeys();
        const expectedKeys = [
          'manv',
          'sanitaetsdienst',
          'katastrophenschutz',
          'betreuung',
          'rettungsdienst',
          'psnv',
          'ausbildung',
        ];

        expect(keys).toEqual(expect.arrayContaining(expectedKeys));
        expect(keys).toHaveLength(expectedKeys.length);
      });
    });
  });

  describe('DRKEinsatzCategory enum', () => {
    it('should have all expected categories', () => {
      expect(DRKEinsatzCategory.RETTUNGSDIENST).toBe('rettungsdienst');
      expect(DRKEinsatzCategory.KATASTROPHENSCHUTZ).toBe('katastrophenschutz');
      expect(DRKEinsatzCategory.SANITAETSDIENST).toBe('sanitaetsdienst');
      expect(DRKEinsatzCategory.BETREUUNG).toBe('betreuung');
      expect(DRKEinsatzCategory.PSNV).toBe('psnv');
      expect(DRKEinsatzCategory.MANV).toBe('manv');
      expect(DRKEinsatzCategory.AUSBILDUNG).toBe('ausbildung');
    });
  });

  describe('SeedProfile interface compliance', () => {
    it('should ensure all profiles match the SeedProfile interface', () => {
      Object.values(DRK_SEED_PROFILES).forEach((profile: SeedProfile) => {
        // Type checking
        expect(typeof profile.key).toBe('string');
        expect(typeof profile.name).toBe('string');
        expect(typeof profile.description).toBe('string');
        expect(typeof profile.einsatz.name).toBe('string');
        expect(typeof profile.einsatz.beschreibung).toBe('string');
        expect(typeof profile.metadata.estimatedPersonsAffected).toBe('number');
        expect(typeof profile.metadata.estimatedDurationHours).toBe('number');
        expect(Array.isArray(profile.metadata.requiredResources)).toBe(true);

        // Value validation
        expect(profile.metadata.estimatedPersonsAffected).toBeGreaterThan(0);
        expect(profile.metadata.estimatedDurationHours).toBeGreaterThan(0);
        expect(profile.metadata.requiredResources.length).toBeGreaterThan(0);
      });
    });
  });
});
