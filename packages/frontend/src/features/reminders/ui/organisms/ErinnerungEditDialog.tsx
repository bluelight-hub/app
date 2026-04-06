/**
 * Erinnerung Edit Dialog
 *
 * **Story 1.3:** "Erinnerung bearbeiten"
 * AC1: Editor oeffnet sich mit den aktuellen Werten (Titel, Beschreibung, Faelligkeit)
 * AC2: Änderungen speichern und Timer aktualisieren
 * AC3: Nur GEPLANT Status editierbar (wird im Store/List Item geprüft)
 * AC4: Validierung (Titel nicht leer, Zeit in der Zukunft)
 */

import type { ErinnerungResponseDto, UpdateErinnerungDto } from '@/shared';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { cn } from '@/shared/ui/cn';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useCallback, useMemo, useState } from 'react';
import { PiClock, PiPencil } from 'react-icons/pi';
import { toast } from 'sonner';

import { useUpdateErinnerung } from '../../api';
import { type CustomTime, TIME_PRESETS, type UpdateErinnerungFormData, updateErinnerungSchema } from '../../schemas/erinnerung.schema';
import { calculateCustomFaelligAm, formatTimeForToast } from '../../utils/time-calculation';
import { TimeInput } from '../molecules/TimeInput';
import { AssigneeSelector } from '../molecules/AssigneeSelector';

/**
 * Extrahiert Fehlermeldungen aus TanStack Form Errors.
 * Zod-Adapter liefert Objekte mit `message` Property, nicht plain Strings.
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

/**
 * Extrahiert CustomTime aus einem ISO-Datum-String.
 */
function getTimeFromDate(dateString: string): CustomTime {
  const date = new Date(dateString);
  return {
    hours: date.getHours(),
    minutes: date.getMinutes(),
  };
}

interface ErinnerungEditDialogProps {
  /** Ob der Dialog offen ist */
  isOpen: boolean;
  /** Schliessen-Handler */
  onClose: () => void;
  /** Die zu bearbeitende Erinnerung */
  erinnerung: ErinnerungResponseDto | null;
  /** Einsatz ID */
  einsatzId: string;
}

/**
 * Dialog zum Bearbeiten einer bestehenden Erinnerung.
 *
 * **Story 1.3 AC1:** Oeffnet mit den aktuellen Werten der Erinnerung.
 * **Story 1.3 AC2:** Speichert Änderungen und aktualisiert Timer.
 * **Story 1.3 AC4:** Validiert Titel und Faelligkeit.
 */
export function ErinnerungEditDialog({ isOpen, onClose, erinnerung, einsatzId }: ErinnerungEditDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const { mutate: updateErinnerung, isPending } = useUpdateErinnerung();

  // Initiale CustomTime aus der Erinnerung
  const initialCustomTime = useMemo<CustomTime>(() => {
    if (!erinnerung?.faelligAm) {
      return { hours: 0, minutes: 0 };
    }
    return getTimeFromDate(erinnerung.faelligAm);
  }, [erinnerung?.faelligAm]);

  const form = useForm({
    defaultValues: {
      titel: erinnerung?.titel ?? '',
      timeMode: 'unchanged', // Story 1.3: Default ist "unveraendert"
      minuten: undefined,
      customTime: initialCustomTime,
      beschreibung: erinnerung?.beschreibung ?? '',
      eskalationsPersonId: erinnerung?.eskalationsPersonId ?? null,
    } as UpdateErinnerungFormData,
    // @ts-expect-error: validatorAdapter type definition mismatch in current version
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: updateErinnerungSchema,
    },
    onSubmit: async ({ value }) => {
      if (!erinnerung) return;

      setApiErrorMessage(null);

      // Erstelle UpdateErinnerungDto mit nur geänderten Feldern
      const updateData: UpdateErinnerungDto = {};
      let hasChanges = false;
      let toastMessage = 'Erinnerung aktualisiert';

      // Titel pruefen
      const trimmedTitel = value.titel?.trim();
      if (trimmedTitel && trimmedTitel !== erinnerung.titel) {
        updateData.titel = trimmedTitel;
        hasChanges = true;
      }

      // Beschreibung pruefen (null bedeutet loeschen)
      const trimmedBeschreibung = value.beschreibung?.trim() ?? null;
      const existingBeschreibung = erinnerung.beschreibung ?? null;
      if (trimmedBeschreibung !== existingBeschreibung) {
        updateData.beschreibung = trimmedBeschreibung || null;
        hasChanges = true;
      }

      const newEskalation = value.eskalationsPersonId ?? null;
      const oldEskalation = erinnerung?.eskalationsPersonId ?? null;
      if (newEskalation !== oldEskalation) {
        updateData.eskalationsPersonId = newEskalation || null;
        hasChanges = true;
      }

      // Zeit pruefen basierend auf Modus
      if (value.timeMode !== 'unchanged') {
        let faelligAm: Date;
        if (value.timeMode === 'preset') {
          const minuten = value.minuten !== undefined ? value.minuten : 30;
          faelligAm = new Date(Date.now() + minuten * 60 * 1000);
          toastMessage = `Erinnerung auf +${minuten} Min aktualisiert`;
        } else {
          // custom
          const { hours, minutes } = value.customTime ?? { hours: 0, minutes: 0 };
          faelligAm = calculateCustomFaelligAm(hours, minutes);
          toastMessage = `Erinnerung auf ${formatTimeForToast(faelligAm)} aktualisiert`;
        }

        updateData.faelligAm = faelligAm.toISOString();
        hasChanges = true;
      }

      // Wenn nichts geändert wurde, Dialog schliessen ohne API-Call
      if (!hasChanges) {
        toast.info('Keine Änderungen', {
          description: 'Es wurden keine Änderungen vorgenommen.',
        });
        setTimeout(() => {
          form.reset();
          onClose();
        }, 0);
        return;
      }

      updateErinnerung(
        {
          einsatzId,
          erinnerungId: erinnerung.id,
          data: updateData,
        },
        {
          onSuccess: () => {
            toast.success('Erinnerung aktualisiert', {
              description: toastMessage,
            });
            setTimeout(() => {
              form.reset();
              onClose();
            }, 0);
          },
          onError: (error) => {
            setApiErrorMessage(error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Erinnerung');
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

  // Wenn keine Erinnerung, nichts rendern
  if (!erinnerung) {
    return null;
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-info-surface p-2">
          <PiPencil className="h-5 w-5 text-status-info-text" />
        </div>
        <Dialog.Title>Erinnerung bearbeiten</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="edit-erinnerung-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* AC1/AC4: Titel-Eingabe */}
          <form.Field name="titel">
            {(field) => (
              <div>
                <label htmlFor="edit-titel" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Titel
                </label>
                <Input
                  id="edit-titel"
                  type="text"
                  placeholder="z.B. Lagebesprechung, Funkrunde..."
                  value={field.state.value ?? ''}
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

          {/* Story 1.3 AC2: Zeit-Auswahl mit 'Unveraendert' Option */}
          <form.Field name="timeMode">
            {(timeModeField) => (
              <form.Field name="minuten">
                {(minutenField) => (
                  <form.Field name="customTime">
                    {(customTimeField) => (
                      <fieldset className="m-0 border-none p-0">
                        <legend className="mb-2 text-sm font-medium text-text-secondary">Faelligkeit</legend>

                        {/* Zeit-Optionen als Chips */}
                        <div className="flex flex-wrap gap-2">
                          {/* Unveraendert Chip */}
                          <button
                            type="button"
                            aria-pressed={timeModeField.state.value === 'unchanged'}
                            onClick={() => {
                              timeModeField.handleChange('unchanged');
                            }}
                            disabled={isPending}
                            className={cn(
                              'min-h-[48px] rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                              'focus:outline-none focus-visible:shadow-focus-ring',
                              timeModeField.state.value === 'unchanged'
                                ? 'bg-action-primary text-text-inverse shadow-md hover:bg-action-primary-hover'
                                : 'bg-surface-raised text-text-secondary hover:bg-action-secondary',
                              isPending && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            Unverändert
                          </button>

                          {/* Preset Chips */}
                          {TIME_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              aria-pressed={timeModeField.state.value === 'preset' && minutenField.state.value === preset.value}
                              onClick={() => {
                                timeModeField.handleChange('preset');
                                minutenField.handleChange(preset.value);
                              }}
                              disabled={isPending}
                              className={cn(
                                'min-h-[48px] rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                                'focus:outline-none focus-visible:shadow-focus-ring',
                                timeModeField.state.value === 'preset' && minutenField.state.value === preset.value
                                  ? 'bg-status-warning-text text-text-inverse shadow-md hover:opacity-90'
                                  : 'bg-surface-raised text-text-secondary hover:bg-action-secondary',
                                isPending && 'cursor-not-allowed opacity-50',
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}

                          {/* Benutzerdefiniert Chip */}
                          <button
                            type="button"
                            aria-pressed={timeModeField.state.value === 'custom'}
                            onClick={() => {
                              timeModeField.handleChange('custom');
                              // Setze customTime auf aktuelle Faelligkeit falls noch nicht gesetzt
                              if (!customTimeField.state.value || (customTimeField.state.value.hours === 0 && customTimeField.state.value.minutes === 0)) {
                                customTimeField.handleChange(initialCustomTime);
                              }
                            }}
                            disabled={isPending}
                            className={cn(
                              'flex min-h-[48px] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                              'focus:outline-none focus-visible:shadow-focus-ring',
                              timeModeField.state.value === 'custom'
                                ? 'bg-status-warning-text text-text-inverse shadow-md hover:opacity-90'
                                : 'bg-surface-raised text-text-secondary hover:bg-action-secondary',
                              isPending && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            <PiClock className="h-4 w-4" />
                            Benutzerdefiniert
                          </button>
                        </div>

                        {/* TimeInput erscheint bei Benutzerdefiniert */}
                        {timeModeField.state.value === 'custom' && (
                          <div className="mt-4">
                            <span className="mb-1.5 block text-sm font-medium text-text-secondary">Uhrzeit eingeben</span>
                            <TimeInput
                              value={customTimeField.state.value ?? initialCustomTime}
                              onChange={(newTime) => customTimeField.handleChange(newTime)}
                              disabled={isPending}
                              error={customTimeField.state.meta.errors.length > 0}
                            />
                            {customTimeField.state.meta.errors.length > 0 && <p className="mt-1 text-sm text-status-danger-text">{formatErrors(customTimeField.state.meta.errors)}</p>}
                          </div>
                        )}

                        {/* Validation Errors für minuten (bei preset mode) */}
                        {timeModeField.state.value === 'preset' && minutenField.state.meta.errors.length > 0 && (
                          <p className="mt-1 text-sm text-status-danger-text">{formatErrors(minutenField.state.meta.errors)}</p>
                        )}

                        {/* Info: Aktuelle Faelligkeit anzeigen wenn 'unchanged' */}
                        {timeModeField.state.value === 'unchanged' && erinnerung.faelligAm && (
                          <p className="mt-2 text-sm text-text-muted">
                            Aktuelle Faelligkeit:{' '}
                            {new Date(erinnerung.faelligAm).toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </fieldset>
                    )}
                  </form.Field>
                )}
              </form.Field>
            )}
          </form.Field>

          {/* Story 4.1: Eskalationsperson - Story 4.10: Nicht änderbar wenn Rückläufer aktiv */}
          {erinnerung?.eskalationNurAnErsteller ? (
            <div className="rounded-panel border border-status-warning-border bg-status-warning-surface p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-status-warning-text">
                <span className="text-base">↩️</span>
                Rückläufer aktiv
              </p>
              <p className="mt-1 text-xs text-status-warning-text">Eskalation geht automatisch an den Ersteller zurück. Diese Einstellung kann nicht geändert werden.</p>
            </div>
          ) : (
            <form.Field name="eskalationsPersonId">
              {(field) => (
                <div>
                  <label htmlFor="edit-eskalationsPersonId" className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Eskalation an <span className="text-xs text-text-muted">(optional)</span>
                  </label>
                  <AssigneeSelector
                    einsatzId={einsatzId}
                    value={field.state.value}
                    onChange={(userId) => field.handleChange(userId)}
                    onBlur={field.handleBlur}
                    disabled={isPending}
                    error={field.state.meta.errors.length > 0 ? formatErrors(field.state.meta.errors) : undefined}
                    placeholder="Keine Eskalation"
                  />
                  <p className="mt-1 text-xs text-text-muted">Wird benachrichtigt, wenn Zuweisungsempfänger nicht reagiert</p>
                </div>
              )}
            </form.Field>
          )}

          {/* Optionale Beschreibung */}
          <form.Field name="beschreibung">
            {(field) => (
              <div>
                <label htmlFor="edit-beschreibung" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Beschreibung <span className="text-xs text-text-muted">(optional)</span>
                </label>
                <textarea
                  id="edit-beschreibung"
                  placeholder="Zusaetzliche Details zur Erinnerung..."
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || undefined)}
                  disabled={isPending}
                  maxLength={500}
                  rows={3}
                  className={cn(
                    'block w-full rounded-control border bg-surface-panel px-4 py-2.5 font-medium text-text-primary transition-colors duration-200',
                    'placeholder:text-text-muted focus:outline-none focus-visible:shadow-focus-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'resize-none',
                    field.state.meta.errors.length > 0
                      ? ['border-status-danger-border hover:border-status-danger-text', 'focus:border-status-danger-text']
                      : ['border-border-subtle hover:border-border-strong', 'focus:border-action-primary'],
                  )}
                />
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-sm text-status-danger-text">{formatErrors(field.state.meta.errors)}</p>}
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
        <Button type="submit" form="edit-erinnerung-form" intent="primary" loading={isPending} disabled={isPending} kbd="Enter">
          Speichern
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
