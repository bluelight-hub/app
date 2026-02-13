import { ApiProperty } from '@nestjs/swagger';

export class EinsatzVergleichItemDto {
  @ApiProperty({ description: 'ID des Einsatzes' })
  einsatzId!: string;

  @ApiProperty({ description: 'Alarmstichwort des Einsatzes', nullable: true, type: String })
  alarmstichwort!: string | null;

  @ApiProperty({ description: 'Alarmierungszeit (ISO 8601)', nullable: true, type: String })
  alarmierungszeit!: string | null;

  @ApiProperty({ description: 'Erinnerungen pro Stunde' })
  erinnerungenProStunde!: number;

  @ApiProperty({ description: 'Eskalationsrate in Prozent (0-100)' })
  eskalationsrate!: number;

  @ApiProperty({ description: 'Durchschnittliche Reaktionszeit in Sekunden', nullable: true, type: Number })
  durchschnittlicheReaktionszeit!: number | null;

  @ApiProperty({ description: 'Gesamtanzahl Erinnerungen' })
  gesamtErinnerungen!: number;

  @ApiProperty({ description: 'Einsatz-Dauer in Stunden' })
  dauer!: number;
}

export class EinsatzVergleichDto {
  @ApiProperty({ type: [EinsatzVergleichItemDto], description: 'Vergleichsdaten pro Einsatz' })
  items!: EinsatzVergleichItemDto[];
}
