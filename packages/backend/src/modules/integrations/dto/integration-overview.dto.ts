/**
 * IntegrationOverview DTOs - Swagger-dekorierte Response DTOs fuer die Integrationsübersicht.
 *
 * @module modules/integrations/dto
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO fuer eine einzelne Integration in der Uebersicht.
 */
export class IntegrationOverviewItemResponseDto {
  @ApiProperty({ description: 'Eindeutiger Service-Schlüssel', example: 'hiorg-server' })
  serviceKey!: string;

  @ApiProperty({ description: 'Anzeigename der Integration', example: 'HiOrg-Server' })
  displayName!: string;

  @ApiProperty({
    description: 'Aggregierter Status der Integration',
    enum: ['verbunden', 'unterbrochen', 'erneute_anmeldung_erforderlich', 'wird_ueberprueft', 'deaktiviert', 'nicht_konfiguriert'],
    example: 'verbunden',
  })
  status!: string;

  @ApiProperty({ description: 'Human-readable Status-Label', example: 'Verbunden' })
  statusLabel!: string;

  @ApiProperty({
    description: 'Circuit Breaker Zustand',
    enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
    example: 'CLOSED',
  })
  circuitBreakerState!: string;

  @ApiProperty({ description: 'Anzahl Fehler im Rolling Window', example: 0 })
  failureCount!: number;

  @ApiProperty({ description: 'Fehlerrate in Prozent', example: 0 })
  errorRate!: number;

  @ApiProperty({ description: 'Letzter erfolgreicher Aufruf (ISO 8601)', example: '2026-03-23T10:00:00.000Z', nullable: true })
  lastSuccessAt!: string | null;

  @ApiProperty({ description: 'Letzter fehlgeschlagener Aufruf (ISO 8601)', example: null, nullable: true })
  lastFailureAt!: string | null;

  @ApiProperty({ description: 'Letzter manueller Verbindungstest (ISO 8601)', example: '2026-03-23T09:00:00.000Z', nullable: true })
  lastTestedAt!: string | null;

  @ApiProperty({ description: 'Ob Credentials konfiguriert sind', example: true })
  hasCredentials!: boolean;

  @ApiProperty({ description: 'Ob die Integration aktiviert ist', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Empfohlene nächste Aktion', example: 'Verbindung testen', nullable: true })
  suggestedAction!: string | null;
}

/**
 * Response DTO fuer die gesamte Integrationsübersicht.
 */
export class IntegrationOverviewResponseDto {
  @ApiProperty({
    description: 'Liste aller externen Integrationen mit aggregiertem Status',
    type: [IntegrationOverviewItemResponseDto],
  })
  integrations!: IntegrationOverviewItemResponseDto[];
}
