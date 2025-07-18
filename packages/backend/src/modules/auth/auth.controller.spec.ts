import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { JWTPayload } from './types/jwt.types';
import { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let mockResponse: Response;
  let mockRequest: Request;

  const mockAuthService = {
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Create fresh mocks for each test
    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;

    mockRequest = {
      cookies: {},
    } as unknown as Request;

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should handle login with x-forwarded-for header', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      const expectedResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          roles: [],
          permissions: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const mockRequest = {
        ip: undefined,
        headers: { 'x-forwarded-for': '10.0.0.1', 'user-agent': 'test-agent' },
      } as any;
      const result = await controller.login(loginDto, mockRequest, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(loginDto, '10.0.0.1', 'test-agent');
      expect(result).toBe(expectedResult);
    });

    it('should handle login without IP and user-agent', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      };

      const expectedResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          roles: [],
          permissions: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const mockRequest = {
        ip: undefined,
        headers: {},
      } as any;
      const result = await controller.login(loginDto, mockRequest, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(loginDto, undefined, undefined);
      expect(result).toBe(expectedResult);
    });

    it('should call authService.login with correct parameters', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      const expectedResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          roles: [],
          permissions: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const mockRequest = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as any;
      const result = await controller.login(loginDto, mockRequest, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', 'test-agent');
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.any(Object),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.any(Object),
      );
      expect(result).toBe(expectedResult);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with correct parameters', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'refresh-token',
      };

      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshTokens.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshTokenDto, mockRequest, mockResponse);

      expect(authService.refreshTokens).toHaveBeenCalledWith('refresh-token');
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'new-access-token',
        expect.any(Object),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh-token',
        expect.any(Object),
      );
      expect(result).toBe(expectedResult);
    });

    it('should use refresh token from cookie if available', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'body-refresh-token',
      };

      mockRequest.cookies = {
        refresh_token: 'cookie-refresh-token',
      };

      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshTokens.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshTokenDto, mockRequest, mockResponse);

      expect(authService.refreshTokens).toHaveBeenCalledWith('cookie-refresh-token');
      expect(result).toBe(expectedResult);
    });

    it('should throw UnauthorizedException when no refresh token provided', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: '',
      };

      mockRequest.cookies = {};

      await expect(controller.refresh(refreshTokenDto, mockRequest, mockResponse)).rejects.toThrow(
        new UnauthorizedException('Refresh token not provided'),
      );

      expect(authService.refreshTokens).not.toHaveBeenCalled();
    });

    it('should handle undefined refresh token in both cookie and body', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: undefined as any,
      };

      mockRequest.cookies = undefined;

      await expect(controller.refresh(refreshTokenDto, mockRequest, mockResponse)).rejects.toThrow(
        new UnauthorizedException('Refresh token not provided'),
      );

      expect(authService.refreshTokens).not.toHaveBeenCalled();
    });

    it('should handle null cookies object', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'token-from-body',
      };

      mockRequest.cookies = null;

      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshTokens.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshTokenDto, mockRequest, mockResponse);

      expect(authService.refreshTokens).toHaveBeenCalledWith('token-from-body');
      expect(result).toBe(expectedResult);
    });
  });

  describe('getCurrentUser', () => {
    it('should call authService.getCurrentUser with user ID', async () => {
      const user: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        roles: [],
        permissions: [],
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      const expectedResult = {
        id: '1',
        email: 'test@example.com',
        roles: [],
        permissions: [],
      };

      mockAuthService.getCurrentUser.mockResolvedValue(expectedResult);

      const result = await controller.getCurrentUser(user);

      expect(authService.getCurrentUser).toHaveBeenCalledWith('1');
      expect(result).toBe(expectedResult);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with session ID from user', async () => {
      const user: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        roles: [],
        permissions: [],
        sessionId: 'session-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(user, mockResponse);

      expect(authService.logout).toHaveBeenCalledWith('session-123');
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
    });
  });
});
