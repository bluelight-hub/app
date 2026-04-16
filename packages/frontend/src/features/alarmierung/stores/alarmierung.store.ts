/**
 * Alarmierungs-Store
 *
 * Client-State für die Alarmierungs-Ansicht pro Einsatz:
 * - aktuell selektierte `alarmierungId` (Detail-Panel)
 * - Status-Filter für die Liste (aktiv / abgeschlossen / alle)
 */

import { createStore } from '@tanstack/react-store';

export type AlarmierungStatusFilter = 'alle' | 'aktiv' | 'abgeschlossen';

export interface AlarmierungFilter {
  status: AlarmierungStatusFilter;
  selectedAlarmierungId?: string;
}

export const DEFAULT_ALARMIERUNG_FILTER: AlarmierungFilter = {
  status: 'alle',
};

export interface AlarmierungStoreState {
  byEinsatz: Record<string, AlarmierungFilter>;
}

export const alarmierungStore = createStore<AlarmierungStoreState>({ byEinsatz: {} });

export const getAlarmierungFilter = (einsatzId: string): AlarmierungFilter => alarmierungStore.state.byEinsatz[einsatzId] ?? DEFAULT_ALARMIERUNG_FILTER;

export const setAlarmierungFilter = (einsatzId: string, patch: Partial<AlarmierungFilter>): void => {
  alarmierungStore.setState((s) => ({
    byEinsatz: {
      ...s.byEinsatz,
      [einsatzId]: { ...getAlarmierungFilter(einsatzId), ...patch },
    },
  }));
};

export const resetAlarmierungFilter = (einsatzId: string): void => {
  alarmierungStore.setState((s) => {
    const { [einsatzId]: _removed, ...rest } = s.byEinsatz;
    return { byEinsatz: rest };
  });
};
