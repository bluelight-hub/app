/**
 * RiskMatrix5x5 — 5×5-Risikomatrix-Grid (Story 2.2 Task 9).
 *
 * Rendert eine 5×5-Auswahlmatrix (25 Zellen) für die Risikobewertung eines
 * Gefährdungs-Items nach Nohl-Methode (ADR-013). Die Komponente ist reiner
 * View+Input — die Zuordnung Eintritt×Schaden → Risikoklasse passiert in
 * `calculateRisikoklasse` aus `@bluelight-hub/shared` und bleibt einzige
 * Quelle der Wahrheit.
 *
 * A11y-Vertrag:
 * - Container ist `<table role="grid">` mit Achsen-Headern (`<th scope="col">`
 *   für Schadensausmaß oben, `<th scope="row">` für Eintrittswahrscheinlichkeit
 *   links). Screenreader erhalten damit die korrekte 2-dimensionale Navigation
 *   plus Achsen-Kontext.
 * - Zellen haben `role="gridcell"` mit sprechendem `aria-label`
 *   (Eintritt + Schaden + Risikoklasse), damit die Auswahl auch ohne Sicht
 *   verifizierbar ist.
 * - Roving-Tabindex: nur die fokussierte bzw. ausgewählte Zelle trägt
 *   `tabIndex=0`; alle anderen `-1`. Pfeiltasten verschieben den Fokus,
 *   Enter/Space ruft `onChange` auf (AC7, UX-DR22).
 * - Touch-Targets erfüllen das 48×48px-Minimum über `min-h-12 min-w-12` und
 *   wachsen auf größeren Viewports (`sm:min-h-14 sm:min-w-14`,
 *   `lg:min-h-16 lg:min-w-16`), damit die Matrix auf Desktop nicht
 *   zusammengequetscht wirkt (Goal G2).
 * - `prefers-reduced-motion: reduce` deaktiviert die Transition-Klasse —
 *   wir prüfen `window.matchMedia` client-seitig, in jsdom-Tests lässt sich
 *   das über `vi.stubGlobal('matchMedia', …)` steuern.
 *
 * Responsive-Strategie (Goal G2):
 * - Das `<table>` selbst bleibt ein 5×5-Grid (semantisch korrekt für
 *   Screenreader). Auf sehr schmalen Viewports < 360 px (z. B. iPhone SE 1.
 *   Gen mit 320 px Breite) würde das Grid optisch zerquetschen. Lösung:
 *   ein Wrapper-`<div>` mit `overflow-x-auto`, der die Matrix horizontal
 *   scrollbar macht. `min-w-[20rem]` an der Tabelle hält die Mindest-Größe
 *   bei, ab `sm` (640 px) breitet sich die Tabelle wieder auf 100 %.
 *   Damit bleibt die 2-dim-Navigation (Pfeiltasten) auf allen Viewports
 *   konsistent, statt zwischen Grid und Stacked-Layout zu wechseln.
 *
 * Farbgebung:
 * - Die Tailwind-v4-Theme-Tokens heißen `warnstufe-{keine,niedrig,mittel,hoch,akut}`
 *   (siehe `src/index.tailwind.css`) und adressieren andere Stufen als die
 *   vier Ampel-Klassen GRUEN/GELB/ORANGE/ROT. Bewusst nutzen wir stattdessen
 *   die Standard-Tailwind-Paletten (`green/yellow/orange/red`) — sie sind
 *   farbblind-freundlich und semantisch klar mit den Ampelklassen gekoppelt.
 *   Für Dark-Mode (`.dark`-Klasse) hinterlegen wir abgedunkelte Surface-
 *   Varianten plus hellen Text, damit das Kontrastverhältnis gegen den
 *   dunklen Hintergrund mindestens WCAG AA erreicht.
 */

import { calculateRisikoklasse } from '@bluelight-hub/shared';
import { EINTRITTSWAHRSCHEINLICHKEIT_WERTE, SCHADENSAUSMASS_WERTE, type Eintrittswahrscheinlichkeit, type Risikoklasse, type Schadensausmass } from '@bluelight-hub/shared/schemas';
import { cn } from '@/shared/ui/cn';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

export interface RiskMatrix5x5Props {
  readonly value?: {
    readonly eintritt?: Eintrittswahrscheinlichkeit;
    readonly schaden?: Schadensausmass;
  };
  readonly onChange: (value: { eintritt: Eintrittswahrscheinlichkeit; schaden: Schadensausmass }) => void;
  readonly disabled?: boolean;
  /**
   * Wenn `true`, wird die Matrix als Read-only angezeigt (Story 415-2-4 Task 13, AC14):
   * - Root-Element trägt `aria-readonly="true"`.
   * - Klick und Enter/Space lösen kein `onChange` aus.
   * - Pfeiltasten-Fokus bleibt erhalten, damit Screenreader die ausgewählte
   *   Zelle (z. B. in einer Versions-Detailansicht) erkunden können.
   * - Selection-Stil der aktiv ausgewählten Zelle bleibt sichtbar.
   */
  readonly readOnly?: boolean;
  readonly 'aria-labelledby'?: string;
}

/** Menschenlesbare Labels für die Eintrittswahrscheinlichkeits-Zeilen. */
const EINTRITT_LABELS: Record<Eintrittswahrscheinlichkeit, string> = {
  SELTEN: 'Selten',
  GELEGENTLICH: 'Gelegentlich',
  HAEUFIG: 'Häufig',
  OFT: 'Oft',
  STAENDIG: 'Ständig',
};

/** Menschenlesbare Labels für die Schadensausmaß-Spalten. */
const SCHADEN_LABELS: Record<Schadensausmass, string> = {
  VERNACHLAESSIGBAR: 'Vernachlässigbar',
  GERING: 'Gering',
  MITTEL: 'Mittel',
  HOCH: 'Hoch',
  KATASTROPHAL: 'Katastrophal',
};

/** Menschenlesbare Labels für die Risikoklasse (für aria-label). */
const RISIKOKLASSE_LABELS: Record<Risikoklasse, string> = {
  GRUEN: 'Grün',
  GELB: 'Gelb',
  ORANGE: 'Orange',
  ROT: 'Rot',
};

/**
 * Tailwind-Farb-Tokens pro Risikoklasse (Fallback auf Standard-Paletten, siehe Datei-Doc).
 *
 * Light-Mode: helle Surface (`100`/`200`) + dunkler Text (`900`).
 * Dark-Mode: deutlich abgedunkelte Surface (`900`/`950`) + heller Text (`100`/`200`),
 * damit das Kontrastverhältnis im Dark-Theme nicht unter WCAG AA fällt.
 */
const RISIKOKLASSE_STYLES: Record<Risikoklasse, string> = {
  GRUEN: 'bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-100 dark:hover:bg-green-900/70',
  GELB: 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-100 dark:hover:bg-yellow-900/70',
  ORANGE: 'bg-orange-200 text-orange-900 hover:bg-orange-300 dark:bg-orange-900/60 dark:text-orange-100 dark:hover:bg-orange-900/80',
  ROT: 'bg-red-200 text-red-900 hover:bg-red-300 dark:bg-red-900/60 dark:text-red-100 dark:hover:bg-red-900/80',
};

// Konstanten als Arrays für den numerischen Zugriff bei Keyboard-Nav.
const EINTRITT_ORDER = EINTRITTSWAHRSCHEINLICHKEIT_WERTE;
const SCHADEN_ORDER = SCHADENSAUSMASS_WERTE;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    // addEventListener ist der moderne Weg; ältere Browser nutzen addListener.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    return undefined;
  }, []);
  return reduced;
}

export function RiskMatrix5x5({ value, onChange, disabled = false, readOnly = false, 'aria-labelledby': ariaLabelledBy }: RiskMatrix5x5Props) {
  const reducedMotion = usePrefersReducedMotion();

  // Roving-Tabindex-Fokus: Initialisierung auf den selektierten Wert,
  // Fallback auf die mittlere Zelle (HAEUFIG × MITTEL).
  const initialRow = value?.eintritt ? EINTRITT_ORDER.indexOf(value.eintritt) : 2;
  const initialCol = value?.schaden ? SCHADEN_ORDER.indexOf(value.schaden) : 2;
  const [focus, setFocus] = useState<{ row: number; col: number }>({
    row: initialRow >= 0 ? initialRow : 2,
    col: initialCol >= 0 ? initialCol : 2,
  });

  // Programmatisches Fokussieren nach Pfeiltasten-Move (User-Erwartung).
  const gridRef = useRef<HTMLTableElement | null>(null);
  const shouldRefocus = useRef(false);
  useEffect(() => {
    if (!shouldRefocus.current) return;
    shouldRefocus.current = false;
    const cell = gridRef.current?.querySelector<HTMLElement>(`[data-matrix-row="${focus.row}"][data-matrix-col="${focus.col}"]`);
    cell?.focus();
  }, [focus]);

  const handleCellKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, row: number, col: number) => {
      if (disabled) return;
      let nextRow = row;
      let nextCol = col;
      switch (event.key) {
        case 'ArrowUp':
          nextRow = Math.max(0, row - 1);
          break;
        case 'ArrowDown':
          nextRow = Math.min(EINTRITT_ORDER.length - 1, row + 1);
          break;
        case 'ArrowLeft':
          nextCol = Math.max(0, col - 1);
          break;
        case 'ArrowRight':
          nextCol = Math.min(SCHADEN_ORDER.length - 1, col + 1);
          break;
        case 'Home':
          nextCol = 0;
          break;
        case 'End':
          nextCol = SCHADEN_ORDER.length - 1;
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (readOnly) return;
          onChange({ eintritt: EINTRITT_ORDER[row], schaden: SCHADEN_ORDER[col] });
          return;
        default:
          return;
      }
      if (nextRow !== row || nextCol !== col) {
        event.preventDefault();
        shouldRefocus.current = true;
        setFocus({ row: nextRow, col: nextCol });
      }
    },
    [disabled, readOnly, onChange],
  );

  const selectedKey = useMemo(() => {
    if (!value?.eintritt || !value?.schaden) return null;
    return `${EINTRITT_ORDER.indexOf(value.eintritt)}:${SCHADEN_ORDER.indexOf(value.schaden)}`;
  }, [value?.eintritt, value?.schaden]);

  return (
    // Wrapper sorgt für horizontalen Scroll auf sehr schmalen Viewports (Goal G2):
    // unterhalb von 360 px Breite passen 5 Zellen + Achsenlabel sonst nicht hin.
    <div className="overflow-x-auto" data-testid="risk-matrix-5x5-scroll">
      <table
        ref={gridRef}
        role="grid"
        aria-labelledby={ariaLabelledBy}
        aria-disabled={disabled || undefined}
        aria-readonly={readOnly || undefined}
        className="w-full min-w-[20rem] border-separate border-spacing-2 sm:border-spacing-3"
        data-testid="risk-matrix-5x5"
      >
        <thead>
          <tr>
            {/* Leere Ecke oben-links — kein Label. */}
            <th scope="col" aria-hidden="true" className="w-24 sm:w-32" />
            {SCHADEN_ORDER.map((schaden) => (
              <th key={schaden} scope="col" className="px-1.5 pb-2.5 text-center text-xs font-medium text-text-secondary sm:text-sm">
                {SCHADEN_LABELS[schaden]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EINTRITT_ORDER.map((eintritt, rowIdx) => (
            <tr key={eintritt}>
              <th scope="row" className="pr-2.5 text-right text-xs font-medium text-text-secondary sm:pr-3 sm:text-sm">
                {EINTRITT_LABELS[eintritt]}
              </th>
              {SCHADEN_ORDER.map((schaden, colIdx) => {
                const klasse = calculateRisikoklasse(eintritt, schaden);
                const cellKey = `${rowIdx}:${colIdx}`;
                const isSelected = selectedKey === cellKey;
                const isFocusable = focus.row === rowIdx && focus.col === colIdx;
                const ariaLabel = `Eintrittswahrscheinlichkeit ${EINTRITT_LABELS[eintritt]}, Schadensausmaß ${SCHADEN_LABELS[schaden]}, Risikoklasse ${RISIKOKLASSE_LABELS[klasse]}`;
                return (
                  <td
                    key={schaden}
                    role="gridcell"
                    aria-label={ariaLabel}
                    aria-selected={isSelected}
                    aria-disabled={disabled || undefined}
                    tabIndex={disabled ? -1 : isFocusable ? 0 : -1}
                    data-matrix-row={rowIdx}
                    data-matrix-col={colIdx}
                    data-risikoklasse={klasse}
                    data-testid={`risk-matrix-cell-${eintritt}-${schaden}`}
                    onClick={() => {
                      if (disabled) return;
                      shouldRefocus.current = false;
                      setFocus({ row: rowIdx, col: colIdx });
                      if (readOnly) return;
                      onChange({ eintritt, schaden });
                    }}
                    onKeyDown={(event) => handleCellKeyDown(event, rowIdx, colIdx)}
                    className={cn(
                      // Touch-Targets: Basis 48 × 48 px (Primär-Aktion), auf sm/lg-Viewports
                      // großzügig auf 56 × 56 / 64 × 64 px wachsen (Goal G2). Padding gibt
                      // dem Risikoklasse-Label optisch Luft, ohne die Touch-Fläche zu beschneiden.
                      'relative min-h-12 min-w-12 cursor-pointer rounded-control border p-1.5 text-center align-middle text-xs font-semibold select-none sm:min-h-14 sm:min-w-14 sm:p-2 sm:text-sm lg:min-h-16 lg:min-w-16',
                      'focus:outline-none focus-visible:shadow-focus-ring',
                      RISIKOKLASSE_STYLES[klasse],
                      isSelected ? 'border-action-primary ring-2 ring-action-primary/60' : 'border-transparent',
                      disabled ? 'cursor-not-allowed opacity-50' : null,
                      reducedMotion ? null : 'transition-[background-color,border-color,box-shadow] duration-150',
                    )}
                  >
                    <span aria-hidden="true">{RISIKOKLASSE_LABELS[klasse]}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
