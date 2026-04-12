/**
 * KatalogEintrag — Einzelner Eintrag in der Zeichen-Katalog-Liste.
 *
 * Zeigt Vorschau, Name, Kategorie-Badge und Tags.
 * Auswählbar per Klick.
 */

import { cn } from '@/shared/ui/cn';
import { ZeichenPreview } from '../../rendering/ZeichenPreview';
import type { ZeichenDefinition } from '../../rendering/renderer';

export interface KatalogEintragData {
  id: string;
  name: string;
  kategorie: string;
  beschreibung?: string;
  zeichenDefinition: ZeichenDefinition;
  tags: string[];
  sortOrder: number;
  istStandard: boolean;
}

export interface KatalogEintragProps {
  eintrag: KatalogEintragData;
  isSelected?: boolean;
  onClick: (eintrag: KatalogEintragData) => void;
}

const KATEGORIE_FARBEN: Record<string, string> = {
  FUEHRUNG: 'bg-blue-100 text-blue-700',
  EINHEITEN: 'bg-green-100 text-green-700',
  FAHRZEUGE: 'bg-orange-100 text-orange-700',
  GEFAHREN: 'bg-red-100 text-red-700',
  VERSORGUNG: 'bg-purple-100 text-purple-700',
  INFRASTRUKTUR: 'bg-gray-100 text-gray-700',
};

export function KatalogEintrag({ eintrag, isSelected = false, onClick }: KatalogEintragProps) {
  const kategorieFarbe = KATEGORIE_FARBEN[eintrag.kategorie] ?? 'bg-gray-100 text-gray-700';

  return (
    <button
      type="button"
      onClick={() => onClick(eintrag)}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
        isSelected ? 'border border-action-primary bg-action-secondary' : 'hover:bg-surface-hover border border-transparent',
      )}
    >
      {/* Zeichen-Vorschau */}
      <div className="flex-shrink-0">
        <ZeichenPreview definition={eintrag.zeichenDefinition} size="sm" />
      </div>

      {/* Inhalt */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text-primary">{eintrag.name}</span>
          <span className={cn('flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', kategorieFarbe)}>{eintrag.kategorie}</span>
        </div>
        {eintrag.tags.length > 0 && <p className="mt-0.5 truncate text-xs text-text-muted">{eintrag.tags.slice(0, 3).join(', ')}</p>}
      </div>
    </button>
  );
}
