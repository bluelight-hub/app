import { ManagedUserResponseDtoRoleEnum } from '@/shared';

/**
 * Prüft ob die gegebene Rolle eine Admin-Rolle ist.
 *
 * Unterstützt sowohl Enum-Werte als auch String-Werte für Flexibilität.
 * Die Admin-Rollen werden lazy evaluiert um Test-Mocking zu ermöglichen.
 */
export const isAdmin = (role: ManagedUserResponseDtoRoleEnum | string | undefined): boolean => {
  if (!role) return false;
  // Lazy evaluation der Admin-Rollen um Module-Level Side Effects zu vermeiden
  const adminRoles = [ManagedUserResponseDtoRoleEnum.Admin, ManagedUserResponseDtoRoleEnum.SuperAdmin];
  return adminRoles.includes(role as ManagedUserResponseDtoRoleEnum);
};
