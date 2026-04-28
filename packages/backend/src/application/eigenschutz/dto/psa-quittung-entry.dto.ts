import { ApiProperty } from '@nestjs/swagger';

/**
 * Status einer PSA-Quittung pro Einheit (Story 3.4 AC8).
 *
 * - `AUSSTEHEND`: Die Einheit hat noch nicht quittiert.
 * - `QUITTIERT`: Die Einheit hat quittiert (`quittiertAm` + `quittiertVonUserId` gesetzt).
 *
 * `OVERDUE` ist als vierter State für Story 3.7 (Re-Prompt-Scheduler)
 * vorgesehen, wird aber von Story 3.4 nicht emittiert.
 */
export type PsaQuittungStatus = 'AUSSTEHEND' | 'QUITTIERT';

/**
 * Response-Element für `GET /psa-profile/propagation-groups/:propagationGroupId/quittungen`
 * (Story 3.4 AC8).
 *
 * Wird vom Sender-View (Stab-Sicht, `AcknowledgmentStatusBadge`) genutzt:
 * eine Zeile pro erwartetem Empfänger der Bekanntgabe-Gruppe — alle
 * `einheitIds`, an die die ursprüngliche `PsaProfilGeaendert`-Bekanntgabe
 * ging. Die Outbox liefert das erwartete Set; die `PsaProfilQuittung`-
 * Tabelle den aktuellen Quittungs-Stand.
 */
export class PsaQuittungEntryDto {
  @ApiProperty({ description: 'cuid2 der erwarteten Empfänger-Einheit.', example: 'clw3h8x9y0000qwertyui00050' })
  einheitId!: string;

  @ApiProperty({ description: 'Anzeigename der Einheit zum Antwort-Zeitpunkt (Refetch).', example: '1. Sanitätsgruppe' })
  einheitName!: string;

  @ApiProperty({
    description: 'Quittungs-Status der Einheit: `AUSSTEHEND` (noch nicht quittiert) oder `QUITTIERT`.',
    enum: ['AUSSTEHEND', 'QUITTIERT'],
    example: 'QUITTIERT',
  })
  status!: PsaQuittungStatus;

  @ApiProperty({
    description: 'ISO-DateTime der Quittung. Nur gesetzt bei `status === "QUITTIERT"`.',
    required: false,
    example: '2026-04-27T08:42:13.000Z',
  })
  quittiertAm?: string;

  @ApiProperty({
    description: 'cuid2 des Users, der für die Einheit quittiert hat. Nur gesetzt bei `status === "QUITTIERT"`.',
    required: false,
    example: 'clw3h8x9y0000qwertyui00099',
  })
  quittiertVonUserId?: string;

  @ApiProperty({
    description: 'Anzeigename des quittierenden Users (Phase-2-Enrichment).',
    required: false,
    example: 'Sanitäter Max Müller',
  })
  quittiertVonUserName?: string;
}
