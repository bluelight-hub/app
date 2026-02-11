import { ApiProperty } from '@nestjs/swagger';

export class ReaktionszeitBucketDto {
  @ApiProperty({ description: 'Label des Zeitbereichs (z.B. "0-30s")' })
  label!: string;

  @ApiProperty({ description: 'Untere Grenze in Sekunden (inclusive)' })
  minSeconds!: number;

  @ApiProperty({ description: 'Obere Grenze in Sekunden (exclusive)' })
  maxSeconds!: number;

  @ApiProperty({ description: 'Anzahl Erinnerungen in diesem Bereich' })
  count!: number;
}

export class ReaktionszeitStatistikDto {
  @ApiProperty({ description: 'Anzahl acknowledged Erinnerungen' })
  totalAcknowledged!: number;

  @ApiProperty({ description: 'Durchschnittliche Reaktionszeit in Sekunden' })
  avgReaktionszeitSeconds!: number;

  @ApiProperty({ description: 'Median-Reaktionszeit in Sekunden' })
  medianReaktionszeitSeconds!: number;

  @ApiProperty({ description: 'Schnellste Reaktionszeit in Sekunden' })
  minReaktionszeitSeconds!: number;

  @ApiProperty({ description: 'Langsamste Reaktionszeit in Sekunden' })
  maxReaktionszeitSeconds!: number;

  @ApiProperty({ type: [ReaktionszeitBucketDto], description: 'Histogramm der Reaktionszeit-Verteilung' })
  buckets!: ReaktionszeitBucketDto[];
}
