/**
 * Fahrzeug Hinzufügen Dialog (Story 3-1 & 3-2)
 *
 * Dialog zur Auswahl eines Fahrzeugs aus Stammdaten oder Erfassung eines temporären Fahrzeugs.
 * Implementiert:
 * - Story 3-1: Stammdaten-Fahrzeug auswählen
 * - Story 3-2: Temporäres Fahrzeug erfassen
 *
 * @module features/einsatz/ui/organisms
 */

import { useEinsatzFahrzeuge, useErfasseFahrzeugAusStammdaten, useErfasseTemporalesFahrzeug, useFahrzeugtypen, useStammFahrzeuge } from '@/features/einsatz/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { InlineSpinner } from '@/shared/ui/atoms/spinner.atom';
import { cn } from '@/shared/ui/cn';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Combobox as HeadlessCombobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Label, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import type { StammFahrzeugDto } from '@/shared';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useCallback, useMemo, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiCaretDown, PiCheck, PiPlus, PiTruck, PiWarning } from 'react-icons/pi';
import { toast } from 'sonner';
import { useDebouncedCallback } from 'use-debounce';
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

interface FahrzeugHinzufuegenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  einsatzId: string;
}

/**
 * Base Type für temporäres Fahrzeug Formular
 * (Schema wird in Komponente mit Duplikat-Check definiert)
 */
type TemporalFahrzeugFormValues = {
  funkrufname: string;
  fahrzeugtypId: string;
  kennzeichen?: string;
};

/**
 * Dialog zum Hinzufügen eines Fahrzeugs (Stammdaten oder Temporär)
 *
 * Tab 1 (Aus Stammdaten):
 * - Zeigt durchsuchbare Combobox mit allen nicht-archivierten Stamm-Fahrzeugen
 * - Fahrzeuge die bereits im Einsatz erfasst sind, werden als disabled angezeigt
 *
 * Tab 2 (Temporär):
 * - Formular für temporäres Fahrzeug (funkrufname, fahrzeugtypId, optional kennzeichen)
 * - Nutzt @tanstack/react-form mit Zod-Validierung
 *
 * @example
 * ```tsx
 * <FahrzeugHinzufuegenDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   einsatzId={einsatzId}
 * />
 * ```
 */
export function FahrzeugHinzufuegenDialog({ isOpen, onClose, einsatzId }: FahrzeugHinzufuegenDialogProps) {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedFahrzeug, setSelectedFahrzeug] = useState<StammFahrzeugDto | null>(null);

  // Queries
  const { data: stammFahrzeuge, isLoading: isLoadingStamm } = useStammFahrzeuge({ enabled: isOpen });
  const { data: einsatzFahrzeuge } = useEinsatzFahrzeuge(einsatzId, { enabled: isOpen });
  const { data: fahrzeugtypen, isLoading: isLoadingFahrzeugtypen } = useFahrzeugtypen({ enabled: isOpen && selectedTabIndex === 1 });

  // Mutations
  const erfasseFahrzeug = useErfasseFahrzeugAusStammdaten();
  const erfasseTemporales = useErfasseTemporalesFahrzeug();

  // Set mit bereits erfassten Funkrufnamen für schnelle Duplikat-Prüfung
  const erfassteFunkrufnamen = useMemo(() => {
    if (!einsatzFahrzeuge) return new Set<string>();
    return new Set(einsatzFahrzeuge.map((fz) => fz.funkrufname.toLowerCase()));
  }, [einsatzFahrzeuge]);

  /**
   * Zod Schema für temporäres Fahrzeug Formular mit Duplikat-Check
   * Muss nach erfassteFunkrufnamen berechnet werden, da es auf diesem State basiert
   */
  const temporalFahrzeugSchema = useMemo(
    () =>
      z.object({
        funkrufname: z
          .string()
          .min(1, 'Funkrufname ist erforderlich')
          .max(100, 'Funkrufname zu lang (max 100 Zeichen)')
          .refine((val) => !erfassteFunkrufnamen.has(val.trim().toLowerCase()), 'Fahrzeug mit diesem Funkrufnamen bereits im Einsatz erfasst'),
        fahrzeugtypId: z.string().min(1, 'Fahrzeugtyp ist erforderlich'),
        kennzeichen: z.string().max(20, 'Kennzeichen zu lang (max 20 Zeichen)').optional(),
      }),
    [erfassteFunkrufnamen],
  );

  // Form für temporäres Fahrzeug
  const temporalForm = useForm<TemporalFahrzeugFormValues>({
    defaultValues: {
      funkrufname: '',
      fahrzeugtypId: '',
      kennzeichen: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: temporalFahrzeugSchema,
    },
  });

  // Debounced Query-Update (300ms)
  const debouncedSetQuery = useDebouncedCallback(setQuery, 300);

  // Gefilterte Fahrzeuge basierend auf Suchquery
  const filteredFahrzeuge = useMemo(() => {
    if (!stammFahrzeuge) return [];
    if (!query) return stammFahrzeuge;

    const lowerQuery = query.toLowerCase();
    return stammFahrzeuge.filter((fz) => {
      const funkrufname = fz.funkrufname.toLowerCase();
      const kennzeichen = fz.kennzeichen?.toLowerCase() ?? '';
      const fahrzeugtypName = (fz.fahrzeugtyp as { name?: string })?.name?.toLowerCase() ?? '';

      return funkrufname.includes(lowerQuery) || kennzeichen.includes(lowerQuery) || fahrzeugtypName.includes(lowerQuery);
    });
  }, [stammFahrzeuge, query]);

  // Prüft ob ein Fahrzeug bereits im Einsatz ist (disabled)
  const isFahrzeugDisabled = useCallback(
    (fz: StammFahrzeugDto) => {
      return erfassteFunkrufnamen.has(fz.funkrufname.toLowerCase());
    },
    [erfassteFunkrufnamen],
  );

  // Handle Auswahl
  const handleSelect = useCallback((fz: StammFahrzeugDto | null) => {
    setSelectedFahrzeug(fz);
  }, []);

  // Handle Erfassen aus Stammdaten
  const handleErfassen = useCallback(async () => {
    if (!selectedFahrzeug) return;

    const toastId = toast.loading('Fahrzeug wird erfasst…');

    try {
      await erfasseFahrzeug.mutateAsync({
        einsatzId,
        stammId: selectedFahrzeug.id,
      });

      toast.success(`${selectedFahrzeug.funkrufname} erfasst`, {
        id: toastId,
        description: 'Fahrzeug wurde zum Einsatz hinzugefügt',
      });

      // Reset und schließen
      setSelectedFahrzeug(null);
      setQuery('');
      onClose();
    } catch (error) {
      // 409 Conflict = Duplikat (bereits im Einsatz)
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error('Fahrzeug bereits im Einsatz', {
          id: toastId,
          description: `${selectedFahrzeug.funkrufname} ist bereits in diesem Einsatz erfasst`,
        });
      } else {
        toast.error('Fehler beim Erfassen', {
          id: toastId,
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
      // Dialog bleibt offen bei Fehler
    }
  }, [selectedFahrzeug, einsatzId, erfasseFahrzeug, onClose]);

  // Handle Erfassen temporäres Fahrzeug
  const handleErfasseTemporales = useCallback(async () => {
    const values = temporalForm.state.values;
    const toastId = toast.loading('Temporäres Fahrzeug wird erfasst…');

    try {
      await erfasseTemporales.mutateAsync({
        einsatzId,
        funkrufname: values.funkrufname,
        fahrzeugtypId: values.fahrzeugtypId,
        kennzeichen: values.kennzeichen || undefined,
      });

      toast.success(`${values.funkrufname} erfasst`, {
        id: toastId,
        description: 'Temporäres Fahrzeug wurde zum Einsatz hinzugefügt',
      });

      // Reset und schließen
      temporalForm.reset();
      onClose();
    } catch (error) {
      // 409 Conflict = Duplikat (bereits im Einsatz)
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error('Fahrzeug mit diesem Funkrufnamen bereits erfasst', {
          id: toastId,
          description: `${values.funkrufname} existiert bereits in diesem Einsatz`,
        });
      } else {
        toast.error('Fehler beim Erfassen', {
          id: toastId,
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
      // Dialog bleibt offen bei Fehler
    }
  }, [einsatzId, erfasseTemporales, temporalForm, onClose]);

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
      if (!isOpen) return;

      if (selectedTabIndex === 0 && selectedFahrzeug && !erfasseFahrzeug.isPending) {
        handleErfassen();
      } else if (selectedTabIndex === 1 && temporalForm.state.canSubmit && !erfasseTemporales.isPending) {
        handleErfasseTemporales();
      }
    },
    { enabled: isOpen },
  );

  // Reset bei Schließen
  const handleClose = useCallback(() => {
    setSelectedFahrzeug(null);
    setQuery('');
    temporalForm.reset();
    setSelectedTabIndex(0);
    onClose();
  }, [onClose, temporalForm]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <div className="relative">
        <Dialog.CloseButton onClose={handleClose} />

        <Dialog.Title>
          <div className="flex items-center gap-2">
            <PiTruck className="h-5 w-5 text-action-primary" />
            <span>Fahrzeug hinzufügen</span>
          </div>
        </Dialog.Title>

        <Dialog.Body>
          <TabGroup selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
            <TabList className="flex gap-2 border-border-subtle border-b pb-2">
              <Tab
                className={({ selected }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:shadow-focus-ring',
                    selected ? 'bg-action-secondary text-action-primary' : 'text-text-secondary hover:bg-action-secondary hover:text-text-primary',
                  )
                }
              >
                <PiTruck className="h-4 w-4" />
                Aus Stammdaten
              </Tab>
              <Tab
                className={({ selected }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:shadow-focus-ring',
                    selected ? 'bg-action-secondary text-action-primary' : 'text-text-secondary hover:bg-action-secondary hover:text-text-primary',
                  )
                }
              >
                <PiPlus className="h-4 w-4" />
                Temporär
              </Tab>
            </TabList>

            <TabPanels className="mt-4">
              {/* Tab 1: Aus Stammdaten */}
              <TabPanel>
                <p className="mb-4 text-body-sm text-text-secondary">Wählen Sie ein Fahrzeug aus den Stammdaten, um es für diesen Einsatz zu erfassen.</p>

                {/* Combobox */}
                <HeadlessCombobox as="div" value={selectedFahrzeug} onChange={handleSelect} disabled={erfasseFahrzeug.isPending}>
                  <Label className="block font-medium text-text-primary text-body-sm">Fahrzeug auswählen</Label>
                  <div className="relative mt-2">
                    <ComboboxInput
                      className={cn(
                        'block w-full rounded-lg border bg-surface-raised px-4 py-3 pr-12 font-medium text-base text-text-primary',
                        'transition-all duration-200',
                        'border-border-subtle',
                        'placeholder:text-text-muted',
                        'focus-visible:outline-none focus-visible:shadow-focus-ring',
                        'sm:text-sm',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                      placeholder={isLoadingStamm ? 'Lade Fahrzeuge…' : 'Funkrufname, Kennzeichen oder Typ eingeben…'}
                      onChange={(e) => debouncedSetQuery(e.target.value)}
                      displayValue={(fz: StammFahrzeugDto | null) => (fz ? fz.funkrufname : '')}
                      autoComplete="off"
                    />
                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-3">
                      {isLoadingStamm ? <InlineSpinner size="sm" /> : <PiCaretDown className="h-5 w-5 text-text-muted" aria-hidden="true" />}
                    </ComboboxButton>

                    <ComboboxOptions
                      transition
                      className={cn(
                        'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-surface-panel py-1 text-base shadow-panel',
                        'border border-border-subtle',
                        'data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in',
                        'sm:text-sm',
                      )}
                    >
                      {isLoadingStamm ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-8 text-text-secondary">
                          <InlineSpinner size="sm" />
                          <span>Lade Stammdaten…</span>
                        </div>
                      ) : filteredFahrzeuge.length === 0 ? (
                        <div className="px-4 py-4 text-center text-text-secondary">{query ? `Keine Fahrzeuge gefunden für "${query}"` : 'Keine Stamm-Fahrzeuge verfügbar'}</div>
                      ) : (
                        filteredFahrzeuge.map((fz) => {
                          const disabled = isFahrzeugDisabled(fz);
                          const fahrzeugtypName = (fz.fahrzeugtyp as { name?: string })?.name ?? 'Unbekannt';

                          return (
                            <ComboboxOption
                              key={fz.id}
                              value={fz}
                              disabled={disabled}
                              className={cn(
                                'relative cursor-default select-none py-3 pr-9 pl-4',
                                'data-[focus]:bg-action-primary data-[focus]:text-text-inverse data-[focus]:outline-none',
                                'text-text-primary',
                                disabled && 'cursor-not-allowed opacity-50',
                              )}
                            >
                              {({ selected, focus }) => (
                                <>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className={cn('truncate font-medium', selected && 'font-semibold')}>{fz.funkrufname}</span>
                                      {disabled && (
                                        <span
                                          className={cn(
                                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                                            focus ? 'bg-surface-panel/20 text-text-inverse' : 'bg-status-warning-surface text-status-warning-text',
                                          )}
                                        >
                                          <PiWarning className="h-3 w-3" />
                                          Im Einsatz
                                        </span>
                                      )}
                                    </div>
                                    <span className={cn('mt-0.5 text-body-sm', focus ? 'text-text-inverse/90' : 'text-text-secondary')}>
                                      {fz.kennzeichen ?? '–'} • {fahrzeugtypName}
                                    </span>
                                  </div>

                                  {selected && (
                                    <span className={cn('absolute inset-y-0 right-0 flex items-center pr-4', focus ? 'text-text-inverse' : 'text-action-primary')}>
                                      <PiCheck className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  )}
                                </>
                              )}
                            </ComboboxOption>
                          );
                        })
                      )}
                    </ComboboxOptions>
                  </div>
                </HeadlessCombobox>

                {/* Auswahl-Info */}
                {selectedFahrzeug && (
                  <div className="mt-4 rounded-lg border border-status-info-border bg-status-info-surface p-3">
                    <div className="flex items-start gap-3">
                      <PiTruck className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-info-text" />
                      <div>
                        <p className="font-medium text-body-sm text-status-info-text">{selectedFahrzeug.funkrufname}</p>
                        <p className="mt-0.5 text-body-xs text-status-info-text">
                          {selectedFahrzeug.kennzeichen ?? '–'} • {(selectedFahrzeug.fahrzeugtyp as { name?: string })?.name ?? 'Unbekannt'}
                        </p>
                        <p className="mt-1 text-body-xs text-status-info-text">Wird mit initialem FMS-Status 2 (Einsatzbereit) erfasst</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabPanel>

              {/* Tab 2: Temporär */}
              <TabPanel>
                <p className="mb-4 text-body-sm text-text-secondary">Erfassen Sie ein temporäres Fahrzeug ohne Referenz zu den Stammdaten.</p>

                <form className="space-y-4">
                  {/* Funkrufname */}
                  <temporalForm.Field name="funkrufname">
                    {(field) => (
                      <FormField label="Funkrufname" required error={getFormErrors(field.state.meta.errors)} helperText="Eindeutiger Funkrufname für diesen Einsatz">
                        <input
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          disabled={erfasseTemporales.isPending}
                          placeholder="z.B. Florian Stuttgart 44-1"
                          className={cn(
                            'block w-full rounded-lg border bg-surface-raised px-4 py-3 font-medium text-base text-text-primary',
                            'transition-all duration-200',
                            'border-border-subtle',
                            'placeholder:text-text-muted',
                            'focus-visible:outline-none focus-visible:shadow-focus-ring',
                            'sm:text-sm',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            field.state.meta.errors.length > 0 && 'border-status-danger-border',
                          )}
                        />
                      </FormField>
                    )}
                  </temporalForm.Field>

                  {/* Fahrzeugtyp */}
                  <temporalForm.Field name="fahrzeugtypId">
                    {(field) => (
                      <FormField label="Fahrzeugtyp" required error={getFormErrors(field.state.meta.errors)} helperText="Kategorisierung des Fahrzeugs">
                        <select
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          disabled={erfasseTemporales.isPending || isLoadingFahrzeugtypen}
                          className={cn(
                            'block w-full rounded-lg border bg-surface-raised px-4 py-3 font-medium text-base text-text-primary',
                            'transition-all duration-200',
                            'border-border-subtle',
                            'focus-visible:outline-none focus-visible:shadow-focus-ring',
                            'sm:text-sm',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            field.state.meta.errors.length > 0 && 'border-status-danger-border',
                          )}
                        >
                          <option value="">Fahrzeugtyp wählen…</option>
                          {fahrzeugtypen?.map((typ) => (
                            <option key={typ.id} value={typ.id}>
                              {typ.code} - {typ.bezeichnung}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    )}
                  </temporalForm.Field>

                  {/* Kennzeichen (Optional) */}
                  <temporalForm.Field name="kennzeichen">
                    {(field) => (
                      <FormField label="Kennzeichen" error={getFormErrors(field.state.meta.errors)} helperText="Optional: Amtliches Kennzeichen">
                        <input
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          disabled={erfasseTemporales.isPending}
                          placeholder="z.B. S-FW 1234"
                          className={cn(
                            'block w-full rounded-lg border bg-surface-raised px-4 py-3 font-medium text-base text-text-primary',
                            'transition-all duration-200',
                            'border-border-subtle',
                            'placeholder:text-text-muted',
                            'focus-visible:outline-none focus-visible:shadow-focus-ring',
                            'sm:text-sm',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            field.state.meta.errors.length > 0 && 'border-status-danger-border',
                          )}
                        />
                      </FormField>
                    )}
                  </temporalForm.Field>

                  {/* Info Box */}
                  <div className="rounded-lg border border-status-info-border bg-status-info-surface p-3">
                    <p className="text-body-sm text-status-info-text">
                      Temporäre Fahrzeuge werden nur für diesen Einsatz erfasst und sind nicht in den Stammdaten hinterlegt. Sie erhalten ebenfalls den initialen FMS-Status 2 (Einsatzbereit).
                    </p>
                  </div>
                </form>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </Dialog.Body>

        <Dialog.Footer loading={erfasseFahrzeug.isPending || erfasseTemporales.isPending}>
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={erfasseFahrzeug.isPending || erfasseTemporales.isPending}>
            Abbrechen
          </Button>
          {selectedTabIndex === 0 ? (
            <Button intent="primary" onClick={handleErfassen} disabled={!selectedFahrzeug || erfasseFahrzeug.isPending} loading={erfasseFahrzeug.isPending}>
              Fahrzeug erfassen
            </Button>
          ) : (
            <Button intent="primary" onClick={handleErfasseTemporales} disabled={!temporalForm.state.canSubmit || erfasseTemporales.isPending} loading={erfasseTemporales.isPending}>
              Temporär erfassen
            </Button>
          )}
        </Dialog.Footer>
      </div>
    </Dialog>
  );
}
