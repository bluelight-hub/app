import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * QueryClient-Instanz für die gesamte Anwendung.
 *
 * Konfiguriert mit sinnvollen Defaults:
 * - Retry: 3 Versuche mit exponentiellem Backoff
 * - StaleTime: 5 Minuten (Daten gelten als "frisch")
 * - GcTime: 10 Minuten (Cache-Lifetime)
 * - RefetchOnWindowFocus: Deaktiviert für bessere UX
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 Minuten
      gcTime: 10 * 60 * 1000, // 10 Minuten (früher: cacheTime)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Provider-Komponente für TanStack Query.
 *
 * Stellt den QueryClient für alle Child-Komponenten zur Verfügung,
 * die `useQuery`, `useMutation` oder andere TanStack Query Hooks verwenden.
 *
 * Muss in der App-Root eingebunden werden, damit Queries funktionieren.
 *
 * @param props - Die Props für den QueryProvider
 * @param props.children - Die React-Komponenten, die vom Provider umschlossen werden
 * @returns Die gewrappten Komponenten mit QueryClient-Kontext
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
