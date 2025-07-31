import { ApiProperty } from '@nestjs/swagger';

/**
 * Audit Log Statistiken Response
 *
 * DTO für die Rückgabe aggregierter Audit-Log-Statistiken.
 * Enthält verschiedene Metriken zur Analyse von Systemaktivitäten
 * und Benutzerverhalten.
 *
 * @class AuditLogStatisticsResponse
 * @example
 * ```typescript
 * const statistics: AuditLogStatisticsResponse = {
 *   totalLogs: 1234,
 *   actionTypes: { CREATE: 100, READ: 500 },
 *   severities: { LOW: 300, HIGH: 100 },
 *   successRate: { success: 900, failed: 100 },
 *   topUsers: [{ userId: '123', userEmail: 'user@example.com', count: 50 }],
 *   topResources: [{ resource: 'users', count: 100 }]
 * };
 * ```
 */
export class AuditLogStatisticsResponse {
  /**
   * Gesamtzahl aller Audit-Log-Einträge
   * @example 1234
   */
  @ApiProperty({
    description: 'Gesamtzahl der Logs',
    example: 1234,
  })
  totalLogs: number;

  /**
   * Verteilung der Logs nach Aktionstyp
   * Schlüssel sind die Aktionstypen, Werte die Anzahl der Vorkommen
   * @example { CREATE: 100, READ: 500, UPDATE: 200, DELETE: 50 }
   */
  @ApiProperty({
    description: 'Statistiken nach Aktionstyp',
    example: { CREATE: 100, READ: 500, UPDATE: 200, DELETE: 50 },
  })
  actionTypes: Record<string, number>;

  /**
   * Verteilung der Logs nach Schweregrad
   * Zeigt die Häufigkeit verschiedener Schweregrade
   * @example { LOW: 300, MEDIUM: 200, HIGH: 100, CRITICAL: 50 }
   */
  @ApiProperty({
    description: 'Statistiken nach Schweregrad',
    example: { LOW: 300, MEDIUM: 200, HIGH: 100, CRITICAL: 50 },
  })
  severities: Record<string, number>;

  /**
   * Erfolgsrate der protokollierten Aktionen
   * Unterteilt in erfolgreiche und fehlgeschlagene Operationen
   * @example { success: 900, failed: 100 }
   */
  @ApiProperty({
    description: 'Erfolgsrate',
    example: { success: 900, failed: 100 },
  })
  successRate: Record<string, number>;

  /**
   * Die 10 aktivsten Benutzer nach Anzahl der Aktionen
   * Nützlich zur Identifikation von Power-Usern oder abnormalem Verhalten
   * @example [{ userId: '123', userEmail: 'user@example.com', count: 50 }]
   */
  @ApiProperty({
    description: 'Top 10 Benutzer nach Aktivität',
    isArray: true,
    example: [{ userId: '123', userEmail: 'user@example.com', count: 50 }],
  })
  topUsers: Array<{
    /** Eindeutige Benutzer-ID */
    userId: string;
    /** E-Mail-Adresse des Benutzers */
    userEmail: string;
    /** Anzahl der Aktionen dieses Benutzers */
    count: number;
  }>;

  /**
   * Die 10 häufigsten zugegriffenen Ressourcen
   * Hilft bei der Identifikation kritischer oder häufig genutzter Bereiche
   * @example [{ resource: 'users', count: 100 }]
   */
  @ApiProperty({
    description: 'Top 10 Ressourcen nach Zugriff',
    isArray: true,
    example: [{ resource: 'users', count: 100 }],
  })
  topResources: Array<{
    /** Name der Ressource (z.B. 'users', 'sessions', 'alerts') */
    resource: string;
    /** Anzahl der Zugriffe auf diese Ressource */
    count: number;
  }>;
}
