/**
 * VersionTimestampFooter — Mikro-Footer unter dem Editor-Organism
 * (Story 415-2-4, Task 9, AC11).
 *
 * Rendert einen dezenten „Stand {HH:mm} · {UserId-Kurzform}"-Button mit
 * Mini-Chip „V{version}". Der Button ist Popover-Trigger: er dokumentiert
 * per ARIA (`aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`),
 * dass ein Historie-Popover angeboten wird, aber rendert das Popover NICHT
 * selbst — das übernimmt der Parent-Organism (`GefaehrdungsbeurteilungHistoriePopover`).
 *
 * **Scope-Entscheidung (AC11 / Dev Notes „Scope-Entscheidung: Footer-
 * Namens-Resolution"):** Der Footer zeigt **immer** nur die UserId-
 * Kurzform via `aktualisiertVonUserId.slice(-8)`, niemals einen
 * aufgelösten Namen. Grund: das Main-DTO `GefaehrdungsbeurteilungDto`
 * trägt keinen `aktualisiertVonUserName`; eine zusätzliche Namens-
 * Resolution würde Story-2.4-Scope auf die Main-Query ausdehnen. Die
 * vollen Namen leben im Historie-Popover (Backend-seitig aufgelöst via
 * `IUserRepository`) — das ist die primäre Attributions-Ansicht.
 *
 * **Touch-Target:** Mindestens 44 × 44 px via `min-h-[44px] min-w-[44px]`
 * (UX-DR28, Footer gilt als Secondary-Control, daher nicht das 48 px
 * Primary-Minimum).
 */

import { cn } from '@/shared/ui/cn';

export interface VersionTimestampFooterProps {
  readonly aktualisiertAm: string | Date;
  readonly aktualisiertVonUserId: string;
  readonly version: number;
  readonly onOpen?: () => void;
  readonly isOpen?: boolean;
  readonly popoverId: string;
}

/**
 * Formatiert einen ISO-Zeitstempel (oder `Date`) als lokale „HH:mm"-Zeit
 * in deutscher Schreibweise. Ungültige Eingaben führen zu einem
 * Fallback-Dash, damit das UI nicht leer bleibt.
 */
function formatLocalTime(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date);
}

/**
 * Liefert die Kurzform einer UserId (letzte 8 Zeichen). Bei kürzeren
 * IDs wird der volle Wert zurückgegeben.
 */
function formatUserIdShort(userId: string): string {
  return userId.length <= 8 ? userId : userId.slice(-8);
}

export function VersionTimestampFooter({ aktualisiertAm, aktualisiertVonUserId, version, onOpen, isOpen = false, popoverId }: VersionTimestampFooterProps) {
  const timeLabel = formatLocalTime(aktualisiertAm);
  const userShort = formatUserIdShort(aktualisiertVonUserId);

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={popoverId}
      onClick={onOpen}
      data-testid="version-timestamp-footer"
      className={cn(
        'flex min-h-[44px] w-full min-w-[44px] items-center justify-between gap-3 border-t border-border-subtle bg-surface-panel px-4 py-2 text-left text-xs text-text-muted',
        'transition-colors duration-150',
        'hover:bg-action-secondary focus:outline-none focus-visible:shadow-focus-ring',
      )}
    >
      <span>
        Stand <span className="font-medium text-text-secondary">{timeLabel}</span> · <span className="font-mono text-text-secondary">{userShort}</span>
      </span>
      <span className="inline-flex shrink-0 items-center rounded-control bg-action-secondary px-2 py-0.5 text-xs font-semibold text-text-secondary">V{version}</span>
    </button>
  );
}
