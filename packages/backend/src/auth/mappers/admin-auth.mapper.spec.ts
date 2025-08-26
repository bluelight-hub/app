import { type User, UserRole } from '@prisma/client';
import {
  toAdminLoginResponseDto,
  toAdminSetupResponseDto,
  toAdminStatusResponseDto,
  toAdminTokenVerificationDto,
} from './admin-auth.mapper';

describe('Admin Auth Mapper Functions', () => {
  const mockFullUser: User = {
    id: '453GsDyW0KssEuIW2lo2G',
    username: 'admin',
    role: UserRole.ADMIN,
    isActive: true,
    lastLoginAt: new Date('2023-01-01T10:00:00.000Z'),
    createdAt: new Date('2022-01-01T10:00:00.000Z'),
    updatedAt: new Date('2023-01-01T10:00:00.000Z'),
    passwordHash: 'hash123',
    failedLoginCount: 0,
    lockedUntil: null,
  };

  describe('toAdminLoginResponseDto', () => {
    it('should map user to AdminLoginResponseDto correctly', () => {
      const userPick: Pick<User, 'id' | 'username' | 'role'> = {
        id: mockFullUser.id,
        username: mockFullUser.username,
        role: mockFullUser.role,
      };

      const result = toAdminLoginResponseDto(userPick);

      expect(result).toEqual({
        user: {
          id: '453GsDyW0KssEuIW2lo2G',
          username: 'admin',
          role: UserRole.ADMIN,
        },
      });
    });

    it('should handle USER role correctly', () => {
      const userPick: Pick<User, 'id' | 'username' | 'role'> = {
        id: 'user123',
        username: 'regularuser',
        role: UserRole.USER,
      };

      const result = toAdminLoginResponseDto(userPick);

      expect(result.user.role).toBe(UserRole.USER);
    });
  });

  describe('toAdminSetupResponseDto', () => {
    const userWithoutPassword: Omit<User, 'passwordHash'> = {
      id: mockFullUser.id,
      username: mockFullUser.username,
      role: mockFullUser.role,
      isActive: mockFullUser.isActive,
      lastLoginAt: mockFullUser.lastLoginAt,
      createdAt: mockFullUser.createdAt,
      updatedAt: mockFullUser.updatedAt,
      failedLoginCount: mockFullUser.failedLoginCount,
      lockedUntil: mockFullUser.lockedUntil,
    };

    it('should map user to AdminSetupResponseDto correctly', () => {
      const result = toAdminSetupResponseDto(userWithoutPassword);

      expect(result).toEqual({
        message: 'Admin-Setup erfolgreich durchgeführt',
        user: {
          id: '453GsDyW0KssEuIW2lo2G',
          username: 'admin',
          role: UserRole.ADMIN,
          createdAt: mockFullUser.createdAt,
          updatedAt: mockFullUser.updatedAt,
        },
      });
    });

    it('should exclude non-required fields from user object', () => {
      const result = toAdminSetupResponseDto(userWithoutPassword);

      expect(result.user).not.toHaveProperty('isActive');
      expect(result.user).not.toHaveProperty('lastLoginAt');
      expect(result.user).not.toHaveProperty('failedLoginCount');
      expect(result.user).not.toHaveProperty('lockedUntil');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should preserve date objects in user', () => {
      const result = toAdminSetupResponseDto(userWithoutPassword);

      expect(result.user.createdAt).toBeInstanceOf(Date);
      expect(result.user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toAdminStatusResponseDto', () => {
    it('should map to AdminStatusDto when admin exists and user eligible', () => {
      const result = toAdminStatusResponseDto(true, true);

      expect(result).toEqual({
        adminSetupAvailable: true,
        adminExists: true,
        userEligible: true,
      });
    });

    it('should map to AdminStatusDto when admin does not exist and user not eligible', () => {
      const result = toAdminStatusResponseDto(false, false);

      expect(result).toEqual({
        adminSetupAvailable: false,
        adminExists: false,
        userEligible: false,
      });
    });

    it('should map to AdminStatusDto when admin exists but user not eligible', () => {
      const result = toAdminStatusResponseDto(true, false);

      expect(result).toEqual({
        adminSetupAvailable: false,
        adminExists: true,
        userEligible: false,
      });
    });

    it('should map to AdminStatusDto when admin does not exist but user eligible', () => {
      const result = toAdminStatusResponseDto(false, true);

      expect(result).toEqual({
        adminSetupAvailable: true,
        adminExists: false,
        userEligible: true,
      });
    });
  });

  describe('toAdminTokenVerificationDto', () => {
    it('should return ok: true by default', () => {
      const result = toAdminTokenVerificationDto();

      expect(result).toEqual({
        ok: true,
      });
    });

    it('should return ok: true when explicitly passed true', () => {
      const result = toAdminTokenVerificationDto(true);

      expect(result).toEqual({
        ok: true,
      });
    });

    it('should return ok: false when explicitly passed false', () => {
      const result = toAdminTokenVerificationDto(false);

      expect(result).toEqual({
        ok: false,
      });
    });
  });
});
