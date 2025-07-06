import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';
import { JWTPayload, UserRole, Permission } from '../types/jwt.types';

function getParamDecoratorFactory(decorator: (...args: any[]) => any) {
  class Test {
    public test(@decorator() value: any) {
      return value;
    }
  }

  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
  return args[Object.keys(args)[0]].factory;
}

describe('CurrentUser Decorator', () => {
  let factory: any;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;
  let mockUser: JWTPayload;

  beforeEach(() => {
    mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      roles: [UserRole.ADMIN],
      permissions: [Permission.USERS_READ, Permission.USERS_WRITE],
      sessionId: 'session-123',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    mockRequest = {
      user: mockUser,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
    } as unknown as ExecutionContext;

    factory = getParamDecoratorFactory(CurrentUser);
  });

  it('should return the entire user object when no data parameter is provided', () => {
    const result = factory(undefined, mockExecutionContext);

    expect(result).toEqual(mockUser);
    expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
  });

  it('should return a specific user property when data parameter is provided', () => {
    const result = factory('email', mockExecutionContext);

    expect(result).toBe('test@example.com');
  });

  it('should return sub property when requested', () => {
    const result = factory('sub', mockExecutionContext);

    expect(result).toBe('user-123');
  });

  it('should return roles array when requested', () => {
    const result = factory('roles', mockExecutionContext);

    expect(result).toEqual([UserRole.ADMIN]);
  });

  it('should return permissions array when requested', () => {
    const result = factory('permissions', mockExecutionContext);

    expect(result).toEqual([Permission.USERS_READ, Permission.USERS_WRITE]);
  });

  it('should return undefined when user is not present', () => {
    mockRequest.user = undefined;

    const result = factory(undefined, mockExecutionContext);

    expect(result).toBeUndefined();
  });

  it('should return undefined when requesting a property from undefined user', () => {
    mockRequest.user = undefined;

    const result = factory('email', mockExecutionContext);

    expect(result).toBeUndefined();
  });

  it('should handle null user gracefully', () => {
    mockRequest.user = null;

    const result = factory(undefined, mockExecutionContext);

    expect(result).toBeNull();
  });

  it('should return undefined for non-existent property on null user', () => {
    mockRequest.user = null;

    const result = factory('email', mockExecutionContext);

    expect(result).toBeUndefined();
  });

  it('should return sessionId when requested', () => {
    const result = factory('sessionId', mockExecutionContext);

    expect(result).toBe('session-123');
  });

  it('should handle empty roles array', () => {
    mockUser.roles = [];
    const result = factory('roles', mockExecutionContext);

    expect(result).toEqual([]);
  });

  it('should handle empty permissions array', () => {
    mockUser.permissions = [];
    const result = factory('permissions', mockExecutionContext);

    expect(result).toEqual([]);
  });
});
