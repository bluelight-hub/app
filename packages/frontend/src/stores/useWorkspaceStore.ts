import { create, StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface WorkspaceTab {
    id: string;
    title: string;
    type: 'empty' | 'project' | 'settings';
    active: boolean;
}

interface WorkspaceState {
    tabs: WorkspaceTab[];
    activeTabId: string | null;
    addTab: (type: WorkspaceTab['type'], title?: string) => void;
    removeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
}

type WorkspaceStore = StateCreator<
    WorkspaceState,
    [["zustand/devtools", never]],
    [],
    WorkspaceState
>;

export const useWorkspaceStore = create<WorkspaceState>()(
    devtools(
        ((set) => ({
            tabs: [],
            activeTabId: null,
            addTab: (type: WorkspaceTab['type'], title?: string) => set((state: WorkspaceState) => {
                const newTab: WorkspaceTab = {
                    id: crypto.randomUUID(),
                    title: title || `New ${type} ${state.tabs.length + 1}`,
                    type,
                    active: true,
                };

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
        })) as WorkspaceStore,
        { name: 'workspace-store' }
    )
); 