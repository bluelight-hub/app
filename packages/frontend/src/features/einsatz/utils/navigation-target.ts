/**
 * Navigation-Target-Mapping für priorisierte Übersichtselemente.
 *
 * Story 2.4: Mappt ETB-Einträge und Übersichtselemente auf Workspace-Routes
 * und prüft deren Verfügbarkeit via Workspace-Registry.
 */

/** Alle möglichen Quelltypen für Navigations-Elemente */
export type NavigationSourceType = 'etb-entry' | 'lagekarte-update' | 'kraefte-status' | 'befehl' | 'sicherheit' | 'patienten' | 'logistik' | 'unknown';

/** Aufgelöstes Navigations-Ziel für ein Übersichtselement */
export interface NavigationTarget {
  /** Ziel-Route (Template mit $einsatzId) oder null bei fehlendem Ziel */
  route: string | null;
  /** Anzeige-Label für das Ziel */
  label: string;
  /** Modul-Name im Workspace */
  module: string;
  /** Ob der Zielbereich erreichbar ist */
  available: boolean;
  /** Nächste zulässige Aktion als Fallback-Text */
  fallbackAction: string;
}

/** Zuordnungstabelle: Quelltyp → Route-Template + Modul */
const SOURCE_ROUTE_MAP: Record<Exclude<NavigationSourceType, 'unknown'>, { route: string; label: string; module: string }> = {
  'etb-entry': {
    route: '/app/einsatz/$einsatzId/führung/etb',
    label: 'Zum ETB wechseln',
    module: 'Führung',
  },
  'lagekarte-update': {
    route: '/app/einsatz/$einsatzId/übersicht/karte',
    label: 'Zur Lagekarte wechseln',
    module: 'Übersicht',
  },
  'kraefte-status': {
    route: '/app/einsatz/$einsatzId/kräfte/dashboard',
    label: 'Zum Kräfte-Dashboard wechseln',
    module: 'Kräfte',
  },
  befehl: {
    route: '/app/einsatz/$einsatzId/führung/befehle',
    label: 'Zu Befehlen wechseln',
    module: 'Führung',
  },
  sicherheit: {
    route: '/app/einsatz/$einsatzId/sicherheit/eigenschutz',
    label: 'Zum Eigenschutz wechseln',
    module: 'Sicherheit',
  },
  patienten: {
    route: '/app/einsatz/$einsatzId/patienten',
    label: 'Zur Patientenübersicht wechseln',
    module: 'Patienten',
  },
  logistik: {
    route: '/app/einsatz/$einsatzId/logistik/material',
    label: 'Zur Materialverwaltung wechseln',
    module: 'Logistik',
  },
};

/**
 * Löst das Navigations-Ziel für ein Übersichtselement auf.
 *
 * Mappt einen Quelltyp auf die passende Workspace-Route und prüft deren
 * Verfügbarkeit über die Registry-Funktion.
 *
 * @param sourceType - Typ des Quell-Elements (z.B. 'etb-entry', 'kraefte-status')
 * @param einsatzId - Aktive Einsatz-ID für Route-Parameter
 * @param checkAccessibility - Prüffunktion für Route-Verfügbarkeit (i.d.R. isWorkspaceRouteAccessible)
 * @returns Aufgelöstes NavigationTarget mit Route, Verfügbarkeit und Fallback-Aktion
 */
export function resolveNavigationTarget(sourceType: NavigationSourceType, einsatzId: string, checkAccessibility: (route: string, einsatzId: string) => boolean): NavigationTarget {
  if (sourceType === 'unknown') {
    return {
      route: null,
      label: 'Bereich in Vorbereitung',
      module: '',
      available: false,
      fallbackAction: 'Weiter beobachten',
    };
  }

  const mapping = SOURCE_ROUTE_MAP[sourceType];
  const resolvedRoute = mapping.route.replace('$einsatzId', einsatzId);
  const available = checkAccessibility(resolvedRoute, einsatzId);

  if (!available) {
    return {
      route: null,
      label: mapping.label,
      module: mapping.module,
      available: false,
      fallbackAction: 'Bereich nicht zugänglich — weiter beobachten',
    };
  }

  return {
    route: mapping.route,
    label: mapping.label,
    module: mapping.module,
    available: true,
    fallbackAction: 'In Übersicht bleiben',
  };
}

/** Tracks ob die letzte Interaktion per Tastatur (Enter/Space) ausgelöst wurde */
let _lastInteractionKeyboard = false;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        _lastInteractionKeyboard = true;
      }
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    () => {
      _lastInteractionKeyboard = false;
    },
    true,
  );
}

/**
 * Prüft und konsumiert das Keyboard-Navigation-Flag.
 *
 * Gibt true zurück wenn die letzte Interaktion per Tastatur (Enter/Space) war,
 * und setzt das Flag anschließend zurück.
 */
export function consumeKeyboardNavigationFlag(): boolean {
  const was = _lastInteractionKeyboard;
  _lastInteractionKeyboard = false;
  return was;
}
