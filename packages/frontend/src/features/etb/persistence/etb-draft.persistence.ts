import { getStorageAdapter } from '@/shared/services/storage/storage-adapter.factory';
import { ETB_DRAFT_VERSION, etbDraftStateSchema, type EtbDraftScope, type EtbDraftState } from '../types/draft-state.types';

const ETB_DRAFT_FEATURE = 'etb-draft';

/** Erzeugt den scoped Storage-Key für ETB-Drafts */
export function getEtbDraftStorageKey(scope: EtbDraftScope): string {
  return `bluelight:server:${scope.serverId}:user:${scope.userId}:role:${scope.role}:einsatz:${scope.einsatzId}:feature:${ETB_DRAFT_FEATURE}`;
}

/**
 * Persistiert einen ETB-Draft im Storage
 *
 * Setzt `version` und `updatedAt` automatisch.
 */
export async function saveEtbDraft(scope: EtbDraftScope, draft: Omit<EtbDraftState, 'version' | 'updatedAt'>): Promise<void> {
  const adapter = getStorageAdapter();
  const state: EtbDraftState = {
    ...draft,
    version: ETB_DRAFT_VERSION,
    updatedAt: new Date().toISOString(),
  };

  await adapter.setItem(getEtbDraftStorageKey(scope), JSON.stringify(state));
}

/**
 * Lädt einen ETB-Draft aus dem Storage
 *
 * Validiert per Zod-Schema — bei ungültigen Daten wird `null` zurückgegeben
 * und eine Warnung geloggt (fail-safe).
 */
export async function loadEtbDraft(scope: EtbDraftScope): Promise<EtbDraftState | null> {
  const adapter = getStorageAdapter();
  const rawValue = await adapter.getItem(getEtbDraftStorageKey(scope));

  if (!rawValue) {
    return null;
  }

  try {
    return etbDraftStateSchema.parse(JSON.parse(rawValue));
  } catch (error) {
    console.warn('Ungültigen ETB-Draft verworfen:', error);
    return null;
  }
}

/** Löscht einen ETB-Draft aus dem Storage */
export async function clearEtbDraft(scope: EtbDraftScope): Promise<void> {
  const adapter = getStorageAdapter();
  await adapter.removeItem(getEtbDraftStorageKey(scope));
}
