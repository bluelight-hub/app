import { useCallback, useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiMetronome, PiPlus, PiTrash } from 'react-icons/pi';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';

import { useUpdateGlobalFuehrungsrhythmusTemplate, useUpdateEinsatzFuehrungsrhythmusTemplate } from '../../api';
import { updateFuehrungsrhythmusTemplateSchema, type UpdateFuehrungsrhythmusTemplateFormData } from '../../schemas/fuehrungsrhythmus-template.schema';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';

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

/** Preset-Intervalle in Minuten */
const INTERVALL_PRESETS = [15, 30, 45, 60] as const;

interface EditFuehrungsrhythmusTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: {
    id: string;
    name: string;
    beschreibung: string | null;
    scope?: string;
    einsatzId?: string | null;
    eintraege: Array<{ titel: string; intervallMinuten: number; offsetMinuten: number }>;
  };
}

/**
 * Dialog zum Bearbeiten eines Fuehrungsrhythmus-Templates (Story 6.8 AC4).
 */
export function EditFuehrungsrhythmusTemplateDialog({ isOpen, onClose, template }: EditFuehrungsrhythmusTemplateDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const globalMutation = useUpdateGlobalFuehrungsrhythmusTemplate();
  const einsatzMutation = useUpdateEinsatzFuehrungsrhythmusTemplate();
  const isEinsatz = template.scope === 'EINSATZ';
  const isPending = globalMutation.isPending || einsatzMutation.isPending;

  const form = useForm({
    defaultValues: {
      name: template.name,
      beschreibung: template.beschreibung ?? undefined,
      eintraege: template.eintraege.map((e) => ({
        titel: e.titel,
        intervallMinuten: e.intervallMinuten,
        offsetMinuten: e.offsetMinuten,
      })),
    } as UpdateFuehrungsrhythmusTemplateFormData,
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: updateFuehrungsrhythmusTemplateSchema,
    },
    onSubmit: async ({ value }) => {
      setApiErrorMessage(null);

      const updateData = {
        name: value.name.trim(),
        beschreibung: value.beschreibung?.trim() || undefined,
        eintraege: value.eintraege.map((e) => ({
          titel: e.titel.trim(),
          intervallMinuten: e.intervallMinuten,
          offsetMinuten: e.offsetMinuten ?? 0,
        })),
      };

      const callbacks = {
        onSuccess: () => {
          toast.success('Template aktualisiert');
          setTimeout(() => {
            form.reset();
            onClose();
          }, 0);
        },
        onError: async (error: Error) => {
          const message = await getApiErrorMessage(error, 'Fehler beim Aktualisieren des Templates', 'updateFrTemplate');
          setApiErrorMessage(message);
        },
      };

      if (isEinsatz && template.einsatzId) {
        einsatzMutation.mutate({ einsatzId: template.einsatzId, id: template.id, data: updateData }, callbacks);
      } else {
        globalMutation.mutate({ id: template.id, data: updateData }, callbacks);
      }
    },
  });

  // Reset form when template changes (only react to open state and template identity change)
  useEffect(() => {
    if (isOpen) {
      form.reset();
      form.setFieldValue('name', template.name);
      form.setFieldValue('beschreibung', template.beschreibung ?? undefined);
      form.setFieldValue(
        'eintraege',
        template.eintraege.map((e) => ({
          titel: e.titel,
          intervallMinuten: e.intervallMinuten,
          offsetMinuten: e.offsetMinuten,
        })),
      );
      setApiErrorMessage(null);
    }
  }, [isOpen, template.id]);

  const handleClose = useCallback(() => {
    if (!isPending) {
      setApiErrorMessage(null);
      form.reset();
      onClose();
    }
  }, [isPending, form, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
          <PiMetronome className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <Dialog.Title>Template bearbeiten</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="edit-fr-template-form"
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
                <label htmlFor="edit-fr-template-name" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="edit-fr-template-name"
                  type="text"
                  placeholder="z.B. Fuehrungsrhythmus 30min"
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

          {/* Beschreibung */}
          <form.Field name="beschreibung">
            {(field) => (
              <div>
                <label htmlFor="edit-fr-template-beschreibung" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Beschreibung <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <textarea
                  id="edit-fr-template-beschreibung"
                  placeholder="Zusaetzliche Details zum Template..."
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || undefined)}
                  disabled={isPending}
                  maxLength={500}
                  rows={2}
                  className={cn(
                    'block w-full rounded-lg border-2 bg-white px-4 py-2.5 font-medium text-gray-900 transition-colors duration-200',
                    'placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-opacity-20',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500',
                    'resize-none',
                    'border-gray-300 hover:border-gray-400 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700',
                  )}
                />
              </div>
            )}
          </form.Field>

          {/* Eintraege (dynamisch) */}
          <div>
            <div className="mb-3 flex items-center gap-2 border-gray-200 border-b pb-2 dark:border-gray-700">
              <span className="font-medium text-gray-700 text-sm dark:text-gray-300">Erinnerungen</span>
              <span className="text-red-500">*</span>
            </div>

            <form.Field name="eintraege" mode="array">
              {(field) => (
                <div className="space-y-4">
                  {field.state.value.map((eintrag: unknown, index: number) => (
                    <EditEintragRow key={JSON.stringify(eintrag)} form={form} index={index} isPending={isPending} canRemove={field.state.value.length > 1} onRemove={() => field.removeValue(index)} />
                  ))}

                  {/* Erinnerung hinzufuegen Button */}
                  <button
                    type="button"
                    onClick={() => field.pushValue({ titel: '', intervallMinuten: 30, offsetMinuten: 0 })}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-300 border-dashed px-4 py-2.5 text-gray-500 text-sm transition-colors hover:border-amber-400 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-amber-500 dark:hover:text-amber-400"
                  >
                    <PiPlus className="h-4 w-4" />
                    Erinnerung hinzufuegen
                  </button>

                  {/* Array-Level Fehler */}
                  {field.state.meta.errors.length > 0 && <p className="text-red-600 text-sm dark:text-red-400">{formatErrors(field.state.meta.errors)}</p>}
                </div>
              )}
            </form.Field>
          </div>

          {/* API Error */}
          {apiErrorMessage && <div className="rounded-lg bg-red-50 p-3 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">{apiErrorMessage}</div>}
        </form>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button type="submit" form="edit-fr-template-form" intent="primary" loading={isPending} disabled={isPending} kbd="Enter">
          Speichern
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}

/** Einzelne Eintrag-Zeile im Edit-Dialog */
function EditEintragRow({
  form,
  index,
  isPending,
  canRemove,
  onRemove,
}: {
  form: ReturnType<typeof useForm<UpdateFuehrungsrhythmusTemplateFormData>>;
  index: number;
  isPending: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-gray-500 text-xs dark:text-gray-400">{index + 1}.</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label={`Eintrag ${index + 1} entfernen`}
          >
            <PiTrash className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Titel */}
        <form.Field name={`eintraege[${index}].titel`}>
          {(field) => (
            <div>
              <Input
                type="text"
                placeholder="Titel der Erinnerung"
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                disabled={isPending}
                variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                inputSize="sm"
                maxLength={100}
              />
              {field.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-xs dark:text-red-400">{formatErrors(field.state.meta.errors)}</p>}
            </div>
          )}
        </form.Field>

        <div className="flex items-center gap-3">
          {/* Intervall */}
          <form.Field name={`eintraege[${index}].intervallMinuten`}>
            {(field) => (
              <div className="flex-1">
                <label htmlFor={`intervall-${index}`} className="mb-1 block text-gray-500 text-xs dark:text-gray-400">
                  Intervall (Min)
                </label>
                <div className="flex items-center gap-1.5">
                  {INTERVALL_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => field.handleChange(preset)}
                      disabled={isPending}
                      className={cn(
                        'rounded-md px-2.5 py-1 font-medium text-xs transition-colors',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        (field.state.value as number) === preset
                          ? 'bg-amber-500 text-white dark:bg-amber-600'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                  <Input
                    id={`intervall-${index}`}
                    type="number"
                    value={field.state.value as number}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    disabled={isPending}
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    inputSize="sm"
                    min={1}
                    max={1440}
                    className="w-16"
                  />
                </div>
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-xs dark:text-red-400">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* Offset */}
          <form.Field name={`eintraege[${index}].offsetMinuten`}>
            {(field) => (
              <div className="w-24">
                <label htmlFor={`offset-${index}`} className="mb-1 block text-gray-500 text-xs dark:text-gray-400">
                  Offset (Min)
                </label>
                <Input
                  id={`offset-${index}`}
                  type="number"
                  value={(field.state.value as number | undefined) ?? 0}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  disabled={isPending}
                  variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                  inputSize="sm"
                  min={0}
                  max={1440}
                />
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-xs dark:text-red-400">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>
        </div>
      </div>
    </div>
  );
}
