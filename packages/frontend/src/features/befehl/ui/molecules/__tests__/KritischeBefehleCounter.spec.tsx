/**
 * Unit Tests fuer KritischeBefehleCounter
 *
 * Verifiziert:
 * - Zeigt nichts bei 0 kritischen Befehlen
 * - Zaehlt KRITISCH + WARNUNG korrekt
 * - Klick-Handler wird aufgerufen
 * - aria-label ist korrekt (Singular/Plural)
 * - Pulsierender Dot ist vorhanden
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KritischeBefehleCounter } from '../KritischeBefehleCounter.molecule';
import { createBefehl, createEmpfaenger } from '../../../__fixtures__/befehl-test-utils';

describe('KritischeBefehleCounter', () => {
  const BASE_TIME = new Date('2026-01-01T10:00:00Z');

  const normalBefehl = createBefehl({
    id: 'normal',
    nummer: 'B2026-001',
    erteiltAm: BASE_TIME,
    empfaenger: [
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: BASE_TIME,
        quittiertAm: new Date('2026-01-01T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
    ],
  });

  const kritischBefehl = createBefehl({
    id: 'kritisch',
    nummer: 'B2026-002',
    erteiltAm: BASE_TIME,
    empfaenger: [
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: BASE_TIME,
        quittiertAm: new Date('2026-01-01T10:05:00Z'),
        quittierungArt: 'NICHT_VERSTANDEN',
      }),
    ],
  });

  const warnungBefehl = createBefehl({
    id: 'warnung',
    nummer: 'B2026-003',
    erteiltAm: BASE_TIME,
    empfaenger: [
      createEmpfaenger({
        empfaengerId: 'user-1',
        zugestelltAm: BASE_TIME,
        quittiertAm: new Date('2026-01-01T10:05:00Z'),
        quittierungArt: 'VERSTANDEN',
      }),
    ],
    kommentare: [{ id: 'k1', authorId: 'user-1', text: 'Frage?', isRueckfrage: true, createdAt: new Date('2026-01-01T10:06:00Z').toISOString() }],
  });

  it('rendert nichts wenn keine kritischen Befehle', () => {
    const { container } = render(<KritischeBefehleCounter befehle={[normalBefehl]} />);
    expect(container.firstChild).toBeNull();
  });

  it('rendert nichts bei leerem Array', () => {
    const { container } = render(<KritischeBefehleCounter befehle={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('zaehlt KRITISCH-Befehle', () => {
    render(<KritischeBefehleCounter befehle={[normalBefehl, kritischBefehl]} />);
    expect(screen.getByText(/1 kritischer Befehl$/)).toBeTruthy();
  });

  it('zaehlt WARNUNG-Befehle', () => {
    render(<KritischeBefehleCounter befehle={[normalBefehl, warnungBefehl]} />);
    expect(screen.getByText(/1 kritischer Befehl$/)).toBeTruthy();
  });

  it('zaehlt KRITISCH + WARNUNG zusammen', () => {
    render(<KritischeBefehleCounter befehle={[normalBefehl, kritischBefehl, warnungBefehl]} />);
    expect(screen.getByText(/2 kritische Befehle/)).toBeTruthy();
  });

  it('ruft onClick auf bei Klick', () => {
    const handleClick = vi.fn();
    render(<KritischeBefehleCounter befehle={[kritischBefehl]} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('hat korrekte aria-label (Singular)', () => {
    render(<KritischeBefehleCounter befehle={[kritischBefehl]} />);
    expect(screen.getByLabelText('1 kritischer Befehl anzeigen')).toBeTruthy();
  });

  it('hat korrekte aria-label (Plural)', () => {
    render(<KritischeBefehleCounter befehle={[kritischBefehl, warnungBefehl]} />);
    expect(screen.getByLabelText('2 kritische Befehle anzeigen')).toBeTruthy();
  });

  it('hat pulsierenden Dot (animate-ping)', () => {
    const { container } = render(<KritischeBefehleCounter befehle={[kritischBefehl]} />);
    expect(container.querySelector('.animate-ping')).toBeTruthy();
  });

  it('hat motion-reduce:animate-none fuer Barrierefreiheit', () => {
    const { container } = render(<KritischeBefehleCounter befehle={[kritischBefehl]} />);
    const pingSpan = container.querySelector('.animate-ping');
    expect(pingSpan?.className).toContain('motion-reduce:animate-none');
  });
});
