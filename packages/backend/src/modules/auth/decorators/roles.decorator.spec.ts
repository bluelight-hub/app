import { SetMetadata } from '@nestjs/common';
import { Roles, ROLES_KEY } from './roles.decorator';
import { UserRole } from '../types/jwt.types';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Roles Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call SetMetadata with ROLES_KEY and provided roles', () => {
    // Arrange
    const mockSetMetadataReturn = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockSetMetadataReturn);
    const roles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

    // Act
    const decorator = Roles(...roles);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, roles);
    expect(SetMetadata).toHaveBeenCalledWith('roles', roles);
    expect(decorator).toBe(mockSetMetadataReturn);
  });

  it('should handle single role', () => {
    // Arrange
    const mockDecorator = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockDecorator);

    // Act
    const result = Roles(UserRole.USER);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, [UserRole.USER]);
    expect(result).toBe(mockDecorator);
  });

  it('should handle multiple roles', () => {
    // Arrange
    const mockDecorator = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockDecorator);
    const roles = [UserRole.USER, UserRole.SUPPORT, UserRole.ADMIN];

    // Act
    const result = Roles(...roles);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, roles);
    expect(result).toBe(mockDecorator);
  });

  it('should handle empty roles', () => {
    // Arrange
    const mockDecorator = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockDecorator);

    // Act
    const result = Roles();

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, []);
    expect(result).toBe(mockDecorator);
  });
});
