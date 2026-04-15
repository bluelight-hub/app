/**
 * KanalEditDrawer
 *
 * Slide-In Drawer zum Anlegen oder Bearbeiten eines Funkkanals. Nutzt
 * `Dialog.SlideIn`, `@tanstack/react-form` mit Zod-Validierung und die
 * Controlled-Molecule `KanalDetailsForm` für die typabhängigen Felder.
 *
 * Im Edit-Modus wird zusätzlich der `ZuordnungsManager` eingebettet, sowie
 * ein "Archivieren"-Aktionsbereich (DELETE → Soft-Archive).
 */

import { useCreateFunkkanal, useUpdateFunkkanal, useArchiveFunkkanal } from '@/features/funkverkehr/api';
import { KanalDetailsForm, type KanalDetailsShape } from '@/features/funkverkehr/ui/molecules/KanalDetailsForm.molecule';
import { kanalFormSchema, type KanalFormValues } from '@/features/funkverkehr/schemas/kanal.schema';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import type { CreateFunkkanalDto, FunkkanalResponseDto, UpdateFunkkanalDto } from '@bluelight-hub/shared/client';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ZuordnungsManager } from './ZuordnungsManager.organism';

export interface KanalEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  einsatzId: string;
  /** Wenn gesetzt: Edit-Modus für diesen Kanal; sonst Create-Modus. */
  kanal?: FunkkanalResponseDto;
}

const toZweckString = (value: unknown): string => (typeof value === 'string' ? value : '');

const buildDefaultValues = (kanal?: FunkkanalResponseDto): KanalFormValues => {
  if (!kanal) {
    return {
      name: '',
      details: { type: 'tmo', sprechgruppe: '' },
      zweck: '',
    };
  }
  return {
    name: kanal.name,
    details: kanal.details as KanalDetailsShape,
    zweck: toZweckString(kanal.zweck),
  };
};

/**
 * Extrahiert lesbare Fehlermeldungen aus TanStack-Form-Errors (Zod).
 */
function firstError(errors: unknown[]): string | undefined {
  for (const error of errors) {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
  }
  return undefined;
}

export function KanalEditDrawer({ isOpen, onClose, einsatzId, kanal }: KanalEditDrawerProps) {
  const isEditMode = Boolean(kanal);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const createMutation = useCreateFunkkanal(einsatzId);
  const updateMutation = useUpdateFunkkanal(einsatzId);
  const archiveMutation = useArchiveFunkkanal(einsatzId);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const defaultValues = useMemo(() => buildDefaultValues(kanal), [kanal]);

  const form = useForm<KanalFormValues>({
    defaultValues,
    validatorAdapter: zodValidator(),
    validators: {
      onChange: kanalFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (isEditMode && kanal) {
        const dto: UpdateFunkkanalDto = {
          name: value.name !== kanal.name ? value.name : undefined,
          details: value.details as UpdateFunkkanalDto['details'],
          zweck: value.zweck && value.zweck.trim().length > 0 ? (value.zweck as unknown as object) : null,
        };
        try {
          await updateMutation.mutateAsync({ kanalId: kanal.id, dto });
          toast.success('Kanal aktualisiert');
          onClose();
        } catch {
          // Error-Toast wird bereits im Hook gesetzt.
        }
      } else {
        const dto: CreateFunkkanalDto = {
          name: value.name,
          details: value.details as CreateFunkkanalDto['details'],
          zweck: value.zweck && value.zweck.trim().length > 0 ? value.zweck : undefined,
        };
        try {
          await createMutation.mutateAsync(dto);
          onClose();
        } catch {
          // Error-Toast wird bereits im Hook gesetzt.
        }
      }
    },
  });

  const handleClose = useCallback(() => {
    form.reset();
    setConfirmDeleteOpen(false);
    onClose();
  }, [form, onClose]);

  const handleConfirmDelete = useCallback(async () => {
    if (!kanal) return;
    try {
      await archiveMutation.mutateAsync({ kanalId: kanal.id });
      setConfirmDeleteOpen(false);
      onClose();
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 422) {
        toast.error('Kanal wird noch referenziert', {
          description: 'Der Kanal ist in Funksprüchen eingebunden. Archiviere ihn, statt ihn zu löschen.',
        });
      }
      setConfirmDeleteOpen(false);
    }
  }, [archiveMutation, kanal, onClose]);

  return (
    <>
      <Dialog.SlideIn isOpen={isOpen} onClose={handleClose} title={isEditMode ? 'Kanal bearbeiten' : 'Neuen Kanal anlegen'} size="lg" position="right">
        <form
          className="flex h-full flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <div className="flex-1 space-y-5 overflow-y-auto pr-1">
            <form.Field name="name">
              {(field) => {
                const error = firstError(field.state.meta.errors);
                return (
                  <label htmlFor="kanal-name" className="block text-sm">
                    <span className="block font-medium text-slate-700 dark:text-slate-200">
                      Name <span className="text-red-500">*</span>
                    </span>
                    <input
                      id="kanal-name"
                      type="text"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'kanal-name-error' : undefined}
                      placeholder="z. B. TMO SG Feuer 1"
                      disabled={isPending}
                      className={cn('mt-1 w-full rounded border px-3 py-2 text-sm dark:bg-slate-900', error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700')}
                    />
                    {error && (
                      <span id="kanal-name-error" className="mt-1 block text-xs text-red-600">
                        {error}
                      </span>
                    )}
                  </label>
                );
              }}
            </form.Field>

            <form.Field name="details">
              {(field) => {
                const err = firstError(field.state.meta.errors);
                const errorRecord: Partial<Record<string, string>> = err ? { _global: err } : {};
                return (
                  <div>
                    <KanalDetailsForm value={field.state.value} onChange={field.handleChange} errors={errorRecord} disabled={isPending} />
                    {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
                  </div>
                );
              }}
            </form.Field>

            <form.Field name="zweck">
              {(field) => (
                <label htmlFor="kanal-zweck" className="block text-sm">
                  <span className="block font-medium text-slate-700 dark:text-slate-200">Zweck (optional)</span>
                  <textarea
                    id="kanal-zweck"
                    rows={2}
                    value={field.state.value ?? ''}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="z. B. Einsatzabschnitt Nord — Löschangriff"
                    disabled={isPending}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
              )}
            </form.Field>

            {isEditMode && kanal && (
              <section aria-labelledby="zuordnungen-heading" className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 id="zuordnungen-heading" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Zuordnungen
                </h3>
                <ZuordnungsManager einsatzId={einsatzId} kanalId={kanal.id} zuordnungen={kanal.zuordnungen} />
              </section>
            )}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div>
              {isEditMode && (
                <Button intent="danger" appearance="ghost" onClick={() => setConfirmDeleteOpen(true)} disabled={archiveMutation.isPending || isPending} type="button">
                  Archivieren
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending} type="button">
                Abbrechen
              </Button>
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
                {([canSubmit, isSubmitting]) => (
                  <Button intent="primary" type="submit" disabled={!canSubmit || isPending} loading={isSubmitting || isPending}>
                    {isEditMode ? 'Speichern' : 'Kanal anlegen'}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </footer>
        </form>
      </Dialog.SlideIn>

      {kanal && (
        <Dialog.Confirm
          isOpen={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Kanal archivieren"
          message={`Soll der Kanal "${kanal.name}" archiviert werden? Er bleibt für bestehende Funksprüche auffindbar, aber inaktiv.`}
          confirmLabel="Archivieren"
          cancelLabel="Abbrechen"
          variant="warning"
          isProcessing={archiveMutation.isPending}
        />
      )}
    </>
  );
}
