export interface FuehrungsrhythmusReminderTypeStats {
  reminderType: string;
  totalOccurrences: number;
  snoozeCount: number;
  snoozeRate: number;
  escalationCount: number;
  escalationRate: number;
}

export interface FuehrungsrhythmusActivationGroup {
  activationTimestamp: Date;
  reminderCount: number;
  totalCycles: number;
  completedParents: number;
  completionRate: number;
  escalatedCount: number;
  reminderTypeStats: FuehrungsrhythmusReminderTypeStats[];
}

export interface FuehrungsrhythmusStatistik {
  activations: FuehrungsrhythmusActivationGroup[];
  totalActivations: number;
  totalCycles: number;
  avgCompletionRate: number;
  totalEscalations: number;
  overallSnoozeRate: number;
}
