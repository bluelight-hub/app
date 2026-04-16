/**
 * useReaktionszeit
 *
 * Formatiert eine Reaktionszeit (Sekunden) als `mm:ss` und liefert
 * eine Farbcodierung nach Schwellwerten:
 * - `< 5 min` → grün (schnell)
 * - `< 10 min` → gelb (mittel)
 * - `>= 10 min` → rot (langsam)
 *
 * Wenn `sekunden` null/undefined ist (z. B. noch kein `vorOrtAm`),
 * wird `isPending = true` gesetzt und ein neutraler Platzhalter geliefert.
 */

import { useMemo } from 'react';

export type ReaktionszeitStufe = 'schnell' | 'mittel' | 'langsam' | 'pending';

export interface ReaktionszeitAnzeige {
  /** `mm:ss` oder `--:--` wenn pending. */
  label: string;
  /** Ampel-Stufe für Farbcodierung. */
  stufe: ReaktionszeitStufe;
  /** Wahr, solange die Reaktionszeit noch nicht ermittelt ist. */
  isPending: boolean;
  /** ARIA-Label mit ausgeschriebener Dauer. */
  ariaLabel: string;
}

const GRUEN_SCHWELLE_SEK = 5 * 60;
const GELB_SCHWELLE_SEK = 10 * 60;

export function formatReaktionszeit(sekunden: number | null | undefined): ReaktionszeitAnzeige {
  if (sekunden === null || sekunden === undefined || Number.isNaN(sekunden) || sekunden < 0) {
    return { label: '--:--', stufe: 'pending', isPending: true, ariaLabel: 'Reaktionszeit noch nicht verfügbar' };
  }

  const totalSek = Math.floor(sekunden);
  const minuten = Math.floor(totalSek / 60);
  const rest = totalSek % 60;
  const label = `${String(minuten).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;

  let stufe: ReaktionszeitStufe = 'langsam';
  if (totalSek < GRUEN_SCHWELLE_SEK) stufe = 'schnell';
  else if (totalSek < GELB_SCHWELLE_SEK) stufe = 'mittel';

  const ariaLabel = `Reaktionszeit ${minuten} Minuten ${rest} Sekunden`;

  return { label, stufe, isPending: false, ariaLabel };
}

export function useReaktionszeit(sekunden: number | null | undefined): ReaktionszeitAnzeige {
  return useMemo(() => formatReaktionszeit(sekunden), [sekunden]);
}
