import { act } from '@testing-library/react';
import { renderWithProviders, screen, fireEvent } from '@/test/utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ContinuityStatusRail } from '../ContinuityStatusRail';
import type { SyncStatusInfo } from '../../../types/sync-status.types';

/** Factory für SyncStatusInfo */
function createSyncStatus(overrides: Partial<SyncStatusInfo> = {}): SyncStatusInfo {
  return {
    status: 'local-draft',
    message: '',
    ...overrides,
  };
}

describe('ContinuityStatusRail', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // === Render pro Status (Task 7.2) ===

  it('rendert nichts Sichtbares bei local-draft', () => {
    renderWithProviders(<ContinuityStatusRail syncStatus={createSyncStatus()} />);
    // Kein sichtbares Status-Element vorhanden
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rendert Syncing-Status mit Text und Spinner', () => {
    renderWithProviders(<ContinuityStatusRail syncStatus={createSyncStatus({ status: 'syncing', message: 'Wird synchronisiert…' })} />);
    expect(screen.getByText('Wird synchronisiert…')).toBeInTheDocument();
    // Rail + Spinner haben beide role="status"
    const statusElements = screen.getAllByRole('status');
    expect(statusElements.length).toBeGreaterThanOrEqual(1);
  });

  it('rendert Synced-Status mit Erfolgsmeldung', () => {
    renderWithProviders(<ContinuityStatusRail syncStatus={createSyncStatus({ status: 'synced', message: 'Erfolgreich gespeichert' })} />);
    expect(screen.getByText('Erfolgreich gespeichert')).toBeInTheDocument();
  });

  it('rendert Failed-Status mit Fehlermeldung', () => {
    renderWithProviders(
      <ContinuityStatusRail
        syncStatus={createSyncStatus({
          status: 'failed',
          message: 'Speichern fehlgeschlagen',
          nextAction: { label: 'Erneut versuchen', description: 'Fehler', handler: vi.fn() },
        })}
      />,
    );
    expect(screen.getByText('Speichern fehlgeschlagen')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('rendert readonly-locked Status', () => {
    renderWithProviders(
      <ContinuityStatusRail
        syncStatus={createSyncStatus({
          status: 'readonly-locked',
          message: 'Schreibgeschützt – ETB ist gesperrt',
          nextAction: { label: 'Schreibgeschützt', description: 'ETB ist gesperrt' },
        })}
      />,
    );
    expect(screen.getByText('Schreibgeschützt – ETB ist gesperrt')).toBeInTheDocument();
    expect(screen.getByText('Schreibgeschützt')).toBeInTheDocument();
  });

  it('rendert degraded-connection Status', () => {
    renderWithProviders(
      <ContinuityStatusRail
        syncStatus={createSyncStatus({
          status: 'degraded-connection',
          message: 'Verbindung unterbrochen – Eingabe wird lokal gehalten',
          nextAction: { label: 'Warten', description: 'Wird automatisch synchronisiert' },
        })}
      />,
    );
    expect(screen.getByText('Verbindung unterbrochen – Eingabe wird lokal gehalten')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // === Action-Button (Task 7.2) ===

  it('zeigt Retry-Button bei failed-Status', () => {
    const retryFn = vi.fn();
    renderWithProviders(
      <ContinuityStatusRail
        syncStatus={createSyncStatus({
          status: 'failed',
          message: 'Speichern fehlgeschlagen',
          nextAction: { label: 'Erneut versuchen', description: 'Fehler', handler: retryFn },
        })}
      />,
    );
    const retryButton = screen.getByRole('button', { name: /erneut versuchen/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('ruft onRetry beim Klick auf Retry-Button auf', () => {
    const retryFn = vi.fn();
    renderWithProviders(
      <ContinuityStatusRail
        syncStatus={createSyncStatus({
          status: 'failed',
          message: 'Speichern fehlgeschlagen',
          nextAction: { label: 'Erneut versuchen', description: 'Fehler', handler: retryFn },
        })}
      />,
    );
    screen.getByRole('button', { name: /erneut versuchen/i }).click();
    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  it('zeigt keinen Retry-Button bei synced-Status', () => {
    renderWithProviders(<ContinuityStatusRail syncStatus={createSyncStatus({ status: 'synced', message: 'Erfolgreich gespeichert' })} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  // === Accessibility (Task 7.4) ===

  it('hat aria-live="polite" und aria-atomic="true" auf nicht-kritischen Status', () => {
    renderWithProviders(<ContinuityStatusRail syncStatus={createSyncStatus({ status: 'synced', message: 'Erfolgreich gespeichert' })} />);
    const statusElement = screen.getByRole('status');
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
    expect(statusElement).toHaveAttribute('aria-atomic', 'true');
  });

  it('hat role="status" für nicht-kritische Zustände', () => {
    renderWithProviders(<ContinuityStatusRail syncStatus={createSyncStatus({ status: 'syncing', message: 'Wird synchronisiert…' })} />);
    // Es gibt mehrere role="status" Elemente (Rail + Spinner), prüfe dass mindestens eines vorhanden ist
    const statusElements = screen.getAllByRole('status');
    expect(statusElements.length).toBeGreaterThanOrEqual(1);
  });

  it('hat role="alert" ohne aria-live für failed-Status (alert impliziert assertive)', () => {
    renderWithProviders(
      <ContinuityStatusRail
        syncStatus={createSyncStatus({
          status: 'failed',
          message: 'Speichern fehlgeschlagen',
          nextAction: { label: 'Erneut versuchen', description: 'Fehler', handler: vi.fn() },
        })}
      />,
    );
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();
    expect(alertElement).not.toHaveAttribute('aria-live');
    expect(alertElement).toHaveAttribute('aria-atomic', 'true');
  });

  it('hat role="alert" für degraded-connection-Status', () => {
    renderWithProviders(
      <ContinuityStatusRail
        syncStatus={createSyncStatus({
          status: 'degraded-connection',
          message: 'Verbindung unterbrochen',
          nextAction: { label: 'Warten', description: 'auto-sync' },
        })}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // === Synced-Ausblendung (Task 7.2) ===

  it('blendet synced-Status nach 3s aus', () => {
    renderWithProviders(<ContinuityStatusRail syncStatus={createSyncStatus({ status: 'synced', message: 'Erfolgreich gespeichert' })} />);
    expect(screen.getByText('Erfolgreich gespeichert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Erfolgreich gespeichert')).not.toBeInTheDocument();
  });

  it('blendet synced-Status nach benutzerdefinierter Dauer aus', () => {
    renderWithProviders(<ContinuityStatusRail syncStatus={createSyncStatus({ status: 'synced', message: 'Erfolgreich gespeichert' })} syncedFadeMs={1000} />);
    expect(screen.getByText('Erfolgreich gespeichert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Erfolgreich gespeichert')).not.toBeInTheDocument();
  });

  // === Keyboard-Bedienbarkeit (Task 7.4) ===

  it('Retry-Button ist per Klick auslösbar (native <button> aktiviert auch bei Enter/Space)', () => {
    // Hinweis: JSDOM simuliert NICHT die native Browser-Aktivierung von <button>
    // bei Enter/Space keyDown-Events. In echten Browsern lösen Enter und Space
    // automatisch den click-Handler auf nativen Buttons aus.
    // Wir testen den click-Handler direkt, was die Keyboard-Aktivierung abdeckt,
    // da der Button ein natives <button>-Element ist (kein div/span mit role="button").
    const retryFn = vi.fn();
    renderWithProviders(
      <ContinuityStatusRail
        syncStatus={createSyncStatus({
          status: 'failed',
          message: 'Speichern fehlgeschlagen',
          nextAction: { label: 'Erneut versuchen', description: 'Fehler', handler: retryFn },
        })}
      />,
    );
    const retryButton = screen.getByRole('button', { name: /erneut versuchen/i });

    // Verifiziere nativen <button> — Enter/Space wird vom Browser automatisch als click behandelt
    expect(retryButton.tagName).toBe('BUTTON');
    expect(retryButton).not.toBeDisabled();

    fireEvent.click(retryButton);
    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  it('Retry-Button ist nativer <button> und damit per Tastatur bedienbar', () => {
    // JSDOM-Limitation: keyDown mit Enter/Space löst keinen click auf nativen
    // <button>-Elementen aus (im Gegensatz zu echten Browsern).
    // Dieser Test verifiziert, dass der Button ein natives <button>-Element ist,
    // was in echten Browsern Enter- und Space-Aktivierung garantiert.
    const retryFn = vi.fn();
    renderWithProviders(
      <ContinuityStatusRail
        syncStatus={createSyncStatus({
          status: 'failed',
          message: 'Speichern fehlgeschlagen',
          nextAction: { label: 'Erneut versuchen', description: 'Fehler', handler: retryFn },
        })}
      />,
    );
    const retryButton = screen.getByRole('button', { name: /erneut versuchen/i });
    expect(retryButton.tagName).toBe('BUTTON');
    expect(retryButton).not.toBeDisabled();
    expect(retryButton).toHaveAttribute('type', 'button');
  });
});
