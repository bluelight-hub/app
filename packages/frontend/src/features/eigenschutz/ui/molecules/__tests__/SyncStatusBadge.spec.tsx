import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SyncStatusBadge, type SyncStatusBadgeStatus } from '../SyncStatusBadge';

describe('SyncStatusBadge (Story 2.5)', () => {
  const cases: Array<[SyncStatusBadgeStatus, RegExp]> = [
    ['dirty', /Änderungen offen/],
    ['local-saved', /Lokal gespeichert/],
    ['pending', /Sync wird geprüft/],
    ['offline', /Offline/],
    ['syncing', /Wird synchronisiert/],
    ['synced', /Synchronisiert/],
    ['conflict', /Konflikt/],
    ['error', /Speichern fehlgeschlagen/],
    ['offline-queued', /Offline gespeichert/],
  ];

  it.each(cases)('rendert Status %s mit Text und Icon', (status, label) => {
    render(<SyncStatusBadge status={status} />);

    const badge = screen.getByTestId('sync-status-badge');
    expect(badge).toHaveTextContent(label);
    expect(screen.getByTestId('sync-status-badge-icon')).toBeInTheDocument();
  });

  it('nutzt aria-live="polite" für Statuswechsel', () => {
    render(<SyncStatusBadge status="dirty" />);

    expect(screen.getByTestId('sync-status-badge')).toHaveAttribute('aria-live', 'polite');
  });

  it('zeigt gespeicherte Versionsnummer, wenn sie übergeben wird', () => {
    render(<SyncStatusBadge status="synced" savedVersion={8} />);

    expect(screen.getByTestId('sync-status-badge')).toHaveTextContent('Version 8 gespeichert');
  });

  it.each([
    ['idle' as const, 'sync-synced'],
    ['synced' as const, 'sync-synced'],
    ['dirty' as const, 'sync-pending'],
    ['debouncing' as const, 'sync-pending'],
    ['local-saved' as const, 'sync-pending'],
    ['pending' as const, 'sync-pending'],
    ['syncing' as const, 'sync-pending'],
    ['offline' as const, 'sync-offline'],
    ['offline-queued' as const, 'sync-offline'],
    ['conflict' as const, 'sync-conflict'],
    ['error' as const, 'sync-conflict'],
  ])('nutzt für %s die Sync-Tokenfamilie %s', (status, tokenFamily) => {
    render(<SyncStatusBadge status={status} />);

    const badge = screen.getByTestId('sync-status-badge');
    expect(badge.className).toContain(`border-${tokenFamily}-border`);
    expect(badge.className).toContain(`bg-${tokenFamily}-surface`);
    expect(badge.className).toContain(`text-${tokenFamily}-text`);
  });
});
