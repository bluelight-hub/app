import { UserRole } from '@prisma/client';

export const isAdmin = (role: UserRole | undefined): boolean => {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
};
