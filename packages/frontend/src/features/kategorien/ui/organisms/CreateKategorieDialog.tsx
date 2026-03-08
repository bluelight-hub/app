import { useCallback, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiTag } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useCreateKategorie } from '../../api';
import { kategorieSchema, type KategorieFormValues, KATEGORIE_FARB_PRESETS } from '@/features/kategorien';
import { FarbPresetPicker } from '@/features/kategorien';

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

interface CreateKategorieDialogProps {
  isOpen: boolean;
  onClose: () => void;
  einsatzId: string;
}

/**
 * Dialog zum Erstellen einer neuen Kategorie (Story 8.1).
 */
export function CreateKategorieDialog({ isOpen, onClose, einsatzId }: CreateKategorieDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const { mutate: createKategorie, isPending } = useCreateKategorie();

  const form = useForm({
    defaultValues: {
      name: '',
      farbe: KATEGORIE_FARB_PRESETS[5].hex,
    } as KategorieFormValues,
    validatorAdapter: zodValidator(),
    validators: {
      onChange: kategorieSchema,
    },
    onSubmit: async ({ value }) => {
      setApiErrorMessage(null);

      createKategorie(
        {
          einsatzId,
          data: {
            name: value.name,
            farbe: value.farbe,
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
            setApiErrorMessage(error instanceof Error ? error.message : 'Fehler beim Erstellen der Kategorie');
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
        <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
          <PiTag className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <Dialog.Title>Neue Kategorie erstellen</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="create-kategorie-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-5"
        >
          {/* Name */}
          <form.Field name="name">
            {(field) => (
              <div>
                <label htmlFor="kategorie-name" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="kategorie-name"
                  type="text"
                  placeholder="z.B. Einsatzleitung, Lage, Personal..."
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

          {/* Farbe */}
          <form.Field name="farbe">
            {(field) => (
              <div>
                <p id="kategorie-farbe-label" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Farbe <span className="text-red-500">*</span>
                </p>
                <FarbPresetPicker value={field.state.value} onChange={(farbe) => field.handleChange(farbe)} ariaLabelledBy="kategorie-farbe-label" />
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-sm dark:text-red-400">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* API Error */}
          {apiErrorMessage && <div className="rounded-lg bg-red-50 p-3 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">{apiErrorMessage}</div>}
        </form>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button type="submit" form="create-kategorie-form" intent="primary" loading={isPending} disabled={isPending} kbd="Enter">
          Kategorie erstellen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
