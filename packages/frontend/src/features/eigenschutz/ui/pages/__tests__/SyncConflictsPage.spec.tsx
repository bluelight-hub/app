/**
 * Spec für `SyncConflictsPage` (Story 3.10 AC9).
 *
 * Schwerpunkte:
 * - Heading-Hierarchie + statischer Subtext.
 * - Weiterreichung der `einsatzId`-Prop an `<ConflictResolutionList>`.
 * - Übernahme der Search-Params (`entityType`, `einheitId`) als
 *   `initialFilter`.
 * - `canResolve` wird aus `useEinsatzRolleContext` (BEFEHLSGEBER) abgeleitet.
 */

import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import type { MeineEinsatzRolleDto } from '@bluelight-hub/shared/client';

const { mocks, listProps } = vi.hoisted(() => ({
  mocks: {
    search: {} as Record<string, string | undefined>,
    rolle: { rolle: 'BEFEHLSGEBER', permissions: {} } as MeineEinsatzRolleDto | null,
  },
  listProps: { current: null as Record<string, unknown> | null },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useSearch: () => mocks.search,
  };
});

vi.mock('@/features/einsatz', () => ({
  useEinsatzRolleContext: () => ({ meineRolle: mocks.rolle, isLoading: false }),
}));

vi.mock('../../organisms/ConflictResolutionList', () => ({
  ConflictResolutionList: (props: Record<string, unknown>) => {
    listProps.current = props;
    return (
      <div
        data-testid="conflict-resolution-list-stub"
        data-einsatz-id={String(props.einsatzId ?? '')}
        data-can-resolve={String(props.canResolve)}
        data-initial-filter={JSON.stringify(props.initialFilter ?? null)}
      />
    );
  },
}));

import { SyncConflictsPage } from '../SyncConflictsPage';

beforeEach(() => {
  mocks.search = {};
  mocks.rolle = { rolle: 'BEFEHLSGEBER', permissions: {} } as MeineEinsatzRolleDto;
  listProps.current = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SyncConflictsPage', () => {
  it('rendert Heading-Hierarchie und Subtext', () => {
    renderWithProviders(<SyncConflictsPage einsatzId="einsatz-1" />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Sync-Konflikte' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText(/Multi-Device-Konflikte/)).toBeInTheDocument();
  });

  it('reicht die einsatzId an ConflictResolutionList weiter', () => {
    renderWithProviders(<SyncConflictsPage einsatzId="einsatz-42" />);

    const stub = screen.getByTestId('conflict-resolution-list-stub');
    expect(stub.dataset.einsatzId).toBe('einsatz-42');
    expect(listProps.current?.einsatzId).toBe('einsatz-42');
  });

  it('übernimmt entityType + einheitId aus useSearch als initialFilter', () => {
    mocks.search = { entityType: 'PSA_PROFIL_ZUWEISUNG', einheitId: 'einheit-7' };
    renderWithProviders(<SyncConflictsPage einsatzId="einsatz-1" />);

    expect(listProps.current?.initialFilter).toEqual({
      entityType: 'PSA_PROFIL_ZUWEISUNG',
      einheitId: 'einheit-7',
    });
  });

  it('deaktiviert canResolve für nicht-BEFEHLSGEBER-Rollen', () => {
    mocks.rolle = { rolle: 'EMPFAENGER', permissions: {} } as MeineEinsatzRolleDto;
    renderWithProviders(<SyncConflictsPage einsatzId="einsatz-1" />);
    expect(listProps.current?.canResolve).toBe(false);
  });

  it('aktiviert canResolve für BEFEHLSGEBER', () => {
    mocks.rolle = { rolle: 'BEFEHLSGEBER', permissions: {} } as MeineEinsatzRolleDto;
    renderWithProviders(<SyncConflictsPage einsatzId="einsatz-1" />);
    expect(listProps.current?.canResolve).toBe(true);
  });

  it('canResolve ist false, wenn Rolle null ist (nicht zugewiesen)', () => {
    mocks.rolle = null;
    renderWithProviders(<SyncConflictsPage einsatzId="einsatz-1" />);
    expect(listProps.current?.canResolve).toBe(false);
  });
});
