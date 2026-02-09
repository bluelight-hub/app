import { ApiProperty } from '@nestjs/swagger';

export class PersonStatistikItemDto {
  @ApiProperty({ description: 'ID des Users' })
  userId!: string;

  @ApiProperty({ description: 'Anzeigename des Users' })
  userName!: string;

  @ApiProperty({ description: 'Anzahl zugewiesener Erinnerungen' })
  zugewiesen!: number;

  @ApiProperty({ description: 'Anzahl bestaetigter Erinnerungen' })
  acknowledged!: number;

  @ApiProperty({ description: 'Anzahl empfangener Eskalationen' })
  eskalationen!: number;

  @ApiProperty({ description: 'Durchschnittliche Reaktionszeit in Sekunden', nullable: true, type: Number })
  avgReaktionszeitSeconds!: number | null;
}

export class PersonStatistikDto {
  @ApiProperty({ type: [PersonStatistikItemDto], description: 'Statistiken pro Person' })
  items!: PersonStatistikItemDto[];
}
