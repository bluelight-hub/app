import type { UserId } from '@domain/value-objects/user-id';

export interface TopReceiverStats {
  userId: UserId;
  count: number;
}

export interface ErinnerungStatistik {
  totalEscalated: number;
  avgEscalationTimeSeconds: number;
  topReceivers: TopReceiverStats[];
}
