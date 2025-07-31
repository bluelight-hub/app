import { SetMetadata } from '@nestjs/common';

/**
 * Metadaten-Schlüssel für die LogAccess-Dekoration
 */
export const LOG_ACCESS_KEY = 'log_access';

/**
 * Interface für LogAccess-Metadaten
 */
export interface LogAccessMetadata {
  /**
   * Art der Ressource, auf die zugegriffen wird
   */
  resource: string;

  /**
   * Aktion, die durchgeführt wird (z.B. 'read', 'write', 'delete')
   */
  action: string;

  /**
   * Zusätzliche Details zum Zugriff (optional)
   */
  details?: string;
}

/**
 * Decorator zum Markieren von Routen, die sensible Datenzugriffe protokollieren sollen.
 *
 * Dieser Decorator wird in Kombination mit einem Interceptor verwendet,
 * um Zugriffe auf sensible Daten zu protokollieren.
 *
 * @param resource - Art der Ressource (z.B. 'user-data', 'financial-records')
 * @param action - Durchgeführte Aktion (z.B. 'read', 'export', 'modify')
 * @param details - Optionale zusätzliche Details
 *
 * @example
 * ```typescript
 * @Controller('users')
 * export class UserController {
 *
 *   @Get(':id/financial-data')
 *   @LogAccess('financial-data', 'read', 'User financial records accessed')
 *   async getFinancialData(@Param('id') userId: string) {
 *     // Sensible Finanzdaten abrufen
 *   }
 *
 *   @Post(':id/medical-records')
 *   @LogAccess('medical-records', 'write')
 *   async updateMedicalRecords(@Param('id') userId: string, @Body() data: any) {
 *     // Medizinische Daten aktualisieren
 *   }
 *
 *   @Get('export')
 *   @LogAccess('user-database', 'export', 'Full user database export')
 *   async exportAllUsers() {
 *     // Alle Benutzerdaten exportieren
 *   }
 * }
 * ```
 */
export const LogAccess = (resource: string, action: string, details?: string) =>
  SetMetadata(LOG_ACCESS_KEY, { resource, action, details } as LogAccessMetadata);
