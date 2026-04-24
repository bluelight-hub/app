import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SyncStatusBadge, type SyncStatusBadgeStatus } from '../SyncStatusBadge';

describe('SyncStatusBadge (Story 2.5)', () => {
  const cases: Array<[SyncStatusBadgeStatus, RegExp]> = [
    ['dirty', /Änderungen offen/],
    ['local-saved', /Lokal gespeichert/],
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
});
