/**
 * OrganisationPicker — Auswahl der Organisation für ein taktisches Zeichen.
 *
 * Zeigt ein Grid aller Organisationen mit farbiger Vorschau.
 */

import { useState } from 'react';
import { organisationen } from 'taktische-zeichen-core';
import { cn } from '@/shared/ui/cn';
import { Input } from '@/shared/ui/atoms/input.atom';
import { ZeichenPreview } from '../../rendering/ZeichenPreview';
import type { ZeichenDefinition } from '../../rendering/renderer';
import type { GrundzeichenId, OrganisationId } from 'taktische-zeichen-core';

export interface OrganisationPickerProps {
  /** Aktuelles Grundzeichen (für Live-Vorschau) */
  grundzeichen: GrundzeichenId;
  /** Aktuell ausgewählte Organisation */
  value?: OrganisationId;
  /** Callback bei Auswahl */
  onChange: (id: OrganisationId | undefined) => void;
}

export function OrganisationPicker({ grundzeichen: gz, value, onChange }: OrganisationPickerProps) {
  const [suche, setSuche] = useState('');

  /** Gefilterte Organisationen basierend auf Suchbegriff */
  const gefilterteOrganisationen = organisationen.filter((org) => org.label.toLowerCase().includes(suche.toLowerCase()));

  return (
    <div className="flex flex-col gap-2">
      {/* Keine Organisation */}
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
          value === undefined ? 'border-2 border-action-primary bg-action-secondary text-text-primary' : 'hover:bg-surface-hover border-2 border-transparent text-text-muted hover:text-text-primary',
        )}
      >
        <ZeichenPreview definition={{ grundzeichen: gz }} size="sm" />
        <span>Keine / Allgemein</span>
      </button>

      {/* Suchfeld */}
      <Input type="text" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Organisation suchen..." autoComplete="off" fullWidth className="mb-2" />

      {/* Organisationen */}
      <div className="grid grid-cols-2 gap-1.5">
        {gefilterteOrganisationen.map((org) => {
          const definition: ZeichenDefinition = { grundzeichen: gz, organisation: org.id as OrganisationId };
          const isSelected = value === org.id;

          return (
            <button
              key={org.id}
              type="button"
              onClick={() => onChange(org.id as OrganisationId)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md p-2 text-center transition-colors',
                isSelected ? 'border-2 border-action-primary bg-action-secondary' : 'hover:bg-surface-hover border-2 border-transparent',
              )}
            >
              <ZeichenPreview definition={definition} size="sm" />
              <span className="text-[10px] text-text-secondary">{org.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
