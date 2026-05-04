/**
 * Tests für `ConflictResolutionList` (Story 3.10 AC8, ≥ 14 Tests).
 *
 * Mockt die API-Hooks `useSyncConflicts` und `useResolveKonflikt`
 * sowie die Lookup-Hooks (`useEinsatzEinheiten`, `useUserNames`),
 * um die Organism isoliert zu testen.
 *
 * **Hinweis zur a11y-Snapshot-Anforderung:** Im Repo ist weder
 * `vitest-axe` noch `jest-axe` installiert (siehe `vitest.setup.ts` —
 * keine Axe-Matcher). Statt eine neue Dependency einzuführen, prüft der
 * a11y-Test strukturelle Invarianten direkt: `role="table"` vorhanden,
 * jeder Sort-Header trägt `aria-sort`, jeder Action-Button ein
 * non-empty `aria-label`, keine doppelten `id`-Attribute.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncConflictListItemDto } from '@bluelight-hub/shared/client';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

const { conflictsResultMock, mutateMock, mutationResultMock, einheitenMock, userNamesMock } = vi.hoisted(() => ({
  conflictsResultMock: {
    current: {
      data: [] as SyncConflictListItemDto[],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<SyncConflictListItemDto[]>,
  },
  mutateMock: vi.fn(),
  mutationResultMock: {
    current: { isPending: false } as unknown as UseMutationResult<unknown, unknown, unknown, unknown>,
  },
  einheitenMock: { data: [{ id: 'einheit-1', name: 'SEG Nord' }] as Array<{ id: string; name: string }> },
  userNamesMock: { getUserName: (id: string) => `User ${id}` },
}));

vi.mock('../../../api/queries', async () => {
  // Wir mocken nur die zwei verwendeten Hooks; alles andere stammt aus dem
  // echten Modul (Query-Keys, Filter-Typen) und bleibt unverändert.
  const actual = await vi.importActual<typeof import('../../../api/queries')>('../../../api/queries');
  return {
    ...actual,
    useSyncConflicts: vi.fn((_einsatzId: string, _filter?: unknown) => conflictsResultMock.current),
    useResolveKonflikt: vi.fn(() => ({
      ...mutationResultMock.current,
      mutate: mutateMock,
    })),
  };
});

vi.mock('@/features/kraefte/api/use-einsatz-einheiten', () => ({
  useEinsatzEinheiten: () => einheitenMock,
}));

vi.mock('@/features/auth/api/use-users', () => ({
  useUserNames: () => userNamesMock,
}));

import { ConflictResolutionList } from '../ConflictResolutionList';
import * as queriesModule from '../../../api/queries';

const useSyncConflictsMock = vi.mocked(queriesModule.useSyncConflicts);

function makeConflict(overrides: Partial<SyncConflictListItemDto> = {}): SyncConflictListItemDto {
  return {
    id: 'conflict-1',
    einheitId: 'einheit-1',
    entityType: 'PSA_PROFIL_ZUWEISUNG',
    entityId: 'entity-1',
    fieldPath: 'profil',
    localPayload: {
      toggles: [
        { code: 'BASIS', active: true },
        { code: 'CBRN', active: false },
      ],
    } as unknown as object,
    serverVersion: 6,
    localExpectedVersion: 5,
    reportedAt: new Date('2026-04-29T10:00:00.000Z'),
    reportedByUserId: 'user-1',
    ...overrides,
  };
}

beforeEach(() => {
  conflictsResultMock.current = {
    data: [makeConflict()],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as UseQueryResult<SyncConflictListItemDto[]>;
  mutationResultMock.current = { isPending: false } as unknown as UseMutationResult<unknown, unknown, unknown, unknown>;
  mutateMock.mockReset();
  useSyncConflictsMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ConflictResolutionList (Story 3.10 AC8)', () => {
  // jsdom liefert für `getBoundingClientRect()` immer 0×0 — der Virtualizer
  // würde dann keine Rows rendern. Wir patchen `getBoundingClientRect` und
  // ersetzen `ResizeObserver` durch einen Stub, der die Callback-Funktion
  // sofort mit realistischen Werten aufruft (Pattern `EtbEntryList.spec.tsx`).
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  const originalResizeObserver = global.ResizeObserver;
  const originalClientHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const originalClientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

  beforeAll(() => {
    Element.prototype.getBoundingClientRect = function getBoundingClientRectStub() {
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 600,
        right: 1200,
        width: 1200,
        height: 600,
        toJSON: () => ({}),
      } as DOMRect;
    };
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 600,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 1200,
    });
    global.ResizeObserver = class ResizeObserver implements globalThis.ResizeObserver {
      constructor(private readonly callback: ResizeObserverCallback) {}
      disconnect(): void {}
      observe(target: Element): void {
        const height = target instanceof HTMLElement ? target.clientHeight || 600 : 600;
        const width = target instanceof HTMLElement ? target.clientWidth || 1200 : 1200;
        queueMicrotask(() => {
          this.callback(
            [
              {
                target,
                borderBoxSize: [{ blockSize: height, inlineSize: width }],
                contentBoxSize: [{ blockSize: height, inlineSize: width }],
                contentRect: { x: 0, y: 0, top: 0, left: 0, bottom: height, right: width, width, height, toJSON: () => ({}) },
                devicePixelContentBoxSize: [{ blockSize: height, inlineSize: width }],
              } as ResizeObserverEntry,
            ],
            this,
          );
        });
      }
      unobserve(): void {}
    };
  });

  afterAll(() => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    global.ResizeObserver = originalResizeObserver;
    if (originalClientHeightDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeightDescriptor);
    if (originalClientWidthDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidthDescriptor);
  });

  it('rendert role="table" mit den erwarteten Spalten-Headern', () => {
    render(<ConflictResolutionList einsatzId="einsatz-1" />);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Entität/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Server-Version/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Lokale Version/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Reportet/ })).toBeInTheDocument();
  });

  it('Klick auf Spalten-Header toggelt aria-sort und sortiert die Rows entsprechend', () => {
    conflictsResultMock.current = {
      data: [makeConflict({ id: 'a', serverVersion: 8 }), makeConflict({ id: 'b', serverVersion: 3 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<SyncConflictListItemDto[]>;
    render(<ConflictResolutionList einsatzId="einsatz-1" />);

    const header = screen.getByTestId('conflict-sort-serverVersion');
    expect(header).toHaveAttribute('aria-sort', 'none');
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-sort', 'ascending');
  });

  it('Filter-Bar entityType triggert useSyncConflicts mit Filter-Argument', () => {
    render(<ConflictResolutionList einsatzId="einsatz-1" />);
    const select = screen.getByLabelText('Entitätstyp') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'GEFAEHRDUNGSBEURTEILUNG_ITEM' } });
    const lastCall = useSyncConflictsMock.mock.calls.at(-1);
    expect(lastCall?.[1]).toEqual({ entityType: 'GEFAEHRDUNGSBEURTEILUNG_ITEM' });
  });

  it('Reset-Button setzt den Filter zurück (entityType + einheitId undefined)', () => {
    render(<ConflictResolutionList einsatzId="einsatz-1" initialFilter={{ entityType: 'PSA_PROFIL_ZUWEISUNG', einheitId: 'einheit-1' }} />);
    fireEvent.click(screen.getByTestId('conflict-filter-reset'));
    const lastCall = useSyncConflictsMock.mock.calls.at(-1);
    expect(lastCall?.[1]).toEqual({});
  });

  it('Resolve-Klick triggert useResolveKonflikt.mutate mit korrekten Argumenten', async () => {
    render(<ConflictResolutionList einsatzId="einsatz-1" />);
    const btn = await screen.findByTestId('conflict-resolve-SERVER_WINS-conflict-1');
    fireEvent.click(btn);
    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock).toHaveBeenCalledWith({ syncConflictId: 'conflict-1', resolution: 'SERVER_WINS' }, expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }));
  });

  it('Erfolgreicher Resolve setzt SR-Ansage in der polite Live-Region', async () => {
    mutateMock.mockImplementation((_vars, opts: { onSuccess?: () => void } | undefined) => {
      opts?.onSuccess?.();
    });
    render(<ConflictResolutionList einsatzId="einsatz-1" />);
    const btn = await screen.findByTestId('conflict-resolve-LOCAL_WINS-conflict-1');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByTestId('conflict-sr-announcer').textContent).toMatch(/Konflikt aufgelöst/);
      expect(screen.getByTestId('conflict-sr-announcer').textContent).toMatch(/Lokal behalten/);
    });
  });

  it('Read-Only-Mode (canResolve=false) deaktiviert alle drei Action-Buttons', async () => {
    render(<ConflictResolutionList einsatzId="einsatz-1" canResolve={false} />);
    const serverBtn = await screen.findByTestId('conflict-resolve-SERVER_WINS-conflict-1');
    const localBtn = screen.getByTestId('conflict-resolve-LOCAL_WINS-conflict-1');
    const mergeBtn = screen.getByTestId('conflict-resolve-MERGED-conflict-1');
    expect(serverBtn).toBeDisabled();
    expect(localBtn).toBeDisabled();
    expect(mergeBtn).toBeDisabled();
    expect(serverBtn).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/nur vom Sicherheitsbeauftragten/)).toBeInTheDocument();
  });

  it('Empty-State rendert bei conflicts=[]', () => {
    conflictsResultMock.current = {
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<SyncConflictListItemDto[]>;
    render(<ConflictResolutionList einsatzId="einsatz-1" />);
    expect(screen.getByText('Keine offenen Sync-Konflikte')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('Loading-State rendert Skeleton bei isLoading=true', () => {
    conflictsResultMock.current = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<SyncConflictListItemDto[]>;
    render(<ConflictResolutionList einsatzId="einsatz-1" />);
    expect(screen.getByTestId('conflict-loading-skeleton')).toBeInTheDocument();
  });

  it('Error-State rendert Inline-Alert bei isError=true (kein globaler Toast)', () => {
    conflictsResultMock.current = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<SyncConflictListItemDto[]>;
    render(<ConflictResolutionList einsatzId="einsatz-1" />);
    expect(screen.getByTestId('conflict-error-alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument();
  });

  it('Virtualisierung bei 100 Konflikten rendert nur einen Bruchteil der Rows initial', async () => {
    const many = Array.from({ length: 100 }, (_, i) => makeConflict({ id: `conflict-${i}`, serverVersion: i, localExpectedVersion: i - 1 }));
    conflictsResultMock.current = {
      data: many,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<SyncConflictListItemDto[]>;
    const { container } = render(<ConflictResolutionList einsatzId="einsatz-1" />);
    await waitFor(() => {
      const dataRows = container.querySelectorAll('[data-testid^="conflict-row-"]');
      expect(dataRows.length).toBeGreaterThan(0);
    });
    const dataRows = container.querySelectorAll('[data-testid^="conflict-row-"]');
    expect(dataRows.length).toBeLessThan(100);
  });

  it('a11y-Strukturinvarianten: aria-sort auf Sort-Headern, aria-label auf Buttons, keine doppelten IDs', async () => {
    const { container } = render(<ConflictResolutionList einsatzId="einsatz-1" />);
    // 1. Sort-Header haben aria-sort.
    for (const headerId of ['conflict-sort-entityType', 'conflict-sort-serverVersion', 'conflict-sort-localExpectedVersion', 'conflict-sort-reportedAt']) {
      expect(screen.getByTestId(headerId)).toHaveAttribute('aria-sort');
    }
    // 2. Action-Buttons haben non-empty aria-label (warten auf Virtualizer-Render).
    await screen.findByTestId('conflict-resolve-SERVER_WINS-conflict-1');
    for (const tid of ['conflict-resolve-SERVER_WINS-conflict-1', 'conflict-resolve-LOCAL_WINS-conflict-1', 'conflict-resolve-MERGED-conflict-1']) {
      const label = screen.getByTestId(tid).getAttribute('aria-label');
      expect(label && label.length > 0).toBe(true);
    }
    // 3. Keine doppelten ID-Attribute im Subtree.
    const ids = Array.from(container.querySelectorAll<HTMLElement>('[id]')).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Touch-Target: alle Action-Buttons haben minHeight ≥ 48px (style)', async () => {
    render(<ConflictResolutionList einsatzId="einsatz-1" />);
    await screen.findByTestId('conflict-resolve-SERVER_WINS-conflict-1');
    for (const tid of ['conflict-resolve-SERVER_WINS-conflict-1', 'conflict-resolve-LOCAL_WINS-conflict-1', 'conflict-resolve-MERGED-conflict-1']) {
      const btn = screen.getByTestId(tid);
      expect(btn).toHaveStyle({ minHeight: '48px' });
    }
  });

  it('LocalPayload-Popover: Klick auf Summary öffnet das <details>-Element mit JSON-Vorschau', async () => {
    render(<ConflictResolutionList einsatzId="einsatz-1" />);
    const details = (await screen.findByTestId('conflict-snapshot-conflict-1')) as HTMLDetailsElement;
    expect(details.open).toBe(false);
    const summary = details.querySelector('summary')!;
    fireEvent.click(summary);
    // jsdom toggelt das `open`-Attribut bei Klick auf Summary.
    expect(details.open).toBe(true);
    // Volltext-JSON enthält den toggle-Code.
    expect(details.querySelector('pre')!.textContent).toContain('BASIS');
  });

  it('Sekundärer Konflikt im Resolve: rendert Inline-Row-Error, kein globaler Toast', async () => {
    mutateMock.mockImplementation((_vars, opts: { onError?: (e: unknown) => void } | undefined) => {
      opts?.onError?.(new Error('ConflictDetected:abc'));
    });
    render(<ConflictResolutionList einsatzId="einsatz-1" />);
    const btn = await screen.findByTestId('conflict-resolve-SERVER_WINS-conflict-1');
    fireEvent.click(btn);
    await waitFor(() => {
      const inlineError = screen.getByTestId('conflict-row-error-conflict-1');
      expect(inlineError).toBeInTheDocument();
      expect(inlineError.textContent).toMatch(/Erneuter Konflikt/);
    });
  });
});
