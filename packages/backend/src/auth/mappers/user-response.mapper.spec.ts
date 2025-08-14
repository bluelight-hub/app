import { User, UserRole } from '@prisma/client';
import { UserResponseMapper } from './user-response.mapper';

describe('UserResponseMapper', () => {
  describe('toUserResponseDto', () => {
    const mockUser: User = {
      id: '453GsDyW0KssEuIW2lo2G',
      username: 'testuser',
      role: UserRole.USER,
      isActive: true,
      lastLoginAt: new Date('2023-01-01T10:00:00.000Z'),
      createdAt: new Date('2022-01-01T10:00:00.000Z'),
      updatedAt: new Date('2023-01-01T10:00:00.000Z'),
      // Sensitive fields that should be excluded
      passwordHash: 'hash123',
      failedLoginCount: 2,
      lockedUntil: null,
    };

    it('should map user to UserResponseDto with all required fields', () => {
      const result = UserResponseMapper.toUserResponseDto(mockUser);

      expect(result).toEqual({
        id: '453GsDyW0KssEuIW2lo2G',
        username: 'testuser',
        role: UserRole.USER,
        isActive: true,
        lastLoginAt: new Date('2023-01-01T10:00:00.000Z'),
        createdAt: new Date('2022-01-01T10:00:00.000Z'),
        updatedAt: new Date('2023-01-01T10:00:00.000Z'),
      });
    });

    it('should exclude sensitive fields like passwordHash, failedLoginCount, lockedUntil', () => {
      const result = UserResponseMapper.toUserResponseDto(mockUser);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('failedLoginCount');
      expect(result).not.toHaveProperty('lockedUntil');
    });

    it('should handle null lastLoginAt', () => {
      const userWithNullLastLogin: User = {
        ...mockUser,
        lastLoginAt: null,
      };

      const result = UserResponseMapper.toUserResponseDto(userWithNullLastLogin);

      expect(result.lastLoginAt).toBeNull();
    });

    it('should handle ADMIN role correctly', () => {
      const adminUser: User = {
        ...mockUser,
        role: UserRole.ADMIN,
      };

      const result = UserResponseMapper.toUserResponseDto(adminUser);

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should handle inactive user correctly', () => {
      const inactiveUser: User = {
        ...mockUser,
        isActive: false,
      };

      const result = UserResponseMapper.toUserResponseDto(inactiveUser);

      expect(result.isActive).toBe(false);
    });

    it('should preserve date objects as Date instances', () => {
      const result = UserResponseMapper.toUserResponseDto(mockUser);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.lastLoginAt).toBeInstanceOf(Date);
    });
  });
});
