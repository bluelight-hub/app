import { useCallback, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiMetronome, PiPlus, PiTrash } from 'react-icons/pi';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';

import { useCreateGlobalFuehrungsrhythmusTemplate, useCreateEinsatzFuehrungsrhythmusTemplate } from '../../api';
import { createFuehrungsrhythmusTemplateSchema, type CreateFuehrungsrhythmusTemplateFormData } from '../../schemas/fuehrungsrhythmus-template.schema';

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

let createEintragKeyCounter = 0;

function createEintragKey(): string {
  createEintragKeyCounter += 1;
  return `create-fr-eintrag-${createEintragKeyCounter}`;
}

function createEintragKeys(count: number): string[] {
  return Array.from({ length: count }, () => createEintragKey());
}

interface CreateFuehrungsrhythmusTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultScope?: string;
  einsatzId?: string;
}

/**
 * Dialog zum Erstellen eines Fuehrungsrhythmus-Templates (Story 6.6 AC1, AC3).
 */
export function CreateFuehrungsrhythmusTemplateDialog({ isOpen, onClose, defaultScope, einsatzId }: CreateFuehrungsrhythmusTemplateDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [entryKeys, setEntryKeys] = useState<string[]>(() => createEintragKeys(1));
  const globalMutation = useCreateGlobalFuehrungsrhythmusTemplate();
  const einsatzMutation = useCreateEinsatzFuehrungsrhythmusTemplate();
  const isEinsatz = defaultScope === 'EINSATZ';
  const { mutate: createTemplate, isPending } = isEinsatz ? einsatzMutation : globalMutation;

  const form = useForm({
    defaultValues: {
      name: '',
      beschreibung: undefined,
      eintraege: [{ titel: '', intervallMinuten: 30, offsetMinuten: 0 }],
    } as CreateFuehrungsrhythmusTemplateFormData,
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: createFuehrungsrhythmusTemplateSchema,
    },
    onSubmit: async ({ value }) => {
      setApiErrorMessage(null);

      const templateData = {
        name: value.name.trim(),
        beschreibung: value.beschreibung?.trim() || undefined,
        ...(defaultScope && { scope: defaultScope }),
        eintraege: value.eintraege.map((e) => ({
          titel: e.titel.trim(),
          intervallMinuten: e.intervallMinuten,
          offsetMinuten: e.offsetMinuten ?? 0,
        })),
      };

      createTemplate(
        // @ts-expect-error -- Die Mutation-Variable unterscheidet sich je nach Scope (mit/ohne einsatzId)
        isEinsatz && einsatzId ? { einsatzId, data: templateData } : { data: templateData },
        {
          onSuccess: () => {
            toast.success('Fuehrungsrhythmus-Template erstellt');
            setTimeout(() => {
              form.reset();
              setEntryKeys(createEintragKeys(1));
              onClose();
            }, 0);
          },
          onError: (error) => {
            setApiErrorMessage(error instanceof Error ? error.message : 'Fehler beim Erstellen des Templates');
          },
        },
      );
    },
  });

  const handleClose = useCallback(() => {
    if (!isPending) {
      setApiErrorMessage(null);
      form.reset();
      setEntryKeys(createEintragKeys(1));
      onClose();
    }
  }, [isPending, form, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-warning-surface p-2">
          <PiMetronome className="h-5 w-5 text-status-warning-text" />
        </div>
        <Dialog.Title>Fuehrungsrhythmus-Template erstellen</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="create-fr-template-form"
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
                <label htmlFor="fr-template-name" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Name <span className="text-status-danger-text">*</span>
                </label>
                <Input
                  id="fr-template-name"
                  type="text"
                  placeholder="z.B. Fuehrungsrhythmus 30min"
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

          {/* Beschreibung */}
          <form.Field name="beschreibung">
            {(field) => (
              <div>
                <label htmlFor="fr-template-beschreibung" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Beschreibung <span className="text-xs text-text-muted">(optional)</span>
                </label>
                <textarea
                  id="fr-template-beschreibung"
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
            <div className="mb-3 flex items-center gap-2 border-b border-border-subtle pb-2">
              <span className="text-sm font-medium text-text-secondary">Erinnerungen</span>
              <span className="text-status-danger-text">*</span>
            </div>

            <form.Field name="eintraege" mode="array">
              {(field) => (
                <div className="space-y-4">
                  {field.state.value.map((_: unknown, index: number) => (
                    <EintragRow
                      key={entryKeys[index] ?? 'create-fr-eintrag-fallback'}
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
                      setEntryKeys((prev) => [...prev, createEintragKey()]);
                    }}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-panel border-2 border-dashed border-border-subtle px-4 py-2.5 text-sm text-text-secondary transition-colors hover:border-status-warning-text hover:text-status-warning-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PiPlus className="h-4 w-4" />
                    Erinnerung hinzufuegen
                  </button>

                  {/* Array-Level Fehler */}
                  {field.state.meta.errors.length > 0 && <p className="text-sm text-status-danger-text">{formatErrors(field.state.meta.errors)}</p>}
                </div>
              )}
            </form.Field>
          </div>

          {/* API Error */}
          {apiErrorMessage && <div className="rounded-panel bg-status-danger-surface p-3 text-sm text-status-danger-text">{apiErrorMessage}</div>}
        </form>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button type="submit" form="create-fr-template-form" intent="primary" loading={isPending} disabled={isPending} kbd="Enter">
          Template erstellen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}

/** Einzelne Eintrag-Zeile im Dialog */
function EintragRow({
  form,
  index,
  isPending,
  canRemove,
  onRemove,
}: {
  form: ReturnType<typeof useForm<CreateFuehrungsrhythmusTemplateFormData>>;
  index: number;
  isPending: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const intervallInputId = `fr-eintrag-${index}-intervall`;
  const offsetInputId = `fr-eintrag-${index}-offset`;

  return (
    <div className="rounded-panel border border-border-subtle bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted">{index + 1}.</span>
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
              {field.state.meta.errors.length > 0 && <p className="mt-1 text-xs text-status-danger-text">{formatErrors(field.state.meta.errors)}</p>}
            </div>
          )}
        </form.Field>

        <div className="flex items-center gap-3">
          {/* Intervall */}
          <form.Field name={`eintraege[${index}].intervallMinuten`}>
            {(field) => (
              <div className="flex-1">
                <label htmlFor={intervallInputId} className="mb-1 block text-xs text-text-muted">
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
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
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
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-xs text-status-danger-text">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* Offset */}
          <form.Field name={`eintraege[${index}].offsetMinuten`}>
            {(field) => (
              <div className="w-24">
                <label htmlFor={offsetInputId} className="mb-1 block text-xs text-text-muted">
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
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-xs text-status-danger-text">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>
        </div>
      </div>
    </div>
  );
}
