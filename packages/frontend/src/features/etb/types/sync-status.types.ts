/**
 * ETB Sync-Status-Typsystem
 *
 * Ring-2-Statusmodell für Save/Sync-Zustände im ETB-Kontext.
 * Status wird aus vorhandenen States abgeleitet (Mutation, ETB-Lock, Netzwerk).
 */

/** Alle möglichen Sync-Zustände im ETB-Kontext */
export type EtbSyncStatus = 'local-draft' | 'syncing' | 'synced' | 'failed' | 'conflict-retry' | 'degraded-connection' | 'readonly-locked';

/** Nächste zulässige Aktion für den aktuellen Status */
export interface SyncNextAction {
  /** Button-Label (kurz) */
  label: string;
  /** Beschreibungstext für den Nutzer */
  description: string;
  /** Optionaler Handler für die Aktion */
  handler?: () => void;
}

/** Vollständige Status-Info für die ContinuityStatusRail */
export interface SyncStatusInfo {
  /** Aktueller Sync-Status */
  status: EtbSyncStatus;
  /** Verständliche Statusmeldung */
  message: string;
  /** Nächste zulässige Aktion (inline angezeigt) */
  nextAction?: SyncNextAction;
  /** Zeitstempel der letzten Status-Änderung */
  timestamp?: string;
}
