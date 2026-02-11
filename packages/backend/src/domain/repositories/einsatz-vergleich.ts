import type { EinsatzId } from '@domain/value-objects/einsatz-id';

export interface EinsatzVergleichItem {
  einsatzId: EinsatzId;
  alarmstichwort: string | null;
  alarmierungszeit: Date | null;
  erinnerungenProStunde: number;
  eskalationsrate: number;
  durchschnittlicheReaktionszeit: number | null;
  gesamtErinnerungen: number;
  /** Einsatz-Dauer in Stunden */
  dauer: number;
}

export interface EinsatzVergleich {
  items: EinsatzVergleichItem[];
}
