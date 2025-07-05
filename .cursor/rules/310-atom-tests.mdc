---
description: ENFORCE standardized testing practices for atomic components
globs: packages/frontend/src/components/atoms/**/*.tsx
alwaysApply: false
---
# Atom Component Tests

## Context
- Gilt für alle Atom-Komponenten im Frontend
- Tests müssen im gleichen Verzeichnis wie die Komponente platziert werden
- Es wird Vitest und React Testing Library verwendet

## Requirements

1. **Testdateinamenskonvention**
   - Namensschema: `KomponentenName.test.tsx`
   - Platzierung im gleichen Verzeichnis wie die Komponente

2. **Testart und -umfang**
   - **Unit Tests** (mindestens 2-3):
     - Rendering ohne Fehler
     - Überprüfung grundlegender Props
     - Überprüfung von CSS-Klassen und Styling
   
   - **Integration Tests** (mindestens 1):
     - Verhalten der Komponente in einem Container/Layout
     - Interaktion mit anderen Komponenten wenn relevant
   
   - **Snapshot Tests** (mindestens 1):
     - Grundversion der Komponente
     - Varianten mit unterschiedlichen Props (optional)

3. **Testing Best Practices**
   - Tests sollten klar beschrieben sein (`it('should do something'`)
   - Verwende spezifische Selektoren (z.B. `data-testid`)
   - Teste Accessibility-Features, wenn relevant
   - Halte Tests möglichst unabhängig voneinander
   - Vermeide unnötige Abhängigkeiten zu anderen Komponenten

4. **Test Coverage**
   - Mindestens 80% Testabdeckung für Atom-Komponenten anstreben
   - Alle öffentlichen Props testen
   - Interaktive Elemente (Events, Callbacks) explizit testen

5. **Integration von Test-IDs in Komponenten**
   - Komponenten sollten `BaseAtomProps` oder `TestableComponent` aus `utils/types.ts` verwenden
   - Die Standard-Test-ID sollte dem Komponentennamen in Kleinbuchstaben entsprechen
   - Die Test-ID sollte direkt im JSX der Komponente eingefügt werden
   - Niemals separate Test-ID-Properties definieren, wenn bereits die gemeinsamen Interfaces verfügbar sind

6. **Spezifische Selektormethoden**
   - Für einfache Atom-Komponenten: `container.firstChild` für Styling-Tests
   - Für komplexe Komponenten oder Layout-Tests: `screen.getByTestId`
   - Niemals generische Selektoren wie `document.querySelector` verwenden
   - Bei Snapshot-Tests immer konsistente `data-testid`-Werte verwenden

## Examples

<example>
// Button.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  // Unit Test
  it('should render with label', () => {
    render(<Button label="Click me" onClick={() => {}} data-testid="button" />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  // Unit Test - Props & Events
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button label="Click me" onClick={handleClick} data-testid="button" />);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Integration Test
  it('should work in a form context', () => {
    const handleSubmit = vi.fn(e => e.preventDefault());
    render(
      <form onSubmit={handleSubmit}>
        <Button label="Submit" onClick={() => {}} type="submit" data-testid="button" />
      </form>
    );
    fireEvent.click(screen.getByTestId('button'));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  // Snapshot Test
  it('should match snapshot', () => {
    const { container } = render(<Button label="Click me" onClick={() => {}} data-testid="button" />);
    expect(container).toMatchSnapshot();
  });
});
</example>

<example>
// Divider Component Implementation mit BaseAtomProps
import { BaseAtomProps } from '../../utils/types';

type DividerProps = BaseAtomProps;

const Divider: React.FC<DividerProps> = ({ className, "data-testid": dataTestId = "divider" }) => {
  return (
    <div 
      data-testid={dataTestId} 
      className={twMerge(`border-t border-gray-800/10 dark:border-gray-200/10 my-3`, className)}
    ></div>
  );
};
</example> 