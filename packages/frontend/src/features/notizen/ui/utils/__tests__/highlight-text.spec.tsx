import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HighlightText } from '../highlight-text';

describe('HighlightText', () => {
  it('sollte matchenden Text in mark-Element wrappen', () => {
    // Given ein Text mit einem Suchwort
    const { container } = render(<HighlightText text="Hallo Welt" query="Welt" />);

    // When die Komponente gerendert wird
    const marks = container.querySelectorAll('mark');

    // Then wird der Treffer in einem mark-Element gewrapped
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('Welt');
  });

  it('sollte Text unverändert zurückgeben wenn kein Match', () => {
    // Given ein Text ohne Treffer für den Query
    const { container } = render(<HighlightText text="Hallo Welt" query="xyz" />);

    // When die Komponente gerendert wird
    const marks = container.querySelectorAll('mark');

    // Then gibt es keine mark-Elemente
    expect(marks).toHaveLength(0);
    expect(screen.getByText('Hallo Welt')).toBeInTheDocument();
  });

  it('sollte case-insensitive matchen', () => {
    // Given ein Text und ein Query mit unterschiedlicher Groß-/Kleinschreibung
    const { container } = render(<HighlightText text="Hallo WELT" query="welt" />);

    // When die Komponente gerendert wird
    const marks = container.querySelectorAll('mark');

    // Then wird trotzdem gematcht und hervorgehoben
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('WELT');
  });

  it('sollte Regex-Sonderzeichen im Query korrekt handhaben', () => {
    // Given ein Text mit einem Punkt und ein Query "test." (Punkt ist Regex-Sonderzeichen)
    const { container } = render(<HighlightText text="Dies ist ein test. Und testX bleibt unberührt." query="test." />);

    // When die Komponente gerendert wird
    const marks = container.querySelectorAll('mark');

    // Then wird nur der exakte String "test." gematcht, nicht "testX" (Punkt nicht als Wildcard)
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('test.');
  });

  it('sollte plain Text zurückgeben wenn Query leer ist', () => {
    // Given ein Text mit leerem Query
    const { container } = render(<HighlightText text="Hallo Welt" query="" />);

    // When die Komponente gerendert wird
    const marks = container.querySelectorAll('mark');

    // Then gibt es keine mark-Elemente und der Text wird unverändert dargestellt
    expect(marks).toHaveLength(0);
    expect(container.textContent).toBe('Hallo Welt');
  });

  it('sollte mehrere Treffer hervorheben', () => {
    // Given ein Text mit mehreren Vorkommen des Suchbegriffs
    const { container } = render(<HighlightText text="Test eins, Test zwei, Test drei" query="Test" />);

    // When die Komponente gerendert wird
    const marks = container.querySelectorAll('mark');

    // Then werden alle drei Treffer hervorgehoben
    expect(marks).toHaveLength(3);
    for (const mark of marks) {
      expect(mark.textContent).toBe('Test');
    }
  });
});
