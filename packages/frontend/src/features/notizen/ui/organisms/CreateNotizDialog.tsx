import { useCallback, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiNotepad, PiUsersThree } from 'react-icons/pi';
import { Switch } from '@headlessui/react';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';
import { KategorieSelector } from '@/features/kategorien';

import { useCreateNotiz } from '../../api';
import { createNotizSchema, type CreateNotizFormValues } from '@/features/notizen';

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

interface CreateNotizDialogProps {
  isOpen: boolean;
  onClose: () => void;
  einsatzId: string;
}

/**
 * Dialog zum Erstellen einer neuen Notiz (Story 7.1).
 */
export function CreateNotizDialog({ isOpen, onClose, einsatzId }: CreateNotizDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const { mutate: createNotiz, isPending } = useCreateNotiz();

  const form = useForm({
    defaultValues: {
      titel: '',
      inhalt: undefined,
      kategorieId: null,
      istTeamsichtbar: false,
    } as CreateNotizFormValues,
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: createNotizSchema,
    },
    onSubmit: async ({ value }) => {
      setApiErrorMessage(null);

      createNotiz(
        {
          einsatzId,
          data: {
            titel: value.titel,
            inhalt: value.inhalt,
            kategorieId: value.kategorieId ?? undefined,
            istTeamsichtbar: value.istTeamsichtbar,
          },
        },
        {
          onSuccess: () => {
            setTimeout(() => {
              form.reset();
              onClose();
            }, 0);
          },
          onError: (error) => {
            setApiErrorMessage(error instanceof Error ? error.message : 'Fehler beim Erstellen der Notiz');
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
        <div className="rounded-full bg-surface-raised p-2">
          <PiNotepad className="h-5 w-5 text-text-secondary" />
        </div>
        <Dialog.Title>Neue Notiz erstellen</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="create-notiz-form"
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
                <label htmlFor="notiz-titel" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Titel <span className="text-status-danger-text">*</span>
                </label>
                <Input
                  id="notiz-titel"
                  type="text"
                  placeholder="z.B. Lageänderung, Rückmeldung..."
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

          {/* Inhalt */}
          <form.Field name="inhalt">
            {(field) => (
              <div>
                <label htmlFor="notiz-inhalt" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Inhalt <span className="text-xs text-text-muted">(optional)</span>
                </label>
                <textarea
                  id="notiz-inhalt"
                  placeholder="Zusätzliche Details zur Notiz..."
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || undefined)}
                  disabled={isPending}
                  maxLength={2000}
                  rows={4}
                  className={cn(
                    'block w-full rounded-control border bg-surface-panel px-4 py-2.5 font-medium text-text-primary transition-[background-color,border-color,color,box-shadow] duration-200',
                    'placeholder:text-text-muted focus:outline-none focus-visible:shadow-focus-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'resize-none',
                    field.state.meta.errors.length > 0
                      ? 'border-status-danger-border hover:border-status-danger-text focus:border-status-danger-text'
                      : 'border-border-subtle hover:border-border-strong focus:border-action-primary',
                  )}
                />
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-sm text-status-danger-text">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* Kategorie */}
          <form.Field name="kategorieId">
            {(field) => (
              <div>
                <KategorieSelector
                  einsatzId={einsatzId}
                  value={field.state.value}
                  onChange={(kategorieId) => field.handleChange(kategorieId)}
                  onBlur={field.handleBlur}
                  disabled={isPending}
                  label="Kategorie (optional)"
                />
              </div>
            )}
          </form.Field>

          {/* Team-sichtbar Toggle */}
          <form.Field name="istTeamsichtbar">
            {(field) => (
              <div className="flex items-center gap-3">
                <Switch
                  checked={field.state.value ?? false}
                  onChange={(checked) => field.handleChange(checked)}
                  disabled={isPending}
                  aria-label="Für das Team sichtbar"
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill transition-colors focus:outline-none focus-visible:shadow-focus-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    field.state.value ? 'bg-action-primary' : 'bg-surface-raised',
                  )}
                >
                  <span className={cn('inline-block h-4 w-4 transform rounded-full bg-surface-panel transition-transform', field.state.value ? 'translate-x-6' : 'translate-x-1')} />
                </Switch>
                <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <PiUsersThree className="h-4 w-4" />
                  Für das Team sichtbar
                </span>
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
        <Button type="submit" form="create-notiz-form" intent="primary" loading={isPending} disabled={isPending} kbd="Enter">
          Notiz erstellen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
