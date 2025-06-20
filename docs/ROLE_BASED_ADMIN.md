# Role-Based Administration System

## Overview

The Bluelight Hub application now features a comprehensive role-based administration system that provides different levels of access based on user roles.

## User Roles

The system supports four distinct user roles:

1. **SUPER_ADMIN**: Full system access with all permissions
2. **ADMIN**: Administrative access with most permissions except role management
3. **SUPPORT**: Read-only access to most resources, limited write permissions
4. **USER**: Basic read access to ETB and Einsatz resources

## Permissions

The system uses a granular permission-based access control system. Each role has specific permissions that control access to different parts of the system.

### Permission Categories

#### User Management

- `USERS_READ`: View user data and lists
- `USERS_WRITE`: Create and edit users
- `USERS_DELETE`: Delete users

#### System Settings

- `SYSTEM_SETTINGS_READ`: View system settings
- `SYSTEM_SETTINGS_WRITE`: Modify system settings
- `AUDIT_LOG_READ`: View audit logs and system protocols
- `ROLE_MANAGE`: Manage roles and permissions

#### Application Permissions

- `ETB_READ`: View Einsatztagebuch entries
- `ETB_WRITE`: Create and edit ETB entries
- `ETB_DELETE`: Delete ETB entries
- `EINSATZ_READ`: View Einsätze
- `EINSATZ_WRITE`: Create and edit Einsätze
- `EINSATZ_DELETE`: Delete Einsätze

### Role-Permission Matrix

| Permission            | SUPER_ADMIN | ADMIN | SUPPORT | USER |
| --------------------- | ----------- | ----- | ------- | ---- |
| **User Management**   |
| USERS_READ            | ✓           | ✓     | ✓       | -    |
| USERS_WRITE           | ✓           | ✓     | -       | -    |
| USERS_DELETE          | ✓           | ✓     | -       | -    |
| **System Settings**   |
| SYSTEM_SETTINGS_READ  | ✓           | ✓     | -       | -    |
| SYSTEM_SETTINGS_WRITE | ✓           | ✓     | -       | -    |
| AUDIT_LOG_READ        | ✓           | ✓     | ✓       | -    |
| ROLE_MANAGE           | ✓           | -     | -       | -    |
| **Application**       |
| ETB_READ              | ✓           | ✓     | ✓       | ✓    |
| ETB_WRITE             | ✓           | ✓     | -       | -    |
| ETB_DELETE            | ✓           | -     | -       | -    |
| EINSATZ_READ          | ✓           | ✓     | ✓       | ✓    |
| EINSATZ_WRITE         | ✓           | ✓     | -       | -    |
| EINSATZ_DELETE        | ✓           | -     | -       | -    |

### Critical Permissions

The following permissions are considered critical and should only be granted to trusted users:

- `USERS_DELETE`: Can remove users from the system
- `ROLE_MANAGE`: Can modify roles and permissions
- `SYSTEM_SETTINGS_WRITE`: Can change system configuration

## Implementation Details

### Backend

1. **Database Schema**: Uses PostgreSQL with Prisma ORM

   - User model with role field
   - RolePermission model for role-to-permission mapping
   - JWT tokens include roles and permissions

2. **Guards**:

   - `RolesGuard`: Checks if user has required role
   - `PermissionsGuard`: Checks for specific permissions
   - `JwtAuthGuard`: Validates JWT tokens

3. **Decorators**:
   - `@Roles()`: Specify required roles for endpoints
   - `@RequirePermissions()`: Specify required permissions
   - `@Public()`: Mark endpoints as publicly accessible

### Frontend

1. **AuthContext**:

   - `hasRole(role: string)`: Check if user has specific role
   - `hasPermission(permission: string)`: Check if user has specific permission
   - `isAdmin()`: Check if user is any type of admin (SUPER_ADMIN, ADMIN, or SUPPORT)

2. **Navigation**:

   - Regular users see only main navigation items
   - Admin users see both main and admin navigation items
   - Admin panel can be opened in a separate window

3. **Route Protection**:
   - Admin routes are protected by `AdminGuard`
   - Routes can be accessed both in main app and separate admin window

## Permission Management

### Database Seeding

The role-permission mappings are stored in the database and need to be seeded:

```bash
# Seed role permissions
npm run cli -- seed:admin

# Or seed everything (permissions + users)
npm run cli -- seed:admin --password="secure-password"
```

### Permission Constants

All permissions are defined in `packages/backend/src/modules/auth/constants/permissions.constants.ts`. This file contains:

- Permission groups for easier management
- Default role-permission mappings
- Permission descriptions
- Helper functions

### Fallback Mechanism

If permissions are not found in the database, the system falls back to the default permissions defined in code. This ensures the system continues to work even if the database seeding hasn't been performed.

## Usage

### Creating Admin Users

Use the CLI command to seed admin users:

```bash
npm run cli -- seed:admin --password="secure-password"
```

This creates four test users:

- superadmin@bluelight-hub.com (SUPER_ADMIN)
- admin@bluelight-hub.com (ADMIN)
- support@bluelight-hub.com (SUPPORT)
- user@bluelight-hub.com (USER)

### Accessing Admin Features

1. **In Main App**: Admin navigation items appear in the sidebar for admin users
2. **Separate Window**: Click "Admin Panel öffnen" button in sidebar
3. **Direct URL**: Navigate to `/admin` routes (requires admin role)

## Security Considerations

- Frontend role checks are for UX only
- All security is enforced at the backend API level
- JWT tokens expire after 15 minutes (access) and 7 days (refresh)
- Failed login attempts lock accounts after 5 attempts
- Sessions are tracked in the database for revocation

## Testing

Test the implementation with different user roles:

1. Login as different users to verify navigation visibility
2. Attempt to access admin routes as non-admin user
3. Verify API endpoints reject unauthorized requests
4. Test admin panel in both integrated and separate window modes
