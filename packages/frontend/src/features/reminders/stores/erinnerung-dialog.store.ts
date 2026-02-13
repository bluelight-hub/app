/**
 * Erinnerung Dialog Store
 *
 * Globaler UI-State für Erinnerungs-Dialog mit TanStack Store.
 *
 * **Story 1.1 AC4:** "Erstellen-Button oeffnet Quick-Create Dialog"
 */

import type { ErinnerungResponseDto, ErinnerungsvorlageResponseDto } from '@/shared';
import { Store, useStore } from '@tanstack/react-store';

/**
 * Erinnerung Dialog State Interface
 *
 * **Story 1.1:** Quick-Create Dialog State
 * **Story 1.3:** Edit Dialog State
 * **Story 1.4:** Delete Dialog State
 * **Story 2.5:** MarkErledigt Dialog State
 * **Story 5.4:** ETB Quick-Create Dialog State
 */
export interface ErinnerungDialogState {
  /** Ob der Quick-Create Dialog geoeffnet ist */
  isQuickCreateOpen: boolean;
  /** Einsatz-ID fuer den aktuellen Dialog-Kontext */
  einsatzId: string | null;
  /** Ob der Edit Dialog geoeffnet ist (Story 1.3 AC1) */
  isEditOpen: boolean;
  /** Die zu bearbeitende Erinnerung (Story 1.3 AC1) */
  erinnerungToEdit: ErinnerungResponseDto | null;
  /** Ob der Delete Dialog geoeffnet ist (Story 1.4 AC2) */
  isDeleteOpen: boolean;
  /** Die zu loeschende Erinnerung (Story 1.4 AC2) */
  erinnerungToDelete: ErinnerungResponseDto | null;
  /** Ob der MarkErledigt Dialog geoeffnet ist (Story 2.5) */
  isMarkErledigtOpen: boolean;
  /** Die zu erledigende Erinnerung (Story 2.5) */
  erinnerungToMarkErledigt: ErinnerungResponseDto | null;
  /** ETB-Eintrag-ID fuer Quick-Create aus ETB (Story 5.4) */
  etbEintragId: string | null;
  /** ETB-Eintrag-Text fuer Quick-Create aus ETB (Story 5.4) */
  etbEintragText: string | null;
  /** Vorlage fuer Quick-Create aus Vorlage (Story 6.3) */
  fromTemplate: ErinnerungsvorlageResponseDto | null;
  /** Ob der StopRecurring Dialog geoeffnet ist (Story 6.5) */
  isStopRecurringOpen: boolean;
  /** Die Erinnerung deren Serie gestoppt werden soll (Story 6.5) */
  erinnerungToStopRecurring: ErinnerungResponseDto | null;
}

/**
 * Initial State
 */
const initialState: ErinnerungDialogState = {
  isQuickCreateOpen: false,
  einsatzId: null,
  isEditOpen: false,
  erinnerungToEdit: null,
  isDeleteOpen: false,
  erinnerungToDelete: null,
  isMarkErledigtOpen: false,
  erinnerungToMarkErledigt: null,
  etbEintragId: null,
  etbEintragText: null,
  fromTemplate: null,
  isStopRecurringOpen: false,
  erinnerungToStopRecurring: null,
};

/**
 * Erinnerung Dialog Store
 *
 * Zentrale Store-Instanz fuer Erinnerungs-Dialog-State.
 */
export const erinnerungDialogStore = new Store<ErinnerungDialogState>(initialState);

// ============================================
// Store Actions (Helper Functions)
// ============================================

/**
 * Oeffnet den Quick-Create Dialog fuer einen Einsatz.
 *
 * @param einsatzId - ID des Einsatzes
 */
export const openQuickCreateDialog = (einsatzId: string) => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isQuickCreateOpen: true,
    einsatzId,
  }));
};

/**
 * Schliesst den Quick-Create Dialog.
 */
export const closeQuickCreateDialog = () => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isQuickCreateOpen: false,
    // einsatzId bleibt erhalten fuer potentielle Wiederverwendung
    // ETB-Felder zuruecksetzen
    etbEintragId: null,
    etbEintragText: null,
    // Vorlage zuruecksetzen (Story 6.3)
    fromTemplate: null,
  }));
};

/**
 * Oeffnet den Quick-Create Dialog aus einem ETB-Eintrag.
 *
 * **Story 5.4:** "Erinnerung aus ETB-Eintrag erstellen"
 *
 * @param einsatzId - ID des Einsatzes
 * @param eintragId - ID des ETB-Eintrags
 * @param eintragText - Text des ETB-Eintrags (wird als Vorausfuellung verwendet)
 */
export const openQuickCreateFromEtb = (einsatzId: string, eintragId: string, eintragText: string) => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isQuickCreateOpen: true,
    einsatzId,
    etbEintragId: eintragId,
    etbEintragText: eintragText,
  }));
};

/**
 * Oeffnet den Quick-Create Dialog aus einer Vorlage.
 *
 * **Story 6.3:** "Erinnerung aus Vorlage erstellen"
 *
 * @param einsatzId - ID des Einsatzes
 * @param vorlage - Die ausgewaehlte Erinnerungsvorlage
 */
export const openQuickCreateFromTemplate = (einsatzId: string, vorlage: ErinnerungsvorlageResponseDto) => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isQuickCreateOpen: true,
    einsatzId,
    fromTemplate: vorlage,
    // ETB-Felder zuruecksetzen
    etbEintragId: null,
    etbEintragText: null,
  }));
};

/**
 * Oeffnet den Edit Dialog fuer eine Erinnerung.
 *
 * **Story 1.3 AC1:** "Dialog oeffnet sich mit den aktuellen Werten"
 *
 * @param erinnerung - Die zu bearbeitende Erinnerung
 * @param einsatzId - ID des Einsatzes
 */
export const openEditDialog = (erinnerung: ErinnerungResponseDto, einsatzId: string) => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isEditOpen: true,
    erinnerungToEdit: erinnerung,
    einsatzId,
  }));
};

/**
 * Schliesst den Edit Dialog.
 */
export const closeEditDialog = () => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isEditOpen: false,
    erinnerungToEdit: null,
    // einsatzId bleibt erhalten fuer potentielle Wiederverwendung
  }));
};

/**
 * Oeffnet den Delete Dialog fuer eine Erinnerung.
 *
 * **Story 1.4 AC2:** "Bestaetigungs-Dialog fragt: 'Wirklich loeschen?'"
 *
 * @param erinnerung - Die zu loeschende Erinnerung
 * @param einsatzId - ID des Einsatzes
 */
export const openDeleteDialog = (erinnerung: ErinnerungResponseDto, einsatzId: string) => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isDeleteOpen: true,
    erinnerungToDelete: erinnerung,
    einsatzId,
  }));
};

/**
 * Schliesst den Delete Dialog.
 */
export const closeDeleteDialog = () => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isDeleteOpen: false,
    erinnerungToDelete: null,
    // einsatzId bleibt erhalten fuer potentielle Wiederverwendung
  }));
};

/**
 * Oeffnet den MarkErledigt Dialog fuer eine Erinnerung.
 *
 * **Story 2.5:** "Erinnerung als erledigt markieren"
 *
 * @param erinnerung - Die zu erledigende Erinnerung
 * @param einsatzId - ID des Einsatzes
 */
export const openMarkErledigtDialog = (erinnerung: ErinnerungResponseDto, einsatzId: string) => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isMarkErledigtOpen: true,
    erinnerungToMarkErledigt: erinnerung,
    einsatzId,
  }));
};

/**
 * Schliesst den MarkErledigt Dialog.
 */
export const closeMarkErledigtDialog = () => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isMarkErledigtOpen: false,
    erinnerungToMarkErledigt: null,
    // einsatzId bleibt erhalten fuer potentielle Wiederverwendung
  }));
};

/**
 * Oeffnet den StopRecurring Dialog fuer eine Erinnerung.
 *
 * **Story 6.5:** "Wiederkehrende Serie stoppen"
 *
 * @param erinnerung - Die Erinnerung deren Serie gestoppt werden soll
 * @param einsatzId - ID des Einsatzes
 */
export const openStopRecurringDialog = (erinnerung: ErinnerungResponseDto, einsatzId: string) => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isStopRecurringOpen: true,
    erinnerungToStopRecurring: erinnerung,
    einsatzId,
  }));
};

/**
 * Schliesst den StopRecurring Dialog.
 */
export const closeStopRecurringDialog = () => {
  erinnerungDialogStore.setState((state) => ({
    ...state,
    isStopRecurringOpen: false,
    erinnerungToStopRecurring: null,
  }));
};

/**
 * Setzt den Store zurueck.
 */
export const resetErinnerungDialogStore = () => {
  erinnerungDialogStore.setState(initialState);
};

// ============================================
// React Hooks
// ============================================

/**
 * Quick-Create Dialog State mit ETB-Verknuepfung
 *
 * **Story 5.4:** Erweitert um ETB-Felder
 */
export interface QuickCreateDialogState {
  isOpen: boolean;
  einsatzId: string | null;
  etbEintragId: string | null;
  etbEintragText: string | null;
  /** Story 6.3: Vorlage fuer Quick-Create */
  fromTemplate: ErinnerungsvorlageResponseDto | null;
}

/**
 * Hook fuer den Quick-Create Dialog State.
 *
 * @returns Tuple aus [isOpen, einsatzId]
 *
 * @example
 * ```tsx
 * const [isOpen, einsatzId] = useQuickCreateDialogState();
 *
 * return (
 *   <QuickCreateErinnerungDialog
 *     isOpen={isOpen}
 *     einsatzId={einsatzId ?? ''}
 *     onClose={closeQuickCreateDialog}
 *   />
 * );
 * ```
 */
export const useQuickCreateDialogState = (): [boolean, string | null] => {
  const isOpen = useStore(erinnerungDialogStore, (state) => state.isQuickCreateOpen);
  const einsatzId = useStore(erinnerungDialogStore, (state) => state.einsatzId);
  return [isOpen, einsatzId];
};

/**
 * Hook fuer den Quick-Create Dialog State mit ETB-Verknuepfung.
 *
 * **Story 5.4:** "Erinnerung aus ETB-Eintrag erstellen"
 *
 * @returns QuickCreateDialogState mit ETB-Feldern
 *
 * @example
 * ```tsx
 * const { isOpen, einsatzId, etbEintragId, etbEintragText } = useQuickCreateDialogStateWithEtb();
 *
 * return (
 *   <QuickCreateErinnerungDialog
 *     isOpen={isOpen}
 *     einsatzId={einsatzId ?? ''}
 *     etbEintragId={etbEintragId}
 *     defaultText={etbEintragText}
 *     onClose={closeQuickCreateDialog}
 *   />
 * );
 * ```
 */
export const useQuickCreateDialogStateWithEtb = (): QuickCreateDialogState => {
  const isOpen = useStore(erinnerungDialogStore, (state) => state.isQuickCreateOpen);
  const einsatzId = useStore(erinnerungDialogStore, (state) => state.einsatzId);
  const etbEintragId = useStore(erinnerungDialogStore, (state) => state.etbEintragId);
  const etbEintragText = useStore(erinnerungDialogStore, (state) => state.etbEintragText);
  const fromTemplate = useStore(erinnerungDialogStore, (state) => state.fromTemplate);
  return { isOpen, einsatzId, etbEintragId, etbEintragText, fromTemplate };
};

/**
 * Hook fuer den Edit Dialog State.
 *
 * **Story 1.3 AC1:** "Dialog oeffnet sich mit den aktuellen Werten"
 *
 * @returns Tuple aus [isOpen, erinnerungToEdit, einsatzId]
 *
 * @example
 * ```tsx
 * const [isOpen, erinnerung, einsatzId] = useEditDialogState();
 *
 * return (
 *   <ErinnerungEditDialog
 *     isOpen={isOpen}
 *     erinnerung={erinnerung}
 *     einsatzId={einsatzId ?? ''}
 *     onClose={closeEditDialog}
 *   />
 * );
 * ```
 */
export const useEditDialogState = (): [boolean, ErinnerungResponseDto | null, string | null] => {
  const isOpen = useStore(erinnerungDialogStore, (state) => state.isEditOpen);
  const erinnerungToEdit = useStore(erinnerungDialogStore, (state) => state.erinnerungToEdit);
  const einsatzId = useStore(erinnerungDialogStore, (state) => state.einsatzId);
  return [isOpen, erinnerungToEdit, einsatzId];
};

/**
 * Hook fuer den Delete Dialog State.
 *
 * **Story 1.4 AC2:** "Bestaetigungs-Dialog fragt: 'Wirklich loeschen?'"
 *
 * @returns Tuple aus [isOpen, erinnerungToDelete, einsatzId]
 *
 * @example
 * ```tsx
 * const [isOpen, erinnerung, einsatzId] = useDeleteDialogState();
 *
 * return (
 *   <ErinnerungDeleteDialog
 *     isOpen={isOpen}
 *     erinnerung={erinnerung}
 *     einsatzId={einsatzId ?? ''}
 *     onClose={closeDeleteDialog}
 *   />
 * );
 * ```
 */
export const useDeleteDialogState = (): [boolean, ErinnerungResponseDto | null, string | null] => {
  const isOpen = useStore(erinnerungDialogStore, (state) => state.isDeleteOpen);
  const erinnerungToDelete = useStore(erinnerungDialogStore, (state) => state.erinnerungToDelete);
  const einsatzId = useStore(erinnerungDialogStore, (state) => state.einsatzId);
  return [isOpen, erinnerungToDelete, einsatzId];
};

/**
 * Hook fuer den MarkErledigt Dialog State.
 *
 * **Story 2.5:** "Erinnerung als erledigt markieren"
 *
 * @returns Tuple aus [isOpen, erinnerungToMarkErledigt, einsatzId]
 *
 * @example
 * ```tsx
 * const [isOpen, erinnerung, einsatzId] = useMarkErledigtDialogState();
 *
 * return (
 *   <ErinnerungMarkErledigtDialog
 *     isOpen={isOpen}
 *     erinnerung={erinnerung}
 *     einsatzId={einsatzId ?? ''}
 *     onClose={closeMarkErledigtDialog}
 *   />
 * );
 * ```
 */
export const useMarkErledigtDialogState = (): [boolean, ErinnerungResponseDto | null, string | null] => {
  const isOpen = useStore(erinnerungDialogStore, (state) => state.isMarkErledigtOpen);
  const erinnerungToMarkErledigt = useStore(erinnerungDialogStore, (state) => state.erinnerungToMarkErledigt);
  const einsatzId = useStore(erinnerungDialogStore, (state) => state.einsatzId);
  return [isOpen, erinnerungToMarkErledigt, einsatzId];
};

/**
 * Hook fuer den StopRecurring Dialog State.
 *
 * **Story 6.5:** "Wiederkehrende Serie stoppen"
 *
 * @returns Tuple aus [isOpen, erinnerungToStopRecurring, einsatzId]
 */
export const useStopRecurringDialogState = (): [boolean, ErinnerungResponseDto | null, string | null] => {
  const isOpen = useStore(erinnerungDialogStore, (state) => state.isStopRecurringOpen);
  const erinnerungToStopRecurring = useStore(erinnerungDialogStore, (state) => state.erinnerungToStopRecurring);
  const einsatzId = useStore(erinnerungDialogStore, (state) => state.einsatzId);
  return [isOpen, erinnerungToStopRecurring, einsatzId];
};
