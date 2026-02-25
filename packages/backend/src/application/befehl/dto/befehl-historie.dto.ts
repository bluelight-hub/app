import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BefehlHistorieEventTyp {
  ERTEILT = 'ERTEILT',
  ZUGESTELLT = 'ZUGESTELLT',
  QUITTIERT = 'QUITTIERT',
  RUECKFRAGE = 'RUECKFRAGE',
  NICHT_VERSTANDEN = 'NICHT_VERSTANDEN',
  KORRIGIERT = 'KORRIGIERT',
  KOMMENTAR = 'KOMMENTAR',
}

export enum BefehlHistorieEventStatus {
  ABGESCHLOSSEN = 'ABGESCHLOSSEN',
  AKTUELL = 'AKTUELL',
  AUSSTEHEND = 'AUSSTEHEND',
}

export class BefehlHistorieEventDto {
  @ApiProperty({ enum: BefehlHistorieEventTyp, example: 'ERTEILT' })
  typ!: BefehlHistorieEventTyp;

  @ApiProperty({ enum: BefehlHistorieEventStatus, example: 'ABGESCHLOSSEN' })
  status!: BefehlHistorieEventStatus;

  @ApiPropertyOptional({ type: Date, description: 'Nullable bei AUSSTEHEND Events' })
  zeitpunkt!: Date | null;

  @ApiProperty({ example: 'Befehl #B-001 erteilt' })
  beschreibung!: string;

  @ApiPropertyOptional({ example: 'ZF Meier' })
  akteur?: string;

  @ApiPropertyOptional({ example: 'Kommentar-Text' })
  details?: string;

  @ApiPropertyOptional({ example: 'B-002' })
  korrekturBefehlNummer?: string;
}

export class BefehlHistorieTimelineDto {
  @ApiProperty()
  befehlId!: string;

  @ApiProperty({ example: 'B-001' })
  befehlNummer!: string;

  @ApiProperty({ example: 'ERTEILT' })
  aktuellerStatus!: string;

  @ApiProperty({ type: [BefehlHistorieEventDto] })
  events!: BefehlHistorieEventDto[];
}
