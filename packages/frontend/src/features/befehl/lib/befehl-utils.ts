/**
 * Befehl Utility-Funktionen
 *
 * Hilfsfunktionen fuer Befehl-Logik, Empfaenger-Status und Farbcodierung.
 */

import type { BefehlEmpfaengerDto, BefehlEmpfaengerDtoQuittierungArtEnum, BefehlKommentarDto } from '@bluelight-hub/shared/client';

// ============================================
// Quittierungsfortschritt Types & Funktionen
// ============================================

/** Ergebnis der Quittierungsfortschritt-Berechnung */
export interface Quittierungsfortschritt {
  /** Anzahl quittierter Empfaenger */
  quittiert: number;
  /** Gesamtanzahl Empfaenger */
  gesamt: number;
  /** Fortschritt in Prozent (0-100) */
  prozent: number;
  /** Aufschluesselung nach Quittierungsart */
  art: Record<'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN', number>;
}

/**
 * Berechnet den Quittierungsfortschritt fuer eine Empfaenger-Liste.
 *
 * Zaehlt ALLE Empfaenger fuer den Fortschritt (inkl. Funk-Empfaenger).
 * RUECKFRAGE zaehlt als quittiert (Empfaenger hat reagiert).
 * Division-by-Zero sicher bei leerer Liste.
 */
export function getQuittierungsfortschritt(empfaenger: BefehlEmpfaengerDto[]): Quittierungsfortschritt {
  const gesamt = empfaenger.length;
  const quittierte = empfaenger.filter((e) => e.quittiertAm != null);
  const quittiert = quittierte.length;
  const prozent = gesamt > 0 ? Math.round((quittiert / gesamt) * 100) : 0;

  const art: Record<'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN', number> = {
    VERSTANDEN: 0,
    RUECKFRAGE: 0,
    NICHT_VERSTANDEN: 0,
  };

  for (const e of quittierte) {
    if (e.quittierungArt) {
      art[e.quittierungArt] = (art[e.quittierungArt] ?? 0) + 1;
    }
  }

  return { quittiert, gesamt, prozent, art };
}

/** Ergebnis der Empfaenger-Gruppierung nach Quittierbarkeit */
export interface EmpfaengerGruppierung {
  /** Empfaenger mit User-Link (koennen in-app quittieren) */
  quittierbar: BefehlEmpfaengerDto[];
  /** Empfaenger ohne User-Link (nur via Funk, nicht quittierbar) */
  nichtQuittierbar: BefehlEmpfaengerDto[];
}

/**
 * Gruppiert Empfaenger in quittierbare und nicht-quittierbare.
 * Quittierbar = mit User verknuepft (empfaengerId vorhanden).
 */
export function splitEmpfaenger(empfaenger: BefehlEmpfaengerDto[]): EmpfaengerGruppierung {
  const quittierbar: BefehlEmpfaengerDto[] = [];
  const nichtQuittierbar: BefehlEmpfaengerDto[] = [];
  for (const e of empfaenger) {
    if (e.istQuittierbar) {
      quittierbar.push(e);
    } else {
      nichtQuittierbar.push(e);
    }
  }
  return { quittierbar, nichtQuittierbar };
}

// ============================================
// Empfaenger-Quittierungs-Status (Einzelner Empfaenger)
// ============================================

/** Status eines einzelnen Empfaengers fuer die Chip-Anzeige */
export type EmpfaengerChipStatus = 'ZUGESTELLT' | 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN';

/** Ergebnis fuer einen einzelnen Empfaenger-Chip */
export interface EmpfaengerQuittierungStatus {
  /** Chip-Status */
  status: EmpfaengerChipStatus;
  /** CSS-Klassen fuer Chip-Hintergrund */
  chipBg: string;
  /** CSS-Klassen fuer Chip-Text */
  chipText: string;
  /** Label fuer Tooltip */
  label: string;
  /** Zeitstempel der Quittierung (falls vorhanden) */
  zeitpunkt: Date | undefined;
}

/** Chip-Konfiguration pro Empfaenger-Status */
const CHIP_CONFIG: Record<EmpfaengerChipStatus, { chipBg: string; chipText: string; label: string }> = {
  ZUGESTELLT: {
    chipBg: 'bg-surface-raised',
    chipText: 'text-text-muted',
    label: 'Zugestellt',
  },
  VERSTANDEN: {
    chipBg: 'bg-status-success-surface',
    chipText: 'text-status-success-text',
    label: 'Verstanden',
  },
  RUECKFRAGE: {
    chipBg: 'bg-status-warning-surface',
    chipText: 'text-status-warning-text',
    label: 'Rückfrage',
  },
  NICHT_VERSTANDEN: {
    chipBg: 'bg-status-danger-surface',
    chipText: 'text-status-danger-text',
    label: 'Nicht verstanden',
  },
};

/**
 * Ermittelt den Quittierungs-Status eines einzelnen Empfaengers fuer die Chip-Anzeige.
 *
 * @param empfaenger - Einzelner Empfaenger
 * @returns Status mit Farb-Klassen und Label
 */
export function getEmpfaengerQuittierungStatus(empfaenger: BefehlEmpfaengerDto): EmpfaengerQuittierungStatus {
  if (empfaenger.quittiertAm != null) {
    if (empfaenger.quittierungArt) {
      const status = empfaenger.quittierungArt as EmpfaengerChipStatus;
      const config = CHIP_CONFIG[status] ?? CHIP_CONFIG.ZUGESTELLT;
      return {
        status,
        ...config,
        zeitpunkt: empfaenger.quittiertAm,
      };
    }
    // Defensiv: quittiertAm gesetzt aber quittierungArt fehlt (Dateninkonsistenz)
    return {
      status: 'VERSTANDEN',
      ...CHIP_CONFIG.VERSTANDEN,
      zeitpunkt: empfaenger.quittiertAm,
    };
  }

  return {
    status: 'ZUGESTELLT',
    ...CHIP_CONFIG.ZUGESTELLT,
    zeitpunkt: undefined,
  };
}

// ============================================
// ZustellHaekchen Quittierungs-Farbe
// ============================================

/** Moegliche Quittierungs-Farb-Zustaende fuer ZustellHaekchen */
export type QuittierungHaekchenStatus = 'none' | 'partial' | 'all_verstanden' | 'mixed' | 'has_nicht_verstanden';

/**
 * Bestimmt die Haekchen-Farbe basierend auf allen Quittierungen.
 *
 * Logik:
 * - 'none': Noch nicht alle quittiert (oder keine Empfaenger)
 * - 'all_verstanden': Alle quittiert UND alle VERSTANDEN
 * - 'has_nicht_verstanden': Mind. 1 NICHT_VERSTANDEN
 * - 'mixed': Alle quittiert, gemischte Quittierungsarten (kein NICHT_VERSTANDEN)
 * - 'partial': Nicht alle quittiert
 */
export function getZustellHaekchenFarbe(empfaenger: BefehlEmpfaengerDto[]): QuittierungHaekchenStatus {
  if (empfaenger.length === 0) {
    return 'none';
  }

  const fortschritt = getQuittierungsfortschritt(empfaenger);

  if (fortschritt.quittiert === 0) {
    return 'none';
  }

  if (fortschritt.art.NICHT_VERSTANDEN > 0) {
    return 'has_nicht_verstanden';
  }

  if (fortschritt.quittiert < fortschritt.gesamt) {
    return 'partial';
  }

  // Alle quittiert
  if (fortschritt.art.VERSTANDEN === fortschritt.gesamt) {
    return 'all_verstanden';
  }

  return 'mixed';
}

// ============================================
// Empfaenger-Status Types
// ============================================

/** Moegliche Zustaende eines Empfaengers relativ zum aktuellen User */
export type EmpfaengerStatus = 'NICHT_EMPFAENGER' | 'AUSSTEHEND' | 'ZUGESTELLT' | 'QUITTIERT' | 'RUECKFRAGE';

/** Ergebnis der Empfaenger-Status-Ermittlung */
export interface EigenerEmpfaengerStatus {
  /** Der ermittelte Status */
  status: EmpfaengerStatus;
  /** Ob der aktuelle User Empfaenger ist */
  istEmpfaenger: boolean;
  /** Empfaenger-Info-Objekt (nur wenn Empfaenger) */
  empfaengerInfo: BefehlEmpfaengerDto | undefined;
  /** Art der Quittierung (nur wenn quittiert) */
  quittierungArt: BefehlEmpfaengerDtoQuittierungArtEnum | undefined;
}

// ============================================
// Empfaenger-Status Ermittlung
// ============================================

/**
 * Ermittelt den Empfaenger-Status des aktuellen Users fuer einen Befehl
 *
 * @param empfaenger - Liste der Empfaenger des Befehls
 * @param currentUserId - ID des aktuellen Users
 * @returns Empfaenger-Status mit Details
 */
export function getEigenerEmpfaengerStatus(empfaenger: BefehlEmpfaengerDto[], currentUserId: string | undefined): EigenerEmpfaengerStatus {
  if (!currentUserId) {
    return { status: 'NICHT_EMPFAENGER', istEmpfaenger: false, empfaengerInfo: undefined, quittierungArt: undefined };
  }

  const info = empfaenger.find((e) => e.empfaengerId === currentUserId);

  if (!info) {
    return { status: 'NICHT_EMPFAENGER', istEmpfaenger: false, empfaengerInfo: undefined, quittierungArt: undefined };
  }

  if (info.quittiertAm) {
    if (info.quittierungArt === 'RUECKFRAGE') {
      return { status: 'RUECKFRAGE', istEmpfaenger: true, empfaengerInfo: info, quittierungArt: info.quittierungArt };
    }
    return { status: 'QUITTIERT', istEmpfaenger: true, empfaengerInfo: info, quittierungArt: info.quittierungArt };
  }

  if (info.zugestelltAm) {
    return { status: 'ZUGESTELLT', istEmpfaenger: true, empfaengerInfo: info, quittierungArt: undefined };
  }

  return { status: 'AUSSTEHEND', istEmpfaenger: true, empfaengerInfo: info, quittierungArt: undefined };
}

// ============================================
// Rueckfragen-Zaehlung
// ============================================

/**
 * Zaehlt offene Rueckfragen eines Befehls.
 * Eine Rueckfrage ist "offen" wenn isRueckfrage=true UND kein anderer Kommentar
 * parentId gleich dieser Kommentar-ID hat (= keine Antwort existiert).
 */
export function getOffeneRueckfragenCount(befehl: { kommentare?: BefehlKommentarDto[] }): number {
  const kommentare = befehl.kommentare ?? [];
  const childParentIds = new Set(kommentare.filter((k) => k.parentId).map((k) => k.parentId));
  return kommentare.filter((k) => k.isRueckfrage && !childParentIds.has(k.id)).length;
}

// ============================================
// Farbcodierung
// ============================================

/** CSS-Klassen fuer Empfaenger-Status Farbcodierung (AC5: Grau=unquittiert, Gelb=Rueckfrage, Gruen=Verstanden) */
export const EMPFAENGER_STATUS_FARBEN: Record<EmpfaengerStatus, { bg: string; text: string; border: string }> = {
  NICHT_EMPFAENGER: {
    bg: 'bg-surface-raised',
    text: 'text-text-muted',
    border: 'border-border-subtle',
  },
  AUSSTEHEND: {
    bg: 'bg-surface-raised',
    text: 'text-text-muted',
    border: 'border-border-subtle',
  },
  ZUGESTELLT: {
    bg: 'bg-surface-raised',
    text: 'text-text-secondary',
    border: 'border-border-subtle',
  },
  QUITTIERT: {
    bg: 'bg-status-success-surface',
    text: 'text-status-success-text',
    border: 'border-status-success-border',
  },
  RUECKFRAGE: {
    bg: 'bg-status-warning-surface',
    text: 'text-status-warning-text',
    border: 'border-status-warning-border',
  },
};

// ============================================
// Kanban-Spalten-Zuordnung
// ============================================

/** Moegliche Kanban-Spalten fuer die Befehlsuebersicht */
export type KanbanSpalteKey = 'ERTEILT' | 'ZUGESTELLT' | 'TEILWEISE_QUITTIERT' | 'VOLLSTAENDIG_QUITTIERT';

/**
 * Bestimmt die Kanban-Spalte eines Befehls basierend auf Status und Empfaenger-Quittierungen.
 *
 * KORRIGIERT ist KEIN separater Spaltentyp - Befehle mit status=KORRIGIERT werden
 * in die Spalte einsortiert, die sich aus ihren Empfaenger-Daten ergibt.
 * Die visuelle Darstellung (gedimmt + Badge) wird in der UI-Schicht geloest.
 */
export function getKanbanSpalte(befehl: { status: string; empfaenger: BefehlEmpfaengerDto[] }): KanbanSpalteKey {
  if (befehl.status === 'ERTEILT') return 'ERTEILT';
  if (befehl.status === 'QUITTIERT') return 'VOLLSTAENDIG_QUITTIERT';

  const quittiert = befehl.empfaenger.filter((e) => e.quittiertAm != null).length;
  const gesamt = befehl.empfaenger.length;

  if (quittiert === 0) return 'ZUGESTELLT';
  if (quittiert < gesamt) return 'TEILWEISE_QUITTIERT';
  return 'VOLLSTAENDIG_QUITTIERT';
}
