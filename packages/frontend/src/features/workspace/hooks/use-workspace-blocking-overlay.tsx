import { createContext, useContext, type ReactNode } from 'react';

interface WorkspaceBlockingOverlayContextValue {
  readonly isBlocking: boolean;
}

const WorkspaceBlockingOverlayContext = createContext<WorkspaceBlockingOverlayContextValue>({ isBlocking: false });

export function WorkspaceBlockingOverlayProvider({ isBlocking, children }: WorkspaceBlockingOverlayContextValue & { readonly children: ReactNode }) {
  return <WorkspaceBlockingOverlayContext.Provider value={{ isBlocking }}>{children}</WorkspaceBlockingOverlayContext.Provider>;
}

export function useWorkspaceBlockingOverlay(): WorkspaceBlockingOverlayContextValue {
  return useContext(WorkspaceBlockingOverlayContext);
}
