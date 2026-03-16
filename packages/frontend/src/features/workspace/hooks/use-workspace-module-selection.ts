import type { WorkspaceModuleDefinition, WorkspaceModuleSelection, WorkspaceSubPage } from '../types';
import { useMemo } from 'react';

interface UseWorkspaceModuleSelectionOptions {
  modules: WorkspaceModuleDefinition[];
  activeModuleId?: string;
  activePageHref?: string;
}

export function getWorkspacePrimaryPage(module: WorkspaceModuleDefinition): WorkspaceSubPage {
  return module.subPages.find((page) => page.href === module.routeTarget) ?? module.subPages[0];
}

export function useWorkspaceModuleSelection({ modules, activeModuleId, activePageHref }: UseWorkspaceModuleSelectionOptions): WorkspaceModuleSelection {
  return useMemo(() => {
    const fallbackModule = modules[0];

    if (!fallbackModule) {
      throw new Error('WorkspaceShell benötigt mindestens ein Modul im Contract.');
    }

    const currentModule = modules.find((module) => module.id === activeModuleId) ?? fallbackModule;
    const currentPage = currentModule.subPages.find((page) => page.href === activePageHref) ?? getWorkspacePrimaryPage(currentModule);

    return {
      currentModule,
      currentPage,
    };
  }, [modules, activeModuleId, activePageHref]);
}
