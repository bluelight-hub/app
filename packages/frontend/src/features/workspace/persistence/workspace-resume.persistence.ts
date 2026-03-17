import { getStorageAdapter } from '@/shared/services/storage/storage-adapter.factory';
import { z } from 'zod';

const WORKSPACE_RESUME_VERSION = 1;
const WORKSPACE_RESUME_FEATURE = 'workspace-resume';

const workspaceResumeStateSchema = z.object({
  version: z.literal(WORKSPACE_RESUME_VERSION),
  serverId: z.string().min(1),
  userId: z.string().min(1),
  role: z.string().min(1),
  einsatzId: z.string().min(1),
  moduleId: z.string().min(1).nullable(),
  pathname: z.string().min(1),
  search: z.record(z.string(), z.unknown()),
  updatedAt: z.string().datetime(),
});

export type WorkspaceResumeState = z.infer<typeof workspaceResumeStateSchema>;

export interface WorkspaceResumeScope {
  serverId: string;
  userId: string;
  role: string;
  einsatzId: string;
}

export interface SaveWorkspaceResumeStateInput extends WorkspaceResumeScope {
  moduleId: string | null;
  pathname: string;
  search: Record<string, unknown>;
}

export function getWorkspaceResumeStorageKey(scope: WorkspaceResumeScope): string {
  return `bluelight:server:${scope.serverId}:user:${scope.userId}:role:${scope.role}:einsatz:${scope.einsatzId}:feature:${WORKSPACE_RESUME_FEATURE}`;
}

export async function saveWorkspaceResumeState(input: SaveWorkspaceResumeStateInput): Promise<void> {
  const adapter = getStorageAdapter();
  const state: WorkspaceResumeState = {
    version: WORKSPACE_RESUME_VERSION,
    serverId: input.serverId,
    userId: input.userId,
    role: input.role,
    einsatzId: input.einsatzId,
    moduleId: input.moduleId,
    pathname: input.pathname,
    search: input.search,
    updatedAt: new Date().toISOString(),
  };

  await adapter.setItem(getWorkspaceResumeStorageKey(input), JSON.stringify(state));
}

export async function loadWorkspaceResumeState(scope: WorkspaceResumeScope): Promise<WorkspaceResumeState | null> {
  const adapter = getStorageAdapter();
  const rawValue = await adapter.getItem(getWorkspaceResumeStorageKey(scope));

  if (!rawValue) {
    return null;
  }

  try {
    return workspaceResumeStateSchema.parse(JSON.parse(rawValue));
  } catch (error) {
    console.warn('Ignoring invalid workspace resume state:', error);
    return null;
  }
}

export async function clearWorkspaceResumeState(scope: WorkspaceResumeScope): Promise<void> {
  const adapter = getStorageAdapter();
  await adapter.removeItem(getWorkspaceResumeStorageKey(scope));
}
