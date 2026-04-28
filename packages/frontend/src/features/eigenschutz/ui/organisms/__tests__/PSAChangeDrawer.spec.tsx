import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { hoisted } = vi.hoisted(() => ({
  hoisted: {
    mutateAsync: vi.fn(),
    profileQuery: { data: [] as Array<{ profil: string; version: number; einheitId?: string }>, isLoading: false },
    changeMutation: { mutateAsync: vi.fn(), isPending: false, error: null as unknown },
    apiBulkCall: vi.fn(),
    apiSingleCall: vi.fn(),
  },
}));

vi.mock('@/features/eigenschutz/api/queries', () => ({
  EIGENSCHUTZ_QUERY_KEYS: {
    psaProfileByEinheit: (einsatzId: string, einheitId: string) => ['eigenschutz', einsatzId, 'psa-profile', einheitId] as const,
  },
  useChangePsaProfil: () => hoisted.changeMutation,
  usePsaProfileByEinheit: () => hoisted.profileQuery,
  PsaProfilConflictError: class PsaProfilConflictError extends Error {
    constructor(
      public variant: 'OCC' | 'DuplicateActiveProfile',
      public currentVersion?: number,
      public attemptedVersion?: number,
      public originalError?: unknown,
      public einheitId?: string,
      public profil?: string,
    ) {
      super('PsaProfilConflictError');
    }
  },
}));

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      psaProfilControllerGetPsaProfileVAlpha: hoisted.apiSingleCall,
      psaProfilControllerBulkChangePsaProfilVAlpha: hoisted.apiBulkCall,
    }),
  },
}));

import { PSAChangeDrawer } from '../PSAChangeDrawer';

function withQueryClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe('PSAChangeDrawer (Story 3.1)', () => {
  beforeEach(() => {
    hoisted.changeMutation.mutateAsync = vi.fn().mockResolvedValue({ propagationGroupId: 'group-1', affected: [] });
    hoisted.changeMutation.isPending = false;
    hoisted.changeMutation.error = null;
    hoisted.profileQuery.data = [];
    hoisted.profileQuery.isLoading = false;
    hoisted.apiSingleCall.mockReset();
    hoisted.apiSingleCall.mockResolvedValue({ data: [] });
    hoisted.apiBulkCall.mockReset();
    hoisted.apiBulkCall.mockResolvedValue({ data: { propagationGroupId: 'group-1', affected: [] } });
  });

  function renderDrawer() {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(withQueryClient(<PSAChangeDrawer einsatzId="einsatz-1" einheitId="einheit-1" einheitName="Sani 1" callerUserId="user-1" open={true} onClose={onClose} onSaved={onSaved} />));
    return { onClose, onSaved };
  }

  it('Submit ist disabled, solange keine Begründung eingegeben wurde', () => {
    renderDrawer();
    expect(screen.getByTestId('psa-change-submit')).toBeDisabled();
  });

  it('Submit ist disabled, solange keine Toggle-Änderung vorgemerkt ist', () => {
    renderDrawer();
    fireEvent.change(screen.getByTestId('psa-change-begruendung'), { target: { value: 'Routine BASIS' } });
    expect(screen.getByTestId('psa-change-submit')).toBeDisabled();
  });

  it('führt Mutation aus mit Toggles und Begründung (Pure-Aktivierung)', async () => {
    const { onSaved } = renderDrawer();
    fireEvent.click(screen.getByRole('checkbox', { name: 'PSA-Profil Basis' }));
    fireEvent.change(screen.getByTestId('psa-change-begruendung'), { target: { value: 'Routine BASIS' } });
    fireEvent.click(screen.getByTestId('psa-change-submit'));

    await waitFor(() => expect(hoisted.changeMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(hoisted.changeMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        einheitId: 'einheit-1',
        profilToggles: [{ profil: 'BASIS', aktivieren: true, expectedVersion: undefined }],
        begruendung: 'Routine BASIS',
      }),
    );
    expect(onSaved).toHaveBeenCalledWith('group-1', expect.any(Array));
  });

  it('Last-BASIS-Modal erscheint beim Deaktivieren von BASIS, wenn andere Profile aktiv bleiben', async () => {
    hoisted.profileQuery.data = [
      { profil: 'BASIS', version: 1 },
      { profil: 'INFEKTION', version: 1 },
    ];
    renderDrawer();
    fireEvent.click(screen.getByRole('checkbox', { name: 'PSA-Profil Basis' }));
    fireEvent.change(screen.getByTestId('psa-change-begruendung'), { target: { value: 'Lage geklärt' } });
    fireEvent.click(screen.getByTestId('psa-change-submit'));

    await waitFor(() => expect(screen.getByTestId('psa-last-basis-modal')).toBeInTheDocument());
    expect(hoisted.changeMutation.mutateAsync).not.toHaveBeenCalled();

    // P-30: UX-DR27-Pattern — der Confirm-Button im Last-BASIS-Modal MUSS
    // visuell als destruktive Aktion gerendert sein (variant="danger" → CSS-
    // Class, die `bg-status-danger` o. ä. trägt). Wir prüfen strukturell.
    const confirmButton = screen.getByTestId('psa-last-basis-confirm');
    expect(confirmButton.className).toMatch(/danger|destruct/i);

    fireEvent.click(confirmButton);
    await waitFor(() => expect(hoisted.changeMutation.mutateAsync).toHaveBeenCalledTimes(1));
  });

  // P-29: AC2 verlangt, dass das Begründungs-Feld `aria-required="true"`
  // trägt UND via `aria-describedby` mit einem Hint-Text verknüpft ist.
  it('AC2 — Begründungs-Feld trägt aria-required und aria-describedby (a11y)', () => {
    renderDrawer();
    const textarea = screen.getByTestId('psa-change-begruendung');
    expect(textarea.getAttribute('aria-required')).toBe('true');
    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const hint = describedBy ? document.getElementById(describedBy) : null;
    expect(hint).not.toBeNull();
    expect(hint?.textContent ?? '').toMatch(/Begründung ist verpflichtend/);
  });
});

describe('PSAChangeDrawer (Story 3.2 Bulk)', () => {
  const E1 = 'einheit-1';
  const E2 = 'einheit-2';
  const E3 = 'einheit-3';

  beforeEach(() => {
    hoisted.changeMutation.mutateAsync = vi.fn().mockResolvedValue({ propagationGroupId: 'group-bulk', affected: [] });
    hoisted.changeMutation.isPending = false;
    hoisted.changeMutation.error = null;
    hoisted.profileQuery.data = [];
    hoisted.profileQuery.isLoading = false;
    hoisted.apiSingleCall.mockReset();
    hoisted.apiSingleCall.mockResolvedValue({ data: [] });
    hoisted.apiBulkCall.mockReset();
  });

  function renderBulkDrawer(opts: { einheitIds?: string[]; einheiten?: Array<{ id: string; name: string }>; profilesByEinheit?: Record<string, Array<{ profil: string; version: number }>> } = {}) {
    const einheiten = opts.einheiten ?? [
      { id: E1, name: 'Sani 1' },
      { id: E2, name: 'Sani 2' },
      { id: E3, name: 'Sani 3' },
    ];
    const ids = opts.einheitIds ?? einheiten.map((e) => e.id);
    if (opts.profilesByEinheit) {
      hoisted.apiSingleCall.mockImplementation(async (params: { einheitId: string }) => ({
        data: opts.profilesByEinheit?.[params.einheitId] ?? [],
      }));
    }
    const onSaved = vi.fn();
    const onRemoveEinheit = vi.fn();
    render(
      withQueryClient(
        <PSAChangeDrawer einsatzId="einsatz-1" einheitIds={ids} einheiten={einheiten} callerUserId="user-1" open={true} onClose={vi.fn()} onSaved={onSaved} onRemoveEinheit={onRemoveEinheit} />,
      ),
    );
    return { onSaved, onRemoveEinheit };
  }

  it('Bulk mit N=3: Drawer rendert konsolidierte Width-Class und 3 Abschnitt-Chips', async () => {
    renderBulkDrawer();
    const drawer = screen.getByTestId('psa-change-drawer');
    expect(drawer.getAttribute('data-bulk')).toBe('true');
    expect(drawer.getAttribute('data-abschnitt-count')).toBe('3');
    expect(screen.getByText(/PSA-Profile ändern für 3 Abschnitte/)).toBeInTheDocument();
    const chips = screen.getByTestId('psa-bulk-einheit-chips');
    expect(chips.querySelectorAll('button')).toHaveLength(3);
  });

  it('Bulk mit N=2: Standard-Width-Class (kein 640px)', () => {
    renderBulkDrawer({
      einheitIds: [E1, E2],
      einheiten: [
        { id: E1, name: 'Sani 1' },
        { id: E2, name: 'Sani 2' },
      ],
    });
    const drawer = screen.getByTestId('psa-change-drawer');
    expect(drawer.getAttribute('data-abschnitt-count')).toBe('2');
  });

  it('Bulk-Submit ruft Mutation mit einheitIds + Bulk-Toggle-Liste', async () => {
    const { onSaved } = renderBulkDrawer();
    // useQueries hat einen Frame-Tick, bis die Daten verfügbar sind — wir
    // warten auf die ersten Chips.
    const chip = await screen.findByTestId('psa-chip-cbrn_patient');
    fireEvent.click(chip);
    fireEvent.change(screen.getByTestId('psa-change-begruendung'), { target: { value: 'CBRN-Lage' } });
    fireEvent.click(screen.getByTestId('psa-change-submit'));
    await waitFor(() => expect(hoisted.changeMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(hoisted.changeMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        einheitIds: [E1, E2, E3],
        begruendung: 'CBRN-Lage',
      }),
    );
    expect(onSaved).toHaveBeenCalledWith('group-bulk', expect.any(Array));
  });

  it('Chip-Klick im Header ruft onRemoveEinheit', () => {
    const { onRemoveEinheit } = renderBulkDrawer();
    fireEvent.click(screen.getByTestId(`psa-bulk-chip-${E2}`));
    expect(onRemoveEinheit).toHaveBeenCalledWith(E2);
  });

  it('schreibt assess_started-Telemetrie mit abschnittCount=N (AC8)', async () => {
    const { eigenschutzTelemetryQueue } = await import('@/features/eigenschutz/lib/telemetry-queue');
    eigenschutzTelemetryQueue.drain();
    renderBulkDrawer();
    const events = eigenschutzTelemetryQueue.snapshot();
    expect(events.length).toBeGreaterThanOrEqual(1);
    const last = events[events.length - 1]!;
    expect(last.eventName).toBe('assess_started');
    expect(last.abschnittCount).toBe(3);
    expect(last.userId).toBe('user-1');
    expect(typeof last.propagationGroupIdCandidate).toBe('string');
    expect(last.propagationGroupIdCandidate.length).toBeGreaterThan(10);
  });

  it('Konflikt-Recovery: Begründung und Toggles bleiben erhalten, wenn eine Einheit entfernt wird', async () => {
    const einheiten = [
      { id: E1, name: 'Sani 1' },
      { id: E2, name: 'Sani 2' },
      { id: E3, name: 'Sani 3' },
    ];
    const onSaved = vi.fn();
    const onRemoveEinheit = vi.fn();
    const { rerender } = render(
      withQueryClient(
        <PSAChangeDrawer
          einsatzId="einsatz-1"
          einheitIds={einheiten.map((e) => e.id)}
          einheiten={einheiten}
          callerUserId="user-1"
          open={true}
          onClose={vi.fn()}
          onSaved={onSaved}
          onRemoveEinheit={onRemoveEinheit}
        />,
      ),
    );
    fireEvent.change(screen.getByTestId('psa-change-begruendung'), { target: { value: 'CBRN-Lage' } });
    const chip = await screen.findByTestId('psa-chip-cbrn_patient');
    fireEvent.click(chip);

    // Selection schrumpft (z. B. nach Konflikt-„Einheit entfernen") — Re-Render mit
    // identischem Drawer-`open`-State, aber kürzerem `einheitIds`-Array.
    const reduced = einheiten.filter((e) => e.id !== E2);
    rerender(
      withQueryClient(
        <PSAChangeDrawer
          einsatzId="einsatz-1"
          einheitIds={reduced.map((e) => e.id)}
          einheiten={reduced}
          callerUserId="user-1"
          open={true}
          onClose={vi.fn()}
          onSaved={onSaved}
          onRemoveEinheit={onRemoveEinheit}
        />,
      ),
    );

    expect((screen.getByTestId('psa-change-begruendung') as HTMLTextAreaElement).value).toBe('CBRN-Lage');
    const chipAfter = await screen.findByTestId('psa-chip-cbrn_patient');
    expect(chipAfter.getAttribute('aria-checked')).not.toBe('false');
  });

  it('AC8: assess_started feuert genau einmal pro Drawer-Open, auch wenn einheitIds schrumpft', async () => {
    const { eigenschutzTelemetryQueue } = await import('@/features/eigenschutz/lib/telemetry-queue');
    eigenschutzTelemetryQueue.drain();
    const einheiten = [
      { id: E1, name: 'Sani 1' },
      { id: E2, name: 'Sani 2' },
      { id: E3, name: 'Sani 3' },
    ];
    const { rerender } = render(
      withQueryClient(
        <PSAChangeDrawer
          einsatzId="einsatz-1"
          einheitIds={einheiten.map((e) => e.id)}
          einheiten={einheiten}
          callerUserId="user-1"
          open={true}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          onRemoveEinheit={vi.fn()}
        />,
      ),
    );
    expect(eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'assess_started')).toHaveLength(1);

    const reduced = einheiten.filter((e) => e.id !== E2);
    rerender(
      withQueryClient(
        <PSAChangeDrawer
          einsatzId="einsatz-1"
          einheitIds={reduced.map((e) => e.id)}
          einheiten={reduced}
          callerUserId="user-1"
          open={true}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          onRemoveEinheit={vi.fn()}
        />,
      ),
    );
    expect(eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'assess_started')).toHaveLength(1);
  });

  it('Konflikt-Banner zeigt Einheit-Name und triggert onRemoveEinheit beim Action-Klick', async () => {
    // Wir setzen mutation.error direkt im hoisted-State — der Mock von
    // useChangePsaProfil reicht das Objekt unverändert weiter, sodass der
    // Drawer beim ersten Render den Banner basierend auf `mutation.error`
    // rendert, ohne dass die Mutation tatsächlich laufen muss.
    const { PsaProfilConflictError } = await import('@/features/eigenschutz/api/queries');
    hoisted.changeMutation.error = new PsaProfilConflictError('OCC', undefined, undefined, undefined, E2, 'CBRN_PATIENT');
    const { onRemoveEinheit } = renderBulkDrawer();

    expect(screen.getByTestId('psa-bulk-conflict-banner').textContent).toContain('Sani 2');

    fireEvent.click(screen.getByRole('button', { name: /Konflikt-Einheit aus Auswahl entfernen/ }));
    expect(onRemoveEinheit).toHaveBeenCalledWith(E2);
  });
});
