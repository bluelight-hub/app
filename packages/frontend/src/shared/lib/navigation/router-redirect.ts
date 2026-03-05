import { logger } from '@/shared/lib/logger';

type RedirectSearch = Record<string, unknown>;

export interface RouterRedirectOptions {
  to: string;
  search?: RedirectSearch;
  replace?: boolean;
}

const PROTOCOL_PREFIX_REGEX = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

/**
 * Erlaubt nur interne Redirect-Ziele, um Open-Redirects zu verhindern.
 */
export function sanitizeInternalRedirectPath(path: string | null | undefined): string | undefined {
  if (typeof path !== 'string') {
    return undefined;
  }

  const trimmedPath = path.trim();
  if (!trimmedPath || !trimmedPath.startsWith('/')) {
    return undefined;
  }

  // Blockiert Protokoll-relative/externe Ziele wie //evil.com
  if (trimmedPath.startsWith('//')) {
    return undefined;
  }

  // Zusätzliche Absicherung gegen protokollartige Präfixe
  if (PROTOCOL_PREFIX_REGEX.test(trimmedPath)) {
    return undefined;
  }

  return trimmedPath;
}

export function getCurrentPathWithQueryAndHash(fallbackPathname = '/'): string {
  if (typeof window === 'undefined') {
    return fallbackPathname;
  }

  const pathname = window.location.pathname || fallbackPathname;
  return `${pathname}${window.location.search}${window.location.hash}`;
}

export function getRedirectFromSearch(search: string): string | undefined {
  const params = new URLSearchParams(search);
  return sanitizeInternalRedirectPath(params.get('redirect'));
}

function buildFallbackHref(to: string, search?: RedirectSearch): string {
  if (!search) {
    return to;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry !== undefined && entry !== null) {
          params.append(key, String(entry));
        }
      }
      continue;
    }

    params.set(key, String(value));
  }

  const queryString = params.toString();
  if (!queryString) {
    return to;
  }

  const [pathAndQuery, hash = ''] = to.split('#', 2);
  const separator = pathAndQuery.includes('?') ? '&' : '?';
  return `${pathAndQuery}${separator}${queryString}${hash ? `#${hash}` : ''}`;
}

/**
 * Exportiert für Tests, damit Dynamic-Import-Verhalten mockbar ist.
 */
export async function loadAppRouter(): Promise<{
  navigate: (options: { to: string; search?: RedirectSearch; replace?: boolean }) => Promise<unknown> | unknown;
} | null> {
  try {
    const module = await import('@/main');
    return module.router as {
      navigate: (options: { to: string; search?: RedirectSearch; replace?: boolean }) => Promise<unknown> | unknown;
    };
  } catch (error) {
    logger.debug('Router konnte für Soft-Redirect nicht geladen werden', { error });
    return null;
  }
}

/**
 * Führt bevorzugt Soft-Navigation über den Router aus.
 * Bei Fehlern wird kontrolliert auf window.location.href zurückgefallen.
 */
export async function redirectWithRouter({ to, search, replace = true }: RouterRedirectOptions): Promise<void> {
  const safeTarget = sanitizeInternalRedirectPath(to);
  if (!safeTarget) {
    logger.warn('Unsicheres Redirect-Ziel blockiert', { to });
    return;
  }

  try {
    const router = await loadAppRouter();
    if (router) {
      await router.navigate({
        to: safeTarget,
        search,
        replace,
      });
      return;
    }
  } catch (error) {
    logger.warn('Soft-Redirect fehlgeschlagen, verwende Hard-Redirect-Fallback', { to: safeTarget, error });
  }

  const fallbackHref = buildFallbackHref(safeTarget, search);
  window.location.href = fallbackHref;
}
