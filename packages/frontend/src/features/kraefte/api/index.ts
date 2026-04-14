/**
 * API Layer Exports für Kräfte Feature
 */

// Query Keys
export { KRAEFTE_QUERY_KEYS, calculateRetryDelay } from './queries';

// Query Hooks
export { useTaktischeStaerke, type TaktischeStaerke } from './use-taktische-staerke';
export { useEinsatzFahrzeuge } from './use-einsatz-fahrzeuge';
export { useKraeftePois } from './use-kraefte-pois';
export { useRollenBesetzungen } from './use-rollen-besetzungen';
export { useRollenDefinitionen } from './use-rollen-definitionen';

// Query Hooks (Issue #411 - Taktische Einheiten)
export { useEinsatzEinheiten } from './use-einsatz-einheiten';
export { useEinheitDetails } from './use-einheit-details';

// Re-Export von Einsatz Feature (TD2-Person-Picker: DRY Principle)
export { useEinsatzPersonen } from '@/features/einsatz/api';

// Mutation Hooks (Story 6.1c)
export { useBesetzeRolle } from './use-besetze-rolle';
export { useFreigebeRolle } from './use-freigebe-rolle';

// Mutation Hooks (Issue #411 - Taktische Einheiten)
export { useCreateEinheit } from './use-create-einheit';
export { useUpdateEinheit } from './use-update-einheit';
export { useChangeEinheitStatus } from './use-change-einheit-status';
export { useSetEinheitenfuehrer } from './use-set-einheitenfuehrer';
export { useAssignPersonToEinheit } from './use-assign-person-to-einheit';
export { useRemovePersonFromEinheit } from './use-remove-person-from-einheit';
export { useMoveEinheit } from './use-move-einheit';
export { useDeleteEinheit } from './use-delete-einheit';
export { useAssignFahrzeugZuEinheit } from './use-assign-fahrzeug-zu-einheit';

// Query/Mutation Hooks (Issue #667 - Einheit taktisches Zeichen)
export { useEinheitZeichen } from './use-einheit-zeichen';
export { useUpdateEinheitZeichen } from './use-update-einheit-zeichen';
