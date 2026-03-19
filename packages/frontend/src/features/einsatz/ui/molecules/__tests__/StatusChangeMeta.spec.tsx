/**
 * Unit-Tests: StatusChangeMeta Komponente
 *
 * Story 2.3, Task 6.2 + 6.3 + 6.4:
 * - Zeitformat und Herkunft-Label Rendering
 * - Degradierung bei fehlenden Daten
 * - Versions-Badge bei Updates
 * - Accessibility: <time> Element, aria-live, Screenreader-Labels
 */
import { renderWithProviders, screen } from '@/test/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatusChangeMetadata, StatusChangeSource } from '../../../utils/status-change-meta';
import { StatusChangeMeta } from '../StatusChangeMeta';

function createMeta(overrides: Partial<StatusChangeMetadata> = {}): StatusChangeMetadata {
  return {
    timestamp: new Date('2026-03-16T12:00:00.000Z'),
    source: 'funk' as StatusChangeSource,
    sourceDisplay: 'Führung 1',
    actor: null,
    isAutomatic: false,
    isUpdated: false,
    version: 1,
    ...overrides,
  };
}

describe('StatusChangeMeta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T14:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Task 6.2: Rendering-Tests ---

  it('zeigt Herkunft-Label und relative Zeitanzeige an', () => {
    // Given - Meta mit Funk-Herkunft und gültigem Timestamp
    const meta = createMeta({ source: 'funk', sourceDisplay: 'Florian 1/44/1' });

    // When
    const { container } = renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then
    expect(screen.getByText('Florian 1/44/1')).toBeInTheDocument();
    // Relative Zeitanzeige im <time> Element
    const timeElement = container.querySelector('time');
    expect(timeElement).not.toBeNull();
    expect(timeElement?.textContent).toMatch(/vor/i);
  });

  it('zeigt System-Label und Screenreader-Text für automatische Einträge', () => {
    // Given - System-generierter Eintrag
    const meta = createMeta({ source: 'system', sourceDisplay: 'System', isAutomatic: true });

    // When
    renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText(/Automatisch erzeugt/)).toBeInTheDocument();
  });

  it('zeigt User-Label und Screenreader-Text für manuelle Einträge', () => {
    // Given - User-Eintrag
    const meta = createMeta({ source: 'user', sourceDisplay: 'Max Mustermann' });

    // When
    renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.getByText(/Von Nutzer erfasst/)).toBeInTheDocument();
  });

  it('zeigt Funk-Label und Screenreader-Text für Funk-Einträge', () => {
    // Given - Funk-Eintrag
    const meta = createMeta({ source: 'funk', sourceDisplay: 'Florian 1/44/1' });

    // When
    renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then
    expect(screen.getByText('Florian 1/44/1')).toBeInTheDocument();
    expect(screen.getByText(/Per Funk gemeldet/)).toBeInTheDocument();
  });

  it('zeigt "Unbekannt" und Screenreader-Text bei unbekannter Herkunft', () => {
    // Given - Herkunft unbekannt
    const meta = createMeta({ source: 'unknown', sourceDisplay: 'Unbekannt' });

    // When
    renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then
    expect(screen.getByText('Unbekannt')).toBeInTheDocument();
    expect(screen.getByText(/Herkunft unbekannt/)).toBeInTheDocument();
  });

  // --- Task 6.2: Degradierung ---

  it('zeigt Strich-Fallback wenn Timestamp fehlt', () => {
    // Given - Kein Timestamp
    const meta = createMeta({ timestamp: null });

    // When
    const { container } = renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then - Strich statt leerem String
    expect(screen.getByText('–')).toBeInTheDocument();
    expect(screen.getByTitle('Zeitpunkt nicht verfügbar')).toBeInTheDocument();
    // Kein <time>-Element
    expect(container.querySelector('time')).toBeNull();
  });

  // --- Task 6.3: Versions-Badge ---

  it('zeigt Versions-Badge bei version > 1', () => {
    // Given - Aktualisierter Eintrag
    const meta = createMeta({ version: 3, isUpdated: true });

    // When
    renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByTitle('Version 3 — aktualisiert')).toBeInTheDocument();
  });

  it('zeigt kein Versions-Badge bei version 1', () => {
    // Given - Ungeänderter Eintrag
    const meta = createMeta({ version: 1, isUpdated: false });

    // When
    renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then
    expect(screen.queryByText(/^v\d/)).not.toBeInTheDocument();
  });

  it('zeigt kein Versions-Badge wenn nur updatedBy (nicht version > 1)', () => {
    // Given - isUpdated=true aber version=1
    const meta = createMeta({ version: 1, isUpdated: true });

    // When
    renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then - Badge nur bei version > 1
    expect(screen.queryByText(/^v\d/)).not.toBeInTheDocument();
  });

  // --- Task 6.4: Accessibility ---

  it('rendert ein semantisches <time> Element mit ISO-8601 datetime Attribut', () => {
    // Given - Meta mit Timestamp
    const meta = createMeta({ timestamp: new Date('2026-03-16T12:00:00.000Z') });

    // When
    const { container } = renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then
    const timeElement = container.querySelector('time');
    expect(timeElement).not.toBeNull();
    expect(timeElement?.getAttribute('dateTime')).toBe('2026-03-16T12:00:00.000Z');
  });

  it('hat einen Screenreader-Text mit Herkunft und Zeitinformation', () => {
    // Given - Vollständige Meta
    const meta = createMeta({ source: 'funk', sourceDisplay: 'Führung 1' });

    // When
    renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then - sr-only Text enthält Herkunft und relative Zeit
    expect(screen.getByText(/Per Funk gemeldet: Führung 1/i)).toBeInTheDocument();
  });

  it('hat einen Screenreader-Text mit Hinweis bei fehlendem Zeitpunkt', () => {
    // Given - Meta ohne Timestamp
    const meta = createMeta({ timestamp: null, sourceDisplay: 'System' });

    // When
    renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then
    expect(screen.getByText(/Zeitpunkt nicht verfügbar/i)).toBeInTheDocument();
  });

  it('hat title-Attribut mit vollständigem Zeitformat für Tooltip', () => {
    // Given - Meta mit Timestamp
    const meta = createMeta({ timestamp: new Date('2026-03-16T12:00:00.000Z') });

    // When
    const { container } = renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then - title zeigt vollständiges Datum
    const timeElement = container.querySelector('time');
    expect(timeElement?.getAttribute('title')).toMatch(/16\.03\.2026/);
  });

  // --- aria-live Region ---

  it('rendert eine aria-live Region für dynamische Updates', () => {
    // Given - Vollständige Meta
    const meta = createMeta();

    // When
    const { container } = renderWithProviders(<StatusChangeMeta meta={meta} />);

    // Then
    const outputElement = container.querySelector('output');
    expect(outputElement).not.toBeNull();
    expect(outputElement?.getAttribute('aria-live')).toBe('polite');
    expect(outputElement?.getAttribute('aria-atomic')).toBe('true');
  });

  // --- Skeleton/Loading ---

  it('zeigt Skeleton-Placeholder im Lade-Zustand', () => {
    // Given - Loading state
    const meta = createMeta();

    // When
    const { container } = renderWithProviders(<StatusChangeMeta meta={meta} isLoading />);

    // Then - Kein aria-live Output, stattdessen aria-busy skeleton
    expect(container.querySelector('output')).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
