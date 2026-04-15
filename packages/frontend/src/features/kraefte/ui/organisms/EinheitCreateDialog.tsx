/**
 * Dialog zum Erstellen einer neuen taktischen Einheit.
 *
 * Nutzt @tanstack/react-form mit zodValidator für Formular-Validierung.
 * Folgt exakt das BesetzeRolleDialog-Pattern (Form + Dialog compound component).
 */

import { useCallback, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiPlus } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useCreateEinheit } from '@/features/kraefte/api/use-create-einheit';
import { createEinheitSchema, EINHEIT_TYP_OPTIONS } from '@/features/kraefte/schemas/einheit.schema';

import type { z } from 'zod';

type CreateEinheitFormData = z.infer<typeof createEinheitSchema>;

interface EinheitCreateDialogProps {
  /** Ob der Dialog geöffnet ist */
  isOpen: boolean;
  /** Handler zum Schließen */
  onClose: () => void;
  /** Einsatz-ID */
  einsatzId: string;
  /** Optionale Eltern-Einheit-ID (für "Kind hinzufügen") */
  parentId?: string;
}

/**
 * Extrahiert benutzerfreundliche Fehlermeldung aus API-Fehler.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('already') || message.includes('bereits')) {
      return 'Eine Einheit mit diesem Namen existiert bereits';
    }
    if (message.includes('not_found') || message.includes('nicht gefunden')) {
      return 'Übergeordnete Einheit nicht gefunden';
    }
  }
  return 'Fehler beim Erstellen der Einheit';
}

/**
 * Dialog-Formular zum Anlegen einer taktischen Einheit.
 *
 * Felder: Name, Typ, Funktion (optional), Soll-Stärke, Auftrag (optional), Einsatzort (optional).
 * Die parentId wird als verstecktes Feld übergeben wenn "Kind hinzufügen" gewählt wurde.
 */
export function EinheitCreateDialog({ isOpen, onClose, einsatzId, parentId }: EinheitCreateDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const { mutate: createEinheit, isPending } = useCreateEinheit(einsatzId);

  const form = useForm<CreateEinheitFormData>({
    defaultValues: {
      name: '',
      typ: 'GRUPPE',
      funktion: '',
      sollStaerke: 9,
      auftrag: '',
      einsatzort: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createEinheitSchema,
    },
    onSubmit: async ({ value }) => {
      setApiErrorMessage(null);
      createEinheit(
        {
          name: value.name.trim(),
          typ: value.typ,
          funktion: value.funktion?.trim() || undefined,
          sollStaerke: value.sollStaerke,
          auftrag: value.auftrag?.trim() || undefined,
          einsatzort: value.einsatzort?.trim() || undefined,
          parentId: parentId || undefined,
        },
        {
          onSuccess: () => {
            form.reset();
            onClose();
          },
          onError: (error) => {
            setApiErrorMessage(getErrorMessage(error));
          },
        },
      );
    },
  });

  const handleClose = useCallback(() => {
    if (!isPending) {
      setApiErrorMessage(null);
      form.reset();
      onClose();
    }
  }, [isPending, form, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-info-surface p-2">
          <PiPlus className="h-5 w-5 text-status-info-text" />
        </div>
        <Dialog.Title>{parentId ? 'Untereinheit erstellen' : 'Neue Einheit erstellen'}</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="create-einheit-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Name */}
          <form.Field name="name">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="einheit-name" className="block text-sm font-medium text-text-secondary">
                  Name *
                </label>
                <Input
                  id="einheit-name"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isPending}
                  placeholder="z.B. 1. Sanitätsgruppe"
                  fullWidth
                  variant={field.state.meta.errors?.length ? 'error' : 'default'}
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-status-danger-text">
                    {field.state.meta.errors.flatMap((e) => (typeof e === 'string' ? e : e && typeof e === 'object' && 'message' in e ? String(e.message) : [])).join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Typ */}
          <form.Field name="typ">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="einheit-typ" className="block text-sm font-medium text-text-secondary">
                  Typ *
                </label>
                <select
                  id="einheit-typ"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isPending}
                  className="w-full rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-primary focus:border-action-primary focus:ring-1 focus:ring-action-primary focus:outline-none disabled:opacity-50"
                >
                  {EINHEIT_TYP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>

          {/* Funktion (optional) */}
          <form.Field name="funktion">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="einheit-funktion" className="block text-sm font-medium text-text-secondary">
                  Funktion
                </label>
                <Input
                  id="einheit-funktion"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isPending}
                  placeholder="z.B. Sanitätsdienst, Betreuung"
                  fullWidth
                />
              </div>
            )}
          </form.Field>

          {/* Soll-Stärke */}
          <form.Field name="sollStaerke">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="einheit-sollstaerke" className="block text-sm font-medium text-text-secondary">
                  Soll-Stärke *
                </label>
                <Input
                  id="einheit-sollstaerke"
                  type="number"
                  min={1}
                  max={999}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number.parseInt(e.target.value, 10) || 1)}
                  onBlur={field.handleBlur}
                  disabled={isPending}
                  fullWidth
                  variant={field.state.meta.errors?.length ? 'error' : 'default'}
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-status-danger-text">
                    {field.state.meta.errors.flatMap((e) => (typeof e === 'string' ? e : e && typeof e === 'object' && 'message' in e ? String(e.message) : [])).join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Auftrag (optional) */}
          <form.Field name="auftrag">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="einheit-auftrag" className="block text-sm font-medium text-text-secondary">
                  Auftrag
                </label>
                <Textarea
                  id="einheit-auftrag"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isPending}
                  placeholder="Auftrag der Einheit..."
                  rows={2}
                  fullWidth
                />
              </div>
            )}
          </form.Field>

          {/* Einsatzort (optional) */}
          <form.Field name="einsatzort">
            {(field) => (
              <div className="space-y-1">
                <label htmlFor="einheit-einsatzort" className="block text-sm font-medium text-text-secondary">
                  Einsatzort
                </label>
                <Input
                  id="einheit-einsatzort"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isPending}
                  placeholder="z.B. Abschnitt Nord"
                  fullWidth
                />
              </div>
            )}
          </form.Field>

          {/* API Error Message */}
          {apiErrorMessage && <div className="rounded-panel bg-status-danger-surface p-3 text-sm text-status-danger-text">{apiErrorMessage}</div>}
        </form>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button type="submit" form="create-einheit-form" intent="primary" loading={isPending} disabled={isPending}>
          Erstellen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
