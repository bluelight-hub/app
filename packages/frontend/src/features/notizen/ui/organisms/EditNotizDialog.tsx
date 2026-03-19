import { useCallback, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiNotepad, PiUsersThree } from 'react-icons/pi';
import { Switch } from '@headlessui/react';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';
import { KategorieSelector } from '@/features/kategorien';

import { useUpdateNotiz } from '../../api';
import { updateNotizSchema, type UpdateNotizFormValues } from '@/features/notizen';

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

interface EditNotizDialogProps {
  isOpen: boolean;
  onClose: () => void;
  einsatzId: string;
  notiz: {
    id: string;
    titel: string;
    inhalt: string | null;
    kategorieId?: string | null;
    istTeamsichtbar?: boolean;
  };
}

/**
 * Dialog zum Bearbeiten einer Notiz (Story 7.3).
 *
 * Nutzt useEffect fuer Form-Reset bei isOpen/notiz.id Aenderung
 * und setTimeout fuer Race-Condition bei onClose.
 */
export function EditNotizDialog({ isOpen, onClose, einsatzId, notiz }: EditNotizDialogProps) {
  const { mutate: updateNotiz, isPending } = useUpdateNotiz();

  const form = useForm({
    defaultValues: {
      titel: notiz.titel,
      inhalt: notiz.inhalt ?? undefined,
      kategorieId: notiz.kategorieId ?? null,
      istTeamsichtbar: notiz.istTeamsichtbar ?? false,
    } as UpdateNotizFormValues,
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: updateNotizSchema,
    },
    onSubmit: async ({ value }) => {
      updateNotiz(
        {
          einsatzId,
          notizId: notiz.id,
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
        },
      );
    },
  });

  // Reset form when notiz changes (react to open state and notiz identity)
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally only reacting to isOpen and notiz.id to avoid infinite loops from form/notiz object references
  useEffect(() => {
    if (isOpen) {
      form.reset();
      form.setFieldValue('titel', notiz.titel);
      form.setFieldValue('inhalt', notiz.inhalt ?? undefined);
      form.setFieldValue('kategorieId', notiz.kategorieId ?? null);
      form.setFieldValue('istTeamsichtbar', notiz.istTeamsichtbar ?? false);
    }
  }, [isOpen, notiz.id]);

  const handleClose = useCallback(() => {
    if (!isPending) {
      form.reset();
      onClose();
    }
  }, [isPending, form, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
          <PiNotepad className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <Dialog.Title>Notiz bearbeiten</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="edit-notiz-form"
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
                <label htmlFor="edit-notiz-titel" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Titel <span className="text-red-500">*</span>
                </label>
                <Input
                  id="edit-notiz-titel"
                  type="text"
                  placeholder="z.B. Lageaenderung, Rueckmeldung..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={isPending}
                  variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                  maxLength={100}
                  autoFocus
                />
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-sm dark:text-red-400">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* Inhalt */}
          <form.Field name="inhalt">
            {(field) => (
              <div>
                <label htmlFor="edit-notiz-inhalt" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Inhalt <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <textarea
                  id="edit-notiz-inhalt"
                  placeholder="Zusaetzliche Details zur Notiz..."
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || undefined)}
                  disabled={isPending}
                  maxLength={2000}
                  rows={4}
                  className={cn(
                    'block w-full rounded-lg border bg-white px-4 py-2.5 font-medium text-gray-900 transition-colors duration-200',
                    'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-20',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500',
                    'resize-none',
                    field.state.meta.errors.length > 0
                      ? 'border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-red-500 dark:border-red-400'
                      : 'border-gray-300 hover:border-gray-400 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700',
                  )}
                />
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-sm dark:text-red-400">{formatErrors(field.state.meta.errors)}</p>}
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
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    field.state.value ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700',
                  )}
                >
                  <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', field.state.value ? 'translate-x-6' : 'translate-x-1')} />
                </Switch>
                <span className="flex items-center gap-1.5 text-slate-700 text-sm dark:text-slate-300">
                  <PiUsersThree className="h-4 w-4" />
                  Für das Team sichtbar
                </span>
              </div>
            )}
          </form.Field>
        </form>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button type="submit" form="edit-notiz-form" intent="primary" loading={isPending} disabled={isPending} kbd="Enter">
          Speichern
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
