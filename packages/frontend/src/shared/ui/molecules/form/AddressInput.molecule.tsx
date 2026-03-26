/**
 * AddressInput Molecule - Wiederverwendbare Adress-Eingabe mit PLZ-Autocomplete.
 *
 * Rendert vier koordinierte Formularfelder (PLZ, Ort, Bundesland, Land).
 * Bei PLZ-Eingabe wird automatisch Ort und Bundesland via Backend-API befüllt.
 *
 * Die Parent-Form behält die Ownership über alle Feldwerte.
 * Die Molecule nimmt vier `AnyFieldApi`-Instanzen als Props.
 *
 * @module shared/ui/molecules/form
 */

import { Input } from '@/shared/ui/atoms/input.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { InlineSpinner } from '@/shared/ui/atoms/spinner.atom';
import { FormFieldWrapper } from '@/shared/ui/molecules/form/FormFieldWrapper';
import { usePlzLookup } from '@/shared/api/use-plz-lookup';
import { DACH_LAENDER } from './address-input-laender';
import type { AnyFieldApi } from '@tanstack/react-form';
import { debounce } from '@tanstack/pacer';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/ui/cn';

export interface AddressInputProps {
  /** TanStack Form Field Handle für PLZ */
  plzField: AnyFieldApi;
  /** TanStack Form Field Handle für Ort */
  ortField: AnyFieldApi;
  /** TanStack Form Field Handle für Bundesland/Region */
  bundeslandField: AnyFieldApi;
  /** TanStack Form Field Handle für Ländercode (ISO 3166-1 Alpha-2) */
  landField: AnyFieldApi;
  /** Callback wenn PLZ-Lookup Koordinaten liefert (für Straßen-Autocomplete Proximity-Bias) */
  onCoordinatesChange?: (lat: string, lon: string) => void;
  /** Deaktiviert alle Felder */
  disabled?: boolean;
  /** Zusätzliche CSS-Klassen für den Container */
  className?: string;
}

/**
 * Wiederverwendbare Adress-Eingabe mit PLZ-Autocomplete.
 *
 * - PLZ-Eingabe → Debounce 400ms → API-Lookup → Auto-Populate Ort + Bundesland
 * - Benutzer kann auto-befüllte Werte manuell überschreiben (Dirty-Flag-Schutz)
 * - Land-Wechsel triggert neuen Lookup
 */
export function AddressInput({ plzField, ortField, bundeslandField, landField, onCoordinatesChange, disabled = false, className }: AddressInputProps) {
  const [debouncedPlz, setDebouncedPlz] = useState('');
  const ortDirtyRef = useRef(false);
  const bundeslandDirtyRef = useRef(false);

  // Debounce PLZ-Eingabe (400ms) — stabile Referenz via useRef
  const debouncedSetPlz = useRef(debounce((value: string) => setDebouncedPlz(value), { wait: 400 })).current;

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      debouncedSetPlz.cancel?.();
    };
  }, [debouncedSetPlz]);

  // PLZ-Lookup Query
  const countryCode = (landField.state.value as string) || 'DE';
  const { data, isLoading, isError } = usePlzLookup(countryCode, debouncedPlz);

  // Stabile Referenzen auf die Field-Handles (vermeidet infinite Loop im useEffect)
  const ortFieldRef = useRef(ortField);
  ortFieldRef.current = ortField;
  const bundeslandFieldRef = useRef(bundeslandField);
  bundeslandFieldRef.current = bundeslandField;
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  onCoordinatesChangeRef.current = onCoordinatesChange;

  // Auto-Populate bei erfolgreichem Lookup
  // Nur `data` als Dependency — Field-Handles über Refs, um Re-Render-Loops zu vermeiden
  useEffect(() => {
    if (!data) return;

    if (data.orte.length > 0) {
      const erstesErgebnis = data.orte[0]!;

      if (!ortDirtyRef.current) {
        ortFieldRef.current.handleChange(erstesErgebnis.ortsname);
      }

      if (!bundeslandDirtyRef.current) {
        bundeslandFieldRef.current.handleChange(erstesErgebnis.bundesland);
      }

      // Koordinaten an Parent weitergeben (für Straßen-Autocomplete Proximity-Bias)
      onCoordinatesChangeRef.current?.(erstesErgebnis.breitengrad, erstesErgebnis.laengengrad);
    } else {
      // Keine Treffer: Auto-befüllte Felder zurücksetzen (nur wenn nicht manuell geändert)
      if (!ortDirtyRef.current) {
        ortFieldRef.current.handleChange('');
      }
      if (!bundeslandDirtyRef.current) {
        bundeslandFieldRef.current.handleChange('');
      }
    }
  }, [data]);

  // Bei Land-Wechsel Dirty-Flags zurücksetzen
  useEffect(() => {
    ortDirtyRef.current = false;
    bundeslandDirtyRef.current = false;
  }, [countryCode]);

  const plzHasLookupError = isError && debouncedPlz.length >= 4;
  const plzVariant = (plzField.state.meta.errors as string[]).length > 0 || plzHasLookupError ? 'error' : 'default';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Zeile 1: PLZ + Land */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <FormFieldWrapper field={plzField} label="PLZ">
            <Input
              id={plzField.name}
              type="text"
              inputMode="numeric"
              placeholder="z.B. 80331"
              value={plzField.state.value as string}
              variant={plzVariant}
              disabled={disabled}
              rightElement={isLoading ? <InlineSpinner size="xs" className="mr-2 text-text-muted" label="PLZ wird gesucht…" /> : undefined}
              onBlur={plzField.handleBlur}
              onChange={(e) => {
                const value = e.target.value;
                plzField.handleChange(value);
                debouncedSetPlz(value);
                // Bei neuer PLZ-Eingabe Dirty-Flags zurücksetzen
                ortDirtyRef.current = false;
                bundeslandDirtyRef.current = false;
              }}
              className="mt-1"
            />
            {plzHasLookupError && (plzField.state.meta.errors as string[]).length === 0 && <p className="mt-1 text-sm text-status-danger-text">PLZ nicht gefunden</p>}
          </FormFieldWrapper>
        </div>

        <div className="col-span-1">
          <FormFieldWrapper field={landField} label="Land">
            <Select id={landField.name} options={DACH_LAENDER} value={countryCode} disabled={disabled} onChange={(e) => landField.handleChange(e.target.value)} className="mt-1" />
          </FormFieldWrapper>
        </div>
      </div>

      {/* Zeile 2: Ort */}
      <FormFieldWrapper field={ortField} label="Ort">
        <Input
          id={ortField.name}
          type="text"
          placeholder="z.B. München"
          value={ortField.state.value as string}
          disabled={disabled}
          onBlur={ortField.handleBlur}
          onChange={(e) => {
            ortField.handleChange(e.target.value);
            ortDirtyRef.current = true;
          }}
          className="mt-1"
        />
      </FormFieldWrapper>

      {/* Zeile 3: Bundesland */}
      <FormFieldWrapper field={bundeslandField} label="Bundesland / Region" optional>
        <Input
          id={bundeslandField.name}
          type="text"
          placeholder="z.B. Bayern"
          value={bundeslandField.state.value as string}
          disabled={disabled}
          onBlur={bundeslandField.handleBlur}
          onChange={(e) => {
            bundeslandField.handleChange(e.target.value);
            bundeslandDirtyRef.current = true;
          }}
          className="mt-1"
        />
      </FormFieldWrapper>
    </div>
  );
}
