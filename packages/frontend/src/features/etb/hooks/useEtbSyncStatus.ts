/**
 * Hook zur Ableitung des ETB Sync-Status
 *
 * Leitet den aktuellen Sync-Status aus vorhandenen States ab:
 * - Mutation-Status (isPending, isSuccess, isError)
 * - ETB-Lock-Status
 * - Netzwerk-Status (navigator.onLine)
 *
 * Kein eigener Store — reine Ableitung aus bestehenden States.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SyncStatusInfo, EtbSyncStatus } from '../types/sync-status.types';

/** Mutation-State Subset, der für die Status-Ableitung benötigt wird */
export interface MutationStatusInput {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** Fehlermeldung falls vorhanden */
  errorMessage?: string;
}

/** Parameter für den useEtbSyncStatus Hook */
export interface UseEtbSyncStatusParams {
  /** Create-Mutation Status */
  createMutation: MutationStatusInput;
  /** Update-Mutation Status */
  updateMutation: MutationStatusInput;
  /** Einsatz-Status (z.B. 'IN_BEARBEITUNG', 'ABGESCHLOSSEN') — Issue #582 */
  einsatzStatus?: string;
  /** Retry-Handler für fehlgeschlagene Speichervorgänge */
  onRetry?: () => void;
  /** Verzögerung bevor Syncing-Status angezeigt wird (Standard: 300ms) */
  syncingDelayMs?: number;
}

/** Status-Mapping-Konfiguration */
const STATUS_MESSAGES: Record<EtbSyncStatus, string> = {
  'local-draft': '',
  syncing: 'Wird synchronisiert…',
  synced: 'Erfolgreich gespeichert',
  failed: 'Speichern fehlgeschlagen',
  'conflict-retry': 'Konflikt erkannt – bitte erneut versuchen',
  'degraded-connection': 'Verbindung unterbrochen – Eingabe wird lokal gehalten',
  'readonly-locked': 'Schreibgeschützt – Einsatz ist abgeschlossen',
};

/**
 * Leitet den Sync-Status aus Mutation- und ETB-State ab
 *
 * Implementiert das 300ms-Gate: `syncing` wird erst nach 300ms angezeigt.
 * Bei schnellen Mutations (<300ms) springt der Status direkt zu `synced`.
 */
export function useEtbSyncStatus({ createMutation, updateMutation, einsatzStatus, onRetry, syncingDelayMs = 300 }: UseEtbSyncStatusParams): SyncStatusInfo {
  const [showSyncing, setShowSyncing] = useState(false);
  const syncingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  // Netzwerk-Status tracken
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isSuccess = createMutation.isSuccess || updateMutation.isSuccess;
  const isError = createMutation.isError || updateMutation.isError;
  const errorMessage = createMutation.errorMessage || updateMutation.errorMessage;

  // 300ms-Gate für Syncing-Anzeige
  useEffect(() => {
    if (isPending) {
      syncingTimerRef.current = setTimeout(() => {
        setShowSyncing(true);
      }, syncingDelayMs);
    } else {
      if (syncingTimerRef.current) {
        clearTimeout(syncingTimerRef.current);
        syncingTimerRef.current = null;
      }
      setShowSyncing(false);
    }
    return () => {
      if (syncingTimerRef.current) {
        clearTimeout(syncingTimerRef.current);
        syncingTimerRef.current = null;
      }
    };
  }, [isPending, syncingDelayMs]);

  // Status-Ableitung (Prioritätsreihenfolge)
  const status = useMemo((): EtbSyncStatus => {
    // Höchste Priorität: Einsatz abgeschlossen → ETB schreibgeschützt (Issue #582)
    if (einsatzStatus === 'ABGESCHLOSSEN' || einsatzStatus === 'ARCHIVIERT') return 'readonly-locked';
    // Netzwerk degradiert
    if (!isOnline) return 'degraded-connection';
    // Aktive Mutation (nur anzeigen nach 300ms Gate)
    if (isPending && showSyncing) return 'syncing';
    // Mutation pending aber unter 300ms — zeige local-draft (AC2: kein Syncing-Flicker bei schnellen Mutations)
    if (isPending) return 'local-draft';
    // TODO: conflict-retry Erkennung wird in Story 3.5 implementiert (benötigt HTTP 409 Conflict-Handling vom Backend)
    // Fehler
    if (isError) return 'failed';
    // Erfolg
    if (isSuccess) return 'synced';
    // Default
    return 'local-draft';
  }, [einsatzStatus, isOnline, isPending, showSyncing, isError, isSuccess]);

  // Next-Action ableiten
  const nextAction = (() => {
    switch (status) {
      case 'failed':
        return {
          label: 'Erneut versuchen',
          description: errorMessage || 'Der Speichervorgang ist fehlgeschlagen.',
          handler: onRetry,
        };
      case 'conflict-retry':
        return {
          label: 'Erneut versuchen',
          description: 'Ein Versionskonflikt wurde erkannt. Bitte erneut speichern.',
          handler: onRetry,
        };
      case 'degraded-connection':
        return {
          label: 'Warten',
          description: 'Wird automatisch synchronisiert, sobald die Verbindung wiederhergestellt ist.',
        };
      case 'readonly-locked':
        return {
          label: 'Schreibgeschützt',
          description: 'Der Einsatz ist abgeschlossen — das ETB kann nicht mehr bearbeitet werden.',
        };
      default:
        return undefined;
    }
  })();

  // Timestamp nur bei Status-Änderung aktualisieren (Referenz-Stabilität)
  const prevStatusRef = useRef<EtbSyncStatus | null>(null);
  const timestampRef = useRef<string>(new Date().toISOString());
  if (prevStatusRef.current !== status) {
    prevStatusRef.current = status;
    timestampRef.current = new Date().toISOString();
  }

  return {
    status,
    message: STATUS_MESSAGES[status],
    nextAction,
    timestamp: timestampRef.current,
  };
}
