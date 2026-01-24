/**
 * Unit Tests für PreviewHiOrgPersonsHandler.
 *
 * Testet das Laden von Personen-Vorschau aus HiOrg-Server für Import.
 *
 * @module application/integrations/queries/preview-hiorg-persons/__tests__
 */

import { Result } from '@domain/common/result';
import { IntegrationCredential, INTEGRATION_TYPES, INTEGRATION_ERROR_CODES } from '@domain/integrations';
import type { IHiOrgServerPort, HiOrgPersonDto } from '@domain/ports/i-hiorg-server.port';
import type { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { IQualifikationMappingRepository } from '@domain/integrations/repositories/i-qualifikation-mapping.repository';
import { PreviewHiOrgPersonsHandler } from '../preview-hiorg-persons.handler';
import { PreviewHiOrgPersonsQuery } from '../preview-hiorg-persons.query';
import type { HiOrgTokenRefreshService, ValidTokenResult } from '../../../services/hiorg-token-refresh.service';

describe('PreviewHiOrgPersonsHandler', () => {
  let handler: PreviewHiOrgPersonsHandler;
  let mockHiOrgPort: jest.Mocked<IHiOrgServerPort>;
  let mockStammPersonRepo: jest.Mocked<IStammPersonRepository>;
  let mockQualifikationRepo: jest.Mocked<IQualifikationRepository>;
  let mockMappingRepo: jest.Mocked<IQualifikationMappingRepository>;
  let mockTokenRefresh: jest.Mocked<HiOrgTokenRefreshService>;

  /**
   * Test-Fixture: Gültige Credentials für HiOrg-Server.
   */
  const createValidCredential = (): IntegrationCredential => {
    return IntegrationCredential.fromPersistence({
      id: 'test-credential-id',
      type: INTEGRATION_TYPES.HIORG_SERVER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      encryptedAccessToken: 'encrypted-access-token',
      encryptedRefreshToken: 'encrypted-refresh-token',
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    });
  };

  /**
   * Test-Fixture: ValidTokenResult vom Token-Refresh-Service.
   */
  const createValidTokenResult = (): ValidTokenResult => ({
    accessToken: 'decrypted-access-token',
    credential: createValidCredential(),
    wasRefreshed: false,
  });

  /**
   * Test-Fixture: Personen-Liste aus HiOrg-Server.
   */
  const createPersonList = (): HiOrgPersonDto[] => [
    {
      username: 'jdoe',
      mitgliednr: '12345',
      vorname: 'John',
      nachname: 'Doe',
      email: 'john.doe@example.com',
      handy: '+49123456789',
      gruppen_namen: ['Gruppe A', 'Gruppe B'],
      qualifikationen: [
        { position: 1, liste_id: 1, name: 'Rettungssanitaeter', name_kurz: 'RS' },
        { position: 2, liste_id: 2, name: 'Notfallsanitaeter', name_kurz: 'NotSan' },
      ],
      ausbildungen: [{ id: 'a1', bezeichnung: 'Erste Hilfe', datum: '2024-01-15' }],
    },
    {
      username: 'mmueller',
      vorname: 'Maria',
      nachname: 'Mueller',
      gruppen_namen: ['Gruppe A'],
      qualifikationen: [],
      ausbildungen: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockHiOrgPort = {
      testConnection: jest.fn(),
      fetchPersons: jest.fn(),
    };

    mockStammPersonRepo = {
      findByExternalId: jest.fn(),
      findByPersonalnummer: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      search: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockQualifikationRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockMappingRepo = {
      findByExternalSource: jest.fn(),
      findByExternalName: jest.fn(),
      findByExternalNames: jest.fn(),
      findById: jest.fn(),
      findByQualifikationId: jest.fn(),
      findUnmapped: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      delete: jest.fn(),
      deleteBySource: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<IQualifikationMappingRepository>;

    mockTokenRefresh = {
      getValidAccessToken: jest.fn(),
    } as unknown as jest.Mocked<HiOrgTokenRefreshService>;

    // Default: Keine Duplikate vorhanden
    mockStammPersonRepo.findByExternalId.mockResolvedValue(Result.ok(undefined));

    // Default: Leere Mappings und Qualifikationen
    mockMappingRepo.findByExternalSource.mockResolvedValue(Result.ok([]));
    mockQualifikationRepo.findAll.mockResolvedValue(Result.ok([]));

    handler = new PreviewHiOrgPersonsHandler(mockHiOrgPort, mockStammPersonRepo, mockQualifikationRepo, mockMappingRepo, mockTokenRefresh);
  });

  describe('execute', () => {
    it('should fail when token refresh fails', async () => {
      // Given: Token-Refresh schlägt fehl
      const query = PreviewHiOrgPersonsQuery.create({ activeOnly: true }).value!;
      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.fail(`${INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND}: Keine Credentials`));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND);
      expect(mockHiOrgPort.fetchPersons).not.toHaveBeenCalled();
    });

    it('should propagate fetchPersons errors', async () => {
      // Given: fetchPersons schlägt fehl
      const query = PreviewHiOrgPersonsQuery.create({ activeOnly: true }).value!;
      const tokenResult = createValidTokenResult();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.fetchPersons.mockResolvedValue(Result.fail('API Error: 500 Internal Server Error'));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('API Error');
    });

    it('should call fetchPersons with status=["aktiv"] when activeOnly=true', async () => {
      // Given: Query mit activeOnly=true
      const query = PreviewHiOrgPersonsQuery.create({ activeOnly: true }).value!;
      const tokenResult = createValidTokenResult();
      const persons = createPersonList();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.fetchPersons.mockResolvedValue(Result.ok(persons));

      // When
      await handler.execute(query);

      // Then
      expect(mockHiOrgPort.fetchPersons).toHaveBeenCalledWith('decrypted-access-token', { status: ['aktiv'] });
    });

    it('should call fetchPersons with status=undefined when activeOnly=false', async () => {
      // Given: Query mit activeOnly=false
      const query = PreviewHiOrgPersonsQuery.create({ activeOnly: false }).value!;
      const tokenResult = createValidTokenResult();
      const persons = createPersonList();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.fetchPersons.mockResolvedValue(Result.ok(persons));

      // When
      await handler.execute(query);

      // Then
      expect(mockHiOrgPort.fetchPersons).toHaveBeenCalledWith('decrypted-access-token', { status: undefined });
    });

    it('should map persons to preview DTOs correctly', async () => {
      // Given: Personen aus HiOrg-Server
      const query = PreviewHiOrgPersonsQuery.create({ activeOnly: true }).value!;
      const tokenResult = createValidTokenResult();
      const persons = createPersonList();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.fetchPersons.mockResolvedValue(Result.ok(persons));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.totalCount).toBe(2);
      expect(result.value!.persons).toHaveLength(2);

      // Erste Person pruefen (mit Qualifikationen und Ausbildungen)
      expect(result.value!.persons[0]).toMatchObject({
        username: 'jdoe',
        mitgliednr: '12345',
        vorname: 'John',
        nachname: 'Doe',
        qualifikationenCount: 2,
        ausbildungenCount: 1,
        isDuplicate: false,
        existingStammPersonId: undefined,
      });
      // Qualifikationen-Array prüfen
      expect(result.value!.persons[0].qualifikationen).toHaveLength(2);

      // Zweite Person pruefen (ohne Qualifikationen und Ausbildungen)
      expect(result.value!.persons[1]).toMatchObject({
        username: 'mmueller',
        mitgliednr: undefined,
        vorname: 'Maria',
        nachname: 'Mueller',
        qualifikationenCount: 0,
        ausbildungenCount: 0,
        isDuplicate: false,
        existingStammPersonId: undefined,
      });
      expect(result.value!.persons[1].qualifikationen).toHaveLength(0);
    });

    it('should return empty array when no persons found', async () => {
      // Given: Keine Personen gefunden
      const query = PreviewHiOrgPersonsQuery.create({ activeOnly: true }).value!;
      const tokenResult = createValidTokenResult();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.fetchPersons.mockResolvedValue(Result.ok([]));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.totalCount).toBe(0);
      expect(result.value!.persons).toEqual([]);
    });

    it('should fail when tokenResult value is undefined', async () => {
      // Given: Token-Refresh gibt Success aber undefined value zurueck
      const query = PreviewHiOrgPersonsQuery.create({ activeOnly: true }).value!;
      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(undefined as unknown as ValidTokenResult));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Access Token');
    });

    it('should handle undefined personsResult value as empty array', async () => {
      // Given: fetchPersons gibt Success aber undefined value zurueck
      const query = PreviewHiOrgPersonsQuery.create({ activeOnly: true }).value!;
      const tokenResult = createValidTokenResult();

      mockTokenRefresh.getValidAccessToken.mockResolvedValue(Result.ok(tokenResult));
      mockHiOrgPort.fetchPersons.mockResolvedValue(Result.ok(undefined as unknown as HiOrgPersonDto[]));

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value!.totalCount).toBe(0);
      expect(result.value!.persons).toEqual([]);
    });
  });
});
