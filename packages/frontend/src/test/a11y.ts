/**
 * A11y-Test-Helper für Vitest + jsdom (Story 7.8).
 *
 * Direktes `axe-core` ohne `vitest-axe`/`jest-axe`-Wrapper — dieser dünne
 * Helper exportiert `expectNoAxeViolations` (assertion) und registriert über
 * `setup.ts` den `toHaveNoAxeViolations`-Vitest-Matcher.
 *
 * jsdom-Limitationen (Pflicht-Wissen):
 * - `color-contrast` und `color-contrast-enhanced` brauchen echte
 *   Compute-Style-Werte. jsdom liefert keine Cascade-Auflösung für CSS-
 *   Custom-Properties, daher sind beide Regeln per Default deaktiviert.
 *   Kontrast wird über die Token-basierte Spec (`contrast-audit.spec.ts`,
 *   AC4) und den Block-B-Browser-Smoke abgedeckt.
 * - Layout-getriebene Regeln liefern in jsdom unzuverlässige Ergebnisse,
 *   weil `getBoundingClientRect()` immer `0,0,0,0` zurückgibt. Touch-Target-
 *   und Reflow-Heuristiken laufen separat in Story 7.7.
 *
 * Falsch-positive Befunde dürfen nur per `axe-allow`-Marker (Spec-lokale
 * `rules: { '<id>': { enabled: false } }`-Override mit `// axe-allow:`-
 * Begründungs-Kommentar) ausgenommen werden — und müssen in
 * `packages/frontend/src/features/eigenschutz/CONSISTENCY.md` Abschnitt
 * „A11y-Audit / axe-allow-Marker" gelistet sein.
 */
import axe, { type AxeResults, type RunOptions, type Result } from 'axe-core';

/**
 * Default-Tag-Set für WCAG 2.1 AA-Konformität + axe-Best-Practices.
 */
export const DEFAULT_AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

/**
 * Default-deaktivierte Regeln (jsdom-Limitierungen — siehe Modul-Header).
 */
export const DEFAULT_DISABLED_RULES: Record<string, { enabled: false }> = {
  'color-contrast': { enabled: false },
  'color-contrast-enhanced': { enabled: false },
};

export interface ExpectNoAxeViolationsOptions {
  /**
   * Regel-spezifische Overrides (z. B. um eine `axe-allow`-Ausnahme zu
   * setzen). Wird mit `DEFAULT_DISABLED_RULES` zusammengeführt; eigene
   * Overrides haben Vorrang.
   */
  rules?: Record<string, { enabled: boolean }>;
  /**
   * Optionaler `runOnly`-Override (z. B. um nur eine konkrete Regel oder
   * einen reduzierten Tag-Satz zu prüfen). Default: alle Tags aus
   * `DEFAULT_AXE_TAGS`.
   */
  runOnly?: RunOptions['runOnly'];
}

function formatViolation(violation: Result): string {
  const nodes = violation.nodes
    .map((node) => {
      const target = Array.isArray(node.target) ? node.target.join(' ') : String(node.target);
      const failureSummary = node.failureSummary?.split('\n').join('\n     ') ?? '';
      return `   • ${target}\n     ${failureSummary}`;
    })
    .join('\n');
  return `❌ [${violation.id}] ${violation.help} (${violation.helpUrl})\n${nodes}`;
}

/**
 * Wirft eine Vitest-Assertion mit deutscher Fehlermeldung, wenn axe-core
 * Violations findet. Erfolg → resolved Promise, kein Rückgabewert.
 *
 * Fehlerformat:
 * ```
 * A11y-Verstoß (N):
 * ❌ [<regel-id>] <help> (<helpUrl>)
 *    • <selektor>
 *      <failureSummary>
 * ```
 */
export async function expectNoAxeViolations(container: HTMLElement, options?: ExpectNoAxeViolationsOptions): Promise<void> {
  const results: AxeResults = await axe.run(container, {
    resultTypes: ['violations'],
    runOnly: options?.runOnly ?? { type: 'tag', values: DEFAULT_AXE_TAGS },
    rules: { ...DEFAULT_DISABLED_RULES, ...options?.rules },
  });

  if (results.violations.length === 0) {
    return;
  }

  const formatted = results.violations.map(formatViolation).join('\n\n');
  throw new Error(`A11y-Verstoß (${results.violations.length}):\n${formatted}`);
}

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveNoAxeViolations(options?: ExpectNoAxeViolationsOptions): Promise<T>;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoAxeViolations(options?: ExpectNoAxeViolationsOptions): unknown;
  }
}
