import { useCallback, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiAlarm } from 'react-icons/pi';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useCreateVorlage } from '../../api';
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

interface CreateVorlageDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dialog zum Erstellen einer neuen Erinnerungsvorlage (Story 6.1 AC1).
 */
export function CreateVorlageDialog({ isOpen, onClose }: CreateVorlageDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const { mutate: createVorlage, isPending } = useCreateVorlage();

  const form = useForm({
    defaultValues: {
      titel: '',
      minuten: 30,
      beschreibung: undefined,
    } as CreateVorlageFormData,
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: createVorlageSchema,
    },
    onSubmit: async ({ value }) => {
      setApiErrorMessage(null);

      createVorlage(
        {
          data: {
            titel: value.titel.trim(),
            minuten: value.minuten,
            beschreibung: value.beschreibung?.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success('Vorlage erstellt');
            setTimeout(() => {
              form.reset();
              onClose();
            }, 0);
          },
          onError: (error) => {
            setApiErrorMessage(error instanceof Error ? error.message : 'Fehler beim Erstellen der Vorlage');
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
    <Dialog isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-warning-surface p-2">
          <PiAlarm className="h-5 w-5 text-status-warning-text" />
        </div>
        <Dialog.Title>Neue Vorlage erstellen</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="create-vorlage-form"
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
                <label htmlFor="vorlage-titel" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Titel <span className="text-status-danger-text">*</span>
                </label>
                <Input
                  id="vorlage-titel"
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
                <label htmlFor="vorlage-minuten" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Minuten <span className="text-status-danger-text">*</span>
                </label>
                <Input
                  id="vorlage-minuten"
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
                <label htmlFor="vorlage-beschreibung" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Beschreibung <span className="text-xs text-text-muted">(optional)</span>
                </label>
                <Textarea
                  id="vorlage-beschreibung"
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
        <Button type="submit" form="create-vorlage-form" intent="primary" loading={isPending} disabled={isPending} kbd="Enter">
          Vorlage erstellen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
