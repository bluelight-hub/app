import type { UserResponseDtoRoleEnum } from '@bluelight-hub/shared/client';

export const isAdmin = (role: UserResponseDtoRoleEnum | undefined): boolean => {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
};
