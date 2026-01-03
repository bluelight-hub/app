import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { HiOrgCredentialsResponseDto, HiOrgConnectionInfoDto, HiOrgPersonsPreviewResponseDto, SaveHiOrgCredentialsDto } from '@bluelight-hub/shared/client';
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
 * Response-Wrapper Typ für API-Responses.
 */
interface WrappedResponse<T> {
  data: T;
  meta?: unknown;
}

/**
 * Options für den useAdminHiOrgIntegration Hook.
 */
interface UseAdminHiOrgIntegrationOptions {
  /** Filter für aktive Personen (default: undefined = alle) */
  activeOnly?: boolean;
  /** Ob die Personen-Vorschau geladen werden soll (default: false) */
  enablePreview?: boolean;
}

/**
 * Hook für Admin HiOrg-Server Integration Management.
 *
 * Bietet Operationen für:
 * - Credentials abfragen/speichern
 * - Verbindung testen
 * - Personen-Vorschau laden (nur wenn enablePreview=true)
 *
 * @param options - Filter und Steuerungsoptionen
 */
export const useAdminHiOrgIntegration = (options?: UseAdminHiOrgIntegrationOptions) => {
  const { activeOnly, enablePreview = false } = options ?? {};
  const queryClient = useQueryClient();

  // Query: Credentials abfragen (ohne Token!)
  // Returns immer eine Response mit isOAuthConfigured, auch wenn keine Credentials existieren
  const credentialsQuery = useQuery<HiOrgCredentialsResponseDto, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.credentials(),
    queryFn: async () => {
      const response = await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerGetCredentialsVAlpha();
      return (response as unknown as WrappedResponse<HiOrgCredentialsResponseDto>).data;
    },
    retry: 3,
    staleTime: 60_000, // 1 Minute
  });

  // Query: Personen-Vorschau laden (nur wenn explizit aktiviert)
  const previewQuery = useQuery<HiOrgPersonsPreviewResponseDto | null, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.preview({ activeOnly }),
    queryFn: async () => {
      const response = await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerPreviewPersonsVAlpha({
        activeOnly,
      });
      return (response as unknown as WrappedResponse<HiOrgPersonsPreviewResponseDto>).data;
    },
    // Nur ausführen wenn Credentials vorhanden sind (Token oder OAuth) UND Preview explizit aktiviert
    enabled: (credentialsQuery.data?.hasToken === true || credentialsQuery.data?.hasOAuthTokens === true) && enablePreview,
    retry: 2,
    staleTime: 30_000, // 30 Sekunden
  });

  // Mutation: Credentials speichern
  const saveCredentialsMutation = useMutation<HiOrgCredentialsResponseDto, ResponseError, SaveHiOrgCredentialsDto>({
    mutationFn: async (data: SaveHiOrgCredentialsDto) => {
      const response = await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerSaveCredentialsVAlpha({
        saveHiOrgCredentialsDto: data,
      });
      return (response as unknown as WrappedResponse<HiOrgCredentialsResponseDto>).data;
    },
    onSuccess: async () => {
      toast.success('Credentials gespeichert', {
        description: 'Die HiOrg-Server Zugangsdaten wurden erfolgreich gespeichert.',
      });
      // Invalidiere alle HiOrg-Queries
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.integrations.hiorg.all(),
        exact: false,
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Die Credentials konnten nicht gespeichert werden.', 'saveHiOrgCredentials');
      logger.error('Failed to save HiOrg credentials', error);
      toast.error('Fehler', { description: message });
    },
  });

  // Mutation: Verbindung testen
  const testConnectionMutation = useMutation<HiOrgConnectionInfoDto, ResponseError, void>({
    mutationFn: async () => {
      const response = await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerTestConnectionVAlpha();
      return (response as unknown as WrappedResponse<HiOrgConnectionInfoDto>).data;
    },
    onSuccess: async (data) => {
      toast.success('Verbindung erfolgreich', {
        description: `Verbunden mit ${data.organisationName}`,
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
  const initiateOAuthMutation = useMutation<{ authorizationUrl: string }, ResponseError, void>({
    mutationFn: async () => {
      const response = await api.adminIntegrationsHiorg().adminHiOrgIntegrationControllerInitiateOAuthFlowVAlpha();
      return (response as unknown as WrappedResponse<{ authorizationUrl: string }>).data;
    },
    onSuccess: async (data) => {
      // Öffne Authorization URL im externen Browser (Tauri: Systembrowser, Browser: neues Fenster)
      try {
        await openExternalUrl(data.authorizationUrl);
        toast.info('Browser geöffnet', {
          description: 'Bitte melde dich im Browser bei HiOrg-Server an.',
        });
      } catch (error) {
        logger.error('Failed to open OAuth URL', error);
        toast.error('Fehler', {
          description: `Der Browser konnte nicht geöffnet werden. URL: ${data.authorizationUrl}`,
        });
      }
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'OAuth Flow konnte nicht gestartet werden.', 'initiateOAuth');
      logger.error('Failed to initiate OAuth flow', error);
      toast.error('Fehler', { description: message });
    },
  });

  return {
    // Queries
    credentials: credentialsQuery.data,
    isLoadingCredentials: credentialsQuery.isLoading,
    credentialsError: credentialsQuery.error,

    preview: previewQuery.data,
    isLoadingPreview: previewQuery.isLoading,
    previewError: previewQuery.error,

    // Mutations
    saveCredentials: saveCredentialsMutation.mutate,
    saveCredentialsAsync: saveCredentialsMutation.mutateAsync,
    isSavingCredentials: saveCredentialsMutation.isPending,

    testConnection: testConnectionMutation.mutate,
    testConnectionAsync: testConnectionMutation.mutateAsync,
    isTestingConnection: testConnectionMutation.isPending,
    connectionInfo: testConnectionMutation.data,

    // OAuth
    initiateOAuth: initiateOAuthMutation.mutate,
    isInitiatingOAuth: initiateOAuthMutation.isPending,

    // Refetch functions
    refetchCredentials: credentialsQuery.refetch,
    refetchPreview: previewQuery.refetch,
  };
};
