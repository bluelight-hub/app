/**
 * FachaufgabePicker — Auswahl der Fachaufgabe für ein taktisches Zeichen.
 *
 * Zeigt ein Grid aller Fachaufgaben mit Live-Vorschau.
 */

import { useState } from 'react';
import { fachaufgaben } from 'taktische-zeichen-core';
import { cn } from '@/shared/ui/cn';
import { Input } from '@/shared/ui/atoms/input.atom';
import { ZeichenPreview } from '../../rendering/ZeichenPreview';
import type { ZeichenDefinition } from '../../rendering/renderer';
import type { FachaufgabeId, GrundzeichenId, OrganisationId } from 'taktische-zeichen-core';

export interface FachaufgabePickerProps {
  /** Aktuelles Grundzeichen (für Live-Vorschau) */
  grundzeichen: GrundzeichenId;
  /** Aktuelle Organisation (für Live-Vorschau) */
  organisation?: OrganisationId;
  /** Aktuell ausgewählte Fachaufgabe */
  value?: FachaufgabeId;
  /** Callback bei Auswahl */
  onChange: (id: FachaufgabeId | undefined) => void;
}

export function FachaufgabePicker({ grundzeichen: gz, organisation, value, onChange }: FachaufgabePickerProps) {
  const [suche, setSuche] = useState('');

  /** Gefilterte Fachaufgaben basierend auf Suchbegriff */
  const gefilterteFachaufgaben = fachaufgaben.filter((fa) => fa.label.toLowerCase().includes(suche.toLowerCase()));

  return (
    <div className="flex flex-col gap-2">
      {/* Keine Fachaufgabe */}
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
          value === undefined ? 'border-2 border-action-primary bg-action-secondary text-text-primary' : 'hover:bg-surface-hover border-2 border-transparent text-text-muted hover:text-text-primary',
        )}
      >
        <ZeichenPreview definition={{ grundzeichen: gz, organisation }} size="sm" />
        <span>Keine / Allgemein</span>
      </button>

      {/* Suchfeld */}
      <Input type="text" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Fachaufgabe suchen..." autoComplete="off" fullWidth className="mb-2" />

      {/* Fachaufgaben-Grid */}
      <div className="grid grid-cols-3 gap-1">
        {gefilterteFachaufgaben.map((fa) => {
          const definition: ZeichenDefinition = {
            grundzeichen: gz,
            organisation,
            fachaufgabe: fa.id as FachaufgabeId,
          };
          const isSelected = value === fa.id;

          return (
            <button
              key={fa.id}
              type="button"
              title={fa.label}
              onClick={() => onChange(fa.id as FachaufgabeId)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md p-1.5 text-center transition-colors',
                isSelected ? 'border-2 border-action-primary bg-action-secondary' : 'hover:bg-surface-hover border-2 border-transparent',
              )}
            >
              <ZeichenPreview definition={definition} size="sm" />
              <span className="w-full truncate text-[9px] leading-tight text-text-muted">{fa.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
