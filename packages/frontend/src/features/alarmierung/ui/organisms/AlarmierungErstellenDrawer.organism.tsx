/**
 * AlarmierungErstellenDrawer
 *
 * SlideIn-Drawer zum Anlegen einer neuen Alarmierung. Enthält:
 * - Bezeichnung (Pflicht) + optionale Beschreibung
 * - Empfänger-Combobox (Rufnamen-Vorschläge aus Funkverkehr, gruppiert
 *   nach Fahrzeugen / Personen / Einheiten)
 * - Liste ausgewählter Empfänger mit Typ-Badge und Remove-Button
 *
 * Wird im gleichen Muster auch für Nachalarmierungen wiederverwendet
 * (siehe `NachalarmierungDialog`), das Feld-Set ist identisch.
 */

import { useRufnameVorschlaege } from '@/features/funkverkehr/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { cn } from '@/shared/ui/cn';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import type { CreateAlarmierungDto } from '@bluelight-hub/shared/client';
import { useForm } from '@tanstack/react-form';
import { useMemo, useState } from 'react';
import { PiCaretDown, PiCheck, PiX } from 'react-icons/pi';
import { useErstelleAlarmierung } from '../../api/mutations';
import { createAlarmierungFormSchema, type CreateAlarmierungFormValues, type EmpfaengerInput, type EmpfaengerKind } from '../../schemas/alarmierung.schema';
import { toCreateEmpfaenger } from '../../utils/empfaenger-mapping';
import { EmpfaengerTypBadge } from '../atoms/EmpfaengerTypBadge.atom';

interface KraftOption {
  id: string;
  kind: EmpfaengerKind;
  label: string;
  group: 'Fahrzeuge' | 'Personen' | 'Einheiten';
}

export interface AlarmierungErstellenDrawerProps {
  einsatzId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AlarmierungErstellenDrawer({ einsatzId, isOpen, onClose }: AlarmierungErstellenDrawerProps) {
  const mutation = useErstelleAlarmierung(einsatzId);
  const { data: vorschlaege, isLoading } = useRufnameVorschlaege({ einsatzId, enabled: isOpen });

  const [query, setQuery] = useState('');
  const [selectedKraft, setSelectedKraft] = useState<KraftOption | null>(null);

  const form = useForm({
    defaultValues: {
      bezeichnung: '',
      beschreibung: '',
      alarmierungszeit: '',
      empfaenger: [] as EmpfaengerInput[],
    } satisfies CreateAlarmierungFormValues,
    onSubmit: async ({ value }) => {
      const parsed = createAlarmierungFormSchema.safeParse(value);
      if (!parsed.success) {
        return;
      }
      const dto: CreateAlarmierungDto = {
        bezeichnung: parsed.data.bezeichnung,
        beschreibung: parsed.data.beschreibung && parsed.data.beschreibung.length > 0 ? parsed.data.beschreibung : null,
        alarmierungszeit: parsed.data.alarmierungszeit ? new Date(parsed.data.alarmierungszeit) : null,
        empfaenger: toCreateEmpfaenger(parsed.data.empfaenger),
      };
      try {
        await mutation.mutateAsync(dto);
        form.reset();
        onClose();
      } catch {
        // Error-Toast wird bereits im Hook gesetzt.
      }
    },
  });

  const options = useMemo<KraftOption[]>(() => {
    if (!vorschlaege?.data) return [];
    const fahrzeuge = vorschlaege.data.fahrzeuge.map<KraftOption>((f) => ({ id: f.id, kind: 'fahrzeug', label: f.funkrufname, group: 'Fahrzeuge' }));
    const personen = vorschlaege.data.personen.map<KraftOption>((p) => ({ id: p.id, kind: 'person', label: p.funkrufname, group: 'Personen' }));
    const einheiten = vorschlaege.data.einheiten.map<KraftOption>((e) => ({ id: e.id, kind: 'einheit', label: e.name, group: 'Einheiten' }));
    return [...fahrzeuge, ...personen, ...einheiten];
  }, [vorschlaege]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q === '' ? options : options.filter((o) => o.label.toLowerCase().includes(q));
    const groups: Record<KraftOption['group'], KraftOption[]> = { Fahrzeuge: [], Personen: [], Einheiten: [] };
    for (const o of base) groups[o.group].push(o);
    return groups;
  }, [options, query]);

  const handleClose = () => {
    form.reset();
    setSelectedKraft(null);
    setQuery('');
    onClose();
  };

  return (
    <Dialog.SlideIn
      isOpen={isOpen}
      onClose={handleClose}
      title="Neue Alarmierung"
      size="lg"
      position="right"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button intent="secondary" appearance="ghost" type="button" onClick={handleClose} disabled={mutation.isPending}>
            Abbrechen
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.values.empfaenger.length, state.values.bezeichnung] as const}>
            {([canSubmit, isSubmitting, empfaengerCount, bezeichnung]) => (
              <Button
                intent="primary"
                type="submit"
                form="alarmierung-erstellen-form"
                disabled={!canSubmit || mutation.isPending || empfaengerCount === 0 || !bezeichnung.trim()}
                loading={Boolean(isSubmitting) || mutation.isPending}
              >
                Alarmierung auslösen
              </Button>
            )}
          </form.Subscribe>
        </div>
      }
    >
      <form
        id="alarmierung-erstellen-form"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div className="space-y-5">
          <form.Field name="bezeichnung">
            {(field) => (
              <label htmlFor="alarmierung-bezeichnung" className="block text-sm">
                <span className="block font-medium text-slate-700 dark:text-slate-200">
                  Bezeichnung <span className="text-red-500">*</span>
                </span>
                <Input
                  id="alarmierung-bezeichnung"
                  type="text"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="z. B. BMA Müllerstraße 12"
                  disabled={mutation.isPending}
                  fullWidth
                  className="mt-1"
                />
              </label>
            )}
          </form.Field>

          <form.Field name="beschreibung">
            {(field) => (
              <label htmlFor="alarmierung-beschreibung" className="block text-sm">
                <span className="block font-medium text-slate-700 dark:text-slate-200">Beschreibung (optional)</span>
                <Textarea
                  id="alarmierung-beschreibung"
                  rows={2}
                  value={field.state.value ?? ''}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="z. B. Rauchmelder im 2. OG, Gebäude evakuiert"
                  disabled={mutation.isPending}
                  fullWidth
                  className="mt-1"
                />
              </label>
            )}
          </form.Field>

          <form.Field name="empfaenger" mode="array">
            {(field) => {
              const empfaenger = field.state.value;
              const isAssigned = (opt: KraftOption) => empfaenger.some((e) => e.kind === opt.kind && e.refId === opt.id);

              const handleAdd = () => {
                if (!selectedKraft || isAssigned(selectedKraft)) return;
                field.pushValue({ kind: selectedKraft.kind, refId: selectedKraft.id, nameSnapshot: selectedKraft.label });
                setSelectedKraft(null);
                setQuery('');
              };

              return (
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Empfänger <span className="text-red-500">*</span>
                  </span>
                  <Combobox value={selectedKraft} onChange={setSelectedKraft} disabled={isLoading || mutation.isPending}>
                    <div className="relative">
                      <ComboboxInput<KraftOption | null>
                        displayValue={(value) => value?.label ?? ''}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={isLoading ? 'Lade Vorschläge…' : 'Rufname suchen…'}
                        className="w-full rounded border border-slate-300 bg-white px-3 py-2 pr-9 text-sm dark:border-slate-700 dark:bg-slate-900"
                        autoComplete="off"
                      />
                      <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <PiCaretDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      </ComboboxButton>
                      {/*
                        `anchor` aktiviert Portal + Floating-UI — ohne das würde die Liste
                        vom `overflow-y-auto` des Drawer-Contents (`Dialog.SlideIn`) abgeschnitten.
                        `w-[var(--input-width)]` übernimmt die Breite des Anchor-Inputs.
                      */}
                      <ComboboxOptions
                        anchor={{ to: 'bottom start', gap: 4 }}
                        className="z-50 max-h-60 w-[var(--input-width)] overflow-auto rounded border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
                      >
                        {Object.entries(filteredGroups).map(([groupName, items]) => {
                          if (items.length === 0) return null;
                          return (
                            <div key={groupName}>
                              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{groupName}</div>
                              {items.map((opt) => {
                                const disabled = isAssigned(opt);
                                return (
                                  <ComboboxOption
                                    key={`${opt.kind}:${opt.id}`}
                                    value={opt}
                                    disabled={disabled}
                                    className={({ focus }) =>
                                      cn(
                                        'relative flex cursor-default items-center gap-2 py-1.5 pr-8 pl-3 select-none',
                                        focus ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-100',
                                        disabled && 'cursor-not-allowed opacity-50',
                                      )
                                    }
                                  >
                                    {({ selected }) => (
                                      <>
                                        <span className={cn('truncate', selected && 'font-semibold')}>{opt.label}</span>
                                        {disabled && <span className="ml-auto text-xs">(bereits gewählt)</span>}
                                        {selected && !disabled && (
                                          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                                            <PiCheck className="h-4 w-4" aria-hidden="true" />
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </ComboboxOption>
                                );
                              })}
                            </div>
                          );
                        })}
                        {Object.values(filteredGroups).every((items) => items.length === 0) && (
                          <div className="px-3 py-3 text-center text-slate-500">{query ? `Keine Treffer für „${query}"` : 'Keine Vorschläge verfügbar'}</div>
                        )}
                      </ComboboxOptions>
                    </div>
                  </Combobox>

                  {selectedKraft && (
                    <div className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                      <span className="text-sm text-slate-700 dark:text-slate-200">{selectedKraft.label}</span>
                      <Button intent="primary" size="sm" type="button" onClick={handleAdd} disabled={mutation.isPending}>
                        Hinzufügen
                      </Button>
                    </div>
                  )}

                  {empfaenger.length === 0 ? (
                    <p className="text-xs text-slate-500">Noch keine Empfänger ausgewählt.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {empfaenger.map((e, idx) => (
                        <li key={`${e.kind}:${e.refId}`} className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-1.5 dark:border-slate-700">
                          <div className="flex min-w-0 items-center gap-2">
                            <EmpfaengerTypBadge kind={e.kind} size="sm" iconOnly />
                            <span className="truncate text-sm text-slate-800 dark:text-slate-100">{e.nameSnapshot ?? e.refId}</span>
                          </div>
                          <button
                            type="button"
                            aria-label={`Empfänger ${e.nameSnapshot ?? e.refId} entfernen`}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                            onClick={() => field.removeValue(idx)}
                          >
                            <PiX className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            }}
          </form.Field>
        </div>
      </form>
    </Dialog.SlideIn>
  );
}
