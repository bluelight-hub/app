import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SplitViewToggle } from '../SplitViewToggle';
import { splitViewActions, splitViewStore } from '../../../stores/split-view.store';

function stubMatchMedia(matches: boolean): void {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.push(fn),
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(fn);
      if (idx >= 0) listeners.splice(idx, 1);
    },
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  }));
  // `window.matchMedia` ist read-only in jsdom, wir müssen es via defineProperty setzen.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: window.matchMedia,
  });
}

describe('SplitViewToggle', () => {
  beforeEach(() => {
    splitViewActions.deactivate();
    vi.unstubAllGlobals();
  });

  it('ist enabled bei xl Viewport und toggled isActive', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    render(<SplitViewToggle />);
    const btn = screen.getByRole('switch');
    expect(btn).not.toBeDisabled();
    await user.click(btn);
    expect(splitViewStore.state.isActive).toBe(true);
  });

  it('ist disabled unter xl und zeigt Tooltip', () => {
    stubMatchMedia(false);
    render(<SplitViewToggle />);
    const btn = screen.getByRole('switch');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/1280/));
  });

  it('aria-checked spiegelt isActive', () => {
    stubMatchMedia(true);
    splitViewActions.activate(null);
    render(<SplitViewToggle />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});
