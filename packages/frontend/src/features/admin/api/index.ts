/**
 * Admin API Feature - Public Exports
 *
 * Zentrale Export-Datei für alle Admin-API-Funktionen.
 * Vereinfacht Imports und definiert die öffentliche API des Features.
 */

// Query Keys
export { ADMIN_QUERY_KEYS } from './queries';

// Hooks
export { useAdminUserManagement } from './use-admin-user-management';
export { useAdminFahrzeugtypenManagement, FAHRZEUGTYP_KATEGORIE_LABELS, getFahrzeugtypKategorieBadgeVariant } from './use-admin-fahrzeugtypen-management';
export { useAdminQualifikationenManagement, type QualifikationKategorie, KATEGORIE_LABELS, getKategorieBadgeVariant } from './use-admin-qualifikationen-management';
export { useAdminBefehlsgeberVorschlaegeManagement } from './use-admin-befehlsgeber-vorschlaege-management';
export { useAdminRollenDefinitionenManagement } from './use-admin-rollen-definitionen-management';
export { useAdminStammFahrzeugeManagement } from './use-admin-stamm-fahrzeuge-management';
export { useAdminStammPersonenManagement } from './use-admin-stamm-personen-management';
export { useAdminHiOrgIntegration } from './use-admin-hiorg-integration';
export { useIntegrationOverview } from './use-integration-overview';
export { useListInvites, useRevokeInvite, type InviteFilters } from './use-admin-invite-management';
export { useAccessTokenManagement, useListAccessTokens, useCreateAccessToken, type AccessTokenFilters } from './use-access-token-management';
export { useSecurityManagement, useSecurityStatus, useMigrateToSecureMode, type SecurityStatus, type MigrateToSecureModeResponse, type MigrateToSecureModeRequest } from './use-security-management';
export {
  useRuntimeConfigManagement,
  useRuntimeConfigList,
  useConfigDoctor,
  useUpsertRuntimeConfig,
  useDeleteRuntimeConfig,
  useMigrateLegacyRuntimeConfig,
  type RuntimeConfigEntry,
  type RuntimeConfigListResponse,
  type ConfigDoctorResponse,
  type UpsertRuntimeConfigRequest,
  type DeleteRuntimeConfigResult,
  type MigrateLegacyRuntimeConfigRequest,
  type MigrateLegacyRuntimeConfigResult,
  type MigrateLegacyRuntimeConfigFailure,
  type MigrateLegacyRuntimeConfigSummary,
} from './use-runtime-config-management';

// Re-export generierte DTOs für Convenience
export type { CreateQualifikationDto, QualifikationDto, UpdateQualifikationDto } from '@/shared';
export type { CreateFahrzeugtypDto, CreateFahrzeugtypDtoKategorieEnum, FahrzeugtypDto, UpdateFahrzeugtypDto, UpdateFahrzeugtypDtoKategorieEnum } from '@/shared';
export type { CreateRollenDefinitionDto, RollenDefinitionDto, UpdateRollenDefinitionDto } from '@/shared';
export type { CreateStammFahrzeugDto, StammFahrzeugDto, UpdateStammFahrzeugDto } from '@/shared';
export type { CreateStammPersonDto, StammPersonDto, UpdateStammPersonDto, StammPersonQualifikationDto } from '@/shared';
export type { InviteCodeListItemDto, AdminInviteControllerListInvitesVAlphaStatusEnum } from '@/shared';
export type {
  CreateAccessTokenDto,
  CreateAccessTokenResponseDto,
  TokenListItemDto,
  TokenListItemDtoStatusEnum,
  AdminTokenControllerCreateTokenVAlpha201Response,
  AdminTokenControllerListTokensVAlpha200Response,
} from '@/shared';
export type { BefehlsgeberVorschlagDto, CreateBefehlsgeberVorschlagDto, UpdateBefehlsgeberVorschlagDto } from '@/shared';
