import { useWorkspaceModules } from '@/features/workspace';
import type { WorkspaceModuleDefinition } from '@/features/workspace';

export type Module = WorkspaceModuleDefinition;

export function useEinsatzModules(): Module[] {
  return useWorkspaceModules();
}
