/**
 * Urgency-Gruppierung fuer Erinnerungen
 *
 * Gruppiert Erinnerungen in 5 Urgency-Zonen basierend auf Status und Faelligkeit.
 * Wird von DashboardErinnerungen und PinnwandErinnerungen genutzt.
 */

import type { ErinnerungResponseDto } from '@/shared';

/** Schwellenwert in Minuten fuer die "Aufmerksamkeit"-Zone */
const AUFMERKSAMKEIT_SCHWELLE_MINUTEN = 5;

/** Urgency-Gruppen fuer die Swimlane-Ansicht */
export interface UrgencyGroups {
  sofort: ErinnerungResponseDto[];
  aufmerksamkeit: ErinnerungResponseDto[];
  kontrolle: ErinnerungResponseDto[];
  eingeplant: ErinnerungResponseDto[];
  abgeschlossen: ErinnerungResponseDto[];
}

/** Prueft ob eine Erinnerung innerhalb der naechsten N Minuten faellig ist */
function isFaelligInnerhalb(faelligAm: string, minuten: number): boolean {
  const now = Date.now();
  const faellig = new Date(faelligAm).getTime();
  const schwelle = now + minuten * 60_000;
  return faellig <= schwelle;
}

/** Gruppiert Erinnerungen in 5 Urgency-Zonen basierend auf Status und Faelligkeit */
export function groupByUrgency(erinnerungen: ErinnerungResponseDto[]): UrgencyGroups {
  const groups: UrgencyGroups = { sofort: [], aufmerksamkeit: [], kontrolle: [], eingeplant: [], abgeschlossen: [] };
  for (const e of erinnerungen) {
    const status = e.status;
    if (status === 'AUSGELOEST' || status === 'ESKALIERT') {
      groups.sofort.push(e);
    } else if (status === 'ERLEDIGT') {
      groups.abgeschlossen.push(e);
    } else if (status === 'ACKNOWLEDGED') {
      groups.kontrolle.push(e);
    } else if (isFaelligInnerhalb(e.faelligAm, AUFMERKSAMKEIT_SCHWELLE_MINUTEN)) {
      // GEPLANT/SNOOZED und faellig in <= 5 Minuten
      groups.aufmerksamkeit.push(e);
    } else {
      // GEPLANT/SNOOZED und faellig in > 5 Minuten
      groups.eingeplant.push(e);
    }
  }
  return groups;
}
