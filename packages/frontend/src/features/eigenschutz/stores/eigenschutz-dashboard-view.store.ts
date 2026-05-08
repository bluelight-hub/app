import { createStore, useStore } from '@tanstack/react-store';
import { getStorageAdapter } from '@/shared/services/storage/storage-adapter.factory';

export type EigenschutzDashboardView = 'cards' | 'focus';

export interface EigenschutzDashboardViewState {
  readonly view: EigenschutzDashboardView;
  readonly hydrated: boolean;
}

export const DASHBOARD_VIEW_STORAGE_KEY = 'bluelight-hub:eigenschutz:dashboard-view:v1';

const INITIAL_STATE: EigenschutzDashboardViewState = {
  view: 'cards',
  hydrated: false,
};

export const eigenschutzDashboardViewStore = createStore<EigenschutzDashboardViewState>(INITIAL_STATE);

let mutationSequence = 0;
let writeQueue: Promise<void> = Promise.resolve();

export async function hydrateDashboardView(): Promise<void> {
  if (eigenschutzDashboardViewStore.state.hydrated) return;
  const sequenceAtStart = mutationSequence;

  try {
    const stored = await getStorageAdapter().getItem(DASHBOARD_VIEW_STORAGE_KEY);
    if (eigenschutzDashboardViewStore.state.hydrated || mutationSequence !== sequenceAtStart) return;
    eigenschutzDashboardViewStore.setState(() => ({
      view: parseDashboardView(stored),
      hydrated: true,
    }));
  } catch (error) {
    if (eigenschutzDashboardViewStore.state.hydrated || mutationSequence !== sequenceAtStart) return;
    console.warn('[eigenschutzDashboardViewStore] Persistierte Ansicht konnte nicht geladen werden.', error);
    eigenschutzDashboardViewStore.setState(() => ({ view: 'cards', hydrated: true }));
  }
}

export async function setDashboardView(view: EigenschutzDashboardView): Promise<void> {
  mutationSequence += 1;
  const sequence = mutationSequence;
  eigenschutzDashboardViewStore.setState(() => ({ view, hydrated: true }));

  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      if (sequence !== mutationSequence) return;
      try {
        await getStorageAdapter().setItem(DASHBOARD_VIEW_STORAGE_KEY, view);
      } catch (error) {
        console.warn('[eigenschutzDashboardViewStore] Ansicht konnte nicht gespeichert werden.', error);
      }
    });

  await writeQueue;
}

export function useEigenschutzDashboardView(): EigenschutzDashboardViewState {
  return useStore(eigenschutzDashboardViewStore);
}

export function resetDashboardViewStoreForTest(): void {
  mutationSequence = 0;
  writeQueue = Promise.resolve();
  eigenschutzDashboardViewStore.setState(() => INITIAL_STATE);
}

function parseDashboardView(value: string | null): EigenschutzDashboardView {
  return value === 'focus' || value === 'cards' ? value : 'cards';
}
