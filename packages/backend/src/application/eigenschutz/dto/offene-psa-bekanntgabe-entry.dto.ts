import { ApiProperty } from '@nestjs/swagger';
import type { PsaProfil } from '@/generated/prisma/enums';
import type { PsaProfilAktion } from '@domain/eigenschutz/events/psa-profil-geaendert.event';

/**
 * Aggregations-Status einer offenen PSA-Bekanntgabe-Gruppe (Story 3.4 AC15).
 *
 * - `pending`: keine Einheit hat quittiert (`ackCount === 0`).
 * - `partial`: mindestens eine, aber nicht alle Einheiten haben quittiert.
 *
 * `complete` ist im Aggregations-Status definiert, wird aber vom Endpoint
 * NICHT zurückgegeben — vollständig quittierte Gruppen verschwinden aus
 * der „Offene Bekanntgaben"-Liste (vgl. UX-Spec „Banner verschwindet").
 */
export type OffenePsaBekanntgabeStatus = 'pending' | 'partial';

/**
 * Toggle-Eintrag innerhalb einer Bekanntgabe-Gruppe — was wurde aktiviert/
 * deaktiviert. Entspricht den `(profil, aktion)`-Tupeln aus den
 * `PsaProfilGeaendert`-Events der Gruppe (deduppliziert).
 */
export class OffenePsaBekanntgabeProfilToggleDto {
  @ApiProperty({ description: 'PSA-Profil-Stufe (Enum).', example: 'BASIS' })
  profil!: PsaProfil;

  @ApiProperty({
    description: 'Aktion auf das Profil — `AKTIVIERT` oder `DEAKTIVIERT`.',
    enum: ['AKTIVIERT', 'DEAKTIVIERT'],
    example: 'AKTIVIERT',
  })
  aktion!: PsaProfilAktion;
}

/**
 * Response-Element für
 * `GET /psa-profile/propagation-groups/offene-bekanntgaben?seit=<ISO>`
 * (Story 3.4 AC15).
 *
 * Eine Zeile pro offener Bekanntgabe-Gruppe (`status !== 'complete'`),
 * sortiert nach `occurredAt DESC`. Die Aggregation läuft über die Outbox
 * (`PsaProfilGeaendert`-Events der Gruppe) plus Quittungs-Tabelle.
 */
export class OffenePsaBekanntgabeEntryDto {
  @ApiProperty({ description: 'cuid2 der Bekanntgabe-Gruppe (lebt im Event-Stream, kein FK).', example: 'clw3h8x9y0000qwertyuipgrp01' })
  propagationGroupId!: string;

  @ApiProperty({
    description: 'ISO-DateTime, wann die ursprüngliche Bekanntgabe ausgelöst wurde (älteste `occurredAt` der Gruppe).',
    example: '2026-04-27T08:39:11.000Z',
  })
  occurredAt!: string;

  @ApiProperty({
    description: 'Begründungs-Anriss (max 80 Zeichen) aus dem ersten `PsaProfilGeaendert`-Event der Gruppe.',
    example: 'CBRN-Lage gemeldet, FFP3 für Eingreif-Trupps anziehen.',
  })
  begruendungAnriss!: string;

  @ApiProperty({
    description: 'Liste der durch die Bekanntgabe geänderten Profile mit Aktion (deduppliziert).',
    type: () => OffenePsaBekanntgabeProfilToggleDto,
    isArray: true,
  })
  profilToggles!: OffenePsaBekanntgabeProfilToggleDto[];

  @ApiProperty({
    description: 'cuid2-Liste aller Empfänger-Einheiten der Bekanntgabe.',
    type: String,
    isArray: true,
    example: ['clw3h8x9y0000qwertyui00050', 'clw3h8x9y0000qwertyui00051'],
  })
  betroffeneEinheitIds!: string[];

  @ApiProperty({
    description: 'Anzahl der Einheiten, die bereits quittiert haben.',
    example: 2,
  })
  ackCount!: number;

  @ApiProperty({
    description: 'Gesamt-Anzahl erwarteter Empfänger-Einheiten.',
    example: 5,
  })
  totalCount!: number;

  @ApiProperty({
    description: 'Aggregations-Status: `pending` (keine Quittung) oder `partial` (teilquittiert). `complete` wird ausgefiltert.',
    enum: ['pending', 'partial'],
    example: 'partial',
  })
  status!: OffenePsaBekanntgabeStatus;
}
