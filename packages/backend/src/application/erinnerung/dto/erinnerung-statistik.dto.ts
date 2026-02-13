import { ApiProperty } from '@nestjs/swagger';

export class TopReceiverDto {
  @ApiProperty({ description: 'ID des Users' })
  userId!: string;

  @ApiProperty({ description: 'Anzeigename des Users' })
  userName!: string;

  @ApiProperty({ description: 'Anzahl der erhaltenen Eskalationen' })
  count!: number;
}

export class ErinnerungStatusCountsDto {
  @ApiProperty({ description: 'Gesamtanzahl aller Erinnerungen' })
  total!: number;

  @ApiProperty({ description: 'Anzahl geplanter Erinnerungen' })
  geplant!: number;

  @ApiProperty({ description: 'Anzahl ausgeloester Erinnerungen' })
  ausgeloest!: number;

  @ApiProperty({ description: 'Anzahl bestaetigter Erinnerungen' })
  acknowledged!: number;

  @ApiProperty({ description: 'Anzahl gesnoozter Erinnerungen' })
  snoozed!: number;

  @ApiProperty({ description: 'Anzahl eskalierter Erinnerungen' })
  eskaliert!: number;

  @ApiProperty({ description: 'Anzahl erledigter Erinnerungen' })
  erledigt!: number;
}

export class ErinnerungStatistikDto {
  @ApiProperty({ description: 'Gesamtanzahl eskalierter Erinnerungen' })
  totalEscalated!: number;

  @ApiProperty({ description: 'Durchschnittliche Zeit bis zur Eskalation (in Sekunden)' })
  avgEscalationTimeSeconds!: number;

  @ApiProperty({ type: [TopReceiverDto], description: 'Top 3 Empfaenger von Eskalationen' })
  topReceivers!: TopReceiverDto[];

  @ApiProperty({ type: ErinnerungStatusCountsDto, description: 'Anzahl Erinnerungen pro Status' })
  statusCounts!: ErinnerungStatusCountsDto;

  @ApiProperty({ description: 'Anzahl aktiver (nicht erledigter) Erinnerungen' })
  activeCount!: number;
}
