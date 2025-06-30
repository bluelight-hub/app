import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../types/jwt.types';

/**
 * Metadata key for storing required roles.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for accessing a route.
 * Used with RolesGuard to enforce role-based access control.
 *
 * @param roles - Array of UserRole values required for access
 * @example
 * ```typescript
 * @UseGuards(RolesGuard)
 * @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 * @Get('users')
 * getUsers() {
 *   return this.userService.findAll();
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
