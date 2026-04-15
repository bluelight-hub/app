/**
 * ZuordnungsManager
 *
 * Verwaltet die Kräfte-Zuordnungen eines Funkkanals:
 * - Combobox (Headless UI) mit gruppierten Rufnamen-Vorschlägen
 *   (Fahrzeuge / Personen / Einheiten) aus `useRufnameVorschlaege`.
 * - Liste bereits zugeordneter Kräfte mit Segmented-Control für die Rolle
 *   (primaer / sekundaer / zuhoeren) und Remove-Button.
 */

import { useCreateZuordnung, useRemoveZuordnung, useRufnameVorschlaege, useUpdateZuordnungRolle } from '@/features/funkverkehr/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import type { CreateZuordnungDto, ZuordnungResponseDto } from '@bluelight-hub/shared/client';
import { CreateZuordnungDtoRolleEnum, ZuordnungResponseDtoRolleEnum } from '@bluelight-hub/shared/client';
import { useMemo, useState } from 'react';
import { PiCaretDown, PiCheck, PiX } from 'react-icons/pi';

type KraftKind = 'fahrzeug' | 'person' | 'einheit';

interface KraftOption {
  id: string;
  kind: KraftKind;
  label: string;
  group: 'Fahrzeuge' | 'Personen' | 'Einheiten';
}

interface ZuordnungsManagerProps {
  einsatzId: string;
  kanalId: string;
  zuordnungen: ZuordnungResponseDto[];
}

const ROLLEN: { value: CreateZuordnungDtoRolleEnum; label: string }[] = [
  { value: CreateZuordnungDtoRolleEnum.Primaer, label: 'Primär' },
  { value: CreateZuordnungDtoRolleEnum.Sekundaer, label: 'Sekundär' },
  { value: CreateZuordnungDtoRolleEnum.Zuhoeren, label: 'Zuhören' },
];

export function ZuordnungsManager({ einsatzId, kanalId, zuordnungen }: ZuordnungsManagerProps) {
  const { data: vorschlaege, isLoading } = useRufnameVorschlaege({ einsatzId });
  const createMutation = useCreateZuordnung(einsatzId);
  const updateRolleMutation = useUpdateZuordnungRolle(einsatzId);
  const removeMutation = useRemoveZuordnung(einsatzId);

  const [query, setQuery] = useState('');
  const [selectedKraft, setSelectedKraft] = useState<KraftOption | null>(null);
  const [pendingRolle, setPendingRolle] = useState<CreateZuordnungDtoRolleEnum>(CreateZuordnungDtoRolleEnum.Primaer);

  const assignedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const z of zuordnungen) {
      keys.add(`${z.kraftKind}:${(z.fahrzeugId ?? z.personId ?? z.einheitId) as unknown as string}`);
    }
    return keys;
  }, [zuordnungen]);

  const options = useMemo<KraftOption[]>(() => {
    if (!vorschlaege?.data) return [];
    const fahrzeuge = vorschlaege.data.fahrzeuge.map<KraftOption>((f) => ({ id: f.id, kind: 'fahrzeug', label: f.funkrufname, group: 'Fahrzeuge' }));
    const personen = vorschlaege.data.personen.map<KraftOption>((p) => ({ id: p.id, kind: 'person', label: p.funkrufname, group: 'Personen' }));
    const einheiten = vorschlaege.data.einheiten.map<KraftOption>((e) => ({ id: e.id, kind: 'einheit', label: e.name, group: 'Einheiten' }));
    return [...fahrzeuge, ...personen, ...einheiten];
  }, [vorschlaege]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q === '' ? options : options.filter((o) => o.label.toLowerCase().includes(q));
    // Gruppiert rendern
    const groups: Record<KraftOption['group'], KraftOption[]> = { Fahrzeuge: [], Personen: [], Einheiten: [] };
    for (const o of base) groups[o.group].push(o);
    return groups;
  }, [options, query]);

  const isAssigned = (opt: KraftOption | null) => {
    if (!opt) return false;
    return assignedKeys.has(`${opt.kind}:${opt.id}`);
  };

  const handleAssign = async () => {
    if (!selectedKraft || isAssigned(selectedKraft)) return;
    const dto: CreateZuordnungDto = {
      rolle: pendingRolle,
      fahrzeugId: selectedKraft.kind === 'fahrzeug' ? selectedKraft.id : undefined,
      personId: selectedKraft.kind === 'person' ? selectedKraft.id : undefined,
      einheitId: selectedKraft.kind === 'einheit' ? selectedKraft.id : undefined,
    };
    try {
      await createMutation.mutateAsync({ kanalId, dto });
      setSelectedKraft(null);
      setQuery('');
    } catch {
      // Fehlertoast bereits im Hook
    }
  };

  return (
    <div className="space-y-4">
      {/* Combobox zum Zuordnen */}
      <div className="space-y-2">
        <Combobox value={selectedKraft} onChange={setSelectedKraft} disabled={isLoading || createMutation.isPending}>
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">Kraft zuordnen</span>
          <div className="relative mt-1">
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

            <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {Object.entries(filteredOptions).map(([groupName, items]) => {
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
                              {disabled && <span className="ml-auto text-xs">(zugeordnet)</span>}
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

              {Object.values(filteredOptions).every((items) => items.length === 0) && (
                <div className="px-3 py-3 text-center text-slate-500">{query ? `Keine Treffer für „${query}"` : 'Keine Vorschläge verfügbar'}</div>
              )}
            </ComboboxOptions>
          </div>
        </Combobox>

        {selectedKraft && (
          <div className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
            <RolleSegmented value={pendingRolle} onChange={setPendingRolle} disabled={createMutation.isPending} idPrefix="new" />
            <Button intent="primary" size="sm" onClick={handleAssign} disabled={createMutation.isPending || isAssigned(selectedKraft)} loading={createMutation.isPending} type="button">
              Zuordnen
            </Button>
          </div>
        )}
      </div>

      {/* Liste bestehender Zuordnungen */}
      {zuordnungen.length === 0 ? (
        <p className="text-xs text-slate-500">Noch keine Zuordnungen.</p>
      ) : (
        <ul role="list" className="space-y-2">
          {zuordnungen.map((z) => (
            <li key={z.id} className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{z.rufnameSnapshot}</div>
                <div className="text-[11px] text-slate-500 uppercase">{z.kraftKind}</div>
              </div>
              <RolleSegmented
                value={z.rolle as unknown as CreateZuordnungDtoRolleEnum}
                onChange={(rolle) => {
                  updateRolleMutation.mutate({ kanalId, zuordnungId: z.id, dto: { rolle } });
                }}
                disabled={updateRolleMutation.isPending}
                idPrefix={`existing-${z.id}`}
              />
              <button
                type="button"
                aria-label={`Zuordnung ${z.rufnameSnapshot} entfernen`}
                className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                onClick={() => removeMutation.mutate({ kanalId, zuordnungId: z.id })}
                disabled={removeMutation.isPending}
              >
                <PiX className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface RolleSegmentedProps {
  value: CreateZuordnungDtoRolleEnum | ZuordnungResponseDtoRolleEnum;
  onChange: (value: CreateZuordnungDtoRolleEnum) => void;
  disabled?: boolean;
  idPrefix: string;
}

function RolleSegmented({ value, onChange, disabled, idPrefix }: RolleSegmentedProps) {
  return (
    <div role="radiogroup" aria-label="Rolle" className="inline-flex overflow-hidden rounded border border-slate-300 dark:border-slate-600">
      {ROLLEN.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            id={`${idPrefix}-${option.value}`}
            role="radio"
            aria-checked={active}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'px-2 py-1 text-xs font-medium transition-colors',
              active ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
