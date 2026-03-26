/**
 * ETB Feature API
 *
 * Public API für ETB (Einsatztagebuch) Feature.
 *
 * Exportiert alle Hooks und Types für die Verwendung in Komponenten.
 */

// Query Keys
export { ETB_QUERY_KEYS } from './queries';

// Queries
export { useEtb } from './use-etb';
export type { UseEtbOptions } from './use-etb';

export { useEtbHistory } from './use-etb-history';
export type { UseEtbHistoryOptions } from './use-etb-history';

export { useEtbInfinite } from './use-etb-infinite';
export type { UseEtbInfiniteOptions } from './use-etb-infinite';

export { useTextbausteine } from './use-textbausteine';

// Mutations
export { useCreateEtbEntry } from './use-create-entry';
export type { CreateEtbEntryVariables } from './use-create-entry';

export { useCreateKorrektur } from './use-create-korrektur';
export type { CreateKorrekturVariables } from './use-create-korrektur';

export { useDeleteEtbEntry } from './use-delete-entry';
export type { DeleteEtbEntryVariables } from './use-delete-entry';

// Combined Operations
export { useEtbOperations } from './use-etb-operations';
export type { UseEtbOperationsOptions } from './use-etb-operations';

// Timeline (Story 5.5)
export { useErinnerungTimeline, ERINNERUNG_TIMELINE_QUERY_KEYS } from './use-erinnerung-timeline';
export type { UseErinnerungTimelineOptions } from './use-erinnerung-timeline';
