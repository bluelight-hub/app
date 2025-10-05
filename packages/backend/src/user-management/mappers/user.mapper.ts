import type { User } from '@prisma/client';
import type { UserDto } from '../dto/user-management-response.dto';

/**
 * Konvertiert ein Prisma User-Objekt in ein sicheres UserDto
 *
 * Entfernt implizit sensitive Felder, indem nur explizit erlaubte Felder
 * in das DTO übernommen werden.
 */
export function toUserDto(user: Pick<User, 'id' | 'username' | 'role' | 'createdAt' | 'updatedAt' | 'isLocked' | 'lockReason'>): UserDto {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isLocked: user.isLocked,
    lockReason: user.lockReason,
  };
}
