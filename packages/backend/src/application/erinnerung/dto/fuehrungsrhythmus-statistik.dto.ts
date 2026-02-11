import { ApiProperty } from '@nestjs/swagger';

export class FuehrungsrhythmusReminderTypeStatsDto {
  @ApiProperty({ description: 'Erinnerungs-Typ (Titel)' })
  reminderType!: string;

  @ApiProperty({ description: 'Anzahl Vorkommen' })
  totalOccurrences!: number;

  @ApiProperty({ description: 'Gesamtanzahl Snoozes' })
  snoozeCount!: number;

  @ApiProperty({ description: 'Snooze-Rate (0.0 - 1.0)' })
  snoozeRate!: number;

  @ApiProperty({ description: 'Anzahl Eskalationen' })
  escalationCount!: number;

  @ApiProperty({ description: 'Eskalationsrate (0.0 - 1.0)' })
  escalationRate!: number;
}

export class FuehrungsrhythmusActivationGroupDto {
  @ApiProperty({ description: 'Zeitpunkt der Aktivierung (ISO 8601)' })
  activationTimestamp!: string;

  @ApiProperty({ description: 'Anzahl Erinnerungen in dieser Aktivierung' })
  reminderCount!: number;

  @ApiProperty({ description: 'Gesamtanzahl Zyklen (Wiederholungen)' })
  totalCycles!: number;

  @ApiProperty({ description: 'Abgeschlossene Parent-Erinnerungen' })
  completedParents!: number;

  @ApiProperty({ description: 'Abschlussrate (0.0 - 1.0)' })
  completionRate!: number;

  @ApiProperty({ description: 'Anzahl eskalierter Erinnerungen' })
  escalatedCount!: number;

  @ApiProperty({ type: [FuehrungsrhythmusReminderTypeStatsDto], description: 'Statistiken pro Erinnerungs-Typ' })
  reminderTypeStats!: FuehrungsrhythmusReminderTypeStatsDto[];
}

export class FuehrungsrhythmusStatistikDto {
  @ApiProperty({ type: [FuehrungsrhythmusActivationGroupDto], description: 'Aktivierungen' })
  activations!: FuehrungsrhythmusActivationGroupDto[];

  @ApiProperty({ description: 'Gesamtanzahl Aktivierungen' })
  totalActivations!: number;

  @ApiProperty({ description: 'Gesamtanzahl Zyklen ueber alle Aktivierungen' })
  totalCycles!: number;

  @ApiProperty({ description: 'Durchschnittliche Abschlussrate (0.0 - 1.0)' })
  avgCompletionRate!: number;

  @ApiProperty({ description: 'Gesamtanzahl Eskalationen' })
  totalEscalations!: number;

  @ApiProperty({ description: 'Gesamt-Snooze-Rate (0.0 - 1.0)' })
  overallSnoozeRate!: number;
}
