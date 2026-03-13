import { beforeEach, describe, expect, it, vi } from 'vitest';
import { serverStore } from '@/features/server/stores/server.store';
import { clearPersistedResumeContext, loadActiveEinsatzId, loadEinsatzWorkspaceHref, saveActiveEinsatzId, saveEinsatzWorkspaceHref } from '../einsatz-persistence';

describe('einsatz-persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    serverStore.setState(() => ({
      servers: [],
      activeServerId: 'server-a',
      connectionStatus: new Map(),
      isHydrated: true,
    }));
  });

  it('grenzt Resume-Daten auf den aktiven Server ein', () => {
    saveActiveEinsatzId('einsatz-a');
    saveEinsatzWorkspaceHref('einsatz-a', '/app/einsatz/einsatz-a/führung/etb');

    serverStore.setState((state) => ({
      ...state,
      activeServerId: 'server-b',
    }));

    saveActiveEinsatzId('einsatz-b');
    saveEinsatzWorkspaceHref('einsatz-b', '/app/einsatz/einsatz-b/übersicht');

    expect(loadActiveEinsatzId()).toBe('einsatz-b');
    expect(loadEinsatzWorkspaceHref('einsatz-b')).toBe('/app/einsatz/einsatz-b/übersicht');

    serverStore.setState((state) => ({
      ...state,
      activeServerId: 'server-a',
    }));

    expect(loadActiveEinsatzId()).toBe('einsatz-a');
    expect(loadEinsatzWorkspaceHref('einsatz-a')).toBe('/app/einsatz/einsatz-a/führung/etb');
  });

  it('übernimmt alte globale Resume-Daten nicht blind in den aktiven Server-Scope', () => {
    localStorage.setItem('activeEinsatzId', 'legacy-einsatz');
    localStorage.setItem('einsatzWorkspaceHref:legacy-einsatz', '/app/einsatz/legacy-einsatz/übersicht');

    expect(loadActiveEinsatzId()).toBeNull();
    expect(loadEinsatzWorkspaceHref('legacy-einsatz')).toBeNull();
    expect(localStorage.getItem('activeEinsatzId')).toBe('legacy-einsatz');
    expect(localStorage.getItem('einsatzWorkspaceHref:legacy-einsatz')).toBe('/app/einsatz/legacy-einsatz/übersicht');
  });

  it('verwirft einsatzfremde Workspace-Hrefs und räumt sie auf', () => {
    saveEinsatzWorkspaceHref('einsatz-1', '/app/einsatz/einsatz-2/führung/etb');

    expect(loadEinsatzWorkspaceHref('einsatz-1')).toBeNull();
    expect([...Array(localStorage.length).keys()].some((index) => localStorage.key(index)?.includes('einsatzWorkspaceHref:einsatz-1'))).toBe(false);
  });

  it('räumt veraltete Resume-Daten als Paket auf', () => {
    saveActiveEinsatzId('einsatz-42');
    saveEinsatzWorkspaceHref('einsatz-42', '/app/einsatz/einsatz-42/übersicht');

    clearPersistedResumeContext('einsatz-42');

    expect(loadActiveEinsatzId()).toBeNull();
    expect(loadEinsatzWorkspaceHref('einsatz-42')).toBeNull();
  });

  it('degradiert sauber bei localStorage-Schreibfehlern', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    expect(() => saveActiveEinsatzId('einsatz-99')).not.toThrow();
    expect(() => saveEinsatzWorkspaceHref('einsatz-99', '/app/einsatz/einsatz-99/übersicht')).not.toThrow();

    setItemSpy.mockRestore();
  });
});
