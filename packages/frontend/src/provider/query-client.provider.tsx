import { handleQueryError } from '@/shared/lib/errors/error-handler';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Gemeinsame Retry-Strategie für alle Queries.
 *
 * Auth-Endpoints werden nie erneut versucht. Für andere 401-Fehler
 * ist genau ein Retry erlaubt, damit ein möglicher Token-Refresh greifen kann.
 */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const response = (error as { response?: { status?: number; url?: string } })?.response;
  const status = response?.status;
  const isAuthQuery = !!response?.url && /\/auth(\/|$)/i.test(response.url);

  if (isAuthQuery) {
    return false;
  }

  if (status === 401) {
    return failureCount < 1;
  }

  if (status && status >= 400 && status < 500) {
    return false;
  }

  if (status === 503) {
    return false;
  }

  return failureCount < 2;
}

/**
 * Erstellt den globalen QueryClient der Anwendung.
 *
 * Der Client bündelt:
 * - globales Error-Handling
 * - 401-Retry nach möglichem Token-Refresh
 * - einheitliche Defaults für Queries und Mutations
 */
export function createAppQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: async (error, query) => {
        // Zero-Toast-Policy (Architecture §J, UX-DR21): Queries mit
        // `meta: { silentError: true }` unterdrücken den globalen Toast.
        // 401-Token-Refresh bleibt davon unberührt, damit Session-Recovery
        // auch bei stumm-geschalteten Queries greift.
        const silent = query.meta?.silentError === true;
        if (!silent) {
          await handleQueryError(error, query);
        }

        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          setTimeout(() => {
            void queryClient.invalidateQueries({ queryKey: query.queryKey });
          }, 100);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: async (error) => {
        await handleQueryError(error);
      },
    }),
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        throwOnError: false,
      },
      mutations: {
        retry: false,
        throwOnError: false,
      },
    },
  });

  return queryClient;
}

export const queryClient = createAppQueryClient();

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
