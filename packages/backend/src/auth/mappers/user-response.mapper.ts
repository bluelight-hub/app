import { User } from '@prisma/client';
import { UserResponseDto } from '../dto/user-response.dto';

export class UserResponseMapper {
  /**
   * Konvertiert ein Prisma User-Objekt in einen sicheren UserResponseDto
   *
   * Entfernt sensitive Felder wie:
   * - passwordHash
   * - failedLoginCount
   * - lockedUntil
   *
   * @param user - Das vollständige User-Objekt aus der Datenbank
   * @returns Gefiltertes User-Objekt für API-Responses
   */
  static toUserResponseDto(user: User): UserResponseDto {
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
}
