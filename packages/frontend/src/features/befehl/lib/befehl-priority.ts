/**
 * Befehl Priority Utility-Funktionen
 *
 * Berechnet Kritikalitaet, Ueberfaelligkeit und Sortier-Prioritaet fuer Befehle.
 * Nutzt Backend-computed-Felder wenn vorhanden, sonst client-seitiger Fallback.
 */

import type { BefehlDto } from '@bluelight-hub/shared/client';
import { getQuittierungsfortschritt, getOffeneRueckfragenCount } from './befehl-utils';

/** Kritikalitaetsstufen fuer Befehle */
export type Kritikalitaet = 'KRITISCH' | 'WARNUNG' | 'NORMAL';

/**
 * Parsed einen Zeitvorgabe-String in Minuten.
 *
 * Unterstuetzte Formate:
 * - "15 min", "15 Minuten", "15min" → 15
 * - "1h", "1 Stunde", "1 h" → 60
 * - "30" (nur Zahl) → 30 (Default: Minuten)
 * - null / undefined / "" → null
 *
 * @returns Minuten oder null wenn kein gueltiges Format
 */
export function parseZeitvorgabe(zeitvorgabe: string | null | undefined): number | null {
  if (zeitvorgabe == null || zeitvorgabe.trim() === '') {
    return null;
  }

  const trimmed = zeitvorgabe.trim().toLowerCase();

  // Stunden-Format: "1h", "1 h", "1 Stunde", "2 Stunden", "1.5h"
  const stundenMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(?:h|stunde|stunden)$/);
  if (stundenMatch?.[1] != null) {
    const stunden = Number.parseFloat(stundenMatch[1].replace(',', '.'));
    if (!Number.isNaN(stunden) && stunden >= 0) {
      return Math.round(stunden * 60);
    }
  }

  // Minuten-Format: "15 min", "15min", "15 Minuten", "15 Minute"
  const minutenMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(?:min|minute|minuten)$/);
  if (minutenMatch?.[1] != null) {
    const minuten = Number.parseFloat(minutenMatch[1].replace(',', '.'));
    if (!Number.isNaN(minuten) && minuten >= 0) {
      return Math.round(minuten);
    }
  }

  // Nur Zahl: Default = Minuten
  const nurZahl = trimmed.match(/^(\d+(?:[.,]\d+)?)$/);
  if (nurZahl?.[1] != null) {
    const wert = Number.parseFloat(nurZahl[1].replace(',', '.'));
    if (!Number.isNaN(wert) && wert >= 0) {
      return Math.round(wert);
    }
  }

  return null;
}

/**
 * Prueft ob ein Befehl ueberfaellig ist.
 *
 * Ein Befehl ist ueberfaellig wenn:
 * - zeitvorgabe vorhanden UND parsebar
 * - (erteiltAm + parsedMinutes) < now()
 * - nicht alle quittierbaren Empfaenger quittiert haben
 */
export function isBefehlUeberfaellig(befehl: BefehlDto, now: Date = new Date()): boolean {
  const parsedMinutes = parseZeitvorgabe(befehl.zeitvorgabe);
  if (parsedMinutes == null) {
    return false;
  }

  const erteiltAm = befehl.erteiltAm instanceof Date ? befehl.erteiltAm : new Date(befehl.erteiltAm);
  const deadline = new Date(erteiltAm.getTime() + parsedMinutes * 60 * 1000);

  if (deadline >= now) {
    return false;
  }

  // Pruefe ob nicht alle quittiert haben
  const fortschritt = getQuittierungsfortschritt(befehl.empfaenger);
  return fortschritt.gesamt > 0 && fortschritt.quittiert < fortschritt.gesamt;
}

/**
 * Prueft ob ein Befehl mindestens einen NICHT_VERSTANDEN-Empfaenger hat.
 */
function hatNichtVerstanden(befehl: BefehlDto): boolean {
  return befehl.empfaenger.some((e) => e.quittierungArt === 'NICHT_VERSTANDEN');
}

/**
 * Prueft ob ein Befehl offene Rueckfragen hat.
 */
function hatOffeneRueckfrage(befehl: BefehlDto): boolean {
  return getOffeneRueckfragenCount(befehl) > 0;
}

/**
 * Berechnet die Kritikalitaetsstufe eines Befehls.
 *
 * - KRITISCH: ueberfaellig ODER hatNichtVerstanden
 * - WARNUNG: hatOffeneRueckfrage
 * - NORMAL: sonst
 */
export function getBefehlKritikalitaet(befehl: BefehlDto, now: Date = new Date()): Kritikalitaet {
  if (isBefehlUeberfaellig(befehl, now) || hatNichtVerstanden(befehl)) {
    return 'KRITISCH';
  }

  if (hatOffeneRueckfrage(befehl)) {
    return 'WARNUNG';
  }

  return 'NORMAL';
}

/** Sortier-Gewicht pro Kritikalitaets-Grund (hoeher = hoehere Prioritaet) */
export function getSortWeight(befehl: BefehlDto, now: Date = new Date()): number {
  if (isBefehlUeberfaellig(befehl, now)) return 4;
  if (hatNichtVerstanden(befehl)) return 3;
  if (hatOffeneRueckfrage(befehl)) return 2;
  return 1;
}

/**
 * Sortiert Befehle nach Prioritaet (kritischste zuerst).
 *
 * Reihenfolge: Ueberfaellig > Nicht verstanden > Offene Rueckfrage > Normal
 * Bei gleicher Prioritaet: neuere Befehle zuerst (erteiltAm absteigend).
 *
 * Erstellt ein neues Array (kein in-place sort).
 */
export function sortByPriority(befehle: BefehlDto[], now: Date = new Date()): BefehlDto[] {
  return [...befehle].sort((a, b) => {
    const weightDiff = getSortWeight(b, now) - getSortWeight(a, now);
    if (weightDiff !== 0) return weightDiff;

    // Bei gleicher Prioritaet: neuere zuerst
    const aTime = a.erteiltAm instanceof Date ? a.erteiltAm.getTime() : new Date(a.erteiltAm).getTime();
    const bTime = b.erteiltAm instanceof Date ? b.erteiltAm.getTime() : new Date(b.erteiltAm).getTime();
    return bTime - aTime;
  });
}
