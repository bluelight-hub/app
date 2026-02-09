import type { UserId } from '@domain/value-objects/user-id';

export interface PersonStatistikItem {
  userId: UserId;
  zugewiesen: number;
  acknowledged: number;
  eskalationen: number;
  avgReaktionszeitSeconds: number | null;
}

export interface PersonErinnerungStatistik {
  items: PersonStatistikItem[];
}
