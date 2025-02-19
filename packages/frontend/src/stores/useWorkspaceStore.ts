import { create, StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { logger } from '../utils/logger';

export interface WorkspaceTab {
    id: string;
    title: string;
    type: 'workspace' | 'dashboard' | 'administration';
    active: boolean;
}

interface WorkspaceState {
    tabs: WorkspaceTab[];
    activeTabId: string | null;
    addTab: (type: WorkspaceTab['type'], title?: string) => void;
    removeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    updateTabTitle: (id: string, title: string) => void;
}

type WorkspaceStore = StateCreator<
    WorkspaceState,
    [["zustand/devtools", never]],
    [],
    WorkspaceState
>;

const initialTabs: WorkspaceTab[] = [
    { id: crypto.randomUUID(), title: 'Workspace', type: 'workspace', active: true },
];

export const useWorkspaceStore = create<WorkspaceState>()(
    devtools(
        ((set) => ({
            tabs: initialTabs,
            activeTabId: initialTabs[0].id,
            addTab: (type: WorkspaceTab['type'], title?: string) => set((state: WorkspaceState) => {
                const newTab: WorkspaceTab = {
                    id: crypto.randomUUID(),
                    title: title || `New ${type} ${state.tabs.length + 1}`,
                    type,
                    active: true,
                };
                logger.debug('creating new tab', newTab);
                return {
                    tabs: [...state.tabs.map(tab => ({ ...tab, active: false })), newTab],
                    activeTabId: newTab.id,
                };
            }),
            removeTab: (id: string) => set((state: WorkspaceState) => {
                const newTabs = state.tabs.filter(tab => tab.id !== id);
                const newActiveTabId = state.activeTabId === id
                    ? newTabs[newTabs.length - 1]?.id || null
                    : state.activeTabId;

                const newId = crypto.randomUUID();
                if (newTabs.length === 0) {
                    return {
                        tabs: [{ id: newId, title: 'Workspace', type: 'workspace', active: true }],
                        activeTabId: newId,
                    };
                }

                return {
                    tabs: newTabs,
                    activeTabId: newActiveTabId,
                };
            }),
            setActiveTab: (id: string) => set((state: WorkspaceState) => ({
                tabs: state.tabs.map(tab => ({
                    ...tab,
                    active: tab.id === id,
                })),
                activeTabId: id,
            })),
            updateTabTitle: (id: string, title: string) => set((state: WorkspaceState) => ({
                tabs: state.tabs.map(tab =>
                    tab.id === id ? { ...tab, title } : tab
                ),
            })),
        })) as WorkspaceStore,
        { name: 'workspace-store' }
    )
); 