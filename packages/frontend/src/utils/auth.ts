import { UserDtoRoleEnum } from '@bluelight-hub/shared/client';

const adminRoles: Array<UserDtoRoleEnum> = [UserDtoRoleEnum.Admin, UserDtoRoleEnum.SuperAdmin];
export const isAdmin = (role: UserDtoRoleEnum | undefined): boolean => {
  if (!role) return false;
  return adminRoles.includes(role);
};
