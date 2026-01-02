/**
 * API Layer Exports für Kräfte Feature
 */

// Query Keys
export { KRAEFTE_QUERY_KEYS, calculateRetryDelay } from './queries';

// Query Hooks
export { useTaktischeStaerke, type TaktischeStaerke } from './use-taktische-staerke';
export { useEinsatzFahrzeuge } from './use-einsatz-fahrzeuge';
export { useRollenBesetzungen } from './use-rollen-besetzungen';
export { useRollenDefinitionen } from './use-rollen-definitionen';

// Re-Export von Einsatz Feature (TD2-Person-Picker: DRY Principle)
export { useEinsatzPersonen } from '@/features/einsatz/api';

// Mutation Hooks (Story 6.1c)
export { useBesetzeRolle } from './use-besetze-rolle';
export { useFreigebeRolle } from './use-freigebe-rolle';
