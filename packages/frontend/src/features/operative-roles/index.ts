/**
 * Operative Roles Feature
 *
 * Stellt Hooks und Query Keys für operative Rollen und Beitrittsanfragen bereit.
 *
 * - Operative Rollen: Führungskraft, Einsatzkraft, Externe
 * - Beitrittsanfragen: Einsatzkräfte können Beitritt beantragen, Führungskräfte entscheiden
 */

// API
export { OPERATIVE_ROLES_QUERY_KEYS } from './api/queries';
export { useBeitrittsanfragen } from './api/use-beitrittsanfragen';
export { useCreateBeitrittsanfrage } from './api/use-create-beitrittsanfrage';
export { useInviteExterne } from './api/use-invite-externe';
export { useResolveBeitrittsanfrage } from './api/use-resolve-beitrittsanfrage';
export { useRevokeInvitation } from './api/use-revoke-invitation';

// Hooks
export { useOperativeRole } from './hooks/use-operative-role';
export type { OperativeRole, OperativeRoleInfo } from './hooks/use-operative-role';
export { useCanAccessEinsatz } from './hooks/use-can-access-einsatz';
export type { EinsatzAccessInfo } from './hooks/use-can-access-einsatz';
