import { User } from '@prisma/client';
import { UserResponseDto } from './dto/user-response.dto';
import { AdminLoginResponseDto } from './dto/admin-login-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { AdminSetupResponseDto } from './dto/admin-setup-response.dto';
import { AdminSetupUserDto } from './dto/admin-user.dto';
import { AdminStatusDto } from './dto/admin-status.dto';
import { AdminTokenVerificationDto } from './dto/admin-token-verification.dto';

/**
 * Konvertiert ein Prisma User-Objekt in einen sicheren UserResponseDto
 *
 * Entfernt sensitive Felder wie:
 * - passwordHash
 * - failedLoginCount
 * - lockedUntil
 * - createdBy
 *
 * @param user - Das vollständige User-Objekt aus der Datenbank
 * @returns Gefiltertes User-Objekt für API-Responses
 */
export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Erstellt eine Admin-Login-Response
 *
 * @param user - Der eingeloggte Admin-Benutzer
 * @returns Admin-Login-Response-DTO
 */
export function toAdminLoginResponseDto(
  user: Pick<User, 'id' | 'username' | 'role'>,
): AdminLoginResponseDto {
  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

/**
 * Erstellt eine Logout-Response
 *
 * @returns Logout-Response-DTO
 */
export function toLogoutResponseDto(): LogoutResponseDto {
  return {
    message: 'Erfolgreich abgemeldet',
  };
}

/**
 * Erstellt eine Token-Refresh-Response
 *
 * @param accessToken - Das neue Access-Token
 * @returns Refresh-Response-DTO
 */
export function toRefreshResponseDto(): RefreshResponseDto {
  return {
    success: true,
  };
}

/**
 * Erstellt eine Admin-Setup-Response
 *
 * @param user - Der Admin-Benutzer (ohne passwordHash)
 * @returns Admin-Setup-Response-DTO
 */
export function toAdminSetupResponseDto(user: Omit<User, 'passwordHash'>): AdminSetupResponseDto {
  const setupUser: AdminSetupUserDto = {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return {
    message: 'Admin-Setup erfolgreich durchgeführt',
    user: setupUser,
  };
}

/**
 * Erstellt eine Admin-Status-Response
 *
 * @param adminExists - Ob ein Admin existiert
 * @param userEligible - Ob der Benutzer berechtigt ist
 * @returns Admin-Status-Response-DTO
 */
export function toAdminStatusResponseDto(
  adminExists: boolean,
  userEligible: boolean,
): AdminStatusDto {
  return {
    adminSetupAvailable: userEligible,
    adminExists,
    userEligible,
  };
}

/**
 * Erstellt eine Admin-Token-Verifikation-Response
 *
 * @returns Admin-Token-Verifikation-Response-DTO
 */
export function toAdminTokenVerificationDto(): AdminTokenVerificationDto {
  return {
    ok: true,
  };
}
