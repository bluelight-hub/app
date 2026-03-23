// User Management Queries - Barrel Export
// CQRS Query Handlers for User Bounded Context

// Get All Users
export { GetAllUsersQuery } from './get-all-users/get-all-users.query';
export { GetAllUsersQueryHandler } from './get-all-users/get-all-users.handler';

// Get User By ID
export { GetUserByIdQuery } from './get-user-by-id/get-user-by-id.query';
export { GetUserByIdQueryHandler } from './get-user-by-id/get-user-by-id.handler';

// Get Navigation Permissions
export { GetNavigationPermissionsQuery } from './get-navigation-permissions/get-navigation-permissions.query';
export type { NavigationUserRole } from './get-navigation-permissions/get-navigation-permissions.query';
export { GetNavigationPermissionsQueryHandler } from './get-navigation-permissions/get-navigation-permissions.handler';

// Get User Permissions
export { GetUserPermissionsQuery } from './get-user-permissions/get-user-permissions.query';
export { GetUserPermissionsQueryHandler } from './get-user-permissions/get-user-permissions.handler';

// Get Available Permissions
export { GetAvailablePermissionsQuery } from './get-available-permissions/get-available-permissions.query';
export { GetAvailablePermissionsQueryHandler } from './get-available-permissions/get-available-permissions.handler';
