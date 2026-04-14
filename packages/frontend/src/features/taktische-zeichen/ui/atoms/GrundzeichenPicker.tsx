/**
 * GrundzeichenPicker — Auswahl des Grundzeichens für ein taktisches Zeichen.
 *
 * Zeigt ein Grid aller verfügbaren Grundzeichen mit Mini-Vorschau.
 */

import { useState } from 'react';
import { grundzeichen } from 'taktische-zeichen-core';
import { cn } from '@/shared/ui/cn';
import { ZeichenPreview } from '../../rendering/ZeichenPreview';
import type { ZeichenDefinition } from '../../rendering/renderer';
import type { GrundzeichenId } from 'taktische-zeichen-core';

// Bevorzugte Grundzeichen zuerst (häufig genutzt)
const PRIORISIERTE_GRUNDZEICHEN: GrundzeichenId[] = [
  'kraftfahrzeug-gelaendegaengig',
  'kraftfahrzeug-landgebunden',
  'taktische-formation',
  'befehlsstelle',
  'stelle',
  'person',
  'fahrzeug',
  'hubschrauber',
  'flugzeug',
  'wasserfahrzeug',
  'massnahme',
  'gefahr-akut',
  'gefahr-vermutet',
  'anlass',
];

const SICHTBARE_GRUNDZEICHEN = grundzeichen.filter((gz) => !gz.deprecated);

export interface GrundzeichenPickerProps {
  /** Aktuell ausgewähltes Grundzeichen */
  value?: GrundzeichenId;
  /** Callback bei Auswahl */
  onChange: (id: GrundzeichenId) => void;
}

export function GrundzeichenPicker({ value, onChange }: GrundzeichenPickerProps) {
  const [suche, setSuche] = useState('');

  // Sortiere: priorisierte zuerst, dann alphabetisch nach Label
  const sortiertGrundzeichen = [...SICHTBARE_GRUNDZEICHEN].sort((a, b) => {
    const prioA = PRIORISIERTE_GRUNDZEICHEN.indexOf(a.id as GrundzeichenId);
    const prioB = PRIORISIERTE_GRUNDZEICHEN.indexOf(b.id as GrundzeichenId);
    if (prioA !== -1 && prioB !== -1) return prioA - prioB;
    if (prioA !== -1) return -1;
    if (prioB !== -1) return 1;
    return a.label.localeCompare(b.label, 'de');
  });

  /** Gefilterte Grundzeichen basierend auf Suchbegriff */
  const gefilterteGrundzeichen = sortiertGrundzeichen.filter((gz) => gz.label.toLowerCase().includes(suche.toLowerCase()));

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        placeholder="Grundzeichen suchen..."
        autoComplete="off"
        autoCorrect="off"
        className="mb-2 w-full rounded-md border border-border-subtle bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-action-primary focus:ring-1 focus:ring-action-primary focus:outline-none"
      />
      <div className="grid grid-cols-4 gap-1.5">
        {gefilterteGrundzeichen.map((gz) => {
          const definition: ZeichenDefinition = { grundzeichen: gz.id as GrundzeichenId };
          const isSelected = value === gz.id;

          return (
            <button
              key={gz.id}
              type="button"
              title={gz.label}
              onClick={() => onChange(gz.id as GrundzeichenId)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md p-1.5 text-center transition-colors',
                isSelected ? 'border-2 border-action-primary bg-action-secondary' : 'hover:bg-surface-hover border-2 border-transparent',
              )}
            >
              <ZeichenPreview definition={definition} size="sm" />
              <span className="w-full truncate text-[9px] leading-tight text-text-muted">{gz.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
