import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../types/jwt.types';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Guard that validates user permissions for fine-grained access control.
 * Used with @RequirePermissions() decorator to check specific permissions.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    if (!requiredPermissions) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.permissions) {
      return false;
    }
    
    return requiredPermissions.every((permission) =>
      user.permissions?.includes(permission),
    );
  }
}