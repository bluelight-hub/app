import type { EinsatzControllerFindOneVAlpha200Response } from '@/shared';
import { api } from '@/shared';

const rehydrationSessionState: {
  inFlightKey: string | null;
  promise: Promise<void> | null;
  resolvedKey: string | null;
} = {
  inFlightKey: null,
  promise: null,
  resolvedKey: null,
};

const activeEinsatzRequestCache = new Map<string, Promise<EinsatzControllerFindOneVAlpha200Response>>();

let runtimeGeneration = 0;

function getActiveEinsatzRequestKey(serverId: string | null, einsatzId: string): string {
  return `${serverId ?? 'global'}:${einsatzId}`;
}

function resetRehydrationSessionState(): void {
  rehydrationSessionState.inFlightKey = null;
  rehydrationSessionState.promise = null;
  rehydrationSessionState.resolvedKey = null;
}

export function invalidateActiveEinsatzRuntime(): void {
  runtimeGeneration += 1;
  activeEinsatzRequestCache.clear();
  resetRehydrationSessionState();
}

export function getActiveEinsatzRuntimeGeneration(): number {
  return runtimeGeneration;
}

export function isActiveEinsatzRuntimeGenerationCurrent(generation: number): boolean {
  return runtimeGeneration === generation;
}

export function ensureSingleRehydration(sessionKey: string, run: () => Promise<void>): Promise<void> | null {
  if (rehydrationSessionState.resolvedKey === sessionKey) {
    return null;
  }

  if (rehydrationSessionState.inFlightKey === sessionKey && rehydrationSessionState.promise) {
    return rehydrationSessionState.promise;
  }

  const generation = runtimeGeneration;
  rehydrationSessionState.inFlightKey = sessionKey;
  rehydrationSessionState.promise = run().finally(() => {
    if (runtimeGeneration !== generation) {
      return;
    }

    rehydrationSessionState.resolvedKey = sessionKey;

    if (rehydrationSessionState.inFlightKey === sessionKey) {
      rehydrationSessionState.inFlightKey = null;
      rehydrationSessionState.promise = null;
    }
  });

  return rehydrationSessionState.promise;
}

export async function fetchActiveEinsatzOnce(serverId: string | null, einsatzId: string): Promise<EinsatzControllerFindOneVAlpha200Response> {
  const requestKey = getActiveEinsatzRequestKey(serverId, einsatzId);
  const cachedRequest = activeEinsatzRequestCache.get(requestKey);

  if (cachedRequest) {
    return cachedRequest;
  }

  const request = api
    .einsatz()
    .einsatzControllerFindOneVAlpha({ id: einsatzId })
    .finally(() => {
      if (activeEinsatzRequestCache.get(requestKey) === request) {
        activeEinsatzRequestCache.delete(requestKey);
      }
    });

  activeEinsatzRequestCache.set(requestKey, request);
  return request;
}
