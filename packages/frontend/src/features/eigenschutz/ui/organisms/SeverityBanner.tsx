import { type ReactNode } from 'react';
import { cn } from '@/shared/ui';

export type SeverityBannerVariant = 'critical' | 'warning' | 'info';
export type SeverityBannerTone = 'assertive' | 'polite';

export interface SeverityBannerProps {
  variant: SeverityBannerVariant;
  tone?: SeverityBannerTone;
  /** ≤ 60 Zeichen — Story 2.7 AC1. */
  headline: string;
  /** ≤ 140 Zeichen Anriss; voller Inhalt kommt aus Detail-Refetch. */
  body?: string;
  /** Optionaler Footer (Timestamp, Quelle). */
  footer?: ReactNode;
  /** Primary-Action-Label, z. B. „Quittieren". */
  primaryActionLabel?: string;
  /** Wird beim Tap/Enter/Space auf Primary aufgerufen. */
  onPrimary?: () => void;
  /** Optionale Sekundär-Action (z. B. „Später" — Snooze). */
  secondaryActionLabel?: string;
  onSecondary?: () => void;
  /**
   * Optionale Tertiär-Action („Details ansehen") — Story 3.5 AC9. Rendert
   * als kompakter Inline-Button rechts neben Primary/Secondary, ≥ 44 × 44 px
   * Touch-Target. Wenn `tertiaryActionLabel === undefined`, ist das Layout
   * unverändert zu Story-3.4-Defaults (Defense-in-Depth für bestehende Tests).
   */
  tertiaryActionLabel?: string;
  onTertiary?: () => void;
  /** Optionale Inline-Fehlerzeile (Zero-Toast-Policy, Story 2.7 AC14). */
  inlineError?: string;
  /**
   * Optionaler Retry-Handler — wenn gesetzt UND `inlineError` ist gesetzt,
   * wird ein Retry-Button rechts neben dem Fehler gerendert.
   */
  onRetry?: () => void;
  /** Disabled-Pending-State während der Mutation läuft. */
  pending?: boolean;
  /** Optional: Test-Identifier. */
  'data-testid'?: string;
  /** Optional: Test-Identifier am Primary-Action-Button (Story 3.9 P11). */
  primaryActionTestId?: string;
}

/**
 * `SeverityBanner` — UX-Spec-Komponente (Story 2.7 AC1).
 *
 * **Varianten** mappen auf das Eskalations-Token:
 * - `critical` → rot, kritische Bekanntgabe (PSA, CBRN — kommt in Story 3.3+).
 * - `warning` → orange, Änderung einer aktiven Sicherheitsregel.
 * - `info` → blau, Erst-Bekanntgabe einer Regel.
 *
 * **Tone** steuert `aria-live`:
 * - `polite` (default) für Sicherheitsregeln (UX-Spec Zeile 219).
 * - `assertive` für PSA/CBRN.
 *
 * **A11y:** `role="status"` + `aria-live="polite"`/`"assertive"` macht den
 * Banner für Screenreader sichtbar, ohne die Fokus-Reihenfolge zu stören.
 *
 * **Touch-Target:** Primary-Action ist ≥ 48 × 48 px (`min-h-12 min-w-12`).
 * Retry-Button ist ≥ 44 × 44 px (Story 2.7 AC14).
 *
 * **Reduced-Motion:** Tailwind-`motion-safe`-Variante guards optionale
 * Animationen (Fade/Slide) — auf der Atom-Ebene rendern wir keine
 * Animationen, sondern überlassen sie dem Container.
 *
 * **Promotion-Kandidat:** Lebt feature-lokal, bis ein zweiter plattform-
 * weiter Use-Case (PSA, Vorfälle) eintritt — dann Migration nach
 * `shared/ui/`.
 */
export function SeverityBanner({
  variant,
  tone: toneProp,
  headline,
  body,
  footer,
  primaryActionLabel,
  onPrimary,
  secondaryActionLabel,
  onSecondary,
  tertiaryActionLabel,
  onTertiary,
  inlineError,
  onRetry,
  pending = false,
  'data-testid': dataTestId,
  primaryActionTestId,
}: SeverityBannerProps) {
  const toneClass: Record<SeverityBannerVariant, string> = {
    critical: 'border-severity-critical-assertive-border bg-severity-critical-assertive-surface text-severity-critical-assertive-text',
    warning: 'border-severity-warning-border bg-severity-warning-surface text-severity-warning-text',
    info: 'border-severity-info-border bg-severity-info-surface text-severity-info-text',
  };
  const tone = toneProp ?? (variant === 'critical' ? 'assertive' : 'polite');
  const actionFocusClass =
    variant === 'critical' && tone === 'assertive'
      ? 'focus-visible:shadow-focus-ring-critical focus-visible:outline-focus-ring-critical'
      : 'focus-visible:shadow-focus-ring focus-visible:outline-focus-ring';

  return (
    <section
      role="status"
      aria-live={tone}
      data-variant={variant}
      data-testid={dataTestId}
      className={cn('rounded-lg border-l-4 p-4 shadow-sm', toneClass[variant], 'transition-opacity motion-reduce:transition-none')}
    >
      <header className="flex items-start justify-between gap-4">
        <h3 className="text-base leading-tight font-semibold">{headline.length > 60 ? `${headline.slice(0, 57)}…` : headline}</h3>
      </header>
      {body !== undefined && body.length > 0 && <p className="mt-2 text-sm">{body.length > 140 ? `${body.slice(0, 137)}…` : body}</p>}
      {footer !== undefined && <footer className="mt-2 text-xs">{footer}</footer>}
      {(primaryActionLabel !== undefined || secondaryActionLabel !== undefined || tertiaryActionLabel !== undefined) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {primaryActionLabel !== undefined && (
            <button
              type="button"
              onClick={onPrimary}
              disabled={pending || onPrimary === undefined}
              data-testid={primaryActionTestId}
              className={cn(
                'inline-flex min-h-12 min-w-12 items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
                'bg-surface-inverse text-text-inverse hover:opacity-90',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                actionFocusClass,
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {pending ? 'Wird verarbeitet …' : primaryActionLabel}
            </button>
          )}
          {secondaryActionLabel !== undefined && (
            <button
              type="button"
              onClick={onSecondary}
              disabled={onSecondary === undefined}
              className={cn(
                'inline-flex min-h-12 min-w-12 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium',
                'border-current text-current hover:bg-current/10',
                'focus-visible:shadow-focus-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
              )}
            >
              {secondaryActionLabel}
            </button>
          )}
          {tertiaryActionLabel !== undefined && (
            <button
              type="button"
              onClick={onTertiary}
              disabled={onTertiary === undefined}
              data-testid="severity-banner-tertiary"
              className={cn(
                // Kompakter ghost-Stil: ≥ 44 × 44 px Touch-Target, aber
                // visuell schwächer als Primary/Secondary (UX-DR21 — der
                // Tertiary-Pfad ist ein Detail-View-Trigger, kein Mutator).
                'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium',
                'text-current hover:bg-current/10',
                'focus-visible:shadow-focus-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {tertiaryActionLabel}
            </button>
          )}
        </div>
      )}
      {inlineError !== undefined && inlineError.length > 0 && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text"
        >
          <span>{inlineError}</span>
          {onRetry !== undefined && (
            <button
              type="button"
              onClick={onRetry}
              className={cn(
                'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium',
                'border border-status-danger-border text-status-danger-text hover:bg-status-danger-surface/70',
                'focus-visible:shadow-focus-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
              )}
            >
              Erneut versuchen
            </button>
          )}
        </div>
      )}
    </section>
  );
}
