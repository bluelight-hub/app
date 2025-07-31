/**
 * Gemeinsame Typdefinitionen für das gesamte Frontend-Projekt
 */

/**
 * Basis-Interface für testbare Komponenten
 * Erlaubt das Hinzufügen von data-testid zu jeder Komponente
 */
export interface TestableComponent {
  'data-testid'?: string;
}

/**
 * Standard Props für Atom-Komponenten
 * Beinhaltet sowohl Testbarkeit als auch Style-Anpassung
 */
export interface BaseAtomProps extends TestableComponent {
  className?: string;
}
