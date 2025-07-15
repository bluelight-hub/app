import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { LoginDto } from './dto';
import { AuthUser, LoginResponse, TokenResponse } from './types/auth.types';
import { JWTPayload, JWTRefreshPayload, Permission, UserRole } from './types/jwt.types';
import { PrismaService } from '@/prisma/prisma.service';
import { DefaultRolePermissions } from './constants';
import { LOGIN_SECURITY, SecurityEventType, TOKEN_CONFIG } from './constants/auth.constants';
import {
  AccountDisabledException,
  AccountLockedException,
  InvalidCredentialsException,
  InvalidTokenException,
  RefreshRateLimitExceededException,
  TokenRevokedException,
} from './exceptions/auth.exceptions';
import { SessionCleanupService } from './services/session-cleanup.service';
import { LoginAttemptService } from './services/login-attempt.service';
import { SessionService } from '../session/session.service';

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
    private sessionCleanupService: SessionCleanupService,
    private loginAttemptService: LoginAttemptService,
    @Inject(forwardRef(() => SessionService))
    private sessionService: SessionService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    // Check IP rate limit first
    if (ipAddress) {
      const isIpRateLimited = await this.loginAttemptService.checkIpRateLimit(ipAddress);
      if (isIpRateLimited) {
        this.logger.warn(`IP rate limit exceeded for: ${ipAddress}`);
        throw new InvalidCredentialsException(
          0,
          'Too many attempts from this IP. Please try again later.',
        );
      }
    }

    // Check if account is already locked
    const isLocked = await this.loginAttemptService.isAccountLocked(loginDto.email);
    if (isLocked) {
      // Record the failed attempt
      await this.loginAttemptService.recordLoginAttempt({
        email: loginDto.email,
        ipAddress: ipAddress || 'unknown',
        userAgent,
        success: false,
        failureReason: 'Account locked',
      });

      const user = await this.prisma.user.findUnique({
        where: { email: loginDto.email },
        select: { lockedUntil: true },
      });

      throw new AccountLockedException(user?.lockedUntil || new Date());
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      // Record failed attempt for non-existent user
      await this.loginAttemptService.recordLoginAttempt({
        email: loginDto.email,
        ipAddress: ipAddress || 'unknown',
        userAgent,
        success: false,
        failureReason: 'User not found',
      });

      this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
      throw new InvalidCredentialsException();
    }

    // Check if user is active
    if (!user.isActive) {
      // Record failed attempt for disabled account
      await this.loginAttemptService.recordLoginAttempt({
        userId: user.id,
        email: loginDto.email,
        ipAddress: ipAddress || 'unknown',
        userAgent,
        success: false,
        failureReason: 'Account disabled',
      });

      this.logger.warn(`Login attempt for disabled account: ${user.id}`);
      throw new AccountDisabledException();
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      // Record failed login attempt
      await this.loginAttemptService.recordLoginAttempt({
        userId: user.id,
        email: loginDto.email,
        ipAddress: ipAddress || 'unknown',
        userAgent,
        success: false,
        failureReason: 'Invalid password',
      });

      // Check if account should be locked
      const lockoutResult = await this.loginAttemptService.checkAndUpdateLockout(loginDto.email);

      if (lockoutResult.isLocked) {
        this.logSecurityEvent(SecurityEventType.ACCOUNT_LOCKED, user.id, {
          lockedUntil: lockoutResult.lockedUntil,
        });
        throw new AccountLockedException(lockoutResult.lockedUntil!);
      }

      // Calculate remaining attempts
      const windowStart = new Date(Date.now() - 15 * 60 * 1000); // 15 minute window
      const recentFailedAttempts = await this.prisma.loginAttempt.count({
        where: {
          email: loginDto.email,
          success: false,
          attemptAt: { gte: windowStart },
        },
      });

      const remainingAttempts = Math.max(
        0,
        LOGIN_SECURITY.MAX_FAILED_ATTEMPTS - recentFailedAttempts,
      );

      // Send alert if failed attempts reach warning threshold
      if (
        recentFailedAttempts >= 3 && // Multiple failed attempts warning threshold
        remainingAttempts > 0
      ) {
        await this.loginAttemptService.checkMultipleFailedAttempts(
          loginDto.email,
          user.id,
          recentFailedAttempts,
          remainingAttempts,
          ipAddress,
        );
      }

      this.logger.warn(
        `Failed login attempt for user: ${user.id}, remaining attempts: ${remainingAttempts}`,
      );
      throw new InvalidCredentialsException(remainingAttempts);
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

    // Record successful login attempt
    await this.loginAttemptService.recordLoginAttempt({
      userId: user.id,
      email: loginDto.email,
      ipAddress: ipAddress || 'unknown',
      userAgent,
      success: true,
    });

    // Reset failed attempts counter
    await this.loginAttemptService.resetFailedAttempts(loginDto.email);

    // Check session limit before creating new session
    await this.sessionCleanupService.enforceSessionLimit(user.id);

    const jti = randomUUID();
    const sessionId = jti; // Use jti as sessionId for consistency

    // Get permissions for user role
    const permissions = await this.getUserPermissions(user.role as UserRole);

    // Generate tokens with consistent time calculation
    const { accessToken, refreshToken } = this.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      permissions,
      sessionId,
      jti,
    });

    // Create session and refresh token in database
    const expiresAt = new Date(Date.now() + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

    await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          jti,
          userId: user.id,
          expiresAt,
          ipAddress,
          userAgent,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          sessionJti: jti,
          expiresAt,
        },
      }),
    ]);

    // Enhance session with monitoring data
    if (ipAddress && userAgent) {
      await this.sessionService.enhanceSession(jti, ipAddress, userAgent, 'password');
    }

    // Log successful login
    this.logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, user.id, {
      sessionId,
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      roles: [user.role as UserRole],
      permissions,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

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
    } catch (_error) {
      this.logger.warn('Invalid refresh token presented');
      throw new InvalidTokenException('Token verification failed');
    }

    // Check if refresh token exists and is valid
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      this.logger.warn('Refresh token not found in database');
      throw new InvalidTokenException('Token not found');
    }

    if (storedToken.isRevoked) {
      this.logger.warn(`Attempt to use revoked refresh token for user: ${storedToken.userId}`);
      this.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, storedToken.userId, {
        reason: 'Attempted to use revoked token',
      });
      throw new TokenRevokedException();
    }

    if (storedToken.isUsed) {
      // Token reuse detected - potential security breach
      this.logger.error(`Refresh token reuse detected for user: ${storedToken.userId}`);
      this.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, storedToken.userId, {
        reason: 'Token reuse detected',
      });

      // Revoke all user sessions as a security measure
      await this.sessionCleanupService.revokeAllUserSessions(
        storedToken.userId,
        'Token reuse detected',
      );

      throw new InvalidTokenException('Token reuse detected');
    }

    if (storedToken.expiresAt < new Date()) {
      this.logger.warn(`Expired refresh token used for user: ${storedToken.userId}`);
      throw new InvalidTokenException('Token expired');
    }

    const user = storedToken.user;

    if (!user.isActive) {
      throw new AccountDisabledException();
    }

    // Check rate limiting
    const rateLimitCheck = await this.sessionCleanupService.checkRefreshRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      this.logger.warn(`Refresh rate limit exceeded for user: ${user.id}`);
      this.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, user.id, {
        reason: 'Refresh rate limit exceeded',
      });
      throw new RefreshRateLimitExceededException(rateLimitCheck.retryAfter!);
    }

    // Get current permissions
    const permissions = await this.getUserPermissions(user.role as UserRole);

    const newSessionId = randomUUID();
    const newJti = randomUUID();

    // Generate new token pair
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = this.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      permissions,
      sessionId: newSessionId,
      jti: newJti,
    });

    // Perform token rotation in transaction
    const expiresAt = new Date(Date.now() + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

    await this.prisma.$transaction([
      // Mark old refresh token as used
      this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      }),
      // Create new session
      this.prisma.session.create({
        data: {
          jti: newJti,
          userId: user.id,
          expiresAt,
        },
      }),
      // Create new refresh token
      this.prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          sessionJti: newJti,
          expiresAt,
        },
      }),
    ]);

    // Log successful token refresh
    this.logSecurityEvent(SecurityEventType.TOKEN_REFRESH, user.id, {
      oldSessionId: storedToken.sessionJti,
      newSessionId: newSessionId,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(sessionId: string): Promise<void> {
    // Invalidate session and tokens in transaction
    const results = await this.prisma.$transaction([
      // Invalidate session in database
      this.prisma.session.updateMany({
        where: {
          jti: sessionId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'User logout',
        },
      }),
      // Invalidate associated refresh tokens
      this.prisma.refreshToken.updateMany({
        where: {
          sessionJti: sessionId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      }),
    ]);

    if (results[0].count > 0) {
      // Get user ID from session for logging
      const session = await this.prisma.session.findUnique({
        where: { jti: sessionId },
        select: { userId: true },
      });

      if (session) {
        this.logSecurityEvent(SecurityEventType.LOGOUT, session.userId, {
          sessionId,
        });
      }
    }
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new InvalidTokenException('User not found');
    }

    const permissions = await this.getUserPermissions(user.role as UserRole);

    return {
      id: user.id,
      email: user.email,
      roles: [user.role as UserRole],
      permissions,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Holt die Berechtigungen für eine Rolle aus der Datenbank oder verwendet Standardwerte.
   * Zentralisierte Methode zur Vermeidung von Code-Duplikation.
   */
  private async getUserPermissions(role: UserRole): Promise<Permission[]> {
    // Get permissions from database
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role },
      select: { permission: true },
    });

    let permissions = rolePermissions.map((rp) => rp.permission as Permission);

    // Fallback to default permissions if none found in database
    if (permissions.length === 0) {
      this.logger.warn(`No permissions found in database for role ${role}, using defaults`);
      permissions = DefaultRolePermissions[role] || [];
    }

    return permissions;
  }

  /**
   * Generiert ein neues Token-Paar (Access und Refresh Token).
   * Zentralisierte Token-Generierung für Konsistenz.
   */
  private generateTokenPair(params: {
    userId: string;
    email: string;
    role: UserRole;
    permissions: Permission[];
    sessionId: string;
    jti: string;
  }): { accessToken: string; refreshToken: string } {
    const now = Math.floor(Date.now() / 1000);

    const payload: JWTPayload = {
      sub: params.userId,
      email: params.email,
      roles: [params.role],
      permissions: params.permissions,
      sessionId: params.sessionId,
      iat: now,
      exp: now + TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS,
    };

    const refreshPayload: JWTRefreshPayload = {
      sub: params.userId,
      sessionId: params.sessionId,
      jti: params.jti,
      iat: now,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_STRING,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Protokolliert sicherheitsrelevante Ereignisse.
   * Kann später mit einem Audit-Log-System verbunden werden.
   */
  private logSecurityEvent(
    event: SecurityEventType,
    userId: string,
    details?: Record<string, any>,
  ): void {
    this.logger.log({
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}
