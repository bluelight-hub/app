interface ViewportSize {
  width: number;
  height: number;
}

type MediaQueryListener = (event: MediaQueryListEvent) => void;

const DEFAULT_VIEWPORT: ViewportSize = {
  width: 1280,
  height: 800,
};

let viewportSize: ViewportSize = { ...DEFAULT_VIEWPORT };
let viewportOverrideActive = false;

const mediaQueryListeners = new Map<string, Set<MediaQueryListener>>();

function getNumericConstraint(query: string, constraint: 'min' | 'max', dimension: 'width' | 'height'): number | null {
  const match = query.match(new RegExp(`\\(${constraint}-${dimension}:\\s*(\\d+)px\\)`, 'i'));
  return match?.[1] ? Number(match[1]) : null;
}

function evaluateMediaQuery(query: string, size: ViewportSize): boolean {
  if (!viewportOverrideActive) {
    return false;
  }

  if (/prefers-reduced-motion:\s*reduce/i.test(query)) {
    return false;
  }

  const minWidth = getNumericConstraint(query, 'min', 'width');
  const maxWidth = getNumericConstraint(query, 'max', 'width');
  const minHeight = getNumericConstraint(query, 'min', 'height');
  const maxHeight = getNumericConstraint(query, 'max', 'height');

  if (minWidth !== null && size.width < minWidth) {
    return false;
  }

  if (maxWidth !== null && size.width > maxWidth) {
    return false;
  }

  if (minHeight !== null && size.height < minHeight) {
    return false;
  }

  if (maxHeight !== null && size.height > maxHeight) {
    return false;
  }

  return true;
}

function emitMediaQueryChange(query: string, matches: boolean): void {
  const listeners = mediaQueryListeners.get(query);
  if (!listeners || listeners.size === 0) {
    return;
  }

  const event = {
    matches,
    media: query,
  } as MediaQueryListEvent;

  for (const listener of listeners) {
    listener(event);
  }
}

export function createMatchMedia(query: string): MediaQueryList {
  return {
    get matches() {
      return evaluateMediaQuery(query, viewportSize);
    },
    media: query,
    onchange: null,
    addListener(listener: MediaQueryListener) {
      const listeners = mediaQueryListeners.get(query) ?? new Set<MediaQueryListener>();
      listeners.add(listener);
      mediaQueryListeners.set(query, listeners);
    },
    removeListener(listener: MediaQueryListener) {
      mediaQueryListeners.get(query)?.delete(listener);
    },
    addEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      if (typeof listener === 'function') {
        this.addListener(listener as MediaQueryListener);
      }
    },
    removeEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      if (typeof listener === 'function') {
        this.removeListener(listener as MediaQueryListener);
      }
    },
    dispatchEvent(event: Event) {
      if (typeof this.onchange === 'function') {
        this.onchange(event as MediaQueryListEvent);
      }

      return true;
    },
  };
}

export function installViewportMock(targetWindow: Window): void {
  resetViewportSize();

  Object.defineProperty(targetWindow, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => createMatchMedia(query),
  });
}

function applyViewportSize(size: Partial<ViewportSize>, overrideActive: boolean): void {
  const previousQueries = Array.from(mediaQueryListeners.keys()).map((query) => ({
    query,
    matches: evaluateMediaQuery(query, viewportSize),
  }));

  viewportOverrideActive = overrideActive;
  viewportSize = {
    width: size.width ?? viewportSize.width,
    height: size.height ?? viewportSize.height,
  };

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: viewportSize.width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: viewportSize.height,
  });

  window.dispatchEvent(new Event('resize'));

  for (const { query, matches } of previousQueries) {
    const nextMatches = evaluateMediaQuery(query, viewportSize);
    if (matches !== nextMatches) {
      emitMediaQueryChange(query, nextMatches);
    }
  }
}

export function setViewportSize(size: Partial<ViewportSize> | number): void {
  const resolvedSize = typeof size === 'number' ? { width: size } : size;
  applyViewportSize(resolvedSize, true);
}

export function resetViewportSize(): void {
  applyViewportSize(DEFAULT_VIEWPORT, false);
  // Cleanup von test-uebergreifenden Listener-Leaks: jede Spec, die einen Hook
  // mountet ohne sauberes unmount, wuerde sonst Listener zurueck lassen, die in
  // der naechsten Spec stale matches feuern. `cleanup()` aus testing-library
  // entfernt React-Komponenten (und damit deren useEffect-Cleanups), aber wir
  // halten die Map zusaetzlich proaktiv leer, falls Komponenten ausserhalb von
  // testing-library gemountet wurden.
  mediaQueryListeners.clear();
}

export const createMatchMediaList = createMatchMedia;
export const setTestViewport = setViewportSize;
export const resetTestViewport = resetViewportSize;
