import { ApiProperty } from '@nestjs/swagger';

export class TopReceiverDto {
  @ApiProperty({ description: 'ID des Users' })
  userId!: string;

  @ApiProperty({ description: 'Anzeigename des Users' })
  userName!: string;

  @ApiProperty({ description: 'Anzahl der erhaltenen Eskalationen' })
  count!: number;
}

export class ErinnerungStatistikDto {
  @ApiProperty({ description: 'Gesamtanzahl eskalierter Erinnerungen' })
  totalEscalated!: number;

  @ApiProperty({ description: 'Durchschnittliche Zeit bis zur Eskalation (in Sekunden)' })
  avgEscalationTimeSeconds!: number;

  @ApiProperty({ type: [TopReceiverDto], description: 'Top 3 Empfänger von Eskalationen' })
  topReceivers!: TopReceiverDto[];
}
