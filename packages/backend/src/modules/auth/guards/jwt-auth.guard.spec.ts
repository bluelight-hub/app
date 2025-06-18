import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for public routes', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        'isPublic',
        [mockContext.getHandler(), mockContext.getClass()],
      );
    });

    it('should call parent canActivate for non-public routes', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);

      const mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: { authorization: 'Bearer token' },
          }),
        }),
      } as unknown as ExecutionContext;

      // Mock the parent's canActivate method
      const parentCanActivate = jest.fn().mockResolvedValue(true);
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockImplementation(parentCanActivate);

      await guard.canActivate(mockContext);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
      expect(parentCanActivate).toHaveBeenCalledWith(mockContext);
    });
  });

  describe('handleRequest', () => {
    it('should return user when valid', () => {
      const user = { id: '1', email: 'test@example.com' };

      const result = guard.handleRequest(null, user, null);

      expect(result).toBe(user);
    });

    it('should throw UnauthorizedException when error exists', () => {
      const error = new Error('Auth error');

      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with message when no user', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        'Authentication required',
      );
    });
  });
});