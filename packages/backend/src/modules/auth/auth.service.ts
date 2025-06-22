import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
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
  UserRole,
  RolePermissions,
} from './types/jwt.types';
import { PrismaService } from '@/prisma/prisma.service';
import { DefaultRolePermissions } from './constants';
import { MfaService } from './services/mfa.service';

/**
 * Service responsible for authentication operations including login, token refresh, and logout.
 * Handles JWT token generation and validation for users.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private mfaService: MfaService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Check if user is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed login count
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: { increment: 1 },
          // Lock account after 5 failed attempts for 30 minutes
          lockedUntil: user.failedLoginCount >= 4 ? new Date(Date.now() + 30 * 60 * 1000) : null,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login count and update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const sessionId = randomUUID();
    const jti = randomUUID();

    // Get permissions for user role from database
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: user.role },
      select: { permission: true },
    });

    let permissions = rolePermissions.map((rp) => rp.permission as Permission);

    // Fallback to default permissions if none found in database
    if (permissions.length === 0) {
      this.logger.warn(`No permissions found in database for role ${user.role}, using defaults`);
      permissions = DefaultRolePermissions[user.role as UserRole] || [];
    }

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: [user.role as UserRole],
      permissions,
      sessionId,
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 900, // 15 minutes
    };

    const refreshPayload: JWTRefreshPayload = {
      sub: user.id,
      sessionId,
      jti,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Create session in database
    const expiresAt = new Date(Date.now() + 604800 * 1000); // 7 days
    await this.prisma.session.create({
      data: {
        jti,
        userId: user.id,
        expiresAt,
      },
    });

    // Create refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        sessionJti: jti,
        expiresAt,
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      roles: [user.role as UserRole],
      permissions,
      isActive: user.isActive,
      isMfaEnabled: user.isMfaEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Check if user has MFA enabled
    if (user.isMfaEnabled) {
      // Generate MFA challenge ID
      const mfaChallengeId = randomUUID();

      // Store challenge in session/cache (for now, we'll include it in response)
      // In production, this should be stored in Redis or similar

      return {
        accessToken: '', // Don't provide access token yet
        refreshToken: '', // Don't provide refresh token yet
        user: authUser,
        requiresMfa: true,
        mfaChallengeId,
      };
    }

    return {
      accessToken,
      refreshToken,
      user: authUser,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    try {
      this.jwtService.verify<JWTRefreshPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Check if refresh token exists and is valid
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.isUsed || storedToken.isRevoked) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      const user = storedToken.user;

      if (!user.isActive) {
        throw new UnauthorizedException('Account is disabled');
      }

      // Get permissions for user role from database
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: { role: user.role },
        select: { permission: true },
      });

      let permissions = rolePermissions.map((rp) => rp.permission as Permission);

      // Fallback to default permissions if none found in database
      if (permissions.length === 0) {
        this.logger.warn(`No permissions found in database for role ${user.role}, using defaults`);
        permissions = DefaultRolePermissions[user.role as UserRole] || [];
      }

      const newSessionId = randomUUID();
      const newJti = randomUUID();

      const newPayload: JWTPayload = {
        sub: user.id,
        email: user.email,
        roles: [user.role as UserRole],
        permissions,
        sessionId: newSessionId,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
      };

      const newRefreshPayload: JWTRefreshPayload = {
        sub: user.id,
        sessionId: newSessionId,
        jti: newJti,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 604800,
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newRefreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      });

      // Mark old refresh token as used
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // Create new session
      const expiresAt = new Date(Date.now() + 604800 * 1000); // 7 days
      await this.prisma.session.create({
        data: {
          jti: newJti,
          userId: user.id,
          expiresAt,
        },
      });

      // Create new refresh token
      await this.prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          sessionJti: newJti,
          expiresAt,
        },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (_error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(sessionId: string): Promise<void> {
    // Invalidate session in database
    await this.prisma.session.updateMany({
      where: {
        jti: sessionId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'User logout',
      },
    });

    // Invalidate associated refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: {
        sessionJti: sessionId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      roles: [user.role as UserRole],
      permissions: this.getRolePermissions(user.role as UserRole),
      isActive: user.isActive,
      isMfaEnabled: user.isMfaEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private getRolePermissions(role: UserRole): Permission[] {
    return RolePermissions[role] || [];
  }

  async verifyMfaAndLogin(
    userId: string,
    mfaCode?: string,
    webAuthnResponse?: any,
  ): Promise<LoginResponse> {
    // Verify user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    // Verify MFA
    let mfaVerified = false;

    if (webAuthnResponse) {
      // WebAuthn verification is handled in the controller with challenge
      mfaVerified = true;
    } else if (mfaCode) {
      // Verify TOTP code
      mfaVerified = await this.mfaService.validateTotp(userId, mfaCode);
    }

    if (!mfaVerified) {
      throw new UnauthorizedException('MFA verification failed');
    }

    // Generate tokens with MFA flag
    const sessionId = randomUUID();
    const jti = randomUUID();

    // Get permissions for user role from database
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: user.role },
      select: { permission: true },
    });

    let permissions = rolePermissions.map((rp) => rp.permission as Permission);

    // Fallback to default permissions if none found in database
    if (permissions.length === 0) {
      this.logger.warn(`No permissions found in database for role ${user.role}, using defaults`);
      permissions = DefaultRolePermissions[user.role as UserRole] || [];
    }

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: [user.role as UserRole],
      permissions,
      sessionId,
      mfa: true, // Set MFA flag to true
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 900, // 15 minutes
    };

    const refreshPayload: JWTRefreshPayload = {
      sub: user.id,
      sessionId,
      jti,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Create session in database
    const expiresAt = new Date(Date.now() + 604800 * 1000); // 7 days
    await this.prisma.session.create({
      data: {
        jti,
        userId: user.id,
        expiresAt,
      },
    });

    // Create refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        sessionJti: jti,
        expiresAt,
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      roles: [user.role as UserRole],
      permissions,
      isActive: user.isActive,
      isMfaEnabled: user.isMfaEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      accessToken,
      refreshToken,
      user: authUser,
    };
  }
}
