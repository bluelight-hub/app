import { describe, expect, it } from 'vitest';

import { formatChangedFieldsSummary } from '../version-summary';

/**
 * Spec für `formatChangedFieldsSummary` (Story 415-2-4, Task 10, AC3).
 *
 * Prüft die sieben Kernfälle des Formatters: V1-Creation, Singular/Plural
 * pro Kategorie, die fixe Reihenfolge `added, removed, updated` in der
 * kombinierten Ausgabe sowie den Fallback auf `'Keine Änderung'`, wenn
 * nur unveränderte Einträge vorliegen.
 */
describe('formatChangedFieldsSummary (Story 415-2-4 Task 10, AC3)', () => {
  it('gibt "Angelegt" für V1-Creation zurück', () => {
    expect(formatChangedFieldsSummary({ created: true })).toBe('Angelegt');
  });

  it('formatiert eine einzelne hinzugefügte Gefährdung im Singular', () => {
    expect(formatChangedFieldsSummary({ added: ['g-1'], removed: [], updated: [], unchanged: 0 })).toBe('1 Gefährdung hinzugefügt');
  });

  it('formatiert mehrere hinzugefügte Gefährdungen im Plural', () => {
    expect(formatChangedFieldsSummary({ added: ['g-1', 'g-2'], removed: [], updated: [], unchanged: 0 })).toBe('2 Gefährdungen hinzugefügt');
  });

  it('formatiert eine einzelne entfernte Gefährdung im Singular', () => {
    expect(formatChangedFieldsSummary({ added: [], removed: ['g-1'], updated: [], unchanged: 0 })).toBe('1 Gefährdung entfernt');
  });

  it('formatiert mehrere geänderte Gefährdungen im Plural', () => {
    expect(
      formatChangedFieldsSummary({
        added: [],
        removed: [],
        updated: [
          { id: 'g-1', fields: ['massnahmen'] },
          { id: 'g-2', fields: ['eintritt'] },
          { id: 'g-3', fields: ['schaden'] },
        ],
        unchanged: 0,
      }),
    ).toBe('3 Gefährdungen geändert');
  });

  it('kombiniert added, removed und updated in fixer Reihenfolge', () => {
    expect(
      formatChangedFieldsSummary({
        added: ['g-1'],
        removed: ['g-2', 'g-3'],
        updated: [{ id: 'g-4', fields: ['massnahmen'] }],
        unchanged: 2,
      }),
    ).toBe('1 Gefährdung hinzugefügt, 2 Gefährdungen entfernt, 1 Gefährdung geändert');
  });

  it('gibt "Keine Änderung" zurück, wenn nur unchanged-Einträge vorliegen', () => {
    expect(formatChangedFieldsSummary({ added: [], removed: [], updated: [], unchanged: 5 })).toBe('Keine Änderung');
  });
});
