import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './services/mfa.service';
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
    verifyMfaAndLogin: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  const mockMfaService = {
    verify: jest.fn(),
    completeWebAuthnAuthentication: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: MfaService,
          useValue: mockMfaService,
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
          isMfaEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
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

  describe('loginWithMfa', () => {
    it('should verify MFA and complete login', async () => {
      const mfaLoginDto = {
        challengeId: 'user-123',
        totpCode: '123456',
      };

      const expectedResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          roles: [],
          permissions: [],
          isActive: true,
          isMfaEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockAuthService.verifyMfaAndLogin.mockResolvedValue(expectedResult);

      const result = await controller.loginWithMfa(mfaLoginDto, mockResponse);

      expect(authService.verifyMfaAndLogin).toHaveBeenCalledWith('user-123', '123456', undefined);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(result).toBe(expectedResult);
    });

    it('should verify WebAuthn and complete login', async () => {
      const mfaLoginDto = {
        challengeId: 'user-123',
        webAuthnResponse: {
          id: 'credential-id',
          rawId: 'credential-raw-id',
          response: {
            authenticatorData: 'auth-data',
            clientDataJSON: 'client-data',
            signature: 'signature',
            userHandle: 'user-handle',
          },
          type: 'public-key' as const,
          clientExtensionResults: {},
        },
      };

      const expectedResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          roles: [],
          permissions: [],
          isActive: true,
          isMfaEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockMfaService.completeWebAuthnAuthentication.mockResolvedValue(true);
      mockAuthService.verifyMfaAndLogin.mockResolvedValue(expectedResult);

      const result = await controller.loginWithMfa(mfaLoginDto, mockResponse);

      expect(mockMfaService.completeWebAuthnAuthentication).toHaveBeenCalledWith(
        'user-123',
        mfaLoginDto.webAuthnResponse,
        'user-123',
      );
      expect(authService.verifyMfaAndLogin).toHaveBeenCalledWith(
        'user-123',
        undefined,
        mfaLoginDto.webAuthnResponse,
      );
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(result).toBe(expectedResult);
    });

    it('should throw UnauthorizedException when WebAuthn verification fails', async () => {
      const mfaLoginDto = {
        challengeId: 'user-123',
        webAuthnResponse: {
          id: 'credential-id',
          rawId: 'credential-raw-id',
          response: {
            authenticatorData: 'auth-data',
            clientDataJSON: 'client-data',
            signature: 'signature',
            userHandle: 'user-handle',
          },
          type: 'public-key' as const,
          clientExtensionResults: {},
        },
      };

      mockMfaService.completeWebAuthnAuthentication.mockResolvedValue(false);

      await expect(controller.loginWithMfa(mfaLoginDto, mockResponse)).rejects.toThrow(
        new UnauthorizedException('WebAuthn verification failed'),
      );

      expect(mockMfaService.completeWebAuthnAuthentication).toHaveBeenCalledWith(
        'user-123',
        mfaLoginDto.webAuthnResponse,
        'user-123',
      );
      expect(authService.verifyMfaAndLogin).not.toHaveBeenCalled();
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
