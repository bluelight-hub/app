import type { UserId } from '@domain/value-objects/user-id';

export interface TopReceiverStats {
  userId: UserId;
  count: number;
}

export interface ErinnerungStatusCounts {
  total: number;
  geplant: number;
  ausgeloest: number;
  acknowledged: number;
  snoozed: number;
  eskaliert: number;
  erledigt: number;
}

export interface ErinnerungStatistik {
  totalEscalated: number;
  avgEscalationTimeSeconds: number;
  topReceivers: TopReceiverStats[];
  statusCounts: ErinnerungStatusCounts;
  activeCount: number;
}
