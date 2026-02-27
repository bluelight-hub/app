/**
 * useHandlungsbedarf Hook
 *
 * Berechnet drei Alert-Listen aus Befehlen + currentUserId fuer die
 * Handlungsbedarf-Zone auf der Befehle-Seite:
 * - kritisch: Ueberfaellige Befehle oder mit NICHT_VERSTANDEN-Empfaenger
 * - warnung: Befehle mit offenen Rueckfragen
 * - zuQuittieren: Befehle wo der aktuelle User noch quittieren muss
 */

import { useMemo } from 'react';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import { getBefehlKritikalitaet, isBefehlUeberfaellig, sortByPriority } from '../lib/befehl-priority';
import { getOffeneRueckfragenCount } from '../lib/befehl-utils';

export interface HandlungsbedarfResult {
  /** Ueberfaellige Befehle oder mit NICHT_VERSTANDEN-Empfaenger */
  kritisch: BefehlDto[];
  /** Befehle mit offenen Rueckfragen */
  warnung: BefehlDto[];
  /** Befehle wo der aktuelle User noch quittieren muss */
  zuQuittieren: BefehlDto[];
  /** Gesamtanzahl aller Items mit Handlungsbedarf */
  gesamtCount: number;
  /** Ob ueberhaupt Handlungsbedarf besteht */
  hatHandlungsbedarf: boolean;
}

/**
 * Berechnet die drei Handlungsbedarf-Listen aus Befehlen.
 *
 * Befehle koennen nur in einer Kategorie erscheinen (Prioritaet: kritisch > warnung).
 * zuQuittieren ist unabhaengig (User-spezifisch, kann sich mit kritisch/warnung ueberlappen).
 */
export function useHandlungsbedarf(befehle: BefehlDto[] | undefined, currentUserId: string | undefined): HandlungsbedarfResult {
  return useMemo(() => {
    if (!befehle || befehle.length === 0) {
      return { kritisch: [], warnung: [], zuQuittieren: [], gesamtCount: 0, hatHandlungsbedarf: false };
    }

    const kritisch: BefehlDto[] = [];
    const warnung: BefehlDto[] = [];
    const zuQuittieren: BefehlDto[] = [];

    for (const befehl of befehle) {
      // KORRIGIERT-Befehle ignorieren
      if (befehl.status === 'KORRIGIERT') continue;

      const kritikalitaet = getBefehlKritikalitaet(befehl);

      if (kritikalitaet === 'KRITISCH') {
        kritisch.push(befehl);
      } else if (kritikalitaet === 'WARNUNG') {
        warnung.push(befehl);
      }

      // zuQuittieren: User ist Empfaenger UND hat noch nicht quittiert
      if (currentUserId) {
        const eigenerEmpfaenger = befehl.empfaenger.find((e) => e.empfaengerId === currentUserId);
        if (eigenerEmpfaenger && !eigenerEmpfaenger.quittiertAm) {
          zuQuittieren.push(befehl);
        }
      }
    }

    // Kritisch und Warnung nach Prioritaet sortieren
    const sortierteKritisch = sortByPriority(kritisch);
    const sortierteWarnung = sortByPriority(warnung);

    const gesamtCount = sortierteKritisch.length + sortierteWarnung.length + zuQuittieren.length;

    return {
      kritisch: sortierteKritisch,
      warnung: sortierteWarnung,
      zuQuittieren,
      gesamtCount,
      hatHandlungsbedarf: gesamtCount > 0,
    };
  }, [befehle, currentUserId]);
}

/** Ermittelt den Grund fuer einen kritischen Befehl (fuer Badge-Anzeige) */
export function getKritischGrund(befehl: BefehlDto): 'ueberfaellig' | 'nicht-verstanden' {
  if (isBefehlUeberfaellig(befehl)) return 'ueberfaellig';
  return 'nicht-verstanden';
}

/** Ermittelt den Rueckfrage-Text fuer die Warnung-Zeile */
export function getRueckfrageInfo(befehl: BefehlDto): string {
  const count = getOffeneRueckfragenCount(befehl);
  const rueckfrageEmpfaenger = befehl.empfaenger.find((e) => e.quittierungArt === 'RUECKFRAGE');
  if (rueckfrageEmpfaenger) {
    return count > 1 ? `${count} Rückfragen (${rueckfrageEmpfaenger.name} u.a.)` : `Rückfrage (${rueckfrageEmpfaenger.name})`;
  }
  return `${count} offene Rückfrage${count !== 1 ? 'n' : ''}`;
}
