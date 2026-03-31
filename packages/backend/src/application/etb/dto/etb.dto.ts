import { ApiProperty } from '@nestjs/swagger';
import { EintragDto } from './eintrag.dto';
import { EtbVersionDto } from './etb-version.dto';

/**
 * ETB (Einsatztagebuch) Response DTO für Query Operations.
 *
 * Repräsentiert ein vollständiges Einsatztagebuch mit allen Einträgen
 * und Versionierungsinformationen für die API-Rückgabe.
 *
 * **Status-Lifecycle (Issue #582):**
 * - DRAFT: Initiale Erstellung, noch nicht aktiv
 * - ACTIVE: Normaler Betrieb, Einträge können hinzugefügt werden
 *
 * Ob das ETB schreibgeschützt ist, wird aus dem Einsatz-Status abgeleitet
 * (ABGESCHLOSSEN/ARCHIVIERT → nicht editierbar). Kein eigenständiger LOCKED-Status mehr.
 */
export class EtbDto {
  @ApiProperty({
    description: 'Eindeutige ETB-ID (CUID)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'Referenz zum übergeordneten Einsatz',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  einsatzId!: string;

  @ApiProperty({
    description: 'Aktueller Status des ETB im Lifecycle',
    example: 'ACTIVE',
    enum: ['DRAFT', 'ACTIVE'],
  })
  status!: 'DRAFT' | 'ACTIVE';

  @ApiProperty({
    description: 'Liste aller Einträge im ETB (sortiert nach sequenceNumber)',
    type: () => [EintragDto],
  })
  eintraege!: EintragDto[];

  @ApiProperty({
    description: 'Aktuelle Versionsinformation für Optimistic Locking',
    type: EtbVersionDto,
  })
  version!: EtbVersionDto;

  @ApiProperty({
    description: 'Erstellungszeitpunkt des ETB',
    example: '2024-01-15T12:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt!: Date;
}
