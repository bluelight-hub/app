import { beforeEach, describe, expect, it } from 'vitest';
import { onboardingActions, onboardingStore } from '../onboarding.store';

const STORAGE_KEY = 'bluelight:coachmark:gefahrenzone:v1';

describe('onboardingStore', () => {
  beforeEach(() => {
    onboardingActions.reset();
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('Default: coachMarkSeen=false (frischer Browser)', () => {
    expect(onboardingStore.state.coachMarkSeen).toBe(false);
  });

  it('markSeen setzt Flag + localStorage-Wert', () => {
    onboardingActions.markSeen();
    expect(onboardingStore.state.coachMarkSeen).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('reset setzt Flag zurück + localStorage auf false', () => {
    onboardingActions.markSeen();
    onboardingActions.reset();
    expect(onboardingStore.state.coachMarkSeen).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false');
  });

  it('doppeltes markSeen ist no-op', () => {
    onboardingActions.markSeen();
    const ref = onboardingStore.state;
    onboardingActions.markSeen();
    expect(onboardingStore.state).toBe(ref);
  });
});
