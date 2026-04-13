/**
 * Hook für Admin Default-Zeichen-Management.
 *
 * Kombiniert Queries (Laden der Defaults) mit Mutations (Setzen neuer Defaults)
 * für Fahrzeugtypen und Einheitentypen.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DefaultZeichenResponseDto, ZeichenDefinitionRequestDto } from '@bluelight-hub/shared/client';
import { type ResponseError, getApiErrorMessage } from '@/shared/api/errors';
import { logger } from '@/shared/lib/logger';
import { api } from '@/shared/api/api';
import { useDefaultZeichenFahrzeugtypen, useDefaultZeichenEinheitentypen } from '@/features/taktische-zeichen/api/use-default-zeichen';
import { TAKTISCHE_ZEICHEN_QUERY_KEYS } from '@/features/taktische-zeichen/api/queries';

/**
 * Hook für das Management von Default-Zeichen im Admin-Bereich.
 */
export const useAdminDefaultZeichenManagement = () => {
  const queryClient = useQueryClient();

  const fahrzeugtypenQuery = useDefaultZeichenFahrzeugtypen();
  const einheitentypenQuery = useDefaultZeichenEinheitentypen();

  const setFahrzeugtypDefaultMutation = useMutation<DefaultZeichenResponseDto, ResponseError, { fahrzeugtypId: string; zeichenDefinition: ZeichenDefinitionRequestDto }>({
    mutationFn: async ({ fahrzeugtypId, zeichenDefinition }) => {
      const response = await api.taktischeZeichen().taktischeZeichenControllerSetDefaultFahrzeugtypVAlpha({
        fahrzeugtypId,
        setzeDefaultZeichenDto: { zeichenDefinition },
      });
      return response.data;
    },
    onSuccess: async () => {
      toast.success('Default-Zeichen gesetzt', {
        description: 'Das Standard-Zeichen für den Fahrzeugtyp wurde aktualisiert.',
      });
      await queryClient.invalidateQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.defaults(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das Default-Zeichen konnte nicht gesetzt werden.', 'setFahrzeugtypDefault');
      logger.error('Failed to set fahrzeugtyp default zeichen', error);
      toast.error('Fehler', { description: message });
    },
  });

  const setEinheitentypDefaultMutation = useMutation<DefaultZeichenResponseDto, ResponseError, { einheitentyp: string; zeichenDefinition: ZeichenDefinitionRequestDto }>({
    mutationFn: async ({ einheitentyp, zeichenDefinition }) => {
      const response = await api.taktischeZeichen().taktischeZeichenControllerSetDefaultEinheitentypVAlpha({
        einheitentyp,
        setzeDefaultZeichenDto: { zeichenDefinition },
      });
      return response.data;
    },
    onSuccess: async () => {
      toast.success('Default-Zeichen gesetzt', {
        description: 'Das Standard-Zeichen für den Einheitentyp wurde aktualisiert.',
      });
      await queryClient.invalidateQueries({
        queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.defaults(),
      });
    },
    onError: async (error: ResponseError) => {
      const message = await getApiErrorMessage(error, 'Das Default-Zeichen konnte nicht gesetzt werden.', 'setEinheitentypDefault');
      logger.error('Failed to set einheitentyp default zeichen', error);
      toast.error('Fehler', { description: message });
    },
  });

  return {
    fahrzeugtypenDefaults: fahrzeugtypenQuery.data,
    einheitentypenDefaults: einheitentypenQuery.data,
    isLoadingFahrzeugtypen: fahrzeugtypenQuery.isLoading,
    isLoadingEinheitentypen: einheitentypenQuery.isLoading,
    errorFahrzeugtypen: fahrzeugtypenQuery.error,
    errorEinheitentypen: einheitentypenQuery.error,

    setFahrzeugtypDefault: setFahrzeugtypDefaultMutation.mutate,
    setEinheitentypDefault: setEinheitentypDefaultMutation.mutate,
    isSettingFahrzeugtyp: setFahrzeugtypDefaultMutation.isPending,
    isSettingEinheitentyp: setEinheitentypDefaultMutation.isPending,
    settingFahrzeugtypId: setFahrzeugtypDefaultMutation.isPending ? setFahrzeugtypDefaultMutation.variables?.fahrzeugtypId : undefined,
    settingEinheitentyp: setEinheitentypDefaultMutation.isPending ? setEinheitentypDefaultMutation.variables?.einheitentyp : undefined,
  };
};
