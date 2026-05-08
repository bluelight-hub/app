import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Ampelstatus, PsaProfil } from '@/generated/prisma/enums';

export class AmpelProjectionDto {
  @ApiProperty({ description: 'CUID des Einsatzes' })
  einsatzId!: string;

  @ApiProperty({ description: 'CUID der Einsatzeinheit' })
  einheitId!: string;

  @ApiProperty({ description: 'Berechneter Ampelstatus', enum: Ampelstatus })
  status!: Ampelstatus;

  @ApiProperty({ description: 'Aktive PSA-Profile der Einheit', enum: PsaProfil, isArray: true })
  aktivePsaProfile!: PsaProfil[];

  @ApiProperty({ description: 'Offene hohe Gefährdungen ohne ausreichende Schutzmaßnahme' })
  offeneGefaehrdungenHoch!: number;

  @ApiProperty({ description: 'Ausstehende PSA-Quittungen' })
  ausstehendePsaQuittungen!: number;

  @ApiProperty({ description: 'Ausstehende Sicherheitsregel-Quittungen' })
  ausstehendeRegelQuittungen!: number;

  @ApiProperty({ description: 'Offene Eigenschutz-Vorfälle' })
  offeneVorfaelle!: number;

  @ApiProperty({ description: 'Ungelöste Ausrüstungs-Rückmeldungen' })
  ungeloesteRueckmeldungen!: number;

  @ApiProperty({ description: 'Zeitpunkt der letzten relevanten Änderung (ISO 8601)' })
  letzteAenderungAm!: Date;

  @ApiPropertyOptional({ description: 'User-ID der letzten relevanten Änderung', nullable: true, type: String })
  letzteAenderungVonUserId!: string | null;
}
