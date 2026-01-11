import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  AdminHiOrgIntegrationControllerAutoMatchQualifikationenVAlpha200Response,
  AdminHiOrgIntegrationControllerGetCredentialsVAlpha200Response,
  AdminHiOrgIntegrationControllerGetQualifikationMappingsVAlpha200Response,
  AdminHiOrgIntegrationControllerInitiateOAuthFlowVAlpha200Response,
  AdminHiOrgIntegrationControllerPreviewPersonsVAlpha200Response,
  AdminHiOrgIntegrationControllerTestConnectionVAlpha200Response,
  BatchSaveQualifikationMappingsResponseDto,
  ImportPersonsResponseDto,
} from '@/shared';
import { type ResponseError, getApiErrorMessage } from '@/shared/api/errors';
import { logger } from '@/shared/lib/logger';
import { api } from '@/shared/api/api';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Öffnet eine externe URL im Systembrowser.
 * In Tauri wird die Shell API verwendet, im Browser window.open().
 */
async function openExternalUrl(url: string): Promise<void> {
  const { isTauri } = await import('@tauri-apps/api/core');

  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  } else {
    window.open(url, '_blank', 'width=600,height=700');
  }
}

/**
 * Options für den useAdminHiOrgIntegration Hook.
 */
interface UseAdminHiOrgIntegrationOptions {
  /** Filter für aktive Personen (default: undefined = alle) */
  activeOnly?: boolean;
  /** Ob die Personen-Vorschau geladen werden soll (default: false) */
  enablePreview?: boolean;
  /** Ob die Qualifikation-Mappings geladen werden sollen (default: false) */
  enableMappings?: boolean;
}

/**
 * Import Request Parameter.
 */
interface ImportPersonsParams {
  usernames: string[];
  duplicateStrategy?: 'skip' | 'update';
}

/**
 * Batch-Save Mapping Parameter.
 */
export interface BatchMappingItem {
  /** Externer Qualifikations-Name aus HiOrg */
  externalName: string;
  /** Qualifikation-ID zum Mappen (null = ignorieren) */
  qualifikationId: string | null;
}

/**
 * Hook für Admin HiOrg-Server Integration Management.
 *
 * Bietet Operationen für:
 * - Credentials abfragen/speichern
 * - Verbindung testen
 * - Personen-Vorschau laden (nur wenn enablePreview=true)
 * - Qualifikation-Mappings verwalten (nur wenn enableMappings=true)
 * - Personen importieren
 *
 * @param options - Filter und Steuerungsoptionen
 */
export const useAdminHiOrgIntegration = (options?: UseAdminHiOrgIntegrationOptions) => {
  const { activeOnly, enablePreview = false, enableMappings = false } = options ?? {};
  const queryClient = useQueryClient();

  // Query: Credentials abfragen (ohne Token!)
  // Returns immer eine Response mit isOAuthConfigured, auch wenn keine Credentials existieren
  const credentialsQuery = useQuery<AdminHiOrgIntegrationControllerGetCredentialsVAlpha200Response, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.credentials(),
    queryFn: async () => {
      return await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerGetCredentialsVAlpha();
    },
    retry: 3,
    staleTime: 60_000, // 1 Minute
  });

  // Query: Personen-Vorschau laden (nur wenn explizit aktiviert)
  const previewQuery = useQuery<AdminHiOrgIntegrationControllerPreviewPersonsVAlpha200Response | null, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.preview({ activeOnly }),
    queryFn: async () => {
      return await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerPreviewPersonsVAlpha({
        activeOnly,
      });
    },
    // Nur ausführen wenn Credentials vorhanden sind (Token oder OAuth) UND Preview explizit aktiviert
    enabled: (credentialsQuery.data?.data.hasToken === true || credentialsQuery.data?.data.hasOAuthTokens === true) && enablePreview,
    retry: 2,
    staleTime: 30_000, // 30 Sekunden
  });

  // Mutation: Verbindung testen
  const testConnectionMutation = useMutation<AdminHiOrgIntegrationControllerTestConnectionVAlpha200Response, ResponseError, void>({
    mutationFn: async () => {
      return await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerTestConnectionVAlpha();
    },
    onSuccess: async (response) => {
      toast.success('Verbindung erfolgreich', {
        description: `Verbunden mit ${response.data.organisationName}`,
      });
      // Credentials-Query invalidieren um lastTestedAt zu aktualisieren
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.credentials(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Die Verbindung konnte nicht hergestellt werden.', 'testHiOrgConnection');
      logger.error('HiOrg connection test failed', error);
      toast.error('Verbindungstest fehlgeschlagen', { description: message });
    },
  });

  // Mutation: OAuth Flow initiieren
  const initiateOAuthMutation = useMutation<AdminHiOrgIntegrationControllerInitiateOAuthFlowVAlpha200Response, ResponseError, void>({
    mutationFn: async () => {
      return await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerInitiateOAuthFlowVAlpha();
    },
    onSuccess: async (response) => {
      // Öffne Authorization URL im externen Browser (Tauri: Systembrowser, Browser: neues Fenster)
      try {
        await openExternalUrl(response.data.authorizationUrl);
        toast.info('Browser geöffnet', {
          description: 'Bitte melde dich im Browser bei HiOrg-Server an.',
        });
      } catch (error) {
        logger.error('Failed to open OAuth URL', error);
        toast.error('Fehler', {
          description: `Der Browser konnte nicht geöffnet werden. URL: ${response.data.authorizationUrl}`,
        });
      }
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'OAuth Flow konnte nicht gestartet werden.', 'initiateOAuth');
      logger.error('Failed to initiate OAuth flow', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Query: Qualifikation-Mappings laden (nur wenn explizit aktiviert)
  const mappingsQuery = useQuery<AdminHiOrgIntegrationControllerGetQualifikationMappingsVAlpha200Response | null, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.qualifikationMappings(),
    queryFn: async () => {
      return await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerGetQualifikationMappingsVAlpha();
    },
    enabled: (credentialsQuery.data?.data.hasToken === true || credentialsQuery.data?.data.hasOAuthTokens === true) && enableMappings,
    retry: 2,
    staleTime: 60_000, // 1 Minute
  });

  // Mutation: Personen importieren
  const importPersonsMutation = useMutation<{ data: ImportPersonsResponseDto }, ResponseError, ImportPersonsParams>({
    mutationFn: async (params) => {
      return await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerImportPersonsVAlpha({
        importPersonsRequestDto: {
          usernames: params.usernames,
          duplicateStrategy: params.duplicateStrategy,
        },
      });
    },
    onSuccess: async (response) => {
      const { created, updated, skipped, failed } = response.data;
      const description = `${created} erstellt, ${updated} aktualisiert, ${skipped} übersprungen, ${failed} fehlgeschlagen`;

      // Toast-Typ basierend auf Ergebnis: nur grün wenn keine Fehler/Warnings
      if (failed > 0) {
        toast.error('Import mit Fehlern abgeschlossen', { description });
      } else if (skipped > 0) {
        toast.warning('Import abgeschlossen', { description });
      } else {
        toast.success('Import erfolgreich', { description });
      }
      // Stammpersonen-Query invalidieren um neue Daten zu laden
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all(),
      });
      // Preview invalidieren um isDuplicate-Status zu aktualisieren
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.preview(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Der Import konnte nicht durchgeführt werden.', 'importPersons');
      logger.error('HiOrg import failed', error);
      toast.error('Import fehlgeschlagen', { description: message });
    },
  });

  // Mutation: Qualifikation-Mapping speichern
  const saveQualifikationMappingMutation = useMutation<AdminHiOrgIntegrationControllerGetQualifikationMappingsVAlpha200Response, ResponseError, { mappingId: string; qualifikationId: string | null }>({
    mutationFn: async ({ mappingId, qualifikationId }) => {
      return await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerSaveQualifikationMappingVAlpha({
        saveQualifikationMappingRequestDto: { id: mappingId, qualifikationId: qualifikationId ?? undefined },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.qualifikationMappings(),
      });
      toast.success('Mapping gespeichert');
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das Mapping konnte nicht gespeichert werden.', 'saveQualifikationMapping');
      logger.error('Failed to save qualifikation mapping', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation: Auto-Match Qualifikationen
  const autoMatchMutation = useMutation<AdminHiOrgIntegrationControllerAutoMatchQualifikationenVAlpha200Response, ResponseError, { onlyUnmapped?: boolean }>({
    mutationFn: async ({ onlyUnmapped = true }) => {
      return await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerAutoMatchQualifikationenVAlpha({
        autoMatchRequestDto: { onlyUnmapped },
      });
    },
    onSuccess: async (response) => {
      const { totalMatched, totalUnmatched } = response.data;
      toast.success('Auto-Match abgeschlossen', {
        description: `${totalMatched} zugeordnet, ${totalUnmatched} nicht zuordenbar`,
      });
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.qualifikationMappings(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Auto-Match fehlgeschlagen.', 'autoMatch');
      logger.error('Auto-match failed', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation: Batch-Save Qualifikation-Mappings (für Inline-Mapping im Import-Dialog)
  const batchSaveMappingsMutation = useMutation<{ data: BatchSaveQualifikationMappingsResponseDto }, ResponseError, BatchMappingItem[]>({
    mutationFn: async (mappings) => {
      return await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerBatchSaveQualifikationMappingsVAlphaVAlpha({
        batchSaveQualifikationMappingsRequestDto: { mappings },
      });
    },
    onSuccess: async (response) => {
      const { saved, ignored } = response.data;
      toast.success('Mappings gespeichert', {
        description: `${saved} zugeordnet, ${ignored} ignoriert`,
      });
      // Preview invalidieren um Mapping-Status zu aktualisieren
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.preview(),
      });
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.qualifikationMappings(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Mappings konnten nicht gespeichert werden.', 'batchSaveMappings');
      logger.error('Batch save mappings failed', error);
      toast.error('Fehler', { description: message });
    },
  });

  return {
    // Queries - extrahiere .data für konsistente API nach aussen
    credentials: credentialsQuery.data?.data,
    isLoadingCredentials: credentialsQuery.isLoading,
    credentialsError: credentialsQuery.error,

    preview: previewQuery.data?.data,
    isLoadingPreview: previewQuery.isLoading,
    previewError: previewQuery.error,

    mappings: mappingsQuery.data?.data,
    isLoadingMappings: mappingsQuery.isLoading,
    mappingsError: mappingsQuery.error,

    // Mutations
    testConnection: testConnectionMutation.mutate,
    testConnectionAsync: testConnectionMutation.mutateAsync,
    isTestingConnection: testConnectionMutation.isPending,
    connectionInfo: testConnectionMutation.data?.data,

    // OAuth
    initiateOAuth: initiateOAuthMutation.mutate,
    isInitiatingOAuth: initiateOAuthMutation.isPending,

    // Import
    importPersons: importPersonsMutation.mutate,
    importPersonsAsync: importPersonsMutation.mutateAsync,
    isImporting: importPersonsMutation.isPending,
    importResult: importPersonsMutation.data?.data,
    clearImportResult: importPersonsMutation.reset,

    // Mapping Management
    saveQualifikationMapping: saveQualifikationMappingMutation.mutate,
    saveQualifikationMappingAsync: saveQualifikationMappingMutation.mutateAsync,
    isSavingMapping: saveQualifikationMappingMutation.isPending,

    // Auto-Match
    autoMatchQualifikationen: autoMatchMutation.mutate,
    autoMatchAsync: autoMatchMutation.mutateAsync,
    isAutoMatching: autoMatchMutation.isPending,
    autoMatchResult: autoMatchMutation.data?.data,

    // Batch-Save Mappings (für Inline-Mapping im Import-Dialog)
    batchSaveMappings: batchSaveMappingsMutation.mutate,
    batchSaveMappingsAsync: batchSaveMappingsMutation.mutateAsync,
    isSavingBatchMappings: batchSaveMappingsMutation.isPending,

    // Refetch functions
    refetchCredentials: credentialsQuery.refetch,
    refetchPreview: previewQuery.refetch,
    refetchMappings: mappingsQuery.refetch,
  };
};
