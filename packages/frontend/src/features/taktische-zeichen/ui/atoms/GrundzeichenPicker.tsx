/**
 * GrundzeichenPicker — Auswahl des Grundzeichens für ein taktisches Zeichen.
 *
 * Zeigt ein Grid aller verfügbaren Grundzeichen mit Mini-Vorschau.
 */

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
  // Sortiere: priorisierte zuerst, dann alphabetisch nach Label
  const sortiertGrundzeichen = [...SICHTBARE_GRUNDZEICHEN].sort((a, b) => {
    const prioA = PRIORISIERTE_GRUNDZEICHEN.indexOf(a.id as GrundzeichenId);
    const prioB = PRIORISIERTE_GRUNDZEICHEN.indexOf(b.id as GrundzeichenId);
    if (prioA !== -1 && prioB !== -1) return prioA - prioB;
    if (prioA !== -1) return -1;
    if (prioB !== -1) return 1;
    return a.label.localeCompare(b.label, 'de');
  });

  return (
    <div className="grid max-h-64 grid-cols-4 gap-1.5 overflow-y-auto">
      {sortiertGrundzeichen.map((gz) => {
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
  );
}
