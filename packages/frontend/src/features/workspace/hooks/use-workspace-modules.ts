import { EINSATZ_WORKSPACE_MODULES } from '../registry';
import type { WorkspaceModuleDefinition } from '../types';
import { useMemo } from 'react';

export function useWorkspaceModules(): WorkspaceModuleDefinition[] {
  return useMemo(() => [...EINSATZ_WORKSPACE_MODULES].sort((left, right) => left.priority - right.priority), []);
}
