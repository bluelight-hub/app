import { cn } from '@/shared/ui/cn';
import type { IconType } from 'react-icons';
import { PiPlus } from 'react-icons/pi';

/**
 * Entry-Card für den „Neue Gefährdungsbeurteilung"-Drawer (Story 2.1, UX-DR13).
 *
 * Variante `seed` repräsentiert eine konkrete Seed-Vorlage (z. B. MANV) mit
 * Szenario-Titel, 1-Satz-Beschreibung, Icon und Gefährdungen-Zähler.
 * Variante `leer` repräsentiert die gleichwertige sechste Option „Leeres
 * Formular" — kein Default-Highlight, explizit in AC1 gefordert.
 *
 * Touch-Target bleibt ≥ 44×44 px (AC10 / UX-DR2). `selected` steuert nur
 * optische Hervorhebung; Tastatur-Navigation geht über den umgebenden
 * Radio-Group/Form-Context.
 */
export interface SeedTemplateEntryCardProps {
  readonly variant: 'seed' | 'leer';
  readonly title: string;
  readonly description: string;
  readonly icon?: IconType;
  readonly itemCount?: number;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  readonly 'data-testid'?: string;
}

export function SeedTemplateEntryCard({ variant, title, description, icon, itemCount, selected, onSelect, disabled = false, 'data-testid': testId }: SeedTemplateEntryCardProps) {
  const Icon = icon ?? (variant === 'leer' ? PiPlus : undefined);
  const showCounter = variant === 'seed' && typeof itemCount === 'number';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        'group relative flex min-h-[9.5rem] w-full cursor-pointer flex-col items-start gap-3 rounded-panel border bg-surface-panel p-4 text-left shadow-panel transition-[background-color,border-color,box-shadow] duration-150',
        'focus:outline-none focus-visible:shadow-focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-action-primary ring-2 ring-action-primary/40' : 'border-border-subtle hover:border-border-strong hover:bg-action-secondary',
      )}
    >
      <div className="flex w-full items-start justify-between gap-3">
        {Icon ? (
          <span
            aria-hidden="true"
            className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-control', selected ? 'bg-action-primary/10 text-action-primary' : 'bg-action-secondary text-text-secondary')}
          >
            <Icon className="h-6 w-6" />
          </span>
        ) : null}
        {showCounter ? (
          <span className="shrink-0 rounded-control bg-action-secondary px-2 py-1 text-xs font-medium text-text-secondary">
            {itemCount} {itemCount === 1 ? 'Gefährdung' : 'Gefährdungen'}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
    </button>
  );
}
