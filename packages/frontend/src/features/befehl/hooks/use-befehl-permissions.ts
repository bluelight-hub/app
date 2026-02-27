/**
 * Permission Hook für Befehl-Aktionen
 *
 * Gibt aktuell alle Berechtigungen frei - Rollen-Checks werden
 * später mit dem Einsatzrollen-System re-aktiviert.
 */

export interface BefehlPermissions {
  /** Darf Befehle erstellen */
  canCreate: boolean;
  /** Darf Befehle quittieren */
  canQuittieren: boolean;
  /** Darf Befehle korrigieren */
  canKorrigieren: boolean;
  /** Darf Empfaenger-Status verwalten */
  canManageStatus: boolean;
  /** Darf Befehle exportieren */
  canExport: boolean;
  /** Darf alle Befehle einsehen */
  canViewAll: boolean;
  /** Ist nur Beobachter (read-only) */
  isBeobachter: boolean;
  /** Aktuelle Rolle des Users (null wenn keine) */
  rolle: string | null;
  /** Laden die Rollen-Daten noch? */
  isLoading: boolean;
}

/**
 * Hook zur Bestimmung der Befehl-Berechtigungen des aktuellen Users
 *
 * Aktuell: Alle Aktionen erlaubt (Passthrough).
 * Wird mit dem Einsatzrollen-System später eingeschränkt.
 *
 * @param _einsatzId - Einsatz-ID (aktuell nicht verwendet)
 * @returns Alle Berechtigungen als true
 */
export function useBefehlPermissions(_einsatzId: string): BefehlPermissions {
  return {
    canCreate: true,
    canQuittieren: true,
    canKorrigieren: true,
    canManageStatus: true,
    canExport: true,
    canViewAll: true,
    isBeobachter: false,
    rolle: null,
    isLoading: false,
  };
}
