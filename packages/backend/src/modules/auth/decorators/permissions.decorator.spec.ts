import { SetMetadata } from '@nestjs/common';
import { RequirePermissions, PERMISSIONS_KEY } from './permissions.decorator';
import { Permission } from '../types/jwt.types';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('RequirePermissions Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call SetMetadata with PERMISSIONS_KEY and provided permissions', () => {
    // Arrange
    const mockSetMetadataReturn = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockSetMetadataReturn);
    const permissions = [Permission.USERS_READ, Permission.USERS_WRITE];

    // Act
    const decorator = RequirePermissions(...permissions);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, permissions);
    expect(SetMetadata).toHaveBeenCalledWith('permissions', permissions);
    expect(decorator).toBe(mockSetMetadataReturn);
  });

  it('should handle single permission', () => {
    // Arrange
    const mockDecorator = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockDecorator);

    // Act
    const result = RequirePermissions(Permission.USERS_DELETE);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, [Permission.USERS_DELETE]);
    expect(result).toBe(mockDecorator);
  });

  it('should handle multiple permissions', () => {
    // Arrange
    const mockDecorator = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockDecorator);
    const permissions = [
      Permission.SYSTEM_SETTINGS_READ,
      Permission.SYSTEM_SETTINGS_WRITE,
      Permission.ROLE_MANAGE,
    ];

    // Act
    const result = RequirePermissions(...permissions);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, permissions);
    expect(result).toBe(mockDecorator);
  });

  it('should handle empty permissions', () => {
    // Arrange
    const mockDecorator = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockDecorator);

    // Act
    const result = RequirePermissions();

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, []);
    expect(result).toBe(mockDecorator);
  });

  it('should handle all permission types', () => {
    // Arrange
    const mockDecorator = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockDecorator);
    const permissions = [
      Permission.ETB_READ,
      Permission.ETB_WRITE,
      Permission.EINSATZ_READ,
      Permission.AUDIT_LOG_READ,
    ];

    // Act
    const result = RequirePermissions(...permissions);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, permissions);
    expect(result).toBe(mockDecorator);
  });
});
