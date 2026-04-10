/**
 * SymbolLibraryPanel — Symbolbibliothek für taktische Zeichen
 *
 * Schwebendes Panel mit Kategorie-Tabs und Symbol-Raster.
 * Klick auf ein Symbol wählt es für die Platzierung auf der Karte aus.
 */

import { useState } from 'react';
import { cn } from '@/shared/ui/cn';
import { SYMBOL_CATEGORIES, SYMBOL_CATEGORY_LABELS, getSymbolsByCategory, type SymbolCategory, type SymbolDefinition } from '../../drawing/symbols/symbol-registry';

export interface SymbolLibraryPanelProps {
  /** Panel-Sichtbarkeit */
  isVisible: boolean;
  /** Symbol auswählen (zum Platzieren) */
  onSelectSymbol: (symbol: SymbolDefinition) => void;
  /** Panel schließen */
  onClose: () => void;
}

/** Erzeugt eine Data-URI aus SVG-Content für sichere Darstellung via <img> */
function svgToDataUri(svgContent: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
}

export function SymbolLibraryPanel({ isVisible, onSelectSymbol, onClose }: SymbolLibraryPanelProps) {
  const [activeCategory, setActiveCategory] = useState<SymbolCategory>('feuerwehr');

  if (!isVisible) return null;

  const symbols = getSymbolsByCategory(activeCategory);

  return (
    <div className="absolute top-4 left-16 z-10 w-64 rounded-lg border border-border-subtle bg-surface-panel shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <span className="text-xs font-medium text-text-secondary">Symbolbibliothek</span>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Schließen">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Kategorie-Tabs */}
      <div className="flex border-b border-border-subtle">
        {SYMBOL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'flex-1 px-1 py-1.5 text-[10px] transition-colors',
              activeCategory === cat ? 'border-b-2 border-action-primary font-medium text-action-primary' : 'text-text-muted hover:text-text-primary',
            )}
          >
            {SYMBOL_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Symbol-Raster */}
      <div className="grid max-h-48 grid-cols-4 gap-1 overflow-y-auto p-2">
        {symbols.map((symbol) => (
          <button
            key={symbol.id}
            type="button"
            onClick={() => onSelectSymbol(symbol)}
            title={symbol.label}
            className="flex flex-col items-center gap-0.5 rounded p-1.5 transition-colors hover:bg-action-secondary"
          >
            <img src={svgToDataUri(symbol.svgContent)} alt={symbol.label} width={symbol.width} height={symbol.height} className="h-8 w-8" />
            <span className="max-w-full truncate text-[9px] text-text-muted">{symbol.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
