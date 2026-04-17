import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useEffect, useRef } from 'react';
import { PiTrash, PiX } from 'react-icons/pi';
import { z } from 'zod';
import { cn } from '@/shared/ui/cn';
import {
  GEFAHRENTYPEN,
  GEFAHRENTYP_LABELS,
  SCHUTZOBJEKTE,
  WARNSTUFEN,
  WARNSTUFE_LABELS,
  type GefahrentypValue,
  type SchutzobjektValue,
  type WarnstufeValue,
} from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';
import { GefahrentypPicker } from '../atoms/GefahrentypPicker';

/**
 * Zustand des Popovers — entscheidet, ob Gefahrentyp / Schutzobjekt editierbar sind.
 * - `create`: Neu-Zone nach Draw. Typ, Schutzobjekt, Warnstufe wählbar.
 * - `edit`: Klick auf bestehende Zone. Typ + Schutzobjekt read-only (Zone-Identität);
 *   nur Warnstufe wird aktualisiert — Submit geht an Matrix-Endpoint (Caller-Pflicht).
 */
export type GefahrenzonePopoverMode = 'create' | 'edit';

const formSchema = z.object({
  gefahrentyp: z.enum(GEFAHRENTYPEN),
  schutzobjekt: z.enum(SCHUTZOBJEKTE),
  warnstufe: z.enum(WARNSTUFEN),
  bezeichnung: z.string().max(200).optional(),
});

export type GefahrenzonePopoverValues = z.infer<typeof formSchema>;

export interface GefahrenzoneInlinePopoverProps {
  mode: GefahrenzonePopoverMode;
  initialValues: GefahrenzonePopoverValues;
  /** Submit-Handler; Caller entscheidet, welcher Mutation-Hook aufgerufen wird. */
  onSubmit: (values: GefahrenzonePopoverValues) => Promise<void> | void;
  /** Cancel — in Create-Mode entfernt der Caller das Draw-Feature, in Edit-Mode schließt er nur. */
  onCancel: () => void;
  /** Optional: Delete-Handler (nur Edit-Mode sinnvoll). */
  onDelete?: () => Promise<void> | void;
  /** Positions-Anchor: Bildschirm-Koordinate, an der der Popover erscheint (optional; wenn `null`: zentriert). */
  anchor?: { x: number; y: number } | null;
  isSubmitting?: boolean;
  /** Optional: ID für `aria-labelledby`-Reference. */
  id?: string;
}

/**
 * Inline-Popover für Zone-Erstellung und Warnstufen-Update.
 *
 * Keyboard: Esc → Cancel, Enter auf einem Input oder im Form-Bereich → Submit
 * (Combobox fängt Enter zum Auswählen ab; erst Submit-Button oder zweites Enter
 * schließt die Aktion ab — das entspricht Headless-UI-Standardverhalten).
 */
export function GefahrenzoneInlinePopover({ mode, initialValues, onSubmit, onCancel, onDelete, anchor, isSubmitting, id }: GefahrenzoneInlinePopoverProps) {
  const headerId = `${id ?? 'gefahrenzone-popover'}-header`;
  const liveRegionRef = useRef<HTMLSpanElement | null>(null);

  const form = useForm({
    defaultValues: initialValues as GefahrenzonePopoverValues,
    validatorAdapter: zodValidator(),
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = mode === 'create' ? 'Zone erstellt' : 'Warnstufe aktualisiert';
      }
    },
  });

  // Esc schließt den Popover.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const positionStyle = anchor ? { left: anchor.x, top: anchor.y } : undefined;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={headerId}
      className={cn(
        'pointer-events-auto absolute z-20 w-[320px] rounded-panel border border-border-subtle bg-surface-panel p-panel shadow-panel',
        !anchor && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      )}
      style={positionStyle}
      data-gefahrenzone-popover
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 id={headerId} className="text-title-sm font-semibold text-text-primary">
          {mode === 'create' ? 'Neue Gefahrenzone' : 'Zone bearbeiten'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-control p-1 text-text-muted hover:bg-surface-raised hover:text-text-primary focus:shadow-focus focus:outline-none"
          aria-label="Popover schließen"
        >
          <PiX className="size-4" aria-hidden />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-3"
      >
        <form.Field
          name="gefahrentyp"
          children={(field) => (
            <div>
              <label htmlFor={`${id}-gefahrentyp`} className="mb-1 block text-body-xs font-medium text-text-secondary">
                Gefahrentyp
              </label>
              {mode === 'edit' ? (
                <div className="rounded-control border border-border-subtle bg-surface-raised px-3 py-1.5 text-body-sm text-text-primary">
                  {GEFAHRENTYP_LABELS[field.state.value as GefahrentypValue]}
                </div>
              ) : (
                <GefahrentypPicker value={field.state.value as GefahrentypValue} onChange={(v) => field.handleChange(v)} aria-label="Gefahrentyp" />
              )}
            </div>
          )}
        />

        <form.Field
          name="warnstufe"
          children={(field) => (
            <fieldset>
              <legend className="mb-1 text-body-xs font-medium text-text-secondary">Warnstufe</legend>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Warnstufe wählen">
                {WARNSTUFEN.map((stufe) => {
                  const selected = field.state.value === stufe;
                  return (
                    <button
                      key={stufe}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => field.handleChange(stufe as WarnstufeValue)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-body-xs font-medium transition-colors',
                        'focus:shadow-focus focus:outline-none',
                        selected ? 'border-action-primary bg-action-primary text-text-inverse' : 'border-border-subtle bg-surface-panel text-text-secondary hover:bg-surface-raised',
                      )}
                    >
                      {WARNSTUFE_LABELS[stufe]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        />

        {mode === 'create' && (
          <form.Field
            name="schutzobjekt"
            children={(field) => (
              <div>
                <label htmlFor={`${id}-schutzobjekt`} className="mb-1 block text-body-xs font-medium text-text-secondary">
                  Schutzobjekt
                </label>
                <select
                  id={`${id}-schutzobjekt`}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value as SchutzobjektValue)}
                  className="w-full rounded-control border border-border-subtle bg-surface-panel px-3 py-1.5 text-body-sm text-text-primary focus:shadow-focus focus:outline-none"
                >
                  {SCHUTZOBJEKTE.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          />
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          {mode === 'edit' && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete()}
              className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-body-sm text-status-danger-text hover:bg-status-danger-surface focus:shadow-focus focus:outline-none"
              aria-label="Zone löschen"
            >
              <PiTrash className="size-4" aria-hidden />
              Löschen
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} className="rounded-control px-3 py-1 text-body-sm text-text-secondary hover:bg-surface-raised focus:shadow-focus focus:outline-none">
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-control bg-action-primary px-3 py-1 text-body-sm font-medium text-text-inverse shadow-button-primary hover:bg-action-primary-hover focus:shadow-focus focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === 'create' ? 'Zone anlegen' : 'Speichern'}
            </button>
          </div>
        </div>
      </form>

      <span ref={liveRegionRef} aria-live="polite" role="status" className="sr-only" />
    </div>
  );
}
