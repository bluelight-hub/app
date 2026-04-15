/**
 * KanalDetailsForm
 *
 * Controlled Komponente für die Typ-abhängige Details-Konfiguration eines
 * Funkkanals. Der Wrapper (`KanalEditDrawer`, Task 32) verdrahtet es mit
 * TanStack Form + Zod; hier geht es nur um Rendering + `onChange`.
 */

import { cn } from '@/shared/ui/cn';
import type { ChangeEvent } from 'react';

export type KanalDetailsShape =
  | { type: 'tmo'; sprechgruppe: string; gssi?: string }
  | { type: 'dmo'; dmoKanal: string; repeater?: string }
  | { type: 'analog'; band: '4m' | '2m'; frequenz: string; kanalnummer?: string };

export interface KanalDetailsFormProps {
  value: KanalDetailsShape;
  onChange: (next: KanalDetailsShape) => void;
  errors?: Partial<Record<string, string>>;
  disabled?: boolean;
  className?: string;
}

const DEFAULTS: Record<KanalDetailsShape['type'], KanalDetailsShape> = {
  tmo: { type: 'tmo', sprechgruppe: '' },
  dmo: { type: 'dmo', dmoKanal: '' },
  analog: { type: 'analog', band: '4m', frequenz: '' },
};

export function KanalDetailsForm({ value, onChange, errors, disabled, className }: KanalDetailsFormProps) {
  const fieldId = (name: string) => `kanal-details-${name}`;

  const handleTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value as KanalDetailsShape['type'];
    onChange(DEFAULTS[next]);
  };

  const update = (patch: Partial<KanalDetailsShape>) => {
    onChange({ ...value, ...patch } as KanalDetailsShape);
  };

  return (
    <fieldset className={cn('space-y-3', className)} disabled={disabled}>
      <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Kanaltyp</legend>

      <div className="flex gap-3" role="radiogroup" aria-label="Kanaltyp">
        {(['tmo', 'dmo', 'analog'] as const).map((type) => (
          <label key={type} className="inline-flex items-center gap-2 text-sm">
            <input type="radio" name="kanal-type" value={type} checked={value.type === type} onChange={handleTypeChange} />
            <span className="uppercase">{type}</span>
          </label>
        ))}
      </div>

      {value.type === 'tmo' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={fieldId('sprechgruppe')} label="Sprechgruppe" value={value.sprechgruppe} error={errors?.sprechgruppe} required onChange={(sprechgruppe) => update({ sprechgruppe })} />
          <Field id={fieldId('gssi')} label="GSSI (optional)" value={value.gssi ?? ''} onChange={(gssi) => update({ gssi: gssi || undefined })} />
        </div>
      )}

      {value.type === 'dmo' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={fieldId('dmoKanal')} label="DMO-Kanal" value={value.dmoKanal} error={errors?.dmoKanal} required onChange={(dmoKanal) => update({ dmoKanal })} />
          <Field id={fieldId('repeater')} label="Repeater (optional)" value={value.repeater ?? ''} onChange={(repeater) => update({ repeater: repeater || undefined })} />
        </div>
      )}

      {value.type === 'analog' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Band
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={value.band}
              onChange={(event) => update({ band: event.target.value as '4m' | '2m' })}
            >
              <option value="4m">4 m</option>
              <option value="2m">2 m</option>
            </select>
          </label>
          <Field id={fieldId('frequenz')} label="Frequenz (MHz)" value={value.frequenz} error={errors?.frequenz} required onChange={(frequenz) => update({ frequenz })} />
          <Field id={fieldId('kanalnummer')} label="Kanal-Nr. (optional)" value={value.kanalnummer ?? ''} onChange={(kanalnummer) => update({ kanalnummer: kanalnummer || undefined })} />
        </div>
      )}
    </fieldset>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

function Field({ id, label, value, error, required, onChange }: FieldProps) {
  return (
    <label htmlFor={id} className="text-sm">
      <span className="block">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn('mt-1 w-full rounded border px-2 py-1 text-sm dark:bg-slate-900', error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700')}
      />
      {error && (
        <span id={`${id}-error`} className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
