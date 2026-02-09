import { ApiProperty } from '@nestjs/swagger';

export class ZeitverlaufBucketDto {
  @ApiProperty({ description: 'Anfang des Zeitintervalls (ISO 8601)' })
  timestamp!: string;

  @ApiProperty({ description: 'Anzahl erstellter Erinnerungen in diesem Intervall' })
  erstellt!: number;

  @ApiProperty({ description: 'Anzahl ausgelöster Alarme in diesem Intervall' })
  ausgeloest!: number;

  @ApiProperty({ description: 'Anzahl eskalierter Erinnerungen in diesem Intervall' })
  eskaliert!: number;
}

export class ZeitverlaufStatistikDto {
  @ApiProperty({ description: 'Intervallbreite in Minuten' })
  intervalMinutes!: number;

  @ApiProperty({ type: [ZeitverlaufBucketDto], description: 'Zeitreihen-Buckets aufsteigend' })
  buckets!: ZeitverlaufBucketDto[];
}
