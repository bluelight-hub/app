import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { LoginDto } from './dto';
import { AuthUser, LoginResponse, TokenResponse } from './types/auth.types';
import {
  JWTPayload,
  JWTRefreshPayload,
  Permission,
  RolePermissions,
  UserRole,
} from './types/jwt.types';

/**
 * Service responsible for authentication operations including login, token refresh, and logout.
 * Handles JWT token generation and validation for admin users.
 */
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    // TODO: Replace with actual database lookup
    // Pre-hashed password for testing: SecurePassword123!
    const mockUser = {
      id: '1',
      email: 'admin@bluelight-hub.com',
      password: '$2b$10$dfOmBT9d17O7VS6lErrEZuSPuOUWFkLeJV6KGnkHrNXbP3.2IrD8e',
      roles: [UserRole.ADMIN],
      isActive: true,
      isMfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (loginDto.email !== mockUser.email) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, mockUser.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = randomUUID();
    const jti = randomUUID();

    const permissions = this.getPermissionsForRoles(mockUser.roles);

    const payload: JWTPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      roles: mockUser.roles,
      permissions,
      sessionId,
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 900, // 15 minutes
    };

    const refreshPayload: JWTRefreshPayload = {
      sub: mockUser.id,
      sessionId,
      jti,
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 604800, // 7 days
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // TODO: Save session and refresh token to database

    const authUser: AuthUser = {
      id: mockUser.id,
      email: mockUser.email,
      roles: mockUser.roles,
      permissions,
      isActive: mockUser.isActive,
      isMfaEnabled: mockUser.isMfaEnabled,
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
    };

    return {
      accessToken,
      refreshToken,
      user: authUser,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify<JWTRefreshPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // TODO: Validate refresh token exists in database
      // TODO: Get user from database

      const mockUser = {
        id: payload.sub,
        email: 'admin@bluelight-hub.com',
        roles: [UserRole.ADMIN],
      };

      const permissions = this.getPermissionsForRoles(mockUser.roles);
      const newSessionId = randomUUID();

      const newPayload: JWTPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        roles: mockUser.roles,
        permissions,
        sessionId: newSessionId,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      const newRefreshPayload: JWTRefreshPayload = {
        sub: mockUser.id,
        sessionId: newSessionId,
        jti: randomUUID(),
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 604800,
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newRefreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      });

      // TODO: Update session in database

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (_error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(_sessionId: string): Promise<void> {
    // TODO: Invalidate session in database
  }

  private getPermissionsForRoles(roles: UserRole[]): Permission[] {
    const permissions = new Set<Permission>();

    for (const role of roles) {
      const rolePermissions = RolePermissions[role] || [];
      rolePermissions.forEach((permission) => permissions.add(permission));
    }

    return Array.from(permissions);
  }
}
