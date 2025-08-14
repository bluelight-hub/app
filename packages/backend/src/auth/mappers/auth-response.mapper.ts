import { LogoutResponseDto } from '../dto/logout-response.dto';
import { RefreshResponseDto } from '../dto/refresh-response.dto';

export class AuthResponseMapper {
  /**
   * Erstellt eine Logout-Response
   *
   * @returns Logout-Response-DTO
   */
  static toLogoutResponseDto(): LogoutResponseDto {
    return {
      message: 'Erfolgreich abgemeldet',
    };
  }

  /**
   * Erstellt eine Token-Refresh-Response
   *
   * Hinweis: Access- und Refresh-Token werden als HttpOnly-Cookies gesetzt;
   * die Response enthält nur den Erfolgsstatus.
   * @returns Refresh-Response-DTO
   */
  static toRefreshResponseDto(): RefreshResponseDto {
    return {
      success: true,
    };
  }
}
