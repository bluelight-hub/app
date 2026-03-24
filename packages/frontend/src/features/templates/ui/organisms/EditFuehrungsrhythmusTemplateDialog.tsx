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

let editEintragKeyCounter = 0;

function createEditEintragKey(): string {
  editEintragKeyCounter += 1;
  return `edit-fr-eintrag-${editEintragKeyCounter}`;
}

function createEditEintragKeys(count: number): string[] {
  return Array.from({ length: count }, () => createEditEintragKey());
}

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
  const [entryKeys, setEntryKeys] = useState<string[]>(() => createEditEintragKeys(template.eintraege.length));
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
            setEntryKeys(createEditEintragKeys(template.eintraege.length));
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally only reacting to isOpen and template.id to avoid infinite loops from form/template object references
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
      setEntryKeys(createEditEintragKeys(template.eintraege.length));
      setApiErrorMessage(null);
    }
  }, [isOpen, template.id]);

  const handleClose = useCallback(() => {
    if (!isPending) {
      setApiErrorMessage(null);
      form.reset();
      setEntryKeys(createEditEintragKeys(template.eintraege.length));
      onClose();
    }
  }, [isPending, form, onClose, template.eintraege.length]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-warning-surface p-2">
          <PiMetronome className="h-5 w-5 text-status-warning-text" />
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
          className="space-y-4"
        >
          {/* Name */}
          <form.Field name="name">
            {(field) => (
              <div>
                <label htmlFor="edit-fr-template-name" className="mb-1.5 block font-medium text-text-secondary text-sm">
                  Name <span className="text-status-danger-text">*</span>
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
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-status-danger-text text-sm">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* Beschreibung */}
          <form.Field name="beschreibung">
            {(field) => (
              <div>
                <label htmlFor="edit-fr-template-beschreibung" className="mb-1.5 block font-medium text-text-secondary text-sm">
                  Beschreibung <span className="text-text-muted text-xs">(optional)</span>
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
                    'block w-full rounded-control border bg-surface-panel px-4 py-2.5 font-medium text-text-primary transition-colors duration-200',
                    'placeholder:text-text-muted focus:outline-none focus-visible:shadow-focus-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'resize-none',
                    'border-border-subtle hover:border-border-strong focus:border-action-primary',
                  )}
                />
              </div>
            )}
          </form.Field>

          {/* Eintraege (dynamisch) */}
          <div>
            <div className="mb-3 flex items-center gap-2 border-border-subtle border-b pb-2">
              <span className="font-medium text-text-secondary text-sm">Erinnerungen</span>
              <span className="text-status-danger-text">*</span>
            </div>

            <form.Field name="eintraege" mode="array">
              {(field) => (
                <div className="space-y-4">
                  {field.state.value.map((_: unknown, index: number) => (
                    <EditEintragRow
                      key={entryKeys[index] ?? 'edit-fr-eintrag-fallback'}
                      form={form}
                      index={index}
                      isPending={isPending}
                      canRemove={field.state.value.length > 1}
                      onRemove={() => {
                        field.removeValue(index);
                        setEntryKeys((prevKeys) => [...prevKeys.slice(0, index), ...prevKeys.slice(index + 1)]);
                      }}
                    />
                  ))}

                  {/* Erinnerung hinzufuegen Button */}
                  <button
                    type="button"
                    onClick={() => {
                      field.pushValue({ titel: '', intervallMinuten: 30, offsetMinuten: 0 });
                      setEntryKeys((prev) => [...prev, createEditEintragKey()]);
                    }}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-panel border-2 border-dashed border-border-subtle px-4 py-2.5 text-text-secondary text-sm transition-colors hover:border-status-warning-text hover:text-status-warning-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PiPlus className="h-4 w-4" />
                    Erinnerung hinzufuegen
                  </button>

                  {/* Array-Level Fehler */}
                  {field.state.meta.errors.length > 0 && <p className="text-status-danger-text text-sm">{formatErrors(field.state.meta.errors)}</p>}
                </div>
              )}
            </form.Field>
          </div>

          {/* API Error */}
          {apiErrorMessage && <div className="rounded-panel bg-status-danger-surface p-3 text-status-danger-text text-sm">{apiErrorMessage}</div>}
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
  const intervallInputId = `edit-fr-eintrag-${index}-intervall`;
  const offsetInputId = `edit-fr-eintrag-${index}-offset`;

  return (
    <div className="rounded-panel border border-border-subtle bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-text-muted text-xs">{index + 1}.</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            className="rounded-control p-1 text-text-muted transition-colors hover:bg-status-danger-surface hover:text-status-danger-text disabled:cursor-not-allowed disabled:opacity-50"
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
              {field.state.meta.errors.length > 0 && <p className="mt-1 text-status-danger-text text-xs">{formatErrors(field.state.meta.errors)}</p>}
            </div>
          )}
        </form.Field>

        <div className="flex items-center gap-3">
          {/* Intervall */}
          <form.Field name={`eintraege[${index}].intervallMinuten`}>
            {(field) => (
              <div className="flex-1">
                <label htmlFor={intervallInputId} className="mb-1 block text-text-muted text-xs">
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
                        (field.state.value as number) === preset ? 'bg-status-warning-text text-text-inverse' : 'bg-surface-raised text-text-secondary hover:bg-action-secondary',
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                  <Input
                    id={intervallInputId}
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
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-status-danger-text text-xs">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* Offset */}
          <form.Field name={`eintraege[${index}].offsetMinuten`}>
            {(field) => (
              <div className="w-24">
                <label htmlFor={offsetInputId} className="mb-1 block text-text-muted text-xs">
                  Offset (Min)
                </label>
                <Input
                  id={offsetInputId}
                  type="number"
                  value={(field.state.value as number | undefined) ?? 0}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  disabled={isPending}
                  variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                  inputSize="sm"
                  min={0}
                  max={1440}
                />
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-status-danger-text text-xs">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>
        </div>
      </div>
    </div>
  );
}
