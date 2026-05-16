/**
 * Spec für `SyncConflictsDrawer` (Goal G6 — Ablöser der ehemaligen
 * `SyncConflictsPage`).
 *
 * Schwerpunkte:
 * - Schließt-Verhalten bei `isOpen={false}` (kein Render).
 * - Reicht `einsatzId` + `initialFilter` an `ConflictResolutionList` weiter.
 */

import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';

const { listProps } = vi.hoisted(() => ({
  listProps: { current: null as Record<string, unknown> | null },
}));

vi.mock('../ConflictResolutionList', () => ({
  ConflictResolutionList: (props: Record<string, unknown>) => {
    listProps.current = props;
    return <div data-testid="conflict-resolution-list-stub" data-einsatz-id={String(props.einsatzId ?? '')} data-initial-filter={JSON.stringify(props.initialFilter ?? null)} />;
  },
}));

import { SyncConflictsDrawer } from '../SyncConflictsDrawer';

beforeEach(() => {
  listProps.current = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SyncConflictsDrawer', () => {
  it('rendert die ConflictResolutionList, wenn der Drawer offen ist', () => {
    renderWithProviders(<SyncConflictsDrawer einsatzId="einsatz-1" isOpen onClose={() => {}} />);

    expect(screen.getByTestId('sync-conflicts-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('conflict-resolution-list-stub')).toBeInTheDocument();
  });

  it('rendert nichts (kein Drawer-Body), wenn isOpen=false', () => {
    renderWithProviders(<SyncConflictsDrawer einsatzId="einsatz-1" isOpen={false} onClose={() => {}} />);

    expect(screen.queryByTestId('sync-conflicts-drawer')).toBeNull();
    expect(screen.queryByTestId('conflict-resolution-list-stub')).toBeNull();
  });

  it('reicht einsatzId und initialFilter an die Liste weiter', () => {
    renderWithProviders(<SyncConflictsDrawer einsatzId="einsatz-42" isOpen onClose={() => {}} initialFilter={{ entityType: 'PSA_PROFIL_ZUWEISUNG', einheitId: 'einheit-7' }} />);

    expect(listProps.current?.einsatzId).toBe('einsatz-42');
    expect(listProps.current?.initialFilter).toEqual({ entityType: 'PSA_PROFIL_ZUWEISUNG', einheitId: 'einheit-7' });
  });

  it('rendert den Drawer-Titel und die Beschreibung', () => {
    renderWithProviders(<SyncConflictsDrawer einsatzId="einsatz-1" isOpen onClose={() => {}} />);

    expect(screen.getByText('Sync-Konflikte')).toBeInTheDocument();
    expect(screen.getByText(/Multi-Device-Konflikte/)).toBeInTheDocument();
  });
});
