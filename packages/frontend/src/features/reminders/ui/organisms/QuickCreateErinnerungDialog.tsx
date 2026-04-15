/**
 * Quick-Create Erinnerung Dialog
 *
 * **Story 1.1:** "Erinnerung mit Quick-Create anlegen"
 * AC1: Zeit-Presets (5, 10, 15, 30, 60 Min) sind als Chips waehlbar
 * AC2: Titel-Eingabe mit max. 100 Zeichen
 * AC3: Optional: Beschreibung mit max. 500 Zeichen
 * AC4: "Erstellen" Button erstellt Erinnerung
 * AC5: Berechnet faelligAm = now + Minuten
 *
 * **Story 1.2:** "Erinnerung mit benutzerdefinierter Zeit anlegen"
 * AC1: Benutzerdefiniert-Option im Quick-Create Formular
 * AC2: Time-Picker erscheint bei Benutzerdefiniert
 * AC3: Absolute Zeit speichern
 * AC4: Wechsel zwischen Modi
 * AC5: Validierung bei Benutzerdefiniert
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useQueryClient } from '@tanstack/react-query';
import { PiAlarm, PiClock, PiNotepad, PiArrowUUpLeft, PiBookOpen, PiRepeat } from 'react-icons/pi';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { RadioGroup } from '@/shared/ui/atoms/radio-group.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';

import { useCreateErinnerung } from '../../api';
import { createErinnerungSchema, TIME_PRESETS, RECURRING_INTERVAL_PRESETS, type CreateErinnerungFormData } from '../../schemas/erinnerung.schema';
import { TimeInput } from '../molecules/TimeInput';
import { AssigneeSelector } from '../molecules/AssigneeSelector';
import { calculateCustomFaelligAm, formatTimeForToast, getDefaultCustomTime } from '../../utils/time-calculation';
import { ETB_QUERY_KEYS } from '@/features/etb/api/queries';
import { useVorlagen, TemplatePicker } from '@/features/templates';
import { KategorieSelector } from '@/features/kategorien';
import type { ErinnerungsvorlageResponseDto } from '@/shared';

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
 * Story 5.4: Kuerzt Text fuer Titel-Vorausfuellung.
 *
 * @param text - Der zu kuerzende Text
 * @param maxLength - Maximale Laenge (Standard: 80, um mit " - Follow-up" auf max 100 zu kommen)
 * @returns Gekuerzter Text mit "..." wenn noetig
 */
function truncateForTitle(text: string, maxLength = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 3)}...`;
}

/**
 * Story 5.4: FromEtb Daten fuer Erinnerung aus ETB-Eintrag erstellen.
 */
export interface FromEtbData {
  /** ID des ETB-Eintrags */
  entryId: string;
  /** Text des ETB-Eintrags (fuer Titel-Vorausfuellung) */
  text: string;
}

/**
 * Story 7.6: FromNotiz Daten fuer Erinnerung aus Notiz erstellen.
 */
export interface FromNotizData {
  /** ID der Quell-Notiz */
  notizId: string;
  /** Titel der Notiz (fuer Titel-Vorausfuellung) */
  titel: string;
  /** Inhalt der Notiz (fuer Beschreibung-Vorausfuellung) */
  inhalt?: string | null;
}

interface QuickCreateErinnerungDialogProps {
  /** Ob der Dialog offen ist */
  isOpen: boolean;
  /** Schliessen-Handler */
  onClose: () => void;
  /** Einsatz ID */
  einsatzId: string;
  /**
   * Story 5.4: Optional - ETB-Eintrag Kontext fuer Erinnerung aus ETB erstellen.
   * Wenn gesetzt, wird der Titel vorausgefuellt und etbEntryId an die Mutation uebergeben.
   */
  fromEtb?: FromEtbData | null;
  /**
   * Story 6.3: Optional - Vorlage fuer Vorausfuellung des Formulars.
   * Wenn gesetzt, werden Titel, Minuten und Beschreibung vorausgefuellt.
   */
  fromTemplate?: ErinnerungsvorlageResponseDto | null;
  /**
   * Story 7.6: Optional - Notiz-Kontext fuer Erinnerung aus Notiz erstellen.
   * Wenn gesetzt, werden Titel und Beschreibung vorausgefuellt und notizId an die Mutation uebergeben.
   */
  fromNotiz?: FromNotizData | null;
}

/**
 * Dialog zum schnellen Erstellen einer Erinnerung.
 *
 * Der User waehlt ein Zeit-Preset (Chips) und gibt einen Titel ein.
 * Das Backend berechnet automatisch die faelligAm-Zeit basierend auf der Auswahl.
 *
 * **Story 5.4:** Unterstuetzt optional `fromEtb` prop fuer Erinnerung aus ETB-Eintrag.
 */
export function QuickCreateErinnerungDialog({ isOpen, onClose, einsatzId, fromEtb, fromTemplate, fromNotiz }: QuickCreateErinnerungDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { mutate: createErinnerung, isPending } = useCreateErinnerung();

  // Story 6.3 Task 2: Vorlagen lazy laden (nur wenn Dialog offen)
  const { data: vorlagen, isLoading: isLoadingVorlagen } = useVorlagen({ enabled: isOpen });

  // Story 5.4: Berechne vorausgefuellten Titel aus ETB-Text
  const defaultTitel = useMemo(() => {
    if (!fromEtb?.text) return '';
    // Kuerze Text auf 80 Zeichen und fuege " - Follow-up" hinzu (gesamt max 100 Zeichen)
    return `${truncateForTitle(fromEtb.text, 80)} - Follow-up`;
  }, [fromEtb?.text]);

  const form = useForm({
    defaultValues: {
      titel: defaultTitel,
      timeMode: 'preset', // Story 1.2: Default ist Preset-Modus
      minuten: 30, // Default: 30 Minuten
      customTime: getDefaultCustomTime(), // Story 1.2 AC2: aktuelle Zeit + 30 Min
      beschreibung: undefined,
      requiresNote: false, // Story 2.6: Pflicht-Notiz default aus
      assignedToId: null, // Story 3.3: Keine Zuweisung = fuer alle
      eskalationsPersonId: null, // Story 4.1 AC1: Optional
      eskalationNurAnErsteller: false, // Story 4.10 AC1: Default false
      kategorieId: null, // Story 8.2: Keine Kategorie
      isRecurring: false, // Story 6.4
      recurringIntervalMinutes: undefined, // Story 6.4
      recurringEndMode: 'none' as const, // Story 6.4
      recurringMaxCount: undefined, // Story 6.4
      recurringEndDate: undefined, // Story 6.4
    } as CreateErinnerungFormData,
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: createErinnerungSchema,
    },
    onSubmit: async ({ value }) => {
      setApiErrorMessage(null);

      // Story 1.2 AC3: Berechne faelligAm basierend auf Modus
      let faelligAm: Date;
      let toastMessage: string;

      if (value.timeMode === 'preset') {
        // Story 1.1 AC5: Berechne faelligAm = jetzt + gewaehlte Minuten
        // Expliziter Check auf undefined, da minuten = 0 ein valider Wert ist
        const minuten = value.minuten !== undefined ? value.minuten : 30;
        faelligAm = new Date(Date.now() + minuten * 60 * 1000);
        toastMessage = `Erinnerung in ${value.minuten} Min erstellt`;
      } else {
        // Story 1.2 AC3: Absolute Zeit
        const { hours, minutes } = value.customTime ?? { hours: 0, minutes: 0 };
        faelligAm = calculateCustomFaelligAm(hours, minutes);
        toastMessage = `Erinnerung für ${formatTimeForToast(faelligAm)} erstellt`;
      }

      // DEBUG: Logging um den Flow zu tracen
      console.log('[QuickCreateErinnerungDialog] Creating erinnerung with fromEtb:', fromEtb, 'etbEntryId:', fromEtb?.entryId);

      createErinnerung(
        {
          einsatzId,
          data: {
            titel: value.titel.trim(),
            faelligAm: faelligAm.toISOString(),
            beschreibung: value.beschreibung?.trim() || undefined,
            requiresNote: value.requiresNote, // Story 2.6: Pflicht-Notiz Flag
            assignedToId: value.assignedToId ?? undefined, // Story 3.3: Zuweisung an Person
            eskalationsPersonId: value.eskalationsPersonId ?? undefined, // Story 4.1: Eskalationsperson
            eskalationNurAnErsteller: value.eskalationNurAnErsteller, // Story 4.10
            kategorieId: value.kategorieId ?? undefined, // Story 8.2: Kategorie
            etbEntryId: fromEtb?.entryId, // Story 5.4: ETB-Eintrag Referenz
            notizId: fromNotiz?.notizId, // Story 7.6: Quell-Notiz Referenz
            isRecurring: value.isRecurring ?? false,
            recurringIntervalMinutes: value.isRecurring ? value.recurringIntervalMinutes : undefined,
            recurringEndDate: value.isRecurring && value.recurringEndMode === 'date' ? value.recurringEndDate : undefined,
            recurringMaxCount: value.isRecurring && value.recurringEndMode === 'count' ? value.recurringMaxCount : undefined,
          },
        },
        {
          onSuccess: async () => {
            console.log('[QuickCreateErinnerungDialog] Success! fromEtb:', fromEtb);
            // Story 5.4: ETB Query invalidieren fuer UI-Update wenn fromEtb gesetzt
            // Verwende ETB_QUERY_KEYS.all statt .byEinsatz(), da byEinsatz() einen spezifischen
            // includeDeleted-Wert im Key hat und die Invalidierung sonst nicht greift
            if (fromEtb?.entryId) {
              console.log('[QuickCreateErinnerungDialog] Invalidating ETB queries');
              await queryClient.invalidateQueries({
                queryKey: ETB_QUERY_KEYS.all,
              });
            }

            // Story 7.6/1.2: Spezifischer Toast
            toast.success(fromNotiz ? 'Erinnerung aus Notiz erstellt' : 'Erinnerung erstellt', {
              description: toastMessage,
            });
            setTimeout(() => {
              form.reset();
              onClose();
            }, 0);
          },
          onError: (error) => {
            setApiErrorMessage(error instanceof Error ? error.message : 'Fehler beim Erstellen der Erinnerung');
          },
        },
      );
    },
  });

  // Story 5.4: Titel aktualisieren wenn fromEtb sich aendert (Dialog wird mit neuem ETB-Kontext geoeffnet)
  // Fix: Race Condition vermeiden - Titel nur einmal beim ersten Open setzen
  const hasSetTitelRef = useRef(false);

  useEffect(() => {
    if (isOpen && defaultTitel && !hasSetTitelRef.current) {
      form.setFieldValue('titel', defaultTitel);
      hasSetTitelRef.current = true;
    }
    if (!isOpen) {
      hasSetTitelRef.current = false; // Reset fuer naechsten Dialog-Open
    }
  }, [isOpen, defaultTitel, form]);

  // Story 6.3: Vorlagen-Vorausfuellung beim Dialog-Oeffnen
  const hasSetTemplateRef = useRef(false);

  useEffect(() => {
    if (isOpen && fromTemplate && !hasSetTemplateRef.current) {
      form.setFieldValue('titel', fromTemplate.titel);
      form.setFieldValue('timeMode', 'preset');
      form.setFieldValue('minuten', fromTemplate.minuten);
      if (fromTemplate.beschreibung) {
        form.setFieldValue('beschreibung', fromTemplate.beschreibung);
      }
      // Story 6.4 AC6: Vorlage-Minuten als Recurring-Intervall vorausfüllen
      hasSetTemplateRef.current = true;
    }
    if (!isOpen) {
      hasSetTemplateRef.current = false;
    }
  }, [isOpen, fromTemplate, form]);

  // Story 7.6: Notiz-Vorausfuellung beim Dialog-Oeffnen
  const hasSetNotizRef = useRef(false);

  useEffect(() => {
    if (isOpen && fromNotiz && !hasSetNotizRef.current) {
      form.setFieldValue('titel', fromNotiz.titel);
      if (fromNotiz.inhalt && fromNotiz.inhalt.trim().length > 0) {
        form.setFieldValue('beschreibung', fromNotiz.inhalt.substring(0, 500));
      }
      hasSetNotizRef.current = true;
    }
    if (!isOpen) {
      hasSetNotizRef.current = false;
    }
  }, [isOpen, fromNotiz, form]);

  /**
   * Story 6.3 AC2/AC3: Handler fuer Vorlage-Auswahl aus TemplatePicker.
   * Fuellt Formular-Felder via setFieldValue vor (kein form.reset!).
   */
  const handleTemplateSelect = useCallback(
    (vorlage: ErinnerungsvorlageResponseDto) => {
      form.setFieldValue('titel', vorlage.titel);
      form.setFieldValue('timeMode', 'preset');
      form.setFieldValue('minuten', vorlage.minuten);
      form.setFieldValue('beschreibung', vorlage.beschreibung ?? undefined);
      // Story 6.4 AC6: Vorlage-Minuten als Recurring-Intervall vorausfüllen (aber Recurring nicht automatisch aktivieren)
    },
    [form],
  );

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
        <Dialog.Title>Erinnerung erstellen</Dialog.Title>
      </div>

      <Dialog.Body>
        {/* Story 6.3: TemplatePicker - nur anzeigen wenn kein ETB- oder Notiz-Kontext */}
        {!fromEtb && !fromNotiz && (
          <div className="mb-4">
            <TemplatePicker vorlagen={vorlagen ?? []} isLoading={isLoadingVorlagen} onSelect={handleTemplateSelect} disabled={isPending} />
          </div>
        )}

        {/* Story 7.6: Notiz-Verknuepfungs-Hinweis */}
        {fromNotiz && (
          <div className="mb-4 flex items-center gap-2 rounded-panel bg-status-warning-surface p-3 text-sm text-status-warning-text">
            <PiNotepad className="h-4 w-4 flex-shrink-0" />
            <span>Diese Erinnerung wird aus der Notiz erstellt. Die Notiz bleibt bestehen.</span>
          </div>
        )}

        {/* Story 5.4: ETB-Verknuepfungs-Hinweis */}
        {fromEtb && (
          <div className="mb-4 flex items-center gap-2 rounded-panel bg-status-info-surface p-3 text-sm text-status-info-text">
            <PiBookOpen className="h-4 w-4 flex-shrink-0" />
            <span>Diese Erinnerung wird mit dem ETB-Eintrag verknuepft.</span>
          </div>
        )}

        <form
          id="quick-create-erinnerung-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* AC2: Titel-Eingabe */}
          <form.Field name="titel">
            {(field) => (
              <div>
                <label htmlFor="titel" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Titel <span className="text-status-danger-text">*</span>
                </label>
                <Input
                  id="titel"
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

          {/* Story 1.1 AC1 & Story 1.2 AC1-4: Zeit-Auswahl */}
          <form.Field name="timeMode">
            {(timeModeField) => (
              <form.Field name="minuten">
                {(minutenField) => (
                  <form.Field name="customTime">
                    {(customTimeField) => (
                      <fieldset className="m-0 border-none p-0">
                        <legend className="mb-2 text-sm font-medium text-text-secondary">
                          Erinnern in <span className="text-status-danger-text">*</span>
                        </legend>

                        {/* Zeit-Presets und Benutzerdefiniert als Chips */}
                        <div className="flex flex-wrap gap-2">
                          {/* Preset Chips */}
                          {TIME_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              aria-pressed={timeModeField.state.value === 'preset' && minutenField.state.value === preset.value}
                              onClick={() => {
                                // Story 1.2 AC4: Wechsel zu Preset-Modus
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

                          {/* Eigene Dauer als Inline-Chip-Input (immer sichtbar) */}
                          <label
                            className={cn(
                              'min-h-[48px] rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                              'focus-within:shadow-focus-ring focus-within:ring-2',
                              'flex items-center gap-1',
                              timeModeField.state.value === 'preset' && minutenField.state.value !== undefined && !TIME_PRESETS.some((p) => p.value === minutenField.state.value)
                                ? 'bg-status-warning-text text-text-inverse shadow-md'
                                : 'bg-surface-raised text-text-secondary',
                              isPending && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            <Input
                              id="custom-duration-input"
                              type="number"
                              variant="inline"
                              inputSize="sm"
                              placeholder="__"
                              aria-label="Eigene Dauer"
                              aria-invalid={minutenField.state.meta.errors.length > 0}
                              value={
                                timeModeField.state.value === 'preset' && minutenField.state.value !== undefined && !TIME_PRESETS.some((p) => p.value === minutenField.state.value)
                                  ? minutenField.state.value
                                  : ''
                              }
                              onChange={(e) => {
                                timeModeField.handleChange('preset');
                                const parsed = Number.parseInt(e.target.value, 10);
                                const val = e.target.value && !Number.isNaN(parsed) ? parsed : undefined;
                                minutenField.handleChange(val);
                              }}
                              disabled={isPending}
                              min={1}
                              max={1440}
                              className={cn(
                                'w-12 text-center',
                                '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                                timeModeField.state.value === 'preset' && minutenField.state.value !== undefined && !TIME_PRESETS.some((p) => p.value === minutenField.state.value)
                                  ? 'text-text-inverse placeholder:text-text-inverse/60'
                                  : 'text-text-secondary placeholder:text-text-muted',
                              )}
                            />
                            Min
                          </label>

                          {/* Story 1.2 AC1: Benutzerdefiniert Chip */}
                          <button
                            type="button"
                            aria-pressed={timeModeField.state.value === 'custom'}
                            onClick={() => {
                              // Wechsel zu Custom-Modus
                              timeModeField.handleChange('custom');
                              // Story 1.2 AC2: Default-Zeit setzen falls noch nicht gesetzt
                              if (!customTimeField.state.value) {
                                customTimeField.handleChange(getDefaultCustomTime());
                              }
                            }}
                            disabled={isPending}
                            className={cn(
                              'min-h-[48px] rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                              'focus:outline-none focus-visible:shadow-focus-ring',
                              'flex items-center gap-1.5',
                              timeModeField.state.value === 'custom'
                                ? 'bg-status-warning-text text-text-inverse shadow-md hover:opacity-90'
                                : 'bg-surface-raised text-text-secondary hover:bg-action-secondary',
                              isPending && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            <PiClock className="h-4 w-4" />
                            Uhrzeit
                          </button>
                        </div>

                        {/* Story 1.2 AC2: TimeInput erscheint bei Benutzerdefiniert */}
                        {timeModeField.state.value === 'custom' && (
                          <div className="mt-4">
                            <label htmlFor="custom-time-input" className="mb-1.5 block text-sm font-medium text-text-secondary">
                              Uhrzeit eingeben
                            </label>
                            <TimeInput
                              id="custom-time-input"
                              value={customTimeField.state.value ?? getDefaultCustomTime()}
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
                      </fieldset>
                    )}
                  </form.Field>
                )}
              </form.Field>
            )}
          </form.Field>

          {/* Story 3.3: Zuweisung an Person */}
          <form.Field name="assignedToId">
            {(field) => (
              <div>
                <label htmlFor="assignedToId" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Zuweisen an <span className="text-xs text-text-muted">(optional)</span>
                </label>
                <AssigneeSelector
                  einsatzId={einsatzId}
                  value={field.state.value}
                  onChange={(userId) => {
                    field.handleChange(userId);
                    // Reset eskalationNurAnErsteller wenn keine Zuweisung mehr
                    if (!userId) {
                      form.setFieldValue('eskalationNurAnErsteller', false);
                    }
                  }}
                  onBlur={field.handleBlur}
                  disabled={isPending}
                  error={field.state.meta.errors.length > 0 ? formatErrors(field.state.meta.errors) : undefined}
                  placeholder="Für alle (keine Zuweisung)"
                />
                <p className="mt-1 text-xs text-text-muted">Leer lassen für alle Teilnehmer</p>
              </div>
            )}
          </form.Field>

          {/* Story 4.10: Eskalation nur an Ersteller Checkbox - nur sichtbar wenn Zuweisung gesetzt */}
          <form.Subscribe selector={(state) => state.values.assignedToId}>
            {(assignedToId) =>
              assignedToId && (
                <form.Field name="eskalationNurAnErsteller">
                  {(field) => (
                    <Checkbox
                      id="eskalationNurAnErsteller"
                      checked={field.state.value ?? false}
                      onChange={(checked) => {
                        field.handleChange(checked);
                        // Story 4.10: Reset eskalationsPersonId wenn Haken aktiviert wird
                        if (checked) {
                          form.setFieldValue('eskalationsPersonId', null);
                        }
                      }}
                      disabled={isPending}
                      containerClassName="items-start gap-3"
                      label={
                        <div className="flex-1">
                          <span className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                            <PiArrowUUpLeft className="h-4 w-4 text-status-warning-text" />
                            Eskalation nur an mich (Rückläufer)
                          </span>
                          <p className="mt-0.5 text-xs font-normal text-text-muted">Wenn aktiviert, geht jede Eskalation zurück an dich, statt an eine andere Person.</p>
                        </div>
                      }
                    />
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>

          {/* Story 4.1: Eskalationsperson - ausgeblendet wenn "Eskalation nur an mich" aktiv (Story 4.10) */}
          <form.Subscribe selector={(state) => state.values.eskalationNurAnErsteller}>
            {(eskalationNurAnErsteller) =>
              !eskalationNurAnErsteller && (
                <form.Field name="eskalationsPersonId">
                  {(field) => (
                    <div>
                      <label htmlFor="eskalationsPersonId" className="mb-1.5 block text-sm font-medium text-text-secondary">
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
              )
            }
          </form.Subscribe>

          {/* AC3: Optionale Beschreibung */}
          <form.Field name="beschreibung">
            {(field) => (
              <div>
                <label htmlFor="beschreibung" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Beschreibung <span className="text-xs text-text-muted">(optional)</span>
                </label>
                <Textarea
                  id="beschreibung"
                  placeholder="Zusaetzliche Details zur Erinnerung..."
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

          {/* Story 8.2: Kategorie-Auswahl */}
          <form.Field name="kategorieId">
            {(field) => (
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- KategorieSelector ist Custom-Komponente mit internem Select */}
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Kategorie <span className="text-xs text-text-muted">(optional)</span>
                </label>
                <KategorieSelector
                  einsatzId={einsatzId}
                  value={field.state.value}
                  onChange={(kategorieId) => field.handleChange(kategorieId)}
                  onBlur={field.handleBlur}
                  disabled={isPending}
                  error={field.state.meta.errors.length > 0 ? formatErrors(field.state.meta.errors) : undefined}
                />
              </div>
            )}
          </form.Field>

          {/* Story 2.6: Pflicht-Notiz Checkbox */}
          <form.Field name="requiresNote">
            {(field) => (
              <Checkbox
                id="requiresNote"
                checked={field.state.value ?? false}
                onChange={(checked) => field.handleChange(checked)}
                disabled={isPending}
                containerClassName="items-start gap-3"
                label={
                  <div className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                      <PiNotepad className="h-4 w-4 text-status-warning-text" />
                      Pflicht-Notiz bei Erledigung
                    </span>
                    <p className="mt-0.5 text-xs font-normal text-text-muted">Wenn aktiviert, muss bei Erledigung eine Dokumentations-Notiz eingegeben werden.</p>
                  </div>
                }
              />
            )}
          </form.Field>

          {/* Story 6.4: Wiederkehrend Toggle + Intervall */}
          <form.Field name="isRecurring">
            {(recurringField) => (
              <div className="space-y-3">
                <Checkbox
                  id="isRecurring"
                  checked={recurringField.state.value ?? false}
                  onChange={(checked) => recurringField.handleChange(checked)}
                  disabled={isPending}
                  containerClassName="items-start gap-3"
                  label={
                    <div className="flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                        <PiRepeat className="h-4 w-4 text-status-warning-text" />
                        Wiederkehrend
                      </span>
                      <p className="mt-0.5 text-xs font-normal text-text-muted">Erstellt automatisch eine neue Erinnerung nach Erledigung.</p>
                    </div>
                  }
                />

                {/* Conditional Recurring Options */}
                {recurringField.state.value && (
                  <div className="ml-8 space-y-4 rounded-panel border border-border-subtle bg-surface-raised p-4">
                    {/* Intervall-Chips */}
                    <form.Field name="recurringIntervalMinutes">
                      {(intervalField) => (
                        <div>
                          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Label fuer Button-Chip-Gruppe, kein Input-Element */}
                          <label className="mb-2 block text-sm font-medium text-text-secondary">
                            Intervall <span className="text-status-danger-text">*</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {RECURRING_INTERVAL_PRESETS.map((preset) => (
                              <button
                                key={preset.value}
                                type="button"
                                aria-pressed={intervalField.state.value === preset.value}
                                onClick={() => intervalField.handleChange(preset.value)}
                                disabled={isPending}
                                className={cn(
                                  'rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
                                  'focus:outline-none focus-visible:shadow-focus-ring',
                                  intervalField.state.value === preset.value
                                    ? 'bg-status-warning-text text-text-inverse shadow-md hover:opacity-90'
                                    : 'bg-surface-panel text-text-secondary hover:bg-action-secondary',
                                  isPending && 'cursor-not-allowed opacity-50',
                                )}
                              >
                                {preset.label}
                              </button>
                            ))}
                            {/* Eigene Intervall-Dauer als Inline-Chip-Input */}
                            <label
                              className={cn(
                                'rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
                                'focus-within:shadow-focus-ring',
                                'flex items-center gap-1',
                                intervalField.state.value && !RECURRING_INTERVAL_PRESETS.some((p) => p.value === intervalField.state.value)
                                  ? 'bg-status-warning-text text-text-inverse shadow-md'
                                  : 'bg-surface-panel text-text-secondary',
                                isPending && 'cursor-not-allowed opacity-50',
                              )}
                            >
                              <Input
                                type="number"
                                variant="inline"
                                inputSize="sm"
                                placeholder="__"
                                aria-label="Eigenes Intervall"
                                value={intervalField.state.value && !RECURRING_INTERVAL_PRESETS.some((p) => p.value === intervalField.state.value) ? intervalField.state.value : ''}
                                onChange={(e) => {
                                  const parsed = Number.parseInt(e.target.value, 10);
                                  const val = e.target.value && !Number.isNaN(parsed) ? parsed : undefined;
                                  intervalField.handleChange(val);
                                }}
                                disabled={isPending}
                                min={1}
                                max={1440}
                                className={cn(
                                  'w-12 text-center',
                                  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                                  intervalField.state.value && !RECURRING_INTERVAL_PRESETS.some((p) => p.value === intervalField.state.value)
                                    ? 'text-text-inverse placeholder:text-text-inverse/60'
                                    : 'text-text-secondary placeholder:text-text-muted',
                                )}
                              />
                              Min
                            </label>
                          </div>
                          {intervalField.state.meta.errors.length > 0 && <p className="mt-1 text-sm text-status-danger-text">{formatErrors(intervalField.state.meta.errors)}</p>}
                        </div>
                      )}
                    </form.Field>

                    {/* Ende-Bedingung */}
                    <form.Field name="recurringEndMode">
                      {(endModeField) => (
                        <div>
                          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Label fuer Radio-Button-Gruppe */}
                          <label className="mb-2 block text-sm font-medium text-text-secondary">Ende</label>
                          <RadioGroup
                            orientation="vertical"
                            value={endModeField.state.value}
                            onChange={(next) => endModeField.handleChange(next)}
                            disabled={isPending}
                            aria-label="Ende der Wiederholung"
                            options={[
                              { value: 'none', label: 'Kein Ende' },
                              { value: 'count', label: 'Nach' },
                              { value: 'date', label: 'Bis' },
                            ]}
                          />
                          {endModeField.state.value === 'count' && (
                            <form.Field name="recurringMaxCount">
                              {(maxCountField) => (
                                <div className="mt-2 ml-6 flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={maxCountField.state.value ?? ''}
                                    onChange={(e) => maxCountField.handleChange(e.target.value ? Number.parseInt(e.target.value, 10) : undefined)}
                                    disabled={isPending}
                                    className="w-20"
                                    min={1}
                                    max={100}
                                    placeholder="5"
                                  />
                                  <span className="text-sm text-text-secondary">Wiederholungen</span>
                                  {maxCountField.state.meta.errors.length > 0 && <p className="text-sm text-status-danger-text">{formatErrors(maxCountField.state.meta.errors)}</p>}
                                </div>
                              )}
                            </form.Field>
                          )}
                          {endModeField.state.value === 'date' && (
                            <form.Field name="recurringEndDate">
                              {(endDateField) => (
                                <div className="mt-2 ml-6 flex items-center gap-2">
                                  <Input
                                    type="datetime-local"
                                    value={endDateField.state.value ?? ''}
                                    onChange={(e) => endDateField.handleChange(e.target.value || undefined)}
                                    disabled={isPending}
                                    className="w-56"
                                  />
                                  {endDateField.state.meta.errors.length > 0 && <p className="text-sm text-status-danger-text">{formatErrors(endDateField.state.meta.errors)}</p>}
                                </div>
                              )}
                            </form.Field>
                          )}
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}
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
        <Button type="submit" form="quick-create-erinnerung-form" intent="primary" loading={isPending} disabled={isPending} kbd="Enter">
          Erinnerung erstellen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
