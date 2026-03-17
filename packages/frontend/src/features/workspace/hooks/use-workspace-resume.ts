import { useCurrentUser } from '@/features/auth';
import { serverStore } from '@/features/server/stores/server.store';
import { useNavigate } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkspaceResumeState } from '../persistence/workspace-resume.persistence';
import { clearWorkspaceResumeState, loadWorkspaceResumeState, saveWorkspaceResumeState } from '../persistence/workspace-resume.persistence';
import { getAccessibleWorkspacePath, getWorkspaceRouteMeta, isWorkspaceRouteAccessible } from '../registry';

interface UseWorkspaceResumeOptions {
  einsatzId: string;
  pathname: string;
  search: Record<string, unknown>;
  requiresAssignment: boolean;
}

function sanitizeSearch(search: Record<string, unknown>): Record<string, unknown> {
  const nextSearch = { ...search };
  delete nextSearch.mode;
  return nextSearch;
}

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/$/, '');
}

function normalizeComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeComparableValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .reduce<Record<string, unknown>>((accumulator, [key, nestedValue]) => {
        accumulator[key] = normalizeComparableValue(nestedValue);
        return accumulator;
      }, {});
  }

  return value;
}

function createComparableRoute(pathname: string, search: Record<string, unknown>): string {
  return JSON.stringify({
    pathname: normalizePathname(pathname),
    search: normalizeComparableValue(search),
  });
}

function isResumeTargetAccessible(pathname: string, einsatzId: string): boolean {
  const routeMeta = getWorkspaceRouteMeta(pathname, einsatzId);
  return Boolean(routeMeta?.page) && isWorkspaceRouteAccessible(pathname, einsatzId);
}

export function useWorkspaceResume({ einsatzId, pathname, search, requiresAssignment }: UseWorkspaceResumeOptions): void {
  const navigate = useNavigate();
  const activeServerId = useStore(serverStore, (state) => state.activeServerId);
  const { user, authStatus } = useCurrentUser();
  const [storedResume, setStoredResume] = useState<WorkspaceResumeState | null>(null);
  const [resumeLoadState, setResumeLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const comparableCurrentSearch = useMemo(() => sanitizeSearch(search), [search]);
  const currentContextKey = useMemo(() => createComparableRoute(pathname, comparableCurrentSearch), [comparableCurrentSearch, pathname]);
  const currentContextRef = useRef(currentContextKey);
  const heldInitialContextRef = useRef<string | null>(null);

  const resumeScope = useMemo(() => {
    if (!activeServerId || !user?.id || !user.role) {
      return null;
    }

    return {
      serverId: activeServerId,
      userId: user.id,
      role: user.role,
      einsatzId,
    };
  }, [activeServerId, einsatzId, user?.id, user?.role]);

  currentContextRef.current = currentContextKey;

  useEffect(() => {
    if (!resumeScope || authStatus !== 'authenticated') {
      setStoredResume(null);
      setResumeLoadState('idle');
      heldInitialContextRef.current = null;
      return;
    }

    let isCancelled = false;

    async function resolveResumeState() {
      setResumeLoadState('loading');

      try {
        const nextStoredResume = await loadWorkspaceResumeState(resumeScope);

        if (isCancelled) {
          return;
        }

        if (nextStoredResume) {
          const targetPathname = getAccessibleWorkspacePath(nextStoredResume.pathname, einsatzId);
          const targetContextKey = createComparableRoute(targetPathname, nextStoredResume.search ?? {});
          heldInitialContextRef.current = currentContextRef.current === targetContextKey ? null : currentContextRef.current;
        } else {
          heldInitialContextRef.current = null;
        }

        setStoredResume(nextStoredResume);
        setResumeLoadState('loaded');
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to resolve workspace resume state:', error);
          setStoredResume(null);
          setResumeLoadState('error');
          heldInitialContextRef.current = null;
        }
      }
    }

    void resolveResumeState();

    return () => {
      isCancelled = true;
    };
  }, [authStatus, einsatzId, resumeScope]);

  useEffect(() => {
    if (!resumeScope || authStatus !== 'authenticated' || resumeLoadState !== 'loaded' || !storedResume) {
      return;
    }

    const targetPathname = getAccessibleWorkspacePath(storedResume.pathname, einsatzId);
    const targetMeta = getWorkspaceRouteMeta(targetPathname, einsatzId);

    if (isResumeTargetAccessible(storedResume.pathname, einsatzId) && targetMeta?.page) {
      return;
    }

    void clearWorkspaceResumeState(resumeScope).then(() => {
      heldInitialContextRef.current = null;
      setStoredResume(null);
    });
  }, [authStatus, einsatzId, resumeLoadState, resumeScope, storedResume]);

  useEffect(() => {
    if (!resumeScope || authStatus !== 'authenticated' || resumeLoadState !== 'loaded' || !storedResume || requiresAssignment) {
      return;
    }

    const targetPathname = getAccessibleWorkspacePath(storedResume.pathname, einsatzId);
    const targetMeta = getWorkspaceRouteMeta(targetPathname, einsatzId);

    if (!isResumeTargetAccessible(storedResume.pathname, einsatzId) || !targetMeta?.page) {
      return;
    }

    const targetSearch = storedResume.search ?? {};
    const targetContextKey = createComparableRoute(targetPathname, targetSearch);

    if (currentContextKey === targetContextKey) {
      heldInitialContextRef.current = null;
      return;
    }

    if (heldInitialContextRef.current !== currentContextKey) {
      return;
    }

    heldInitialContextRef.current = null;

    void navigate({
      to: targetPathname,
      search: targetSearch as never,
      replace: true,
    });
  }, [authStatus, currentContextKey, einsatzId, navigate, requiresAssignment, resumeLoadState, resumeScope, storedResume]);

  useEffect(() => {
    if (!resumeScope || authStatus !== 'authenticated' || resumeLoadState !== 'loaded') {
      return;
    }

    if (!pathname.startsWith(`/app/einsatz/${einsatzId}`)) {
      return;
    }

    const routeMeta = getWorkspaceRouteMeta(pathname, einsatzId);
    if (!routeMeta?.page) {
      return;
    }

    if (heldInitialContextRef.current && currentContextKey === heldInitialContextRef.current) {
      return;
    }

    if (heldInitialContextRef.current && currentContextKey !== heldInitialContextRef.current) {
      heldInitialContextRef.current = null;
    }

    void saveWorkspaceResumeState({
      ...resumeScope,
      moduleId: routeMeta.module.id,
      pathname,
      search: comparableCurrentSearch,
    });
  }, [authStatus, comparableCurrentSearch, currentContextKey, einsatzId, pathname, resumeLoadState, resumeScope]);
}
