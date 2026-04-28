import type { KeyboardEvent } from 'react';
import { cn } from '@/shared/ui/cn';
import { PSA_PROFIL_META } from '../../constants/psa-profil.constants';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';

/**
 * Toggle-Chip für ein PSA-Profil (Story 3.1, UX-Spec PSA-Profil).
 *
 * - **Touch-Target ≥ 48×48 px** (UX-DR2).
 * - **A11y:** `role="checkbox"`, `aria-checked`, `Space`/`Enter` toggelt.
 * - **Visuelle Differenzierung:** Phosphor-Duotone-Icon + Profil-spezifische
 *   Farbtokens (BASIS = neutral, INFEKTION = amber, VU = orange,
 *   CBRN_PATIENT = red, VOLLSCHUTZ = rose).
 * - **Diff-Vorschau:** `optimisticActive` (vom MultiSelect gesteuert) zeigt
 *   den nächsten Toggle-Zustand vor dem Commit; `pendingChange` rendert
 *   einen subtilen Border-Akzent für „wird geändert".
 */
export interface PSAProfileChipProps {
  readonly profil: PsaProfilValue;
  readonly active: boolean;
  readonly optimisticActive?: boolean;
  readonly pendingChange?: boolean;
  readonly onToggle: () => void;
  readonly disabled?: boolean;
  readonly 'data-testid'?: string;
  /**
   * Story 3.2 (AC3): Im Multi-Select-Modus kann ein Profil auf einem Teil
   * der Einheiten aktiv und auf anderen inaktiv sein. Der Chip rendert
   * dann einen indeterminate-Stil mit `aria-checked="mixed"` und einem
   * Badge „N von M aktiv". `mixedBadge` setzt den Badge-Text; `mixed=true`
   * setzt das ARIA-Attribut + den Visualstil.
   */
  readonly mixed?: boolean;
  readonly mixedBadge?: string;
}

export function PSAProfileChip({ profil, active, optimisticActive, pendingChange = false, onToggle, disabled = false, 'data-testid': testId, mixed = false, mixedBadge }: PSAProfileChipProps) {
  const meta = PSA_PROFIL_META[profil];
  const Icon = meta.icon;
  const effectiveActive = optimisticActive ?? active;

  function handleKey(event: KeyboardEvent<HTMLButtonElement>): void {
    if (disabled) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onToggle();
    }
  }

  // ARIA-Triple-State: `aria-checked="mixed"` ist der WAI-ARIA-1.2-Pattern für
  // Tri-State-Toggles; Screenreader sprechen es als „teilweise aktiviert".
  const ariaChecked: boolean | 'mixed' = mixed ? 'mixed' : effectiveActive;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={ariaChecked}
      aria-label={`PSA-Profil ${meta.label}${mixed && mixedBadge ? ` (${mixedBadge})` : ''}`}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onToggle}
      onKeyDown={handleKey}
      data-testid={testId ?? `psa-chip-${profil.toLowerCase()}`}
      data-pending={pendingChange || undefined}
      data-mixed={mixed || undefined}
      className={cn(
        'group inline-flex min-h-[48px] min-w-[48px] cursor-pointer items-center gap-2 rounded-control border-2 px-3 py-2 text-sm font-medium transition-[background-color,border-color,box-shadow] duration-150',
        'focus:outline-none focus-visible:shadow-focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        effectiveActive ? meta.chipColorActiveClass : meta.chipColorClass,
        pendingChange && !disabled ? 'ring-2 ring-action-primary/40' : null,
        mixed && !disabled ? 'border-dashed bg-status-info-surface text-status-info-text' : null,
      )}
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span>{meta.label}</span>
      {mixed && mixedBadge ? <span className="rounded-full border border-current px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">{mixedBadge}</span> : null}
    </button>
  );
}
