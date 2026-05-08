import { useEffect, useState } from 'react';

export const LG_VIEWPORT_QUERY = '(min-width: 1024px)';
export const XL_VIEWPORT_QUERY = '(min-width: 1280px)';

export function useLgViewport(): boolean {
  return useMediaViewport(LG_VIEWPORT_QUERY);
}

export function useXlViewport(): boolean {
  return useMediaViewport(XL_VIEWPORT_QUERY);
}

function useMediaViewport(query: string): boolean {
  const [matches, setMatches] = useState(() => readMatch(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener?.(handleChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener?.(handleChange);
      }
    };
  }, [query]);

  return matches;
}

function readMatch(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(query).matches;
}
