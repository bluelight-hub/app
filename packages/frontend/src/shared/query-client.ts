/**
 * Re-export des QueryClients aus dem Provider.
 *
 * Ermöglicht den direkten Import des queryClient für imperative
 * Operationen wie invalidateQueries außerhalb von React-Komponenten.
 *
 * @module shared/query-client
 */

export { queryClient } from '@/provider/query-client.provider';
