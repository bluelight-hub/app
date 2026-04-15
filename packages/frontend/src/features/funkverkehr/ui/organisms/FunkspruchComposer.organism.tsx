/**
 * FunkspruchComposer
 *
 * Eingabezeile für neue Funksprüche. Wird am Fuß der FunkprotokollView
 * sticky montiert und hält die ETB-basierte Create-Mutation.
 *
 * Tastatur:
 * - Ctrl/Cmd + Enter: Submit
 * - Shift + Enter: Newline (Default vom Textarea)
 */

import { useCreateFunkspruch } from '@/features/funkverkehr/hooks/use-create-funkspruch';
import { useRufnameVorschlaege } from '@/features/funkverkehr/api';
import type { FunkPrioritaetFilter } from '@/features/funkverkehr/stores/funkprotokoll-filter.store';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { PiCaretDown } from 'react-icons/pi';

export interface FunkspruchComposerProps {
  einsatzId: string;
  etbId: string;
  kanaele: FunkkanalResponseDto[];
  defaultKanalId?: string;
  className?: string;
}

const PRIO_OPTIONS: { value: FunkPrioritaetFilter; label: string }[] = [
  { value: 'routine', label: 'Routine' },
  { value: 'prioritaet', label: 'Priorität' },
  { value: 'notfall', label: 'Notfall' },
];

const toLocalDateTime = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function FunkspruchComposer({ einsatzId, etbId, kanaele, defaultKanalId, className }: FunkspruchComposerProps) {
  const activeKanaele = useMemo(() => kanaele.filter((k) => k.status === 'aktiv'), [kanaele]);
  const initialKanalId = defaultKanalId ?? activeKanaele[0]?.id ?? '';

  const [text, setText] = useState('');
  const [absender, setAbsender] = useState('');
  const [empfaenger, setEmpfaenger] = useState('');
  const [kanalId, setKanalId] = useState(initialKanalId);
  const [prioritaet, setPrioritaet] = useState<FunkPrioritaetFilter>('routine');
  const [ereignisZeitpunkt, setEreignisZeitpunkt] = useState(() => toLocalDateTime(new Date()));

  const { data: vorschlaege } = useRufnameVorschlaege({ einsatzId });
  const createMutation = useCreateFunkspruch({ einsatzId, etbId });

  const rufnameOptions = useMemo(() => {
    if (!vorschlaege?.data) return [] as string[];
    const all = [...vorschlaege.data.fahrzeuge.map((f) => f.funkrufname), ...vorschlaege.data.personen.map((p) => p.funkrufname), ...vorschlaege.data.einheiten.map((e) => e.name)];
    return Array.from(new Set(all)).filter(Boolean);
  }, [vorschlaege]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || !kanalId) return;
    try {
      await createMutation.mutateAsync({
        text: text.trim(),
        absender: absender.trim() || undefined,
        empfaenger: empfaenger.trim() || undefined,
        kanalId,
        funkPrioritaet: prioritaet,
        ereignisZeitpunkt: ereignisZeitpunkt ? new Date(ereignisZeitpunkt).toISOString() : undefined,
      });
      setText('');
      setPrioritaet('routine');
      setEreignisZeitpunkt(toLocalDateTime(new Date()));
    } catch {
      // Error-Toast wird bereits im Hook gesetzt.
    }
  }, [absender, createMutation, empfaenger, ereignisZeitpunkt, kanalId, prioritaet, text]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  const canSubmit = text.trim().length > 0 && Boolean(kanalId) && !createMutation.isPending;

  return (
    <form
      className={cn('flex flex-col gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900', className)}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      aria-label="Funkspruch erfassen"
    >
      <div className="flex flex-wrap items-end gap-3">
        <RufnameCombobox label="Absender" value={absender} onChange={setAbsender} options={rufnameOptions} />
        <RufnameCombobox label="Empfänger" value={empfaenger} onChange={setEmpfaenger} options={rufnameOptions} />

        <label className="text-xs">
          <span className="block font-medium text-slate-600 dark:text-slate-300">Kanal</span>
          <select
            value={kanalId}
            onChange={(event) => setKanalId(event.target.value)}
            className="mt-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
            aria-label="Kanal auswählen"
          >
            <option value="" disabled>
              Kanal wählen…
            </option>
            {activeKanaele.map((kanal) => (
              <option key={kanal.id} value={kanal.id}>
                {kanal.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs">
          <span className="block font-medium text-slate-600 dark:text-slate-300">Ereigniszeitpunkt</span>
          <input
            type="datetime-local"
            value={ereignisZeitpunkt}
            onChange={(event) => setEreignisZeitpunkt(event.target.value)}
            className="mt-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        <fieldset aria-label="Priorität" className="inline-flex overflow-hidden rounded border border-slate-300 dark:border-slate-600">
          {PRIO_OPTIONS.map((option) => {
            const active = prioritaet === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPrioritaet(option.value)}
                className={cn(
                  'px-2 py-1 text-xs font-medium transition-colors',
                  active ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </fieldset>
      </div>

      <div className="flex items-end gap-3">
        <label className="flex-1 text-xs">
          <span className="block font-medium text-slate-600 dark:text-slate-300">Inhalt</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Funkspruch — Cmd/Ctrl+Enter zum Senden, Shift+Enter für Zeilenumbruch"
            className="mt-1 min-h-[2.5rem] w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            aria-label="Funkspruch-Text"
          />
        </label>
        <Button intent="primary" type="submit" disabled={!canSubmit} loading={createMutation.isPending}>
          Senden
        </Button>
      </div>
    </form>
  );
}

interface RufnameComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

function RufnameCombobox({ label, value, onChange, options }: RufnameComboboxProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q === '' ? options : options.filter((o) => o.toLowerCase().includes(q));
    return base.slice(0, 30);
  }, [options, query]);

  const comboValue = value === '' ? null : value;

  return (
    <label className="text-xs">
      <span className="block font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <Combobox
        value={comboValue}
        onChange={(next: string | null) => onChange(next ?? '')}
        // allowCustomValue kommt über die raw-string-Eingabe via onChange
      >
        <div className="relative mt-1 min-w-[10rem]">
          <ComboboxInput<string | null>
            displayValue={(v) => v ?? ''}
            onChange={(event) => {
              setQuery(event.target.value);
              onChange(event.target.value);
            }}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 pr-7 text-sm dark:border-slate-700 dark:bg-slate-900"
            autoComplete="off"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-1">
            <PiCaretDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          </ComboboxButton>

          <ComboboxOptions className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {filtered.length === 0 ? (
              <div className="px-2 py-1.5 text-slate-500">{query ? `Keine Treffer für „${query}"` : 'Keine Vorschläge'}</div>
            ) : (
              filtered.map((opt) => (
                <ComboboxOption key={opt} value={opt} className={({ focus }) => cn('cursor-default px-2 py-1.5 select-none', focus ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-100')}>
                  {opt}
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
    </label>
  );
}
