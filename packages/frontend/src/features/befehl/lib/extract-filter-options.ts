/**
 * Hilfsfunktionen zum Extrahieren von Filter-Optionen aus Befehlen
 *
 * Generiert eindeutige, sortierte Listen fuer Empfaenger- und
 * Befehlsgeber-Dropdowns.
 */

import type { BefehlDto } from '@bluelight-hub/shared/client';

/** Extrahiert eindeutige Empfaenger-Namen aus einer Befehlsliste */
export function extractEmpfaengerNames(befehle: BefehlDto[]): string[] {
  const names = new Set<string>();
  for (const befehl of befehle) {
    for (const emp of befehl.empfaenger ?? []) {
      if (emp.name) names.add(emp.name);
    }
  }
  return [...names].sort();
}

/** Extrahiert eindeutige Befehlsgeber-Namen aus einer Befehlsliste */
export function extractBefehlsgeberNames(befehle: BefehlDto[]): string[] {
  const names = new Set<string>();
  for (const befehl of befehle) {
    if (befehl.befehlsgeberName) names.add(befehl.befehlsgeberName);
  }
  return [...names].sort();
}
