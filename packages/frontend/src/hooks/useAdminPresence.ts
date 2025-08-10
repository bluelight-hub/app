import { useQuery, useQueryClient } from '@tanstack/react-query';
import { verifyAdmin } from '@/services/adminApi';
import { QUERY_KEYS } from '@/queryKeys';

/**
 * Hook zur Überprüfung der Admin-Präsenz
 *
 * Nutzt React Query für effizientes Caching und Refetching des Admin-Status
 *
 * @returns Ein Objekt mit folgenden Eigenschaften:
 * @returns {boolean | undefined} hasAdmin - Gibt an, ob ein Admin-Account existiert. Undefined während des Ladens.
 * @returns {boolean} loading - Gibt an, ob die Admin-Überprüfung gerade läuft
 * @returns {() => Promise<void>} refresh - Funktion zum manuellen Aktualisieren des Admin-Status
 */
export function useAdminPresence(): {
  hasAdmin: boolean | undefined;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const queryClient = useQueryClient();

  const {
    data: hasAdmin,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.auth.adminPresence,
    queryFn: verifyAdmin,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten (frühere cacheTime)
    retry: 1,
  });

  /**
   * Erzwingt eine Aktualisierung des Admin-Status
   */
  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.adminPresence });
    await refetch();
  };

  return {
    hasAdmin,
    loading,
    refresh,
  };
}
