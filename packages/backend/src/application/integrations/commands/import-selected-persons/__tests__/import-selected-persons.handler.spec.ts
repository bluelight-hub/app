/**
 * Unit Tests für ImportSelectedPersonsHandler.
 *
 * Testet den Import von HiOrg-Personen in das Stammpersonen-Verzeichnis.
 *
 * @module application/integrations/commands/import-selected-persons/__tests__
 */

import { Result } from '@domain/common/result';
import { INTEGRATION_TYPES, INTEGRATION_ERROR_CODES } from '@domain/integrations';
import type { QualifikationMapping } from '@domain/integrations/entities/qualifikation-mapping.entity';
import type { IQualifikationMappingRepository } from '@domain/integrations/repositories/i-qualifikation-mapping.repository';
import type { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
import { StammPerson } from '@domain/kraefte/aggregates/stamm-person.aggregate';
import type { IHiOrgServerPort, HiOrgPersonDto } from '@domain/ports/i-hiorg-server.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { HiOrgTokenRefreshService } from '../../../services/hiorg-token-refresh.service';
import { ImportSelectedPersonsHandler } from '../import-selected-persons.handler';
import { ImportSelectedPersonsCommand } from '../import-selected-persons.command';

describe('ImportSelectedPersonsHandler', () => {
  let handler: ImportSelectedPersonsHandler;
  let mockLogger: jest.Mocked<ILogger>;
  let mockHiorg: jest.Mocked<IHiOrgServerPort>;
  let mockStammPersonRepo: jest.Mocked<IStammPersonRepository>;
  let mockMappingRepo: jest.Mocked<IQualifikationMappingRepository>;
  let mockTokenRefresh: jest.Mocked<HiOrgTokenRefreshService>;

  // Test fixtures - CUID2 Format für alle IDs
  const testUserId = 'clp1234567890abcdef123456';
  const testQualifikationId = 'clqual12345678901234567';

  const createHiOrgPerson = (overrides?: Partial<HiOrgPersonDto>): HiOrgPersonDto => ({
    username: 'max.mustermann',
    mitgliednr: '12345',
    vorname: 'Max',
    nachname: 'Mustermann',
    email: 'max@example.com',
    status: 'aktiv',
    qualifikationen: [],
    ausbildungen: [],
    ...overrides,
  });

  const createStammPerson = (overrides?: Partial<{ id: string; vorname: string; nachname: string; personalnummer: string }>): StammPerson => {
    const result = StammPerson.create({
      vorname: overrides?.vorname ?? 'Max',
      nachname: overrides?.nachname ?? 'Mustermann',
      personalnummer: overrides?.personalnummer ?? '12345',
      createdBy: testUserId,
    });
    const person = result.value!;
    // Mock ID
    Object.defineProperty(person.id, 'value', { get: () => overrides?.id ?? 'stammperson-id-123' });
    person.markAsSynced(INTEGRATION_TYPES.HIORG_SERVER, 'max.mustermann', testUserId);
    return person;
  };

  const createQualifikationMapping = (externalName: string, qualifikationId?: string): QualifikationMapping =>
    ({
      externalSource: INTEGRATION_TYPES.HIORG_SERVER,
      externalName,
      qualifikationId,
    }) as QualifikationMapping;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    mockHiorg = {
      fetchPersons: jest.fn(),
      testConnection: jest.fn(),
    };

    mockStammPersonRepo = {
      findByExternalId: jest.fn(),
      findByPersonalnummer: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
    };

    mockMappingRepo = {
      findByExternalSource: jest.fn(),
      findByExternalName: jest.fn(),
      save: jest.fn(),
      deleteMapping: jest.fn(),
    };

    mockTokenRefresh = {
      getValidAccessToken: jest.fn(),
    } as unknown as jest.Mocked<HiOrgTokenRefreshService>;

    handler = new ImportSelectedPersonsHandler(mockLogger, mockHiorg, mockStammPersonRepo, mockMappingRepo, mockTokenRefresh);
  });

  describe('execute', () => {
    it('should successfully import new person with qualifications', async () => {
      // Given: Gültige Command, Token, HiOrg-Daten und Mappings
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann'],
        importedBy: testUserId,
        duplicateStrategy: 'skip',
      }).value!;

      const hiorgPerson = createHiOrgPerson({
        qualifikationen: [{ name: 'Rettungssanitäter', name_kurz: 'RS' }],
      });

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok({ accessToken: 'valid-token', wasRefreshed: false }));
      mockHiorg.fetchPersons.mockResolvedValue(Result.ok([hiorgPerson]));
      mockMappingRepo.findByExternalSource.mockResolvedValue(Result.ok([createQualifikationMapping('rettungssanitäter', testQualifikationId)]));
      mockStammPersonRepo.findByExternalId.mockResolvedValue(Result.ok(undefined));
      mockStammPersonRepo.findByPersonalnummer.mockResolvedValue(Result.ok(undefined));
      mockStammPersonRepo.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.totalProcessed).toBe(1);
      expect(result.value?.created).toBe(1);
      expect(result.value?.results[0].status).toBe('created');
      expect(result.value?.results[0].qualifikationenMapped).toBe(1);
      expect(mockStammPersonRepo.save).toHaveBeenCalled();
    });

    it('should skip existing person with skip strategy', async () => {
      // Given: Person existiert bereits, Strategy ist 'skip'
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann'],
        importedBy: testUserId,
        duplicateStrategy: 'skip',
      }).value!;

      const hiorgPerson = createHiOrgPerson();
      const existingPerson = createStammPerson();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok({ accessToken: 'valid-token', wasRefreshed: false }));
      mockHiorg.fetchPersons.mockResolvedValue(Result.ok([hiorgPerson]));
      mockMappingRepo.findByExternalSource.mockResolvedValue(Result.ok([]));
      mockStammPersonRepo.findByExternalId.mockResolvedValue(Result.ok(existingPerson));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.skipped).toBe(1);
      expect(result.value?.results[0].status).toBe('skipped');
      expect(mockStammPersonRepo.save).not.toHaveBeenCalled();
    });

    it('should update existing person with update strategy', async () => {
      // Given: Person existiert bereits, Strategy ist 'update'
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann'],
        importedBy: testUserId,
        duplicateStrategy: 'update',
      }).value!;

      const hiorgPerson = createHiOrgPerson({ vorname: 'Maximilian' });
      const existingPerson = createStammPerson();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok({ accessToken: 'valid-token', wasRefreshed: false }));
      mockHiorg.fetchPersons.mockResolvedValue(Result.ok([hiorgPerson]));
      mockMappingRepo.findByExternalSource.mockResolvedValue(Result.ok([]));
      mockStammPersonRepo.findByExternalId.mockResolvedValue(Result.ok(existingPerson));
      mockStammPersonRepo.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.updated).toBe(1);
      expect(result.value?.results[0].status).toBe('updated');
      expect(mockStammPersonRepo.save).toHaveBeenCalled();
    });

    it('should fail when access token is not available', async () => {
      // Given: Token Refresh schlägt fehl
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann'],
        importedBy: testUserId,
      }).value!;

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.fail(`[${INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND}] Keine Credentials`));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND);
    });

    it('should fail when HiOrg fetch fails', async () => {
      // Given: HiOrg-Abfrage schlägt fehl
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann'],
        importedBy: testUserId,
      }).value!;

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok({ accessToken: 'valid-token', wasRefreshed: false }));
      mockHiorg.fetchPersons.mockResolvedValue(Result.fail('API Error'));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('API Error');
    });

    it('should fail when no selected persons found in HiOrg', async () => {
      // Given: Keine der ausgewählten Personen in HiOrg vorhanden
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann'],
        importedBy: testUserId,
      }).value!;

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok({ accessToken: 'valid-token', wasRefreshed: false }));
      mockHiorg.fetchPersons.mockResolvedValue(Result.ok([createHiOrgPerson({ username: 'other.person' })]));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.IMPORT_FAILED);
    });

    it('should skip person when personalnummer conflict exists', async () => {
      // Given: Personalnummer existiert bereits für andere Person
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann'],
        importedBy: testUserId,
      }).value!;

      const hiorgPerson = createHiOrgPerson();
      const conflictingPerson = createStammPerson({ id: 'other-person-id', personalnummer: '12345' });

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok({ accessToken: 'valid-token', wasRefreshed: false }));
      mockHiorg.fetchPersons.mockResolvedValue(Result.ok([hiorgPerson]));
      mockMappingRepo.findByExternalSource.mockResolvedValue(Result.ok([]));
      mockStammPersonRepo.findByExternalId.mockResolvedValue(Result.ok(undefined));
      mockStammPersonRepo.findByPersonalnummer.mockResolvedValue(Result.ok(conflictingPerson));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.skipped).toBe(1);
      expect(result.value?.results[0].error).toContain('Personalnummer');
    });

    it('should map qualifications using short name as fallback', async () => {
      // Given: Mapping existiert nur für Kurzname
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann'],
        importedBy: testUserId,
      }).value!;

      const hiorgPerson = createHiOrgPerson({
        qualifikationen: [{ name: 'Rettungssanitäter (mit Zusatz)', name_kurz: 'RS' }],
      });

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok({ accessToken: 'valid-token', wasRefreshed: false }));
      mockHiorg.fetchPersons.mockResolvedValue(Result.ok([hiorgPerson]));
      // Mapping nur für Kurzname 'rs', nicht für vollen Namen
      mockMappingRepo.findByExternalSource.mockResolvedValue(Result.ok([createQualifikationMapping('rs', testQualifikationId)]));
      mockStammPersonRepo.findByExternalId.mockResolvedValue(Result.ok(undefined));
      mockStammPersonRepo.findByPersonalnummer.mockResolvedValue(Result.ok(undefined));
      mockStammPersonRepo.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.results[0].qualifikationenMapped).toBe(1);
    });

    it('should count unmapped qualifications', async () => {
      // Given: Qualifikation ohne Mapping
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann'],
        importedBy: testUserId,
      }).value!;

      const hiorgPerson = createHiOrgPerson({
        qualifikationen: [
          { name: 'Rettungssanitäter', name_kurz: 'RS' },
          { name: 'Sonderkurs XYZ', name_kurz: 'SKX' },
        ],
      });

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok({ accessToken: 'valid-token', wasRefreshed: false }));
      mockHiorg.fetchPersons.mockResolvedValue(Result.ok([hiorgPerson]));
      // Nur ein Mapping vorhanden
      mockMappingRepo.findByExternalSource.mockResolvedValue(Result.ok([createQualifikationMapping('rettungssanitäter', testQualifikationId)]));
      mockStammPersonRepo.findByExternalId.mockResolvedValue(Result.ok(undefined));
      mockStammPersonRepo.findByPersonalnummer.mockResolvedValue(Result.ok(undefined));
      mockStammPersonRepo.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.results[0].qualifikationenMapped).toBe(1);
      expect(result.value?.results[0].qualifikationenUnmapped).toBe(1);
    });

    it('should handle multiple persons with mixed results', async () => {
      // Given: Mehrere Personen mit unterschiedlichen Ergebnissen
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann', 'erika.musterfrau', 'unknown.person'],
        importedBy: testUserId,
      }).value!;

      const hiorgPersons: HiOrgPersonDto[] = [
        createHiOrgPerson({ username: 'max.mustermann' }),
        createHiOrgPerson({ username: 'erika.musterfrau', mitgliednr: '67890', vorname: 'Erika', nachname: 'Musterfrau' }),
      ];
      const existingMax = createStammPerson();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok({ accessToken: 'valid-token', wasRefreshed: false }));
      mockHiorg.fetchPersons.mockResolvedValue(Result.ok(hiorgPersons));
      mockMappingRepo.findByExternalSource.mockResolvedValue(Result.ok([]));

      // Max existiert, Erika ist neu
      mockStammPersonRepo.findByExternalId.mockImplementation(async (_source: string, externalId: string) => {
        if (externalId === 'max.mustermann') return Result.ok(existingMax);
        return Result.ok(undefined);
      });
      mockStammPersonRepo.findByPersonalnummer.mockResolvedValue(Result.ok(undefined));
      mockStammPersonRepo.save.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.totalProcessed).toBe(2); // unknown.person nicht in HiOrg
      expect(result.value?.skipped).toBe(1); // Max
      expect(result.value?.created).toBe(1); // Erika
    });

    it('should fail when person has no mitgliednr (personalnummer required)', async () => {
      // Given: Person ohne Mitgliedsnummer (Personalnummer ist Pflichtfeld)
      const command = ImportSelectedPersonsCommand.create({
        usernames: ['max.mustermann'],
        importedBy: testUserId,
      }).value!;

      const hiorgPerson = createHiOrgPerson({ mitgliednr: undefined });

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok({ accessToken: 'valid-token', wasRefreshed: false }));
      mockHiorg.fetchPersons.mockResolvedValue(Result.ok([hiorgPerson]));
      mockMappingRepo.findByExternalSource.mockResolvedValue(Result.ok([]));
      mockStammPersonRepo.findByExternalId.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.execute(command);

      // Then: Import erfolgreich, aber Person als "failed" markiert
      expect(result.isSuccess).toBe(true);
      expect(result.value?.failed).toBe(1);
      expect(result.value?.created).toBe(0);
      expect(result.value?.results[0].status).toBe('failed');
      expect(result.value?.results[0].error).toContain('Personalnummer');
      // Save sollte nicht aufgerufen worden sein
      expect(mockStammPersonRepo.save).not.toHaveBeenCalled();
    });
  });
});
