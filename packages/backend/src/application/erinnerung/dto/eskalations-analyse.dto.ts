import { ApiProperty } from '@nestjs/swagger';
import { TopReceiverDto } from './erinnerung-statistik.dto';

export class TopSourceDto {
  @ApiProperty({ description: 'ID des Erstellers' })
  userId!: string;

  @ApiProperty({ description: 'Anzeigename des Erstellers' })
  userName!: string;

  @ApiProperty({ description: 'Anzahl eskalierter Erinnerungen von diesem Ersteller' })
  count!: number;
}

export class EskalationsAnalyseItemDto {
  @ApiProperty({ description: 'ID der Erinnerung' })
  erinnerungId!: string;

  @ApiProperty({ description: 'Titel der Erinnerung' })
  titel!: string;

  @ApiProperty({ description: 'Zeitpunkt der Auslösung (ISO 8601)' })
  ausgeloestAm!: string;

  @ApiProperty({ description: 'Zeitpunkt der Eskalation (ISO 8601)' })
  eskaliertAm!: string;

  @ApiProperty({ description: 'Zeit bis zur Eskalation in Sekunden' })
  zeitBisEskalationSeconds!: number;

  @ApiProperty({ description: 'Username der Eskalationsperson' })
  eskaliertAn!: string;

  @ApiProperty({ description: 'Username des vorherigen Assignees', nullable: true, type: String })
  previousAssignee!: string | null;
}

export class EskalationsAnalyseDto {
  @ApiProperty({ description: 'Gesamtanzahl eskalierter Erinnerungen' })
  totalEscalated!: number;

  @ApiProperty({ description: 'Gesamtanzahl aller Erinnerungen im Einsatz' })
  totalErinnerungen!: number;

  @ApiProperty({ description: 'Eskalationsrate als Dezimalwert (0.0 - 1.0)' })
  eskalationsRate!: number;

  @ApiProperty({ description: 'Durchschnittliche Zeit bis Eskalation in Sekunden' })
  avgZeitBisEskalationSeconds!: number;

  @ApiProperty({ type: [TopReceiverDto], description: 'Top 3 Empfänger von Eskalationen' })
  topReceivers!: TopReceiverDto[];

  @ApiProperty({ type: [TopSourceDto], description: 'Top 3 Quellen (Ersteller) eskalierter Erinnerungen' })
  topSources!: TopSourceDto[];

  @ApiProperty({ type: [EskalationsAnalyseItemDto], description: 'Einzelne eskalierte Erinnerungen' })
  items!: EskalationsAnalyseItemDto[];
}
