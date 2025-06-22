import { Permission } from '../types/jwt.types';
import {
  isCriticalPermission,
  getPermissionsForResource,
  CriticalPermissions,
  PermissionGroups,
} from './permissions.constants';

describe('permissions.constants', () => {
  describe('isCriticalPermission', () => {
    it('should return true for critical permissions', () => {
      expect(isCriticalPermission(Permission.USERS_DELETE)).toBe(true);
      expect(isCriticalPermission(Permission.ROLE_MANAGE)).toBe(true);
      expect(isCriticalPermission(Permission.SYSTEM_SETTINGS_WRITE)).toBe(true);
    });

    it('should return false for non-critical permissions', () => {
      expect(isCriticalPermission(Permission.USERS_READ)).toBe(false);
      expect(isCriticalPermission(Permission.ETB_READ)).toBe(false);
      expect(isCriticalPermission(Permission.EINSATZ_READ)).toBe(false);
      expect(isCriticalPermission(Permission.AUDIT_LOG_READ)).toBe(false);
    });

    it('should check against the CriticalPermissions array', () => {
      // Verify all critical permissions return true
      CriticalPermissions.forEach((permission) => {
        expect(isCriticalPermission(permission)).toBe(true);
      });

      // Verify non-critical permissions return false
      const allPermissions = Object.values(Permission);
      const nonCriticalPermissions = allPermissions.filter((p) => !CriticalPermissions.includes(p));

      nonCriticalPermissions.forEach((permission) => {
        expect(isCriticalPermission(permission)).toBe(false);
      });
    });
  });

  describe('getPermissionsForResource', () => {
    it('should return user management permissions for "users" resource', () => {
      const permissions = getPermissionsForResource('users');
      expect(permissions).toEqual(Object.values(PermissionGroups.USER_MANAGEMENT));
      expect(permissions).toContain(Permission.USERS_READ);
      expect(permissions).toContain(Permission.USERS_WRITE);
      expect(permissions).toContain(Permission.USERS_DELETE);
    });

    it('should return system permissions for "system" resource', () => {
      const permissions = getPermissionsForResource('system');
      expect(permissions).toEqual(Object.values(PermissionGroups.SYSTEM));
      expect(permissions).toContain(Permission.SYSTEM_SETTINGS_READ);
      expect(permissions).toContain(Permission.SYSTEM_SETTINGS_WRITE);
      expect(permissions).toContain(Permission.AUDIT_LOG_READ);
      expect(permissions).toContain(Permission.ROLE_MANAGE);
    });

    it('should return ETB permissions for "etb" resource', () => {
      const permissions = getPermissionsForResource('etb');
      expect(permissions).toEqual(Object.values(PermissionGroups.ETB));
      expect(permissions).toContain(Permission.ETB_READ);
      expect(permissions).toContain(Permission.ETB_WRITE);
      expect(permissions).toContain(Permission.ETB_DELETE);
    });

    it('should return Einsatz permissions for "einsatz" resource', () => {
      const permissions = getPermissionsForResource('einsatz');
      expect(permissions).toEqual(Object.values(PermissionGroups.EINSATZ));
      expect(permissions).toContain(Permission.EINSATZ_READ);
      expect(permissions).toContain(Permission.EINSATZ_WRITE);
      expect(permissions).toContain(Permission.EINSATZ_DELETE);
    });

    it('should return empty array for unknown resource', () => {
      const permissions = getPermissionsForResource('unknown' as any);
      expect(permissions).toEqual([]);
    });

    it('should only return valid permissions for known resources', () => {
      // Test that all known resources return valid permissions
      const resources: Array<'users' | 'system' | 'etb' | 'einsatz'> = [
        'users',
        'system',
        'etb',
        'einsatz',
      ];

      resources.forEach((resource) => {
        const permissions = getPermissionsForResource(resource);
        expect(permissions).toBeDefined();
        expect(Array.isArray(permissions)).toBe(true);
        expect(permissions.length).toBeGreaterThan(0);

        // All returned permissions should be valid Permission enum values
        permissions.forEach((permission) => {
          expect(Object.values(Permission)).toContain(permission);
        });
      });
    });
  });
});
