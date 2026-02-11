/**
 * Erinnerungen API Module
 *
 * Zentrale Exporte für alle Erinnerungs-bezogenen API-Hooks und Query Keys.
 */

// Query Hooks und Keys
export {
  ERINNERUNG_QUERY_KEYS,
  calculateRetryDelay,
  useErinnerungenByEinsatz,
  useErinnerungStatistik,
  usePersonStatistik,
  useZeitverlaufStatistik,
  useEskalationsAnalyse,
  useReaktionszeitStatistik,
  useFuehrungsrhythmusStatistik,
  useEinsatzVergleich,
  type UseErinnerungenByEinsatzOptions,
} from './queries';

// ETB History Hook (Story 5.7)
export { ERINNERUNG_ETB_HISTORY_QUERY_KEYS, useErinnerungEtbHistory, type UseErinnerungEtbHistoryOptions } from './use-erinnerung-etb-history';

// Mutation Hooks
export {
  useCreateErinnerung,
  useUpdateErinnerung,
  useDeleteErinnerung,
  useTriggerErinnerung,
  useAcknowledgeErinnerung,
  useSnoozeErinnerung,
  useMarkErledigtErinnerung,
  useAssignErinnerung,
  useStopRecurringSeries,
  type CreateErinnerungVariables,
  type UpdateErinnerungVariables,
  type DeleteErinnerungVariables,
  type TriggerErinnerungVariables,
  type AcknowledgeErinnerungVariables,
  type SnoozeErinnerungVariables,
  type MarkErledigtErinnerungVariables,
  type AssignErinnerungVariables,
  type StopRecurringSeriesVariables,
  type SnoozeMinutes,
} from './mutations';

// Export Hook (Story 9.6)
export { useExportStatistik, type ExportFormat } from './use-export-statistik';

// Rohdaten Export Hook (Story 9.10)
export { useExportRohdaten, type RohdatenExportFormat } from './use-export-rohdaten';
