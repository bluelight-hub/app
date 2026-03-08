import type { BefehlEmpfaenger } from '@domain/entities/befehl-empfaenger.entity';
import type { BefehlKommentar } from '@domain/entities/befehl-kommentar.entity';

/**
 * Ergebnis der Befehl-Prioritaets-Berechnung.
 */
export interface BefehlPriorityResult {
  isUeberfaellig: boolean;
  hatNichtVerstanden: boolean;
  hatOffeneRueckfrage: boolean;
  kritikalitaet: 'KRITISCH' | 'WARNUNG' | 'NORMAL';
}

/**
 * Parst eine Zeitvorgabe-Zeichenkette in Minuten.
 *
 * Unterstuetzte Formate:
 * - "15 min", "15 Minuten", "15min" → 15
 * - "1h", "1 Stunde", "1 h" → 60
 * - "1.5h" → 90 (Dezimal-Stunden)
 * - "30" (nur Zahl) → 30 (Default: Minuten)
 * - null / undefined / "" → null
 */
export function parseZeitvorgabe(zeitvorgabe: string | undefined | null): number | null {
  if (!zeitvorgabe || zeitvorgabe.trim() === '') {
    return null;
  }

  const trimmed = zeitvorgabe.trim().toLowerCase();

  // Stunden-Format: "1h", "1 h", "1.5h", "2 Stunde", "2 Stunden"
  const hoursMatch = trimmed.match(/^(\d+\.?\d*)\s*(h|stunde|stunden)$/);
  if (hoursMatch) {
    const hoursValue = hoursMatch[1];
    if (hoursValue == null) {
      return null;
    }

    return Math.round(Number.parseFloat(hoursValue) * 60);
  }

  // Minuten-Format: "15 min", "15min", "15 Minuten", "15 minuten"
  const minutesMatch = trimmed.match(/^(\d+)\s*(min|minuten|minutes?)$/);
  if (minutesMatch) {
    const minutesValue = minutesMatch[1];
    if (minutesValue == null) {
      return null;
    }

    return Number.parseInt(minutesValue, 10);
  }

  // Nur Zahl → Default Minuten
  const numberMatch = trimmed.match(/^(\d+)$/);
  if (numberMatch) {
    const numberValue = numberMatch[1];
    if (numberValue == null) {
      return null;
    }

    return Number.parseInt(numberValue, 10);
  }

  return null;
}

/**
 * Berechnet die Priority-Felder fuer einen Befehl.
 *
 * Business-Regeln:
 * - KORRIGIERT-Befehle sind obsolet → immer NORMAL
 * - isUeberfaellig: Zeitvorgabe abgelaufen UND nicht alle Empfaenger quittiert
 * - hatNichtVerstanden: Mindestens ein Empfaenger hat NICHT_VERSTANDEN quittiert
 * - hatOffeneRueckfrage: Rueckfrage-Kommentar ohne Thread-Antwort
 * - kritikalitaet: KRITISCH > WARNUNG > NORMAL
 */
export function computeBefehlPriority(
  status: string,
  zeitvorgabe: string | undefined,
  erteiltAm: Date,
  empfaenger: readonly BefehlEmpfaenger[],
  kommentare: readonly BefehlKommentar[],
): BefehlPriorityResult {
  // B-H2: Korrigierte Befehle sind obsolet
  if (status === 'KORRIGIERT') {
    return { isUeberfaellig: false, hatNichtVerstanden: false, hatOffeneRueckfrage: false, kritikalitaet: 'NORMAL' };
  }

  const parsedMinutes = parseZeitvorgabe(zeitvorgabe);
  const now = new Date();

  const isUeberfaellig = parsedMinutes !== null && new Date(erteiltAm.getTime() + parsedMinutes * 60_000) < now && empfaenger.some((e) => e.quittiertAm == null);

  const hatNichtVerstanden = empfaenger.some((e) => e.quittierungArt === 'NICHT_VERSTANDEN');

  // B-M3: Guard fuer undefined k.id
  const hatOffeneRueckfrage = kommentare.some((k) => k.isRueckfrage && k.id != null && !kommentare.some((a) => a.parentId === k.id));

  const kritikalitaet: 'KRITISCH' | 'WARNUNG' | 'NORMAL' = isUeberfaellig || hatNichtVerstanden ? 'KRITISCH' : hatOffeneRueckfrage ? 'WARNUNG' : 'NORMAL';

  return { isUeberfaellig, hatNichtVerstanden, hatOffeneRueckfrage, kritikalitaet };
}
