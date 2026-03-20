import { useCurrentUser } from '@/features/auth';
import { serverStore } from '@/features/server/stores/server.store';
import { useStore } from '@tanstack/react-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clearEtbDraft, loadEtbDraft, saveEtbDraft } from '../persistence/etb-draft.persistence';
import type { EtbDraftScope, EtbDraftState } from '../types/draft-state.types';

/** Form-Werte die für den Draft persistiert werden */
export interface EtbDraftFormValues {
  kategorie: string;
  text: string;
  absender?: string;
  empfaenger?: string;
  etbId: string;
}

export interface UseEtbDraftResumeOptions {
  einsatzId: string;
  etbId: string;
  etbStatus?: string;
}

export interface UseEtbDraftResumeReturn {
  /** Geladener Draft (null wenn keiner vorhanden oder ungültig) */
  pendingDraft: EtbDraftState | null;
  /** Ob der Draft gerade geladen wird */
  isLoadingDraft: boolean;
  /** Stellt den Draft wieder her und gibt die Werte zurück */
  restoreDraft: () => EtbDraftState;
  /** Verwirft den Draft */
  discardDraft: () => Promise<void>;
  /** Persistiert aktuelle Form-Werte als Draft */
  saveDraft: (values: EtbDraftFormValues) => void;
  /** Löscht den Draft aus dem Storage (nach erfolgreichem Speichern) */
  clearDraft: () => Promise<void>;
  /** Grund warum ein Draft verworfen wurde (für Inline-Meldung) */
  discardReason: string | null;
}

/**
 * Hook für ETB-Draft-Wiederaufnahme
 *
 * Lifecycle:
 * 1. Mount → Draft aus Storage laden
 * 2. Validierung → ungültige Drafts verwerfen (locked ETB, falsches etbId)
 * 3. Auto-Save → Form-Werte per saveDraft() persistieren (1000ms Debounce)
 * 4. Clear → nach erfolgreichem Speichern Draft löschen
 */
export function useEtbDraftResume({ einsatzId, etbId, etbStatus }: UseEtbDraftResumeOptions): UseEtbDraftResumeReturn {
  const { user } = useCurrentUser();
  const activeServerId = useStore(serverStore, (state) => state.activeServerId);

  const [pendingDraft, setPendingDraft] = useState<EtbDraftState | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [discardReason, setDiscardReason] = useState<string | null>(null);

  /** Ref für Debounce-Timer (Cleanup bei Unmount) */
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ref um den aktuellen Scope stabil zu halten */
  const scopeRef = useRef<EtbDraftScope | null>(null);

  // Scope ableiten
  const scope: EtbDraftScope | null = activeServerId && user?.id && user?.role ? { serverId: activeServerId, userId: user.id, role: user.role, einsatzId } : null;

  // Scope-Ref aktuell halten
  scopeRef.current = scope;

  // Load-Phase (Mount-Effect)
  useEffect(() => {
    if (!activeServerId || !user?.id || !user?.role) {
      setIsLoadingDraft(false);
      return;
    }

    // H1-FIX: Warte bis etbId verfügbar ist (während Query lädt ist etbId noch leer)
    if (!etbId) {
      setIsLoadingDraft(false);
      return;
    }

    let isCancelled = false;
    const capturedScope: EtbDraftScope = { serverId: activeServerId, userId: user.id, role: user.role, einsatzId };

    async function loadDraft() {
      setIsLoadingDraft(true);
      try {
        const draft = await loadEtbDraft(capturedScope);

        if (isCancelled) return;

        if (!draft) {
          setPendingDraft(null);
          setIsLoadingDraft(false);
          return;
        }

        // AC3: Draft-Validierung
        if (etbStatus === 'LOCKED') {
          await clearEtbDraft(capturedScope);
          if (isCancelled) return;
          setDiscardReason('Entwurf verworfen — ETB wurde zwischenzeitlich gesperrt');
          setPendingDraft(null);
          setIsLoadingDraft(false);
          return;
        }

        if (draft.etbId !== etbId) {
          await clearEtbDraft(capturedScope);
          if (isCancelled) return;
          setDiscardReason('Entwurf verworfen — gehört zu einem anderen ETB');
          setPendingDraft(null);
          setIsLoadingDraft(false);
          return;
        }

        setPendingDraft(draft);
      } catch {
        setPendingDraft(null);
      } finally {
        if (!isCancelled) {
          setIsLoadingDraft(false);
        }
      }
    }

    loadDraft();

    return () => {
      isCancelled = true;
    };
    // Scope-Bestandteile einzeln statt `scope` Objekt (Referenz-Stabilität)
  }, [activeServerId, user?.id, user?.role, einsatzId, etbId, etbStatus]);

  // Discard-Reason automatisch nach 5s ausblenden
  useEffect(() => {
    if (!discardReason) return;
    const timer = setTimeout(() => setDiscardReason(null), 5000);
    return () => clearTimeout(timer);
  }, [discardReason]);

  // Cleanup Debounce-Timer bei Unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const restoreDraft = useCallback((): EtbDraftState => {
    if (!pendingDraft) {
      throw new Error('Kein Draft zum Wiederherstellen vorhanden');
    }
    const draft = pendingDraft;
    setPendingDraft(null);
    return draft;
  }, [pendingDraft]);

  const discardDraft = useCallback(async (): Promise<void> => {
    if (scopeRef.current) {
      await clearEtbDraft(scopeRef.current);
    }
    setPendingDraft(null);
  }, []);

  const clearDraftFn = useCallback(async (): Promise<void> => {
    if (scopeRef.current) {
      await clearEtbDraft(scopeRef.current);
    }
  }, []);

  const saveDraft = useCallback(
    (values: EtbDraftFormValues) => {
      // Keine leeren Formulare persistieren
      if (!values.text.trim()) return;
      // Kein Scope verfügbar
      if (!scopeRef.current) return;

      // Debounce 1000ms
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const currentScope = scopeRef.current;
        if (!currentScope) return;

        saveEtbDraft(currentScope, {
          kategorie: values.kategorie as EtbDraftState['kategorie'],
          text: values.text,
          absender: values.absender,
          empfaenger: values.empfaenger,
          etbId: values.etbId,
        }).catch((error) => {
          console.warn('ETB-Draft auto-save fehlgeschlagen:', error);
        });
      }, 1000);
    },
    [], // scopeRef ist stabil
  );

  return {
    pendingDraft,
    isLoadingDraft,
    restoreDraft,
    discardDraft,
    saveDraft,
    clearDraft: clearDraftFn,
    discardReason,
  };
}
