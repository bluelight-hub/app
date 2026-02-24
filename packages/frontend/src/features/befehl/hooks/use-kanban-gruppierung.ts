/**
 * Hook fuer die Kanban-Spalten-Gruppierung von Befehlen.
 *
 * Gruppiert Befehle in 4 Spalten: ERTEILT, ZUGESTELLT, TEILWEISE_QUITTIERT, VOLLSTAENDIG_QUITTIERT.
 * KORRIGIERT-Befehle werden in ihre logische Spalte einsortiert mit istKorrigiert=true.
 */

import { useMemo } from 'react';
import { getKanbanSpalte, type KanbanSpalteKey } from '../lib/befehl-utils';

/** Befehl mit Kanban-Metadaten */
export interface KanbanBefehl<T> {
  befehl: T;
  spalte: KanbanSpalteKey;
  istKorrigiert: boolean;
}

/** Ergebnis der Kanban-Gruppierung */
export interface KanbanGruppierung<T> {
  ERTEILT: KanbanBefehl<T>[];
  ZUGESTELLT: KanbanBefehl<T>[];
  TEILWEISE_QUITTIERT: KanbanBefehl<T>[];
  VOLLSTAENDIG_QUITTIERT: KanbanBefehl<T>[];
}

/**
 * Hook der Befehle in Kanban-Spalten gruppiert.
 * KORRIGIERT-Befehle werden in ihre logische Spalte einsortiert mit istKorrigiert=true.
 */
export function useKanbanGruppierung<T extends { status: string; empfaenger: { istQuittierbar: boolean; quittiertAm: Date | null }[] }>(befehle: T[]): KanbanGruppierung<T> {
  return useMemo(() => {
    const gruppierung: KanbanGruppierung<T> = {
      ERTEILT: [],
      ZUGESTELLT: [],
      TEILWEISE_QUITTIERT: [],
      VOLLSTAENDIG_QUITTIERT: [],
    };

    for (const befehl of befehle) {
      const spalte = getKanbanSpalte(befehl);
      const istKorrigiert = befehl.status === 'KORRIGIERT';
      gruppierung[spalte].push({ befehl, spalte, istKorrigiert });
    }

    return gruppierung;
  }, [befehle]);
}
