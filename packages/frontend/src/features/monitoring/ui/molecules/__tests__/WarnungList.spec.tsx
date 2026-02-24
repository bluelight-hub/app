/**
 * Unit Tests fuer WarnungList Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 5.6:** Monitoring-Dashboard WarnungList
 * - Leerer Zustand zeigt "Keine Warnungen"
 * - Warnungen mit korrektem Typ-Label
 * - Timestamp formatiert angezeigt
 * - aria-live Attribut auf Container
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { SystemWarnungPayload } from '../../../api';
import { WarnungList } from '../WarnungList';

/** Factory fuer eine minimale SystemWarnungPayload */
function createMockWarnung(overrides?: Partial<SystemWarnungPayload>): SystemWarnungPayload {
  return {
    warnungTyp: 'ZUSTELLRATE',
    schwellwert: 0.8,
    aktuellerWert: 0.65,
    timestamp: '2026-02-24T10:00:00.000Z',
    ...overrides,
  };
}

describe('WarnungList', () => {
  it('sollte "Keine Warnungen" bei leerem Array anzeigen', () => {
    // Given: Leere Warnungs-Liste
    // When: Komponente wird gerendert
    render(<WarnungList warnungen={[]} />);

    // Then: "Keine Warnungen" Nachricht ist sichtbar
    expect(screen.getByText('Keine Warnungen')).toBeInTheDocument();
  });

  it('sollte Warnungen mit korrektem Typ-Label rendern', () => {
    // Given: Warnungen mit verschiedenen Typen
    const warnungen: SystemWarnungPayload[] = [
      createMockWarnung({ warnungTyp: 'ZUSTELLRATE' }),
      createMockWarnung({ warnungTyp: 'OUTBOX_STAU', timestamp: '2026-02-24T10:01:00.000Z' }),
      createMockWarnung({ warnungTyp: 'LATENZ', timestamp: '2026-02-24T10:02:00.000Z' }),
      createMockWarnung({ warnungTyp: 'CIRCUIT_BREAKER', timestamp: '2026-02-24T10:03:00.000Z' }),
    ];

    // When: Komponente wird gerendert
    render(<WarnungList warnungen={warnungen} />);

    // Then: Korrekte Labels sind sichtbar
    expect(screen.getByText('Zustellrate zu niedrig')).toBeInTheDocument();
    expect(screen.getByText('Outbox-Stau')).toBeInTheDocument();
    expect(screen.getByText('Hohe Latenz')).toBeInTheDocument();
    expect(screen.getByText('Circuit Breaker offen')).toBeInTheDocument();
  });

  it('sollte unbekannten Typ als Raw-Wert anzeigen', () => {
    // Given: Warnung mit unbekanntem Typ
    const warnungen = [createMockWarnung({ warnungTyp: 'UNBEKANNT' })];

    // When: Komponente wird gerendert
    render(<WarnungList warnungen={warnungen} />);

    // Then: Raw-Wert wird als Fallback angezeigt
    expect(screen.getByText('UNBEKANNT')).toBeInTheDocument();
  });

  it('sollte Timestamp formatiert anzeigen', () => {
    // Given: Warnung mit bekanntem Timestamp
    const warnungen = [createMockWarnung({ timestamp: '2026-02-24T14:30:45.000Z' })];

    // When: Komponente wird gerendert
    render(<WarnungList warnungen={warnungen} />);

    // Then: Timestamp ist als formatierte Uhrzeit sichtbar (de-DE toLocaleTimeString)
    // Das genaue Format haengt von der Locale ab, aber es sollte Stunden:Minuten:Sekunden enthalten
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('sollte Warnungs-Anzahl im Header anzeigen', () => {
    // Given: Mehrere Warnungen
    const warnungen = [createMockWarnung(), createMockWarnung({ warnungTyp: 'OUTBOX_STAU', timestamp: '2026-02-24T10:01:00.000Z' })];

    // When: Komponente wird gerendert
    render(<WarnungList warnungen={warnungen} />);

    // Then: Anzahl im Header sichtbar
    expect(screen.getByText('Letzte Warnungen (2)')).toBeInTheDocument();
  });

  it('sollte aria-live Attribut auf dem Warnungs-Container haben', () => {
    // Given: Warnungen vorhanden
    const warnungen = [createMockWarnung()];

    // When: Komponente wird gerendert
    render(<WarnungList warnungen={warnungen} />);

    // Then: Container hat aria-live="polite" und role="log"
    const container = screen.getByRole('log');
    expect(container).toHaveAttribute('aria-live', 'polite');
    expect(container).toHaveAttribute('aria-label', 'System-Warnungen');
  });
});
