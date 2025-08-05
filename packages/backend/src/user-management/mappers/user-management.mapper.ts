import { DeleteUserResponseData } from '@bluelight-hub/shared/client';

/**
 * Erstellt eine Lösch-Response für einen Benutzer
 *
 * @param id - Die ID des gelöschten Benutzers
 * @returns Lösch-Response-DTO
 */
export function toDeleteUserResponseDto(id: string): DeleteUserResponseData {
  return {
    id,
    deleted: true,
  };
}
