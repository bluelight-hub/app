/**
 * onboardingStore (Issue #627, G5)
 *
 * Persistiert, ob der Nutzer den Gefahrenzone-Coach-Mark einmal gesehen hat.
 * localStorage-Key `bluelight:coachmark:gefahrenzone:v1` — bei inhaltlicher
 * Änderung der Tour-Steps kann ein `v2`-Key eingeführt werden.
 */

import { createStore } from '@tanstack/react-store';

const COACH_MARK_STORAGE_KEY = 'bluelight:coachmark:gefahrenzone:v1';

export interface OnboardingState {
  coachMarkSeen: boolean;
}

function loadInitial(): OnboardingState {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return { coachMarkSeen: false };
  }
  try {
    const raw = window.localStorage.getItem(COACH_MARK_STORAGE_KEY);
    return { coachMarkSeen: raw === 'true' };
  } catch {
    return { coachMarkSeen: false };
  }
}

function persist(value: boolean): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
  try {
    window.localStorage.setItem(COACH_MARK_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // Private-Mode / Storage-Quota — kein harter Fehler.
  }
}

export const onboardingStore = createStore<OnboardingState>(loadInitial());

export const onboardingActions = {
  markSeen(): void {
    onboardingStore.setState((s) => {
      if (s.coachMarkSeen) return s;
      persist(true);
      return { coachMarkSeen: true };
    });
  },
  /** Für QA / Dev — setzt den Flag zurück, damit der Coach-Mark erneut erscheint. */
  reset(): void {
    onboardingStore.setState((s) => {
      if (!s.coachMarkSeen) return s;
      persist(false);
      return { coachMarkSeen: false };
    });
  },
};
