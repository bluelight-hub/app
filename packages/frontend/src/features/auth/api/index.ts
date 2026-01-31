/**
 * Auth API Module
 *
 * Exportiert alle TanStack Query Hooks für Auth und User Management.
 */

export { AUTH_KEYS, USER_QUERY_KEYS, USERS_QUERY_KEYS, HEALTH_QUERY_KEYS } from './queries';
export { useCurrentUser, useAdminAuth } from './use-current-user';
export { useUnifiedAuth, useAdminLogin } from './use-login';
export { useLogout } from './use-logout';
// useAdminLogout nur direkt importieren
// export { useAdminLogout } from './use-logout';
export { useAdminSetup } from './use-admin-setup';
export { useUsers, useUser, useUserNames } from './use-users';
export { usePublicUsers } from './use-public-users';
