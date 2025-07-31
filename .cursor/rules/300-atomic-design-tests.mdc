---
description: 
globs: packages/frontend/src/components/**
alwaysApply: false
---
# Atomic Design Component Tests

## Context
- Gilt für alle React-Komponenten im Frontend nach Atomic Design Prinzipien
- Alle Komponententests müssen im gleichen Verzeichnis wie die Komponente platziert werden
- Es wird Vitest und React Testing Library verwendet

## Requirements

1. **Allgemeine Teststruktur**
   - **Namenskonvention**: `KomponentenName.test.tsx`
   - **Platzierung**: Im gleichen Verzeichnis wie die Komponente
   - **Import der Komponente**: Mit Default-Import
   - **Teststruktur**: `describe('KomponentenName', () => {...})`

2. **Grundlegende Testarten**
   - **Unit Tests**: Testen einzelner Funktionalitäten der Komponente
   - **Integration Tests**: Testen des Zusammenspiels mit anderen Komponenten
   - **Snapshot Tests**: Prüfen der Renderingkonsistenz 
      -> Aktualisierung der Snapshots mit `pnpm test:update`

3. **Testing Best Practices**
   - Tests sollten klar und eindeutig beschrieben sein (`it('should do something')`)
   - Verwende aussagekräftige Testbezeichnungen und gruppiere verwandte Tests
   - Verwende spezifische Selektoren, vorzugsweise `data-testid`
   - Teste Accessibility-Features, wenn relevant
   - Halte Tests möglichst unabhängig voneinander
   - Vermeide unnötige Abhängigkeiten zu anderen Komponenten
   - Mock externe Abhängigkeiten (APIs, Stores, Hooks) wo nötig

4. **Test-IDs und Props**
   - Verwende passende Interface-Erweiterungen: `BaseAtomProps`, `BaseMoleculeProps`, etc.
   - Stelle sicher, dass `data-testid` als Prop unterstützt wird
   - Setze sinnvolle Default-Werte für `data-testid` (z.B. Komponentenname in kebab-case)
   - Verwende Test-IDs konsistent in allen Tests

5. **Mocking**
   - Mock externe Abhängigkeiten explizit mit `vi.mock()`
   - Dokumentiere, was und warum gemockt wird
   - Stelle sicher, dass Mocks den tatsächlichen Implementations-Schnittstellen entsprechen
   - Verwende `vi.fn()` für Mock-Funktionen

6. **Test Coverage**
   - Strebe mindestens 80% Testabdeckung für alle Komponenten an
   - Teste alle Props und State-Abhängigkeiten
   - Teste Edge Cases (leere Arrays, null-Werte, Fehlerszenarien)
   - Teste alle User-Interaktionen (Klicks, Eingabefelder, etc.)

7. **Test Ausführung**
   - Nach dem Schreiben oder Ändern von Tests IMMER die Tests ausführen
   - Verwende `pnpm test` im jeweiligen Paketverzeichnis, um Tests zu starten
   - Prüfe, ob alle Tests erfolgreich durchlaufen
   - Behebe Fehler umgehend, bevor der Code integriert wird
   - Bei Snapshot-Änderungen verwende `pnpm test:update` nach Überprüfung der Änderungen

## Examples

<example>
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button', () => {
  // Unit Test
  it('should render with label', () => {
    render(<Button label="Click me" onClick={() => {}} data-testid="button" />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  // Event Test
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button label="Click me" onClick={handleClick} data-testid="button" />);
    fireEvent.click(screen.getByTestId('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Snapshot Test
  it('should match snapshot', () => {
    const { container } = render(<Button label="Click me" onClick={() => {}} data-testid="button" />);
    expect(container).toMatchSnapshot();
  });
});
</example> 