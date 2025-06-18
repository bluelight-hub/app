import { SetMetadata } from '@nestjs/common';
import { Permission } from '../types/jwt.types';

/**
 * Metadata key for storing required permissions.
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for accessing a route.
 * Used with PermissionsGuard for fine-grained access control.
 * 
 * @param permissions - Array of Permission values required for access
 * @example
 * ```typescript
 * @UseGuards(PermissionsGuard)
 * @RequirePermissions(Permission.USERS_WRITE)
 * @Post('users')
 * createUser(@Body() dto: CreateUserDto) {
 *   return this.userService.create(dto);
 * }
 * ```
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);