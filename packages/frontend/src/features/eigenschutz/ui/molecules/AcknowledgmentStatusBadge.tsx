/**
 * AcknowledgmentStatusBadge — PSA-Quittungsstand-Anzeige (Story 415-3-4, AC12).
 *
 * Rendert einen Badge mit Live-Counter (`{ack}/{total}`), Status-Icon und
 * status-abhängigem Severity-Token-Rahmen. Klick öffnet einen Headless-UI
 * `Popover` mit der Empfänger-Liste — eine Zeile pro Einheit mit Status-Pill
 * und (bei quittierten Einheiten) HH:mm-Zeit + quittierender User-Name.
 *
 * **States** (UX-Spec §Komponenten-Inventar):
 * - `pending`   → 0 von n quittiert            → Severity „warning"
 * - `partial`   → 1..n-1 von n quittiert       → Severity „warning"
 * - `complete`  → n von n quittiert            → Severity „success" (UX „ok")
 * - `overdue`   → mind. 1 Eintrag mit OVERDUE  → Severity „danger" (UX „critical"),
 *                 Forward-Compat-Branch für Story 3.7 (Re-Prompt-Eskalation).
 *
 * **Live-Counter:** Der Zähler trägt verpflichtend `tabular-nums`, damit
 * sich die Badge-Breite beim WS-Update nicht verschiebt (UX-Spec Z. 571 + 573).
 *
 * **A11y:**
 * - `aria-label` enthält Volltext („Quittungsstand: 3 von 5 empfangen,
 *   2 ausstehend"), kein Icon-only.
 * - Touch-Target ≥ 44 × 44 px (UX-Spec Z. 588).
 * - `Esc` und Tastatur-Navigation via Headless-UI-Default.
 *
 * **Daten-Quelle:** Wenn `initialData` gesetzt ist, wird es bevorzugt
 * verwendet (Storybook / Tests / Server-Side Rendering). Sonst wird der
 * Hook `useEigenschutzPsaQuittungen` aus `../api/queries` aufgerufen.
 */

import { cn } from '@/shared/ui/cn';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import type { ReactNode } from 'react';
import { useEigenschutzPsaQuittungen } from '@/features/eigenschutz/api/queries';
import { PiCheckCircleDuotone, PiCircleDashedDuotone, PiCircleHalfDuotone, PiWarningCircleDuotone } from 'react-icons/pi';

/**
 * DTO-konformer Eintrag pro Empfänger-Einheit. Spiegelt
 * `PsaQuittungEntryDto` aus dem generierten API-Client (Story 3.4 AC8).
 * `OVERDUE` ist Forward-Compat für Story 3.7 (Re-Prompt-Eskalation).
 */
export interface PsaQuittungEntry {
  readonly einheitId: string;
  readonly einheitName: string;
  readonly status: 'AUSSTEHEND' | 'QUITTIERT' | 'OVERDUE';
  readonly quittiertAm?: string;
  readonly quittiertVonUserId?: string;
  readonly quittiertVonUserName?: string;
  /** Story 3.6 AC8 — Empfänger hat eine Ausrüstungs-Lücke gemeldet. */
  readonly lueckeGemeldet?: boolean;
  /** Story 3.6 AC8 — Klartext der Lücken-Meldung. Nur gesetzt, wenn `lueckeGemeldet === true`. */
  readonly lueckeNotiz?: string;
}

export interface AcknowledgmentStatusBadgeProps {
  readonly einsatzId: string;
  readonly propagationGroupId: string;
  /**
   * Überschreibt den Hook-Aufruf — dient Storybook/Tests sowie SSR-Pfaden.
   * Wenn gesetzt, wird `useEigenschutzPsaQuittungen` nicht aufgerufen.
   */
  readonly initialData?: readonly PsaQuittungEntry[];
  readonly className?: string;
}

type DerivedStatus = 'pending' | 'partial' | 'complete' | 'overdue';

interface SeverityView {
  readonly badgeClassName: string;
  readonly icon: ReactNode;
}

/**
 * Leitet den Aggregat-Status aus den Empfänger-Einträgen ab.
 *
 * Reihenfolge bewusst: Ein einzelner OVERDUE-Eintrag dominiert immer —
 * danach erst die Quittierungs-Quote.
 */
export function deriveAcknowledgmentStatus(entries: readonly PsaQuittungEntry[]): DerivedStatus {
  if (entries.some((entry) => entry.status === 'OVERDUE')) return 'overdue';
  const total = entries.length;
  const ack = entries.filter((entry) => entry.status === 'QUITTIERT').length;
  // Defensiv: leere Liste sollte vom Backend nie kommen (Outbox-Lookup
  // liefert mindestens einen Eintrag), wir behandeln sie als „pending".
  if (total === 0) return 'pending';
  if (ack === 0) return 'pending';
  if (ack < total) return 'partial';
  return 'complete';
}

/**
 * Liefert die HH:mm-Komponente eines ISO-Zeitstempels (User-Locale-frei,
 * deterministisch). Bei ungültigem Input → Dash.
 */
function formatHoursMinutes(input: string | undefined): string {
  if (!input) return '—';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Wählt die Severity-Tokens + Icon passend zum abgeleiteten Status.
 *
 * Hinweis: Die UX-Spec referenziert Token-Namen `status-ok-*` und
 * `status-critical-*` — im Codebase-Token-System sind sie als
 * `status-success-*` (ok) und `status-danger-*` (critical) realisiert
 * (vgl. `index.tailwind.css`). Wir nutzen die existierenden Tokens.
 */
function selectSeverityView(status: DerivedStatus): SeverityView {
  switch (status) {
    case 'pending':
      return {
        badgeClassName: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
        icon: <PiCircleDashedDuotone className="h-4 w-4" aria-hidden="true" />,
      };
    case 'partial':
      return {
        badgeClassName: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
        icon: <PiCircleHalfDuotone className="h-4 w-4" aria-hidden="true" />,
      };
    case 'complete':
      return {
        badgeClassName: 'border-status-success-border bg-status-success-surface text-status-success-text',
        icon: <PiCheckCircleDuotone className="h-4 w-4" aria-hidden="true" />,
      };
    case 'overdue':
      return {
        badgeClassName: 'border-status-danger-border bg-status-danger-surface text-status-danger-text',
        icon: <PiWarningCircleDuotone className="h-4 w-4" aria-hidden="true" />,
      };
  }
}

export function AcknowledgmentStatusBadge({ einsatzId, propagationGroupId, initialData, className }: AcknowledgmentStatusBadgeProps) {
  // Wenn `initialData` gesetzt ist (Storybook/Tests/SSR), schalten wir den
  // Live-Hook stumm ab — sonst würden Tests, die das Badge isoliert
  // rendern, einen QueryClient-Provider brauchen.
  const liveResult = useEigenschutzPsaQuittungen(einsatzId, propagationGroupId, { enabled: initialData === undefined });
  const entries = initialData ?? (liveResult.data as readonly PsaQuittungEntry[] | undefined) ?? [];

  const status = deriveAcknowledgmentStatus(entries);
  const total = entries.length;
  const ackCount = entries.filter((entry) => entry.status === 'QUITTIERT').length;
  const pendingCount = entries.filter((entry) => entry.status !== 'QUITTIERT').length;
  const view = selectSeverityView(status);

  const ariaLabel = `Quittungsstand: ${ackCount} von ${total} empfangen, ${pendingCount} ausstehend`;

  return (
    <Popover className="relative inline-block">
      <PopoverButton
        as="button"
        type="button"
        data-testid="acknowledgment-status-badge"
        data-status={status}
        aria-label={ariaLabel}
        className={cn(
          // Touch-Target ≥ 44 × 44 px (UX-Spec Z. 588): min-h/min-w sichern den
          // Mindestabstand auch bei kompaktem Inhalt.
          'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-control border px-3 py-1.5',
          'text-body-sm font-medium',
          'focus:outline-none focus-visible:shadow-focus-ring',
          view.badgeClassName,
          className,
        )}
      >
        <span data-testid="acknowledgment-status-badge-icon" className="inline-flex shrink-0 items-center">
          {view.icon}
        </span>
        <span data-testid="acknowledgment-status-badge-counter" className="tabular-nums">
          {ackCount}/{total}
        </span>
      </PopoverButton>
      <PopoverPanel
        transition
        anchor={{ to: 'bottom end', gap: 4 }}
        className={cn(
          'z-30 w-80 rounded-panel border border-border-subtle bg-surface-panel shadow-panel',
          'ring-1 ring-border-subtle/50 focus:outline-none',
          'transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
        )}
        data-testid="acknowledgment-status-badge-panel"
      >
        <RecipientList entries={entries} />
      </PopoverPanel>
    </Popover>
  );
}

interface RecipientListProps {
  readonly entries: readonly PsaQuittungEntry[];
}

function RecipientList({ entries }: RecipientListProps) {
  if (entries.length === 0) {
    return (
      <div className="p-3 text-sm text-text-muted" data-testid="acknowledgment-status-badge-empty">
        Keine Empfänger
      </div>
    );
  }

  return (
    <ul role="list" aria-label="Empfänger-Liste" className="max-h-80 overflow-y-auto py-1" data-testid="acknowledgment-status-badge-list">
      {entries.map((entry) => {
        const isQuittiert = entry.status === 'QUITTIERT';
        return (
          <li
            key={entry.einheitId}
            data-testid={`acknowledgment-status-badge-row-${entry.einheitId}`}
            className="flex items-start justify-between gap-3 border-b border-border-subtle px-3 py-2 text-sm last:border-b-0"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium text-text-primary">{entry.einheitName}</span>
              {isQuittiert ? (
                <span className="text-xs text-text-muted">
                  <span className="tabular-nums">{formatHoursMinutes(entry.quittiertAm)}</span>
                  {entry.quittiertVonUserName ? <span> · {entry.quittiertVonUserName}</span> : null}
                </span>
              ) : null}
              {/* Story 3.6 AC13 — Lücke-Pill + Notiz unter dem Empfänger-Namen.
                  Severity warning (zu klärende Aufgabe, kein Notfall). */}
              {entry.lueckeGemeldet ? (
                <span data-testid={`acknowledgment-status-badge-luecke-${entry.einheitId}`} className="mt-1 inline-flex flex-col gap-1">
                  <span className="inline-flex w-fit items-center rounded-control border border-status-warning-border bg-status-warning-surface px-2 py-0.5 text-xs font-semibold text-status-warning-text">
                    Lücke gemeldet
                  </span>
                  {entry.lueckeNotiz ? (
                    <span className="text-xs whitespace-pre-line text-text-muted" data-testid={`acknowledgment-status-badge-luecke-notiz-${entry.einheitId}`}>
                      {entry.lueckeNotiz}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
            <StatusPill status={entry.status} />
          </li>
        );
      })}
    </ul>
  );
}

interface StatusPillProps {
  readonly status: PsaQuittungEntry['status'];
}

function StatusPill({ status }: StatusPillProps) {
  if (status === 'QUITTIERT') {
    return (
      <span className="inline-flex items-center rounded-control border border-status-success-border bg-status-success-surface px-2 py-0.5 text-xs font-semibold text-status-success-text">
        quittiert
      </span>
    );
  }
  if (status === 'OVERDUE') {
    return (
      <span className="inline-flex items-center rounded-control border border-status-danger-border bg-status-danger-surface px-2 py-0.5 text-xs font-semibold text-status-danger-text">überfällig</span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-control border border-status-warning-border bg-status-warning-surface px-2 py-0.5 text-xs font-semibold text-status-warning-text">
      ausstehend
    </span>
  );
}
