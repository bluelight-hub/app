/**
 * Combined ETB Operations Hook
 *
 * Convenience Hook der alle ETB-Operationen kombiniert.
 */

import { useCreateEtbEntry } from './use-create-entry';
import { useCreateKorrektur } from './use-create-korrektur';
import { useDeleteEtbEntry } from './use-delete-entry';
import { useEtb } from './use-etb';
import { useTextbausteine } from './use-textbausteine';

export interface UseEtbOperationsOptions {
  /**
   * Einsatz-ID fuer ETB-Abfrage
   */
  einsatzId?: string;

  /**
   * Gelöschte Einträge einschliessen
   *
   * @default false
   */
  includeDeleted?: boolean;
}

/**
 * Kombinierter Hook fuer alle ETB-Operationen (CQRS)
 *
 * Dieser Hook vereint alle ETB-bezogenen Queries und Mutations in einem
 * einzigen Hook. Praktisch fuer Komponenten die mehrere ETB-Operationen
 * benoetigen.
 *
 * @param options - Optionen fuer ETB-Operationen
 * @returns Objekt mit allen ETB-bezogenen Hooks und Daten
 *
 * @example
 * ```tsx
 * const {
 *   etb,
 *   isLoadingEtb,
 *   textbausteine,
 *   createEintrag,
 *   createKorrektur,
 * } = useEtbOperations({ einsatzId: 'abc-123' });
 * ```
 */
export const useEtbOperations = ({ einsatzId, includeDeleted = false }: UseEtbOperationsOptions = {}) => {
  const etbQuery = useEtb({ einsatzId, includeDeleted });
  const textbausteineQuery = useTextbausteine();
  const createEintrag = useCreateEtbEntry();
  const createKorrektur = useCreateKorrektur();
  const deleteEintrag = useDeleteEtbEntry();

  return {
    // Query results
    etb: etbQuery.data,
    isLoadingEtb: etbQuery.isLoading,
    etbError: etbQuery.error,
    textbausteine: textbausteineQuery.data,
    isLoadingTextbausteine: textbausteineQuery.isLoading,
    textbausteineError: textbausteineQuery.error,

    // Mutations
    createEintrag: createEintrag.mutate,
    createKorrektur: createKorrektur.mutate,
    deleteEintrag: deleteEintrag.mutate,

    // Mutation states
    isCreatingEintrag: createEintrag.isPending,
    isCreatingKorrektur: createKorrektur.isPending,
    isDeletingEintrag: deleteEintrag.isPending,

    // Full mutation objects for advanced usage
    createEintragMutation: createEintrag,
    createKorrekturMutation: createKorrektur,
    deleteEintragMutation: deleteEintrag,
  };
};
