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
import { Input } from '@/shared/ui/atoms/input.atom';
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
        <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
          <PiAlarm className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-amber-700 text-sm dark:bg-amber-900/20 dark:text-amber-400">
            <PiNotepad className="h-4 w-4 flex-shrink-0" />
            <span>Diese Erinnerung wird aus der Notiz erstellt. Die Notiz bleibt bestehen.</span>
          </div>
        )}

        {/* Story 5.4: ETB-Verknuepfungs-Hinweis */}
        {fromEtb && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-blue-700 text-sm dark:bg-blue-900/20 dark:text-blue-400">
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
          className="space-y-5"
        >
          {/* AC2: Titel-Eingabe */}
          <form.Field name="titel">
            {(field) => (
              <div>
                <label htmlFor="titel" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Titel <span className="text-red-500">*</span>
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
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-sm dark:text-red-400">{formatErrors(field.state.meta.errors)}</p>}
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
                        <legend className="mb-2 font-medium text-gray-700 text-sm dark:text-gray-300">
                          Erinnern in <span className="text-red-500">*</span>
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
                                'min-h-[48px] rounded-full px-4 py-2 font-medium text-sm transition-all duration-200',
                                'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                                timeModeField.state.value === 'preset' && minutenField.state.value === preset.value
                                  ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                                isPending && 'cursor-not-allowed opacity-50',
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}

                          {/* Eigene Dauer als Inline-Chip-Input (immer sichtbar) */}
                          <label
                            className={cn(
                              'min-h-[48px] rounded-full px-4 py-2 font-medium text-sm transition-all duration-200',
                              'focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-800',
                              'flex items-center gap-1',
                              timeModeField.state.value === 'preset' && minutenField.state.value !== undefined && !TIME_PRESETS.some((p) => p.value === minutenField.state.value)
                                ? 'bg-amber-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                              isPending && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            <input
                              id="custom-duration-input"
                              type="number"
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
                                'w-12 bg-transparent text-center font-medium text-sm focus:outline-none',
                                '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                                timeModeField.state.value === 'preset' && minutenField.state.value !== undefined && !TIME_PRESETS.some((p) => p.value === minutenField.state.value)
                                  ? 'text-white placeholder:text-white/60'
                                  : 'text-gray-700 placeholder:text-gray-400 dark:text-gray-300 dark:placeholder:text-gray-500',
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
                              'min-h-[48px] rounded-full px-4 py-2 font-medium text-sm transition-all duration-200',
                              'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                              'flex items-center gap-1.5',
                              timeModeField.state.value === 'custom'
                                ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
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
                            <label htmlFor="custom-time-input" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                              Uhrzeit eingeben
                            </label>
                            <TimeInput
                              id="custom-time-input"
                              value={customTimeField.state.value ?? getDefaultCustomTime()}
                              onChange={(newTime) => customTimeField.handleChange(newTime)}
                              disabled={isPending}
                              error={customTimeField.state.meta.errors.length > 0}
                            />
                            {customTimeField.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-sm dark:text-red-400">{formatErrors(customTimeField.state.meta.errors)}</p>}
                          </div>
                        )}

                        {/* Validation Errors für minuten (bei preset mode) */}
                        {timeModeField.state.value === 'preset' && minutenField.state.meta.errors.length > 0 && (
                          <p className="mt-1 text-red-600 text-sm dark:text-red-400">{formatErrors(minutenField.state.meta.errors)}</p>
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
                <label htmlFor="assignedToId" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Zuweisen an <span className="text-gray-400 text-xs">(optional)</span>
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
                <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">Leer lassen für alle Teilnehmer</p>
              </div>
            )}
          </form.Field>

          {/* Story 4.10: Eskalation nur an Ersteller Checkbox - nur sichtbar wenn Zuweisung gesetzt */}
          <form.Subscribe selector={(state) => state.values.assignedToId}>
            {(assignedToId) =>
              assignedToId && (
                <form.Field name="eskalationNurAnErsteller">
                  {(field) => (
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 items-center">
                        <input
                          id="eskalationNurAnErsteller"
                          type="checkbox"
                          checked={field.state.value ?? false}
                          onChange={(e) => {
                            field.handleChange(e.target.checked);
                            // Story 4.10: Reset eskalationsPersonId wenn Haken aktiviert wird
                            if (e.target.checked) {
                              form.setFieldValue('eskalationsPersonId', null);
                            }
                          }}
                          disabled={isPending}
                          className={cn(
                            'h-5 w-5 rounded border-2 text-amber-500',
                            'focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            'dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-offset-gray-900',
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="eskalationNurAnErsteller" className="flex cursor-pointer items-center gap-2 font-medium text-gray-700 text-sm dark:text-gray-300">
                          <PiArrowUUpLeft className="h-4 w-4 text-amber-500" />
                          Eskalation nur an mich (Rückläufer)
                        </label>
                        <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">Wenn aktiviert, geht jede Eskalation zurück an dich, statt an eine andere Person.</p>
                      </div>
                    </div>
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
                      <label htmlFor="eskalationsPersonId" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                        Eskalation an <span className="text-gray-400 text-xs">(optional)</span>
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
                      <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">Wird benachrichtigt, wenn Zuweisungsempfänger nicht reagiert</p>
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
                <label htmlFor="beschreibung" className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Beschreibung <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <textarea
                  id="beschreibung"
                  placeholder="Zusaetzliche Details zur Erinnerung..."
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || undefined)}
                  disabled={isPending}
                  maxLength={500}
                  rows={3}
                  className={cn(
                    'block w-full rounded-lg border-2 bg-white px-4 py-2.5 font-medium text-gray-900 transition-colors duration-200',
                    'placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-opacity-20',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500',
                    'resize-none',
                    // Error state styling (consistent with Input component)
                    field.state.meta.errors.length > 0
                      ? [
                          'border-red-500 hover:border-red-600',
                          'focus:border-red-500 focus:bg-white focus:ring-red-500',
                          'dark:border-red-400 dark:hover:border-red-500',
                          'dark:focus:border-red-400 dark:focus:bg-gray-900 dark:focus:ring-red-400',
                        ]
                      : [
                          'border-gray-300 hover:border-gray-400',
                          'focus:border-primary-500 focus:bg-white focus:ring-primary-500',
                          'dark:border-gray-700 dark:hover:border-gray-600',
                          'dark:focus:border-primary-400 dark:focus:bg-gray-900 dark:focus:ring-primary-400',
                        ],
                  )}
                />
                {field.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-sm dark:text-red-400">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* Story 8.2: Kategorie-Auswahl */}
          <form.Field name="kategorieId">
            {(field) => (
              <div>
                {/* biome-ignore lint/a11y/noLabelWithoutControl: KategorieSelector ist Custom-Komponente mit internem Select */}
                <label className="mb-1.5 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Kategorie <span className="text-gray-400 text-xs">(optional)</span>
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
              <div className="flex items-start gap-3">
                <div className="flex h-6 items-center">
                  <input
                    id="requiresNote"
                    type="checkbox"
                    checked={field.state.value ?? false}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    disabled={isPending}
                    className={cn(
                      'h-5 w-5 rounded border-2 text-amber-500',
                      'focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      'dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-offset-gray-900',
                    )}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="requiresNote" className="flex cursor-pointer items-center gap-2 font-medium text-gray-700 text-sm dark:text-gray-300">
                    <PiNotepad className="h-4 w-4 text-amber-500" />
                    Pflicht-Notiz bei Erledigung
                  </label>
                  <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">Wenn aktiviert, muss bei Erledigung eine Dokumentations-Notiz eingegeben werden.</p>
                </div>
              </div>
            )}
          </form.Field>

          {/* Story 6.4: Wiederkehrend Toggle + Intervall */}
          <form.Field name="isRecurring">
            {(recurringField) => (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 items-center">
                    <input
                      id="isRecurring"
                      type="checkbox"
                      checked={recurringField.state.value ?? false}
                      onChange={(e) => recurringField.handleChange(e.target.checked)}
                      disabled={isPending}
                      className={cn(
                        'h-5 w-5 rounded border-2 text-amber-500',
                        'focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-offset-gray-900',
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="isRecurring" className="flex cursor-pointer items-center gap-2 font-medium text-gray-700 text-sm dark:text-gray-300">
                      <PiRepeat className="h-4 w-4 text-amber-500" />
                      Wiederkehrend
                    </label>
                    <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">Erstellt automatisch eine neue Erinnerung nach Erledigung.</p>
                  </div>
                </div>

                {/* Conditional Recurring Options */}
                {recurringField.state.value && (
                  <div className="ml-8 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    {/* Intervall-Chips */}
                    <form.Field name="recurringIntervalMinutes">
                      {(intervalField) => (
                        <div>
                          {/* biome-ignore lint/a11y/noLabelWithoutControl: Label fuer Button-Chip-Gruppe, kein Input-Element */}
                          <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                            Intervall <span className="text-red-500">*</span>
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
                                  'rounded-full px-3 py-1.5 font-medium text-sm transition-all duration-200',
                                  'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                                  intervalField.state.value === preset.value
                                    ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                                  isPending && 'cursor-not-allowed opacity-50',
                                )}
                              >
                                {preset.label}
                              </button>
                            ))}
                            {/* Eigene Intervall-Dauer als Inline-Chip-Input */}
                            <label
                              className={cn(
                                'rounded-full px-3 py-1.5 font-medium text-sm transition-all duration-200',
                                'focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-800',
                                'flex items-center gap-1',
                                intervalField.state.value && !RECURRING_INTERVAL_PRESETS.some((p) => p.value === intervalField.state.value)
                                  ? 'bg-amber-500 text-white shadow-md'
                                  : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                                isPending && 'cursor-not-allowed opacity-50',
                              )}
                            >
                              <input
                                type="number"
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
                                  'w-12 bg-transparent text-center font-medium text-sm focus:outline-none',
                                  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                                  intervalField.state.value && !RECURRING_INTERVAL_PRESETS.some((p) => p.value === intervalField.state.value)
                                    ? 'text-white placeholder:text-white/60'
                                    : 'text-gray-700 placeholder:text-gray-400 dark:text-gray-300 dark:placeholder:text-gray-500',
                                )}
                              />
                              Min
                            </label>
                          </div>
                          {intervalField.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-sm dark:text-red-400">{formatErrors(intervalField.state.meta.errors)}</p>}
                        </div>
                      )}
                    </form.Field>

                    {/* Ende-Bedingung */}
                    <form.Field name="recurringEndMode">
                      {(endModeField) => (
                        <div>
                          {/* biome-ignore lint/a11y/noLabelWithoutControl: Label fuer Radio-Button-Gruppe */}
                          <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">Ende</label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="recurringEndMode"
                                value="none"
                                checked={endModeField.state.value === 'none'}
                                onChange={() => endModeField.handleChange('none')}
                                disabled={isPending}
                                className="h-4 w-4 text-amber-500 focus:ring-amber-500 dark:bg-gray-800"
                              />
                              <span className="text-gray-700 text-sm dark:text-gray-300">Kein Ende</span>
                            </label>

                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="recurringEndMode"
                                value="count"
                                checked={endModeField.state.value === 'count'}
                                onChange={() => endModeField.handleChange('count')}
                                disabled={isPending}
                                className="h-4 w-4 text-amber-500 focus:ring-amber-500 dark:bg-gray-800"
                              />
                              <span className="text-gray-700 text-sm dark:text-gray-300">Nach</span>
                              {endModeField.state.value === 'count' && (
                                <form.Field name="recurringMaxCount">
                                  {(maxCountField) => (
                                    <>
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
                                      <span className="text-gray-700 text-sm dark:text-gray-300">Wiederholungen</span>
                                      {maxCountField.state.meta.errors.length > 0 && <p className="text-red-600 text-sm dark:text-red-400">{formatErrors(maxCountField.state.meta.errors)}</p>}
                                    </>
                                  )}
                                </form.Field>
                              )}
                            </label>

                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="recurringEndMode"
                                value="date"
                                checked={endModeField.state.value === 'date'}
                                onChange={() => endModeField.handleChange('date')}
                                disabled={isPending}
                                className="h-4 w-4 text-amber-500 focus:ring-amber-500 dark:bg-gray-800"
                              />
                              <span className="text-gray-700 text-sm dark:text-gray-300">Bis</span>
                              {endModeField.state.value === 'date' && (
                                <form.Field name="recurringEndDate">
                                  {(endDateField) => (
                                    <>
                                      <Input
                                        type="datetime-local"
                                        value={endDateField.state.value ?? ''}
                                        onChange={(e) => endDateField.handleChange(e.target.value || undefined)}
                                        disabled={isPending}
                                        className="w-56"
                                      />
                                      {endDateField.state.meta.errors.length > 0 && <p className="text-red-600 text-sm dark:text-red-400">{formatErrors(endDateField.state.meta.errors)}</p>}
                                    </>
                                  )}
                                </form.Field>
                              )}
                            </label>
                          </div>
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}
              </div>
            )}
          </form.Field>

          {/* API Error Message */}
          {apiErrorMessage && <div className="rounded-lg bg-red-50 p-3 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">{apiErrorMessage}</div>}
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
