import type { UserId } from '@domain/value-objects/user-id';
import type { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import type { TopReceiverStats } from './erinnerung-statistik';

export interface TopSourceStats {
  userId: UserId;
  count: number;
}

export interface EskalationsAnalyseItem {
  erinnerungId: ErinnerungId;
  titel: string;
  ausgeloestAm: Date;
  eskaliertAm: Date;
  zeitBisEskalationSeconds: number;
  eskaliertAnId: UserId;
  previousAssigneeId: UserId | null;
}

export interface EskalationsAnalyse {
  /** Anzahl eskalierter Erinnerungen gesamt */
  totalEscalated: number;
  /** Gesamtzahl aller Erinnerungen (Basis für Rate) */
  totalErinnerungen: number;
  /** Eskalationsrate als Dezimalwert (0.0 - 1.0) */
  eskalationsRate: number;
  /** Durchschnittliche Zeit bis Eskalation in Sekunden */
  avgZeitBisEskalationSeconds: number;
  /** Top 3 Empfänger von Eskalationen */
  topReceivers: TopReceiverStats[];
  /** Top 3 Quellen (Ersteller) von eskalierten Erinnerungen */
  topSources: TopSourceStats[];
  /** Einzelne eskalierte Erinnerungen für Detail-Tabelle */
  items: EskalationsAnalyseItem[];
}
