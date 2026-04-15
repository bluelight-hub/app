import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiPencilSimple } from 'react-icons/pi';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useUpdateVorlage } from '../../api';
import { createVorlageSchema, type CreateVorlageFormData } from '../../schemas/vorlage.schema';

/**
 * Extrahiert Fehlermeldungen aus TanStack Form Errors.
 */
function formatErrors(errors: unknown[]): string {
  return errors
    .map((e) => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message;
      return String(e);
    })
    .join(', ');
}

interface EditVorlageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vorlage: {
    id: string;
    titel: string;
    minuten: number;
    beschreibung: string | null;
  } | null;
}

/**
 * Dialog zum Bearbeiten einer Erinnerungsvorlage (Story 6.2 AC1).
 */
export function EditVorlageDialog({ isOpen, onClose, vorlage }: EditVorlageDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const { mutate: updateVorlage, isPending } = useUpdateVorlage();
  const lastLoadedIdRef = useRef<string | null>(null);

  const form = useForm({
    defaultValues: {
      titel: vorlage?.titel ?? '',
      minuten: vorlage?.minuten ?? 30,
      beschreibung: vorlage?.beschreibung ?? undefined,
    } as CreateVorlageFormData,
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: createVorlageSchema,
    },
    onSubmit: async ({ value }) => {
      if (!vorlage) return;
      setApiErrorMessage(null);

      updateVorlage(
        {
          id: vorlage.id,
          data: {
            titel: value.titel.trim(),
            minuten: value.minuten,
            beschreibung: value.beschreibung?.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success('Vorlage aktualisiert');
            setTimeout(() => {
              form.reset();
              onClose();
            }, 0);
          },
          onError: (error) => {
            setApiErrorMessage(error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Vorlage');
          },
        },
      );
    },
  });

  // Pre-populate form when vorlage changes
  // Reset form nur wenn eine neue Vorlage geladen wird (ID-Wechsel)
  //
  // `form` ist eine instabile Referenz (aendert sich bei jedem Render).
  // Stattdessen: form.reset direkt im useEffect aufrufen, lastLoadedIdRef verhindert unnoetige Resets.
  // eslint-disable-next-line react/exhaustive-deps -- form.reset ist stabil, lastLoadedIdRef verhindert Race Conditions
  useEffect(() => {
    if (vorlage && isOpen && lastLoadedIdRef.current !== vorlage.id) {
      lastLoadedIdRef.current = vorlage.id;
      form.reset({
        titel: vorlage.titel,
        minuten: vorlage.minuten,
        beschreibung: vorlage.beschreibung ?? undefined,
      } as CreateVorlageFormData);
    }
  }, [vorlage, isOpen]);

  // eslint-disable-next-line react/exhaustive-deps -- form.reset ist stabil (interne TanStack Form Implementierung)
  const handleClose = useCallback(() => {
    if (!isPending) {
      setApiErrorMessage(null);
      form.reset();
      lastLoadedIdRef.current = null;
      onClose();
    }
  }, [isPending, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-warning-surface p-2">
          <PiPencilSimple className="h-5 w-5 text-status-warning-text" />
        </div>
        <Dialog.Title>Vorlage bearbeiten</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="edit-vorlage-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Titel */}
          <form.Field name="titel">
            {(field) => (
              <div>
                <label htmlFor="edit-vorlage-titel" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Titel <span className="text-status-danger-text">*</span>
                </label>
                <Input
                  id="edit-vorlage-titel"
                  type="text"
                  placeholder="z.B. Lagebesprechung, Funkrunde..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={isPending}
                  variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                  maxLength={100}
                  autoFocus
                />
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-sm text-status-danger-text">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* Minuten */}
          <form.Field name="minuten">
            {(field) => (
              <div>
                <label htmlFor="edit-vorlage-minuten" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Minuten <span className="text-status-danger-text">*</span>
                </label>
                <Input
                  id="edit-vorlage-minuten"
                  type="number"
                  placeholder="z.B. 30"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  disabled={isPending}
                  variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                  min={1}
                />
                <p className="mt-1 text-xs text-text-muted">Relative Zeitdauer in Minuten</p>
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-sm text-status-danger-text">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* Beschreibung */}
          <form.Field name="beschreibung">
            {(field) => (
              <div>
                <label htmlFor="edit-vorlage-beschreibung" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Beschreibung <span className="text-xs text-text-muted">(optional)</span>
                </label>
                <Textarea
                  id="edit-vorlage-beschreibung"
                  placeholder="Zusätzliche Details zur Vorlage..."
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || undefined)}
                  disabled={isPending}
                  variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                  maxLength={500}
                  rows={3}
                  fullWidth
                />
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-sm text-status-danger-text">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* API Error */}
          {apiErrorMessage && <div className="rounded-panel bg-status-danger-surface p-3 text-sm text-status-danger-text">{apiErrorMessage}</div>}
        </form>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button type="submit" form="edit-vorlage-form" intent="primary" loading={isPending} disabled={isPending} kbd="Enter">
          Speichern
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
