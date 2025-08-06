import { useQuery, useQueryClient } from '@tanstack/react-query';
import { verifyAdmin } from '@/services/adminApi';

/**
 * Hook zur Überprüfung der Admin-Präsenz
 *
 * Nutzt React Query für effizientes Caching und Refetching des Admin-Status
 *
 * @returns {Object} Admin-Status und Lade-/Refresh-Funktionen
 */
export function useAdminPresence() {
  const queryClient = useQueryClient();

  const {
    data: hasAdmin,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['admin-presence'],
    queryFn: verifyAdmin,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten (früheter cacheTime)
    retry: 1,
  });

  /**
   * Erzwingt eine Aktualisierung des Admin-Status
   */
  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['admin-presence'] });
    await refetch();
  };

  return {
    hasAdmin,
    loading,
    refresh,
  };
}
