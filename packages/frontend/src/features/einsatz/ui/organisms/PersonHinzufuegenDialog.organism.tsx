/**
 * Person Hinzufügen Dialog (Story 4-1)
 *
 * Dialog zur manuellen Registrierung einer Person für einen Einsatz.
 * Implementiert:
 * - Story 4-1: Person manuell registrieren (Vorname, Nachname, Funktion, Funkrufname)
 *
 * @module features/einsatz/ui/organisms
 */

import { useRegistrierePerson } from '@/features/einsatz/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { cn } from '@/shared/ui/cn';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useCallback, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiCaretDown, PiCheck, PiUser } from 'react-icons/pi';
import { toast } from 'sonner';
import { z } from 'zod';

/**
 * Extrahiert Fehlermeldungen aus TanStack Form Errors (Zod-Validierung).
 * TanStack Form mit zodValidator gibt Objekte mit `message` Property zurück.
 */
function getFormErrors(errors: unknown[]): string {
  return errors
    .map((e) => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message;
      return '';
    })
    .filter(Boolean)
    .join(', ');
}

interface PersonHinzufuegenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  einsatzId: string;
}

/**
 * Formular-Werte für Person hinzufügen
 */
type PersonFormValues = {
  vorname: string;
  nachname: string;
  funktion: string;
  funkrufname?: string;
};

/**
 * Vordefinierte Funktionen für Dropdown
 * Häufig verwendete Rollen im Einsatz
 */
const FUNKTIONEN = [
  'Helfer',
  'Rettungshelfer',
  'Rettungssanitäter',
  'Rettungsassistent',
  'Notfallsanitäter',
  'Truppführer',
  'Gruppenführer',
  'Zugführer',
  'Einsatzleiter',
  'Verbindungsführer',
  'Sicherheitsbeauftragter',
] as const;

/**
 * Dialog zum Hinzufügen einer Person für einen Einsatz
 *
 * Formular mit Pflichtfeldern:
 * - Vorname (1-100 Zeichen)
 * - Nachname (1-100 Zeichen)
 * - Funktion (Dropdown mit vordefinierten Optionen)
 *
 * Optionale Felder:
 * - Funkrufname (max 50 Zeichen)
 *
 * Nutzt @tanstack/react-form mit Zod-Validierung für Client-Side Validation.
 * Server-Side Validierung erfolgt im Backend (409 Conflict bei Duplikaten).
 *
 * @example
 * ```tsx
 * <PersonHinzufuegenDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   einsatzId={einsatzId}
 * />
 * ```
 */
export function PersonHinzufuegenDialog({ isOpen, onClose, einsatzId }: PersonHinzufuegenDialogProps) {
  const registrierePerson = useRegistrierePerson();

  /**
   * Zod Schema für Formular-Validierung
   */
  const personSchema = useMemo(
    () =>
      z.object({
        vorname: z.string().min(1, 'Vorname ist erforderlich').max(100, 'Vorname zu lang (max 100 Zeichen)'),
        nachname: z.string().min(1, 'Nachname ist erforderlich').max(100, 'Nachname zu lang (max 100 Zeichen)'),
        funktion: z.string().min(1, 'Funktion ist erforderlich').max(50, 'Funktion zu lang (max 50 Zeichen)'),
        funkrufname: z.string().max(50, 'Funkrufname zu lang (max 50 Zeichen)').optional(),
      }),
    [],
  );

  // Form für Person
  const form = useForm<PersonFormValues>({
    defaultValues: {
      vorname: '',
      nachname: '',
      funktion: 'Helfer',
      funkrufname: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: personSchema,
    },
  });

  // Handle Registrierung
  const handleRegistrieren = useCallback(async () => {
    const values = form.state.values;
    const toastId = toast.loading('Person wird registriert…');

    try {
      await registrierePerson.mutateAsync({
        einsatzId,
        vorname: values.vorname,
        nachname: values.nachname,
        funktion: values.funktion,
        funkrufname: values.funkrufname || undefined,
      });

      toast.success(`${values.vorname} ${values.nachname} registriert`, {
        id: toastId,
        description: 'Person wurde zum Einsatz hinzugefügt',
      });

      // Reset und schließen
      form.reset();
      onClose();
    } catch (error) {
      // 409 Conflict = Duplikat (Person bereits registriert)
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error('Person bereits registriert', {
          id: toastId,
          description: `${values.vorname} ${values.nachname} ist bereits in diesem Einsatz registriert`,
        });
      } else {
        toast.error('Fehler beim Registrieren', {
          id: toastId,
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
      // Dialog bleibt offen bei Fehler
    }
  }, [einsatzId, registrierePerson, form, onClose]);

  // Keyboard Shortcuts
  useHotkeys(
    'esc',
    () => {
      if (isOpen) onClose();
    },
    { enabled: isOpen },
  );

  useHotkeys(
    'mod+enter',
    () => {
      if (isOpen && form.state.canSubmit && !registrierePerson.isPending) {
        handleRegistrieren();
      }
    },
    { enabled: isOpen },
  );

  // Reset bei Schließen
  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [onClose, form]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <div className="relative">
        <Dialog.CloseButton onClose={handleClose} />

        <Dialog.Title>
          <div className="flex items-center gap-2">
            <PiUser className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <span>Person hinzufügen</span>
          </div>
        </Dialog.Title>

        <Dialog.Body>
          <p className="mb-4 text-gray-600 text-sm dark:text-gray-400">Registrieren Sie eine Person für diesen Einsatz.</p>

          <form className="space-y-4">
            {/* Vorname */}
            <form.Field name="vorname">
              {(field) => (
                <FormField label="Vorname" required error={getFormErrors(field.state.meta.errors)} helperText="Vorname der Person">
                  <input
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={registrierePerson.isPending}
                    placeholder="z.B. Max"
                    className={cn(
                      'block w-full rounded-lg border-2 bg-gray-50 px-4 py-3 font-medium text-base text-gray-900',
                      'transition-all duration-200',
                      'border-gray-200',
                      'placeholder:text-gray-400',
                      'focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500 focus:ring-opacity-20',
                      'sm:text-sm',
                      'dark:border-gray-700 dark:bg-gray-900 dark:text-white',
                      'dark:focus:border-primary-400 dark:focus:bg-gray-800 dark:focus:ring-primary-400 dark:placeholder:text-gray-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      field.state.meta.errors.length > 0 && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                    )}
                  />
                </FormField>
              )}
            </form.Field>

            {/* Nachname */}
            <form.Field name="nachname">
              {(field) => (
                <FormField label="Nachname" required error={getFormErrors(field.state.meta.errors)} helperText="Nachname der Person">
                  <input
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={registrierePerson.isPending}
                    placeholder="z.B. Mustermann"
                    className={cn(
                      'block w-full rounded-lg border-2 bg-gray-50 px-4 py-3 font-medium text-base text-gray-900',
                      'transition-all duration-200',
                      'border-gray-200',
                      'placeholder:text-gray-400',
                      'focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500 focus:ring-opacity-20',
                      'sm:text-sm',
                      'dark:border-gray-700 dark:bg-gray-900 dark:text-white',
                      'dark:focus:border-primary-400 dark:focus:bg-gray-800 dark:focus:ring-primary-400 dark:placeholder:text-gray-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      field.state.meta.errors.length > 0 && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                    )}
                  />
                </FormField>
              )}
            </form.Field>

            {/* Funktion (Listbox) */}
            <form.Field name="funktion">
              {(field) => (
                <FormField label="Funktion" required error={getFormErrors(field.state.meta.errors)} helperText="Rolle/Funktion im Einsatz">
                  <Listbox value={field.state.value} onChange={(val) => field.handleChange(val)} disabled={registrierePerson.isPending}>
                    <div className="relative mt-2">
                      <ListboxButton
                        className={cn(
                          'relative w-full cursor-default rounded-lg border-2 bg-gray-50 py-3 pr-10 pl-4 text-left font-medium text-base text-gray-900',
                          'transition-all duration-200',
                          'border-gray-200',
                          'focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500 focus:ring-opacity-20',
                          'sm:text-sm',
                          'dark:border-gray-700 dark:bg-gray-900 dark:text-white',
                          'dark:focus:border-primary-400 dark:focus:bg-gray-800 dark:focus:ring-primary-400',
                          'disabled:cursor-not-allowed disabled:opacity-50',
                          field.state.meta.errors.length > 0 && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                        )}
                      >
                        <span className="block truncate">{field.state.value || 'Funktion wählen…'}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <PiCaretDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </ListboxButton>
                      <ListboxOptions
                        transition
                        className={cn(
                          'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg',
                          'border border-gray-200',
                          'data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in',
                          'sm:text-sm',
                          'dark:border-gray-700 dark:bg-gray-800',
                        )}
                      >
                        {FUNKTIONEN.map((funktion) => (
                          <ListboxOption
                            key={funktion}
                            value={funktion}
                            className={cn(
                              'relative cursor-default select-none py-3 pr-9 pl-4',
                              'data-[focus]:bg-primary-600 data-[focus]:text-white data-[focus]:outline-none',
                              'dark:text-gray-200 dark:data-[focus]:bg-primary-500',
                            )}
                          >
                            {({ selected, focus }) => (
                              <>
                                <span className={cn('block truncate', selected && 'font-semibold')}>{funktion}</span>
                                {selected && (
                                  <span className={cn('absolute inset-y-0 right-0 flex items-center pr-4', focus ? 'text-white' : 'text-primary-600 dark:text-primary-400')}>
                                    <PiCheck className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                )}
                              </>
                            )}
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </div>
                  </Listbox>
                </FormField>
              )}
            </form.Field>

            {/* Funkrufname (Optional) */}
            <form.Field name="funkrufname">
              {(field) => (
                <FormField label="Funkrufname" error={getFormErrors(field.state.meta.errors)} helperText="Optional: Funkrufname für diese Person">
                  <input
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={registrierePerson.isPending}
                    placeholder="z.B. GF"
                    className={cn(
                      'block w-full rounded-lg border-2 bg-gray-50 px-4 py-3 font-medium text-base text-gray-900',
                      'transition-all duration-200',
                      'border-gray-200',
                      'placeholder:text-gray-400',
                      'focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500 focus:ring-opacity-20',
                      'sm:text-sm',
                      'dark:border-gray-700 dark:bg-gray-900 dark:text-white',
                      'dark:focus:border-primary-400 dark:focus:bg-gray-800 dark:focus:ring-primary-400 dark:placeholder:text-gray-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      field.state.meta.errors.length > 0 && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                    )}
                  />
                </FormField>
              )}
            </form.Field>

            {/* Info Box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-blue-900 text-sm dark:text-blue-100">Person wird für diesen Einsatz registriert. Ein ETB-Eintrag wird automatisch erstellt.</p>
            </div>
          </form>
        </Dialog.Body>

        <Dialog.Footer loading={registrierePerson.isPending}>
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={registrierePerson.isPending}>
            Abbrechen
          </Button>
          <Button intent="primary" onClick={handleRegistrieren} disabled={!form.state.canSubmit || registrierePerson.isPending} loading={registrierePerson.isPending}>
            Person hinzufügen
          </Button>
        </Dialog.Footer>
      </div>
    </Dialog>
  );
}
