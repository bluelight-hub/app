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
export { useAdminQualifikationenManagement, type QualifikationKategorie, KATEGORIE_LABELS, getKategorieBadgeVariant } from './use-admin-qualifikationen-management';

// Re-export generierte DTOs für Convenience
export type { CreateQualifikationDto, QualifikationDto, UpdateQualifikationDto } from '@bluelight-hub/shared/client';
