import { api } from '@/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { logger } from '@/shared/lib/logger';
import { toast } from 'sonner';
import type { ResponseError, AdminSecurityControllerGetStatusVAlpha200Response, AdminSecurityControllerMigrateToSecureVAlpha201Response, MigrateToSecureModeRequestDto } from '@/shared';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Query Keys fuer Security-Management
 */
const SECURITY_QUERY_KEYS = {
  all: () => [...ADMIN_QUERY_KEYS.all, 'security'] as const,
  status: () => [...SECURITY_QUERY_KEYS.all(), 'status'] as const,
};

/**
 * Hook fuer das Abrufen des Security-Status
 *
 * Laed den aktuellen Security-Mode des Servers.
 *
 * **Story 4.6 - AC1:**
 * - Zeigt an ob der Server im INSECURE Mode laeuft
 * - Wird fuer InsecureModeBanner verwendet
 *
 * @returns Query-Result mit Security-Status
 */
export const useSecurityStatus = () => {
  return useQuery<AdminSecurityControllerGetStatusVAlpha200Response, ResponseError>({
    queryKey: SECURITY_QUERY_KEYS.status(),
    queryFn: async () => {
      return await api.admin().adminSecurityControllerGetStatusVAlpha();
    },
    // Refetch alle 30 Sekunden um Aenderungen zu erkennen
    refetchInterval: 30000,
  });
};

/**
 * Hook fuer die Migration zu SECURE Mode
 *
 * Migriert den Server irreversibel von INSECURE zu SECURE Mode.
 * Erstellt ein initiales Access-Token das NUR in der Response sichtbar ist.
 *
 * **Story 4.6 - AC2:**
 * - Migriert Server zu SECURE Mode
 * - Erstellt initiales Token
 *
 * @returns Mutation-Result fuer Migration-Operation
 */
export const useMigrateToSecureMode = () => {
  const queryClient = useQueryClient();

  return useMutation<AdminSecurityControllerMigrateToSecureVAlpha201Response, ResponseError, MigrateToSecureModeRequestDto>({
    mutationFn: async (data: MigrateToSecureModeRequestDto) => {
      return await api.admin().adminSecurityControllerMigrateToSecureVAlpha({
        migrateToSecureModeRequestDto: {
          tokenName: data.tokenName,
        },
      });
    },
    onSuccess: async () => {
      // Kein Toast - Modal zeigt eigene Success-UI mit Token-Anzeige
      toast.success('Migration erfolgreich', {
        description: 'Der Server laeuft jetzt im SECURE Mode.',
      });

      // Invalidate Security-Status Query
      await queryClient.invalidateQueries({
        queryKey: SECURITY_QUERY_KEYS.status(),
      });

      // Invalidate Token-Liste da neues Token erstellt wurde
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.accessTokens.all(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Die Migration konnte nicht durchgefuehrt werden.', 'migrateToSecureMode');

      logger.error('Failed to migrate to secure mode', error);
      toast.error('Fehler bei der Migration', {
        description: message,
      });
    },
  });
};

/**
 * Hook fuer das Security-Management
 *
 * Convenience-Wrapper der die standalone Hooks als Objekt bereitstellt.
 *
 * @returns Objekt mit Query- und Mutation-Hooks
 */
export const useSecurityManagement = () => {
  return {
    useStatus: useSecurityStatus,
    useMigrate: useMigrateToSecureMode,
  };
};
