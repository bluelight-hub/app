import { Store, useStore } from '@tanstack/react-store';

interface EinsatzStoreState {
  selectedEinsatzId: string | null;
}

/**
 * Globaler Store für Einsatz UI-State
 */
const einsatzStore = new Store<EinsatzStoreState>({
  selectedEinsatzId: null,
});

export function useEinsatzStore() {
  const store = useStore(einsatzStore);

  const setSelectedEinsatzId = (id: string | null) => {
    einsatzStore.setState({ selectedEinsatzId: id });
  };

  const clearSelectedEinsatzId = () => {
    setSelectedEinsatzId(null);
  };

  return {
    selectedEinsatzId: store.selectedEinsatzId,
    setSelectedEinsatzId,
    clearSelectedEinsatzId,
  };
}
