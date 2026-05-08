import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VorfallAuditTimelineEintragDto {
  @ApiProperty({ description: 'Outbox-Event-ID des Timeline-Eintrags' })
  id!: string;

  @ApiProperty({ enum: ['exported'], description: 'Timeline-Eintragstyp' })
  type!: 'exported';

  @ApiProperty({ description: 'Audit-Zeitpunkt (ISO-8601)' })
  occurredAt!: string;

  @ApiProperty({ description: 'CUID des exportierenden Users' })
  userId!: string;

  @ApiPropertyOptional({ type: String, description: 'Defensiv aufgelöster Username; null wenn nicht verfügbar', nullable: true })
  userName!: string | null;

  @ApiProperty({ enum: ['pdf', 'json'], description: 'Exportformat' })
  format!: 'pdf' | 'json';

  @ApiProperty({ description: 'Kompakter Anzeigetext für die Audit-Timeline' })
  label!: string;
}

export class VorfallAuditTimelineDto {
  @ApiProperty({ type: VorfallAuditTimelineEintragDto, isArray: true })
  eintraege!: VorfallAuditTimelineEintragDto[];
}
