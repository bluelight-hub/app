import { User } from '@prisma/client';
import { UserResponseDto } from './dto/user-response.dto';

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
