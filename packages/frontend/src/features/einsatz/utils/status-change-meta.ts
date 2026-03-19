/**
 * StatusChange-Metadaten — Pure Functions zur Ableitung von Zeitbezug und Herkunft
 * aus bestehenden EintragDto-Feldern.
 *
 * Story 2.3: Statusänderungen mit Zeitbezug und Herkunft nachvollziehbar machen
 */

/** Herkunfts-Typ für die Icon-Zuordnung */
export type StatusChangeSource = 'system' | 'funk' | 'user' | 'unknown';

/** Abgeleitete Metadaten einer Statusänderung */
export interface StatusChangeMetadata {
  /** Zeitpunkt der Statusänderung (fachlicher Timestamp) */
  timestamp: Date | null;
  /** Herkunfts-Typ für Icon-Mapping */
  source: StatusChangeSource;
  /** Anzeige-Label der Herkunft (z.B. Funkrufname, Username, "System") */
  sourceDisplay: string;
  /** Akteur (letzter Bearbeiter oder Ersteller), null wenn unbekannt */
  actor: string | null;
  /** System-generiert vs. manuell */
  isAutomatic: boolean;
  /** Wurde der Eintrag nachträglich bearbeitet? */
  isUpdated: boolean;
  /** Versionsnummer für Änderungshistorie */
  version: number;
}

/** Minimale Eingabe-Felder für die Metadaten-Ableitung */
export interface StatusChangeInput {
  timestamp?: Date | string | null;
  createdBy?: string;
  updatedBy?: string | null;
  absender?: string | null;
  isAutomatic?: boolean;
  version?: number;
  updatedAt?: Date | string | null;
}

function parseTimestamp(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Leitet Zeitbezug- und Herkunft-Metadaten aus einem EintragDto ab.
 *
 * @param entry - EintragDto-Felder (Audit-Trail)
 * @param getUserName - Optionale Funktion zur Auflösung von User-IDs → Anzeigenamen
 */
export function deriveStatusChangeMeta(entry: StatusChangeInput, getUserName?: (userId: string) => string): StatusChangeMetadata {
  const timestamp = parseTimestamp(entry.timestamp);
  const isAutomatic = entry.isAutomatic ?? false;
  const version = entry.version ?? 1;
  const isUpdated = version > 1 || !!entry.updatedBy;

  let source: StatusChangeSource;
  let sourceDisplay: string;

  if (isAutomatic) {
    source = 'system';
    sourceDisplay = 'System';
  } else if (entry.absender) {
    source = 'funk';
    sourceDisplay = entry.absender;
  } else if (entry.createdBy && getUserName) {
    source = 'user';
    sourceDisplay = getUserName(entry.createdBy) || 'Nutzer';
  } else if (entry.createdBy) {
    source = 'user';
    sourceDisplay = 'Nutzer';
  } else {
    source = 'unknown';
    sourceDisplay = 'Unbekannt';
  }

  let actor: string | null = null;
  if (entry.updatedBy && getUserName) {
    actor = getUserName(entry.updatedBy) || null;
  } else if (entry.updatedBy) {
    actor = 'Nutzer';
  } else if (entry.createdBy && getUserName) {
    actor = getUserName(entry.createdBy) || null;
  } else if (entry.createdBy) {
    actor = 'Nutzer';
  }

  return {
    timestamp,
    source,
    sourceDisplay,
    actor,
    isAutomatic,
    isUpdated,
    version,
  };
}
