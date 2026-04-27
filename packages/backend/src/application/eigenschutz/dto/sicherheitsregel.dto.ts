import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response-DTO für eine Sicherheitsregel (Story 2.6 AC6).
 *
 * Wird von `GET/POST/PUT /einsatz/:einsatzId/sicherheitsregeln[/:id]` geliefert.
 * Fanout-Konsistenz: bei Multi-Einheiten-Create liefert der POST ein Array
 * dieser DTOs — die Einzel-Row-Darstellung bleibt identisch.
 *
 * Hinweis zu `propagationGroupId`: Die ID lebt laut Story-Dev-Notes
 * ausschließlich im Event-Payload der initialen Version. Das Repository liest
 * sie für das Read-Model aus dieser Version-Zeile und hängt sie ans DTO — für
 * Audit- und Consumer-Zwecke (Story 2.7 ACK, Epic 6.1 Ampel).
 */
export class SicherheitsregelDto {
  @ApiProperty({ description: 'CUID der Sicherheitsregel' })
  id!: string;

  @ApiProperty({ description: 'CUID des Einsatzes' })
  einsatzId!: string;

  @ApiPropertyOptional({ description: 'CUID der zugeordneten Einsatzeinheit (`null` = einsatzweit)', type: String, nullable: true })
  einheitId!: string | null;

  @ApiProperty({ description: 'Abgeleitetes Flag: `true` wenn die Regel einsatzweit gilt (`einheitId === null`)' })
  einsatzweit!: boolean;

  @ApiProperty({ description: 'Titel der Regel (1–80 Zeichen)' })
  titel!: string;

  @ApiProperty({ description: 'Inhalt der Regel (1–2000 Zeichen, Plain-Text)' })
  inhalt!: string;

  @ApiProperty({ description: 'Versionsnummer (monoton steigend, OCC-Token für Updates)' })
  version!: number;

  @ApiProperty({ description: 'Zeitpunkt der Erstellung (ISO 8601)' })
  erstelltAm!: string;

  @ApiProperty({ description: 'User-ID des Erstellers' })
  erstelltVonUserId!: string;

  @ApiProperty({ description: 'Zeitpunkt der letzten Änderung (ISO 8601)' })
  aktualisiertAm!: string;

  @ApiProperty({ description: 'User-ID des letzten Bearbeiters' })
  aktualisiertVonUserId!: string;

  @ApiProperty({ description: 'Logische Propagation-Gruppen-ID — identisch für alle Fanout-Rows desselben Create-/Re-Wire-Aufrufs' })
  propagationGroupId!: string;
}
