import { SetMetadata } from '@nestjs/common';
import { Public, IS_PUBLIC_KEY } from './public.decorator';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Public Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call SetMetadata with IS_PUBLIC_KEY and true', () => {
    // Arrange
    const mockSetMetadataReturn = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockSetMetadataReturn);

    // Act
    const decorator = Public();

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
    expect(SetMetadata).toHaveBeenCalledWith('isPublic', true);
    expect(decorator).toBe(mockSetMetadataReturn);
  });

  it('should return a function when called', () => {
    // Arrange
    const mockDecorator = jest.fn();
    (SetMetadata as jest.Mock).mockReturnValue(mockDecorator);

    // Act
    const result = Public();

    // Assert
    expect(result).toBe(mockDecorator);
    expect(typeof result).toBe('function');
  });
});
