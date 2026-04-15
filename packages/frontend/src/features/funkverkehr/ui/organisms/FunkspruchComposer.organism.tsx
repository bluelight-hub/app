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

import { DEFAULT_ROLE_SUGGESTIONS } from '@/features/etb/ui/organisms/EtbAbsenderInput';
import { useCreateFunkspruch } from '@/features/funkverkehr/hooks/use-create-funkspruch';
import { useRufnameVorschlaege } from '@/features/funkverkehr/api';
import type { FunkPrioritaetFilter } from '@/features/funkverkehr/stores/funkprotokoll-filter.store';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Combobox } from '@/shared/ui/headless/combobox';
import { cn } from '@/shared/ui/cn';
import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';

export interface FunkspruchComposerProps {
  einsatzId: string;
  etbId: string;
  kanaele: FunkkanalResponseDto[];
  defaultKanalId?: string;
  className?: string;
}

const PRIO_OPTIONS: { value: FunkPrioritaetFilter; label: string; activeClass: string; dotClass: string }[] = [
  {
    value: 'routine',
    label: 'Routine',
    activeClass: 'bg-action-primary text-text-inverse',
    dotClass: 'bg-action-primary',
  },
  {
    value: 'prioritaet',
    label: 'Priorität',
    activeClass: 'bg-status-warning-text text-text-inverse',
    dotClass: 'bg-status-warning-text',
  },
  {
    value: 'notfall',
    label: 'Notfall',
    activeClass: 'bg-status-danger-text text-text-inverse',
    dotClass: 'bg-status-danger-text',
  },
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

  // Parität mit ETB-Absender/Empfänger: Fahrzeuge + Personen + Einheiten aus dem Einsatz plus Standard-Rollen
  const rufnameItems = useMemo(() => {
    const suggestions: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    vorschlaege?.data?.fahrzeuge?.forEach((f) => {
      if (f.funkrufname && !seen.has(f.funkrufname)) {
        suggestions.push({ value: f.funkrufname, label: `${f.funkrufname} (Fahrzeug)` });
        seen.add(f.funkrufname);
      }
    });

    vorschlaege?.data?.personen?.forEach((p) => {
      if (p.funkrufname && !seen.has(p.funkrufname)) {
        suggestions.push({ value: p.funkrufname, label: `${p.funkrufname} (Person)` });
        seen.add(p.funkrufname);
      }
    });

    vorschlaege?.data?.einheiten?.forEach((e) => {
      if (e.name && !seen.has(e.name)) {
        suggestions.push({ value: e.name, label: `${e.name} (Einheit)` });
        seen.add(e.name);
      }
    });

    DEFAULT_ROLE_SUGGESTIONS.forEach((role) => {
      if (!seen.has(role.value)) {
        suggestions.push(role);
        seen.add(role.value);
      }
    });

    return suggestions;
  }, [vorschlaege]);

  const kanalOptions = useMemo(() => activeKanaele.map((k) => ({ value: k.id, label: k.name })), [activeKanaele]);

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
        <div className="min-w-[10rem] flex-1">
          <Combobox label="Absender" value={absender} onChange={setAbsender} items={rufnameItems} allowCustomValue placeholder="Rufname…" />
        </div>
        <div className="min-w-[10rem] flex-1">
          <Combobox label="Empfänger" value={empfaenger} onChange={setEmpfaenger} items={rufnameItems} allowCustomValue placeholder="Rufname…" />
        </div>

        <div className="min-w-[10rem] flex-1">
          <Combobox label="Kanal" value={kanalId} onChange={setKanalId} items={kanalOptions} placeholder="Kanal wählen…" />
        </div>

        <FormField label="Ereigniszeitpunkt" htmlFor="funkspruch-zeit" className="min-w-[14rem]">
          <Input id="funkspruch-zeit" type="datetime-local" value={ereignisZeitpunkt} onChange={(event) => setEreignisZeitpunkt(event.target.value)} fullWidth />
        </FormField>

        <fieldset aria-label="Priorität" className="inline-flex overflow-hidden rounded-control border border-border-subtle">
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
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none',
                  active ? option.activeClass : 'bg-surface-panel text-text-secondary hover:bg-action-secondary',
                )}
              >
                <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', active ? 'bg-current opacity-80' : option.dotClass)} />
                {option.label}
              </button>
            );
          })}
        </fieldset>
      </div>

      <div className="flex items-end gap-3">
        <FormField label="Inhalt" htmlFor="funkspruch-inhalt" className="flex-1">
          <Textarea
            id="funkspruch-inhalt"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Funkspruch — Cmd/Ctrl+Enter zum Senden, Shift+Enter für Zeilenumbruch"
            className="min-h-[2.5rem]"
            fullWidth
            aria-label="Funkspruch-Text"
          />
        </FormField>
        <Button intent="primary" type="submit" disabled={!canSubmit} loading={createMutation.isPending}>
          Senden
        </Button>
      </div>
    </form>
  );
}
