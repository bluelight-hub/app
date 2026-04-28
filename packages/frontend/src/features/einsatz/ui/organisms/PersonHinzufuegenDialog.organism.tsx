/**
 * Person Hinzufügen Dialog (Story 4-1 & 4-2)
 *
 * Dialog zur Registrierung einer Person für einen Einsatz.
 * Unterstützt zwei Modi:
 * - Manuell: Formular mit Autocomplete aus Stammdaten (Story 4-1)
 * - QR-Code: Scannen von DRK-QR-Codes für schnelle Registrierung (Story 4-2)
 *
 * @module features/einsatz/ui/organisms
 */

import { useRegistrierePerson } from '@/features/einsatz/api';
import { useStammPersonenSuche } from '@/features/einsatz/api/use-stamm-personen-suche';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { InlineSpinner } from '@/shared/ui/atoms/spinner.atom';
import { cn } from '@/shared/ui/cn';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react';
import type { StammPersonDto } from '@/shared';
import { debounce } from '@tanstack/pacer';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiCaretDown, PiCheck, PiQrCode, PiUser } from 'react-icons/pi';
import { toast } from 'sonner';
import { z } from 'zod';
import { QrScannerTab } from '@/features/einsatz';

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
  /** Optional: Callback nach erfolgreicher Person-Erstellung (z.B. für Auto-Select im Beitritts-Dialog) */
  onPersonCreated?: (person: { id: string; vorname: string; nachname: string; funkrufname?: string; funktion: string }) => void;
}

/**
 * Formular-Werte für Person hinzufügen
 */
type PersonFormValues = {
  vorname: string;
  nachname: string;
  funktion: string;
  funkrufname?: string;
  stammPersonId?: string; // Optional: ID der StammPerson aus Autocomplete
};

/**
 * Vordefinierte Funktionen für Dropdown
 * Häufig verwendete Rollen im Einsatz
 *
 * Hinweis (2026-04-28): Eigenschutz-spezifische Funktionen wie
 * "Sicherheitsbeauftragter" werden nicht mehr über das Person-Funktion-Feld
 * abgebildet — Eigenschutz-Rollen-Schicht wurde entfernt, Permission-Guard
 * ist die einzige verbleibende Autorisierungsquelle.
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
] as const;

/**
 * Dialog zum Hinzufügen einer Person für einen Einsatz
 *
 * Zwei Modi verfügbar (via Tabs):
 *
 * **Tab 1: Manuell (Story 4-1)**
 * Formular mit Pflichtfeldern:
 * - Vorname (1-100 Zeichen)
 * - Nachname (1-100 Zeichen, mit Autocomplete aus Stammdaten)
 * - Funktion (Dropdown mit vordefinierten Optionen)
 *
 * Optionale Felder:
 * - Funkrufname (max 50 Zeichen, wird aus Stammdaten befüllt wenn verfügbar)
 *
 * Autocomplete:
 * - Nachname-Feld mit Combobox und 300ms Debounce
 * - Auto-fill von Vorname und Funkrufname bei Auswahl einer StammPerson
 * - Speichert stammPersonId für Backend-Verknüpfung
 * - Manuelle Eingabe ohne Autocomplete möglich (stammPersonId = undefined)
 *
 * **Tab 2: QR-Code (Story 4-2)**
 * Scannen von DRK-QR-Codes für schnelle Registrierung:
 * - Automatische Kamera-Aktivierung
 * - DRK-Format Erkennung
 * - Automatische Registrierung ohne Bestätigung (AC4)
 * - Duplikat-Erkennung
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
export function PersonHinzufuegenDialog({ isOpen, onClose, einsatzId, onPersonCreated }: PersonHinzufuegenDialogProps) {
  // Tab State
  const [selectedTab, setSelectedTab] = useState(0);
  // Ref für Focus Management
  const vornameInputRef = useRef<HTMLInputElement>(null);

  // State für Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<StammPersonDto | null>(null);

  // Mutations
  const registrierePerson = useRegistrierePerson();

  // Debounce mit @tanstack/pacer (300ms)
  const debouncedSearch = useCallback(
    debounce(
      (value: string) => {
        setDebouncedQuery(value);
      },
      { wait: 300 },
    ),
    [],
  );

  // Trigger debounced callback when search query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Autocomplete Query
  const { data: stammPersonen, isLoading: isLoadingPersonen, error: stammPersonenError } = useStammPersonenSuche(debouncedQuery, { enabled: isOpen });

  /**
   * Zod Schema für Formular-Validierung
   */
  const personSchema = useMemo(
    () =>
      z.object({
        vorname: z.string().min(1, 'Vorname ist erforderlich').max(100, 'Vorname zu lang (max 100 Zeichen)'),
        nachname: z.string().min(1, 'Nachname ist erforderlich').max(100, 'Nachname zu lang (max 100 Zeichen)'),
        funktion: z.string().min(1, 'Funktion ist erforderlich').max(50, 'Funktion zu lang (max 50 Zeichen)'),
        funkrufname: z
          .string()
          .max(50, 'Funkrufname zu lang (max 50 Zeichen)')
          .transform((val) => (val.trim() === '' ? undefined : val))
          .optional(),
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
      stammPersonId: undefined,
    },
    validatorAdapter: zodValidator(),
    validators: {
      // onChange: Sofortiges Feedback bei Änderungen, aktualisiert canSubmit
      onChange: personSchema,
      // onBlur: Validierung beim Verlassen des Feldes (für initiale Fehlermeldungen)
      onBlur: personSchema,
    },
  });

  // Handle Autocomplete Selection (Auto-fill Vorname und Funkrufname)
  const handlePersonSelect = useCallback(
    (person: StammPersonDto | null) => {
      setSelectedPerson(person);

      if (person) {
        // Auto-fill Felder aus StammPerson
        form.setFieldValue('vorname', person.vorname || '');
        form.setFieldValue('nachname', person.nachname || '');
        form.setFieldValue('funkrufname', person.funkkenungBOS || '');
        form.setFieldValue('stammPersonId', person.id);

        // Setze Suchquery auf Nachname für bessere UX
        setSearchQuery(person.nachname || '');

        // Validierung manuell triggern nach setFieldValue (TanStack Form validiert nicht automatisch)
        void form.validateAllFields('change');
      } else {
        // Reset stammPersonId bei manueller Eingabe
        form.setFieldValue('stammPersonId', undefined);
      }
    },
    [form],
  );

  // Handle Registrierung
  const handleRegistrieren = useCallback(async () => {
    const values = form.state.values;
    const toastId = toast.loading('Person wird registriert…');

    try {
      const result = await registrierePerson.mutateAsync({
        einsatzId,
        vorname: values.vorname,
        nachname: values.nachname,
        funktion: values.funktion,
        funkrufname: values.funkrufname || undefined,
        stammPersonId: values.stammPersonId, // Optional: StammPerson-Verknüpfung
      });

      toast.success(`${values.vorname} ${values.nachname} registriert`, {
        id: toastId,
        description: 'Person wurde zum Einsatz hinzugefügt',
      });

      // Callback für Auto-Select (z.B. im Beitritts-Dialog)
      if (onPersonCreated && result?.data) {
        onPersonCreated({
          id: result.data.id,
          vorname: result.data.vorname,
          nachname: result.data.nachname,
          funkrufname: result.data.funkrufname ?? undefined,
          funktion: result.data.funktion,
        });
      }

      // Reset und schließen
      form.reset();
      setSearchQuery('');
      setSelectedPerson(null);
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
  }, [einsatzId, registrierePerson, form, onClose, onPersonCreated]);

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
      const { vorname, nachname, funktion } = form.state.values;
      if (isOpen && vorname && nachname && funktion && !registrierePerson.isPending) {
        handleRegistrieren();
      }
    },
    { enabled: isOpen },
  );

  // Reset bei Schließen
  const handleClose = useCallback(() => {
    form.reset();
    setSearchQuery('');
    setSelectedPerson(null);
    setSelectedTab(0); // Reset to manual tab
    onClose();
  }, [onClose, form]);

  // Handler für erfolgreiche QR-Registrierung
  const handleQrSuccess = useCallback((_personName: string) => {
    // Dialog bleibt offen für weitere Scans
    // Toast wird im QrScannerTab angezeigt
  }, []);

  // Focus Management: Set focus to first input when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let dialog animation complete
      const timer = setTimeout(() => {
        vornameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <div className="relative">
        <Dialog.CloseButton onClose={handleClose} />

        <Dialog.Title>
          <div className="flex items-center gap-2">
            <PiUser className="h-5 w-5 text-action-primary" />
            <span>Person hinzufügen</span>
          </div>
        </Dialog.Title>

        <Dialog.Body>
          <TabGroup selectedIndex={selectedTab} onChange={setSelectedTab}>
            <TabList className="mb-4 flex gap-1 rounded-lg bg-surface-raised p-1">
              <Tab
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                  'focus-visible:shadow-focus-ring focus-visible:outline-none',
                  'data-[selected]:bg-surface-panel data-[selected]:text-action-primary data-[selected]:shadow-sm',
                  'data-[hover]:text-text-primary',
                )}
              >
                <PiUser className="h-4 w-4" />
                Manuell
              </Tab>
              <Tab
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                  'focus-visible:shadow-focus-ring focus-visible:outline-none',
                  'data-[selected]:bg-surface-panel data-[selected]:text-action-primary data-[selected]:shadow-sm',
                  'data-[hover]:text-text-primary',
                )}
              >
                <PiQrCode className="h-4 w-4" />
                QR-Code
              </Tab>
            </TabList>

            <TabPanels>
              {/* Tab 1: Manuelle Eingabe */}
              <TabPanel>
                <p className="mb-4 text-body-sm text-text-secondary">Registrieren Sie eine Person für diesen Einsatz.</p>

                <form className="space-y-4">
                  {/* Vorname */}
                  <form.Field name="vorname">
                    {(field) => (
                      <FormField label="Vorname" required error={getFormErrors(field.state.meta.errors)} helperText="Vorname der Person">
                        <Input
                          ref={vornameInputRef}
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          disabled={registrierePerson.isPending}
                          placeholder="z.B. Max"
                          fullWidth
                          variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                        />
                      </FormField>
                    )}
                  </form.Field>

                  {/* Nachname (mit Autocomplete) */}
                  <form.Field name="nachname">
                    {(field) => (
                      <FormField label="Nachname" required error={getFormErrors(field.state.meta.errors)} helperText="Nachname der Person (mit Stammdaten-Suche)">
                        <Combobox as="div" value={selectedPerson} onChange={handlePersonSelect} disabled={registrierePerson.isPending}>
                          <div className="relative">
                            <ComboboxInput
                              aria-label="Nachname suchen"
                              className={cn(
                                'block w-full rounded-lg border bg-surface-raised px-4 py-3 pr-12 text-base font-medium text-text-primary',
                                'transition-all duration-200',
                                'border-border-subtle',
                                'placeholder:text-text-muted',
                                'focus-visible:shadow-focus-ring focus-visible:outline-none',
                                'sm:text-sm',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                                field.state.meta.errors.length > 0 && 'border-status-danger-border',
                              )}
                              placeholder="z.B. Mustermann (mit Stammdaten-Suche)"
                              onChange={(e) => {
                                const value = e.target.value;
                                setSearchQuery(value);
                                field.handleChange(value);
                                // Reset selection bei manueller Eingabe
                                if (selectedPerson && value !== selectedPerson.nachname) {
                                  setSelectedPerson(null);
                                  form.setFieldValue('stammPersonId', undefined);
                                }
                              }}
                              onBlur={field.handleBlur}
                              displayValue={(person: StammPersonDto | null) => person?.nachname || searchQuery}
                              autoComplete="off"
                              autoCorrect="off"
                              autoCapitalize="off"
                              spellCheck={false}
                              data-1p-ignore="true"
                              data-lpignore="true"
                              data-form-type="other"
                            />
                            <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-3">
                              {isLoadingPersonen ? <InlineSpinner size="sm" /> : <PiCaretDown className="h-5 w-5 text-text-muted" aria-hidden="true" />}
                            </ComboboxButton>

                            <ComboboxOptions
                              transition
                              className={cn(
                                'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-surface-panel py-1 text-base shadow-panel',
                                'border border-border-subtle',
                                'data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0',
                                'sm:text-sm',
                              )}
                            >
                              {/* Loading State */}
                              {isLoadingPersonen && (
                                <div className="flex items-center justify-center gap-2 px-4 py-8 text-text-secondary">
                                  <InlineSpinner size="sm" />
                                  <span>Suche läuft…</span>
                                </div>
                              )}

                              {/* Error State */}
                              {!isLoadingPersonen && stammPersonenError && (
                                <div className="px-4 py-4 text-center text-body-sm text-status-danger-text">Fehler beim Laden der Stammdaten. Bitte versuchen Sie es erneut.</div>
                              )}

                              {/* No Results */}
                              {!isLoadingPersonen && !stammPersonenError && (!stammPersonen || stammPersonen.length === 0) && (
                                <output className="block px-4 py-4 text-center text-body-sm text-text-secondary" aria-live="polite">
                                  Keine Personen gefunden
                                </output>
                              )}

                              {/* Results */}
                              {!isLoadingPersonen &&
                                stammPersonen &&
                                stammPersonen.length > 0 &&
                                stammPersonen.map((person) => (
                                  <ComboboxOption
                                    key={person.id}
                                    value={person}
                                    className={cn(
                                      'relative cursor-default py-3 pr-9 pl-4 select-none',
                                      'data-[focus]:bg-action-primary data-[focus]:text-text-inverse data-[focus]:outline-none',
                                      'text-text-primary',
                                    )}
                                  >
                                    {({ selected, focus }) => (
                                      <>
                                        <div className="flex flex-col">
                                          <span className={cn('truncate font-medium', selected && 'font-semibold')}>
                                            {person.nachname}, {person.vorname}
                                          </span>
                                          {person.funkkenungBOS && (
                                            <span className={cn('mt-0.5 text-body-sm', focus ? 'text-text-inverse/90' : 'text-text-secondary')}>Funkkennung: {person.funkkenungBOS}</span>
                                          )}
                                        </div>

                                        {selected && (
                                          <span className={cn('absolute inset-y-0 right-0 flex items-center pr-4', focus ? 'text-text-inverse' : 'text-action-primary')}>
                                            <PiCheck className="h-5 w-5" aria-hidden="true" />
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </ComboboxOption>
                                ))}
                            </ComboboxOptions>
                          </div>
                        </Combobox>
                      </FormField>
                    )}
                  </form.Field>

                  {/* Funktion (Listbox) */}
                  <form.Field name="funktion">
                    {(field) => (
                      <FormField label="Funktion" required error={getFormErrors(field.state.meta.errors)} helperText="Rolle/Funktion im Einsatz">
                        <Listbox as="div" value={field.state.value} onChange={(val) => field.handleChange(val)} disabled={registrierePerson.isPending}>
                          <div className="relative mt-2">
                            <ListboxButton
                              aria-label="Funktion auswählen"
                              className={cn(
                                'relative w-full cursor-default rounded-lg border bg-surface-raised py-3 pr-10 pl-4 text-left text-base font-medium text-text-primary',
                                'transition-all duration-200',
                                'border-border-subtle',
                                'focus-visible:shadow-focus-ring focus-visible:outline-none',
                                'sm:text-sm',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                                field.state.meta.errors.length > 0 && 'border-status-danger-border',
                              )}
                            >
                              <span className="block truncate">{field.state.value || 'Funktion wählen…'}</span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <PiCaretDown className="h-5 w-5 text-text-muted" aria-hidden="true" />
                              </span>
                            </ListboxButton>
                            <ListboxOptions
                              transition
                              className={cn(
                                'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-surface-panel py-1 text-base shadow-panel',
                                'border border-border-subtle',
                                'data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0',
                                'sm:text-sm',
                              )}
                            >
                              {FUNKTIONEN.map((funktion) => (
                                <ListboxOption
                                  key={funktion}
                                  value={funktion}
                                  className={cn(
                                    'relative cursor-default py-3 pr-9 pl-4 select-none',
                                    'data-[focus]:bg-action-primary data-[focus]:text-text-inverse data-[focus]:outline-none',
                                    'text-text-primary',
                                  )}
                                >
                                  {({ selected, focus }) => (
                                    <>
                                      <span className={cn('block truncate', selected && 'font-semibold')}>{funktion}</span>
                                      {selected && (
                                        <span className={cn('absolute inset-y-0 right-0 flex items-center pr-4', focus ? 'text-text-inverse' : 'text-action-primary')}>
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
                        <Input
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          disabled={registrierePerson.isPending}
                          placeholder="z.B. GF"
                          fullWidth
                          variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                        />
                      </FormField>
                    )}
                  </form.Field>

                  {/* Info Box */}
                  <div className="rounded-lg border border-status-info-border bg-status-info-surface p-3">
                    <p className="text-body-sm text-status-info-text">Person wird für diesen Einsatz registriert. Ein ETB-Eintrag wird automatisch erstellt.</p>
                  </div>
                </form>
              </TabPanel>

              {/* Tab 2: QR-Code Scanner */}
              <TabPanel>
                <QrScannerTab einsatzId={einsatzId} onSuccess={handleQrSuccess} isActive={selectedTab === 1} />
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </Dialog.Body>

        {/* Footer nur für manuelle Eingabe anzeigen */}
        {selectedTab === 0 && (
          <Dialog.Footer loading={registrierePerson.isPending}>
            <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={registrierePerson.isPending}>
              Abbrechen
            </Button>
            <Button
              intent="primary"
              onClick={handleRegistrieren}
              disabled={
                // Prüfe ob alle Pflichtfelder ausgefüllt sind (robuster als canSubmit)
                !form.state.values.vorname || !form.state.values.nachname || !form.state.values.funktion || registrierePerson.isPending
              }
              loading={registrierePerson.isPending}
            >
              Person hinzufügen
            </Button>
          </Dialog.Footer>
        )}

        {/* Footer für QR-Tab (nur Schließen-Button) */}
        {selectedTab === 1 && (
          <Dialog.Footer>
            <Button intent="secondary" appearance="ghost" onClick={handleClose}>
              Schließen
            </Button>
          </Dialog.Footer>
        )}
      </div>
    </Dialog>
  );
}
