/**
 * ZeichenKatalog — Übersicht aller verfügbaren taktischen Zeichen.
 *
 * Panel mit Suchfeld und Kategorie-Tabs.
 * Zeigt gefilterte KatalogEintrag-Komponenten.
 * Nach Auswahl: Platzierungsmodus mit Abbruch-Option.
 */

import { useState, useMemo } from 'react';
import { PiCursorClick, PiListBullets, PiX } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { ZeichenPreview } from '../../rendering/ZeichenPreview';
import { KatalogEintrag, type KatalogEintragData } from '../molecules/KatalogEintrag';

export const ZEICHEN_KATEGORIEN = ['FUEHRUNG', 'EINHEITEN', 'FAHRZEUGE', 'GEFAHREN', 'VERSORGUNG', 'INFRASTRUKTUR'] as const;
export type ZeichenKategorie = (typeof ZEICHEN_KATEGORIEN)[number];

const KATEGORIE_LABELS: Record<ZeichenKategorie, string> = {
  FUEHRUNG: 'Führung',
  EINHEITEN: 'Einheiten',
  FAHRZEUGE: 'Fahrzeuge',
  GEFAHREN: 'Gefahren',
  VERSORGUNG: 'Versorgung',
  INFRASTRUKTUR: 'Infrastruktur',
};

export interface ZeichenKatalogProps {
  /** Alle verfügbaren Katalog-Einträge */
  eintraege: KatalogEintragData[];
  /** Ladezustand */
  isLoading?: boolean;
  /** Fehlermeldung */
  error?: string;
  /** Callback wenn ein Zeichen ausgewählt wird */
  onSelectEintrag: (eintrag: KatalogEintragData) => void;
  /** Aktuell ausgewählter Eintrag */
  selectedEintragId?: string;
  /** Zeichen wartet auf Platzierung auf der Karte */
  isPendingPlacement?: boolean;
  /** Platzierung abbrechen */
  onCancelPlacement?: () => void;
}

export function ZeichenKatalog({ eintraege, isLoading, error, onSelectEintrag, selectedEintragId, isPendingPlacement, onCancelPlacement }: ZeichenKatalogProps) {
  const [suche, setSuche] = useState('');
  const [aktiveKategorie, setAktiveKategorie] = useState<ZeichenKategorie | 'ALLE'>('ALLE');

  const gefilterteEintraege = useMemo(() => {
    let ergebnis = eintraege;

    if (aktiveKategorie !== 'ALLE') {
      ergebnis = ergebnis.filter((e) => e.kategorie === aktiveKategorie);
    }

    if (suche.trim()) {
      const suchBegriff = suche.toLowerCase().trim();
      ergebnis = ergebnis.filter(
        (e) => e.name.toLowerCase().includes(suchBegriff) || e.tags.some((tag) => tag.toLowerCase().includes(suchBegriff)) || (e.beschreibung?.toLowerCase().includes(suchBegriff) ?? false),
      );
    }

    return ergebnis;
  }, [eintraege, aktiveKategorie, suche]);

  const selectedEintrag = selectedEintragId ? eintraege.find((e) => e.id === selectedEintragId) : undefined;

  // Platzierungsmodus: Zeichen ausgewählt, wartet auf Karten-Klick
  if (isPendingPlacement && selectedEintrag) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4">
        {/* Ausgewähltes Zeichen */}
        <div className="relative">
          <div className="absolute -inset-3 animate-pulse rounded-full bg-action-primary/10" />
          <div className="relative rounded-xl border border-action-primary/20 bg-gradient-to-b from-action-primary/5 to-transparent p-5">
            <ZeichenPreview definition={selectedEintrag.zeichenDefinition} size="lg" />
          </div>
        </div>

        {/* Name & Platzierungs-Hinweis */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-sm font-medium text-text-primary">{selectedEintrag.name}</span>
          <div className="flex items-center gap-2 text-action-primary">
            <PiCursorClick className="h-5 w-5 animate-bounce" />
            <span className="text-sm font-semibold">Auf Karte klicken</span>
          </div>
          <p className="text-xs leading-relaxed text-text-muted">Klicke auf die gewünschte Position,{'\u00A0'}um das Zeichen zu platzieren.</p>
        </div>

        {/* Aktionen */}
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onCancelPlacement}
            className="flex items-center justify-center gap-2 rounded-lg bg-action-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-primary-hover"
          >
            <PiListBullets className="h-4 w-4" />
            Anderes Zeichen wählen
          </button>
          <button
            type="button"
            onClick={onCancelPlacement}
            className="hover:bg-surface-hover flex items-center justify-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            <PiX className="h-4 w-4" />
            Platzierung abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Suchfeld */}
      <div className="border-b border-border-subtle px-3 py-2">
        <input
          type="search"
          placeholder="Zeichen suchen..."
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          className="bg-surface-input w-full rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:border-action-primary focus:outline-none"
        />
      </div>

      {/* Kategorie-Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border-subtle px-3 py-2">
        <button
          type="button"
          onClick={() => setAktiveKategorie('ALLE')}
          className={cn(
            'rounded px-2 py-1 text-[11px] font-medium transition-colors',
            aktiveKategorie === 'ALLE' ? 'bg-action-primary text-white' : 'hover:bg-surface-hover text-text-muted hover:text-text-primary',
          )}
        >
          Alle
        </button>
        {ZEICHEN_KATEGORIEN.map((kat) => (
          <button
            key={kat}
            type="button"
            onClick={() => setAktiveKategorie(kat)}
            className={cn(
              'rounded px-2 py-1 text-[11px] font-medium transition-colors',
              aktiveKategorie === kat ? 'bg-action-primary text-white' : 'hover:bg-surface-hover text-text-muted hover:text-text-primary',
            )}
          >
            {KATEGORIE_LABELS[kat]}
          </button>
        ))}
      </div>

      {/* Ergebnisliste */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-text-muted">Lade Katalog...</span>
          </div>
        )}

        {error && !isLoading && <div className="px-3 py-4 text-sm text-red-600">{error}</div>}

        {!isLoading && !error && gefilterteEintraege.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-text-muted">{suche ? 'Keine Zeichen für diese Suche gefunden.' : 'Keine Zeichen in dieser Kategorie.'}</div>
        )}

        {!isLoading && !error && gefilterteEintraege.length > 0 && (
          <div className="flex flex-col gap-1 p-2">
            {gefilterteEintraege.map((eintrag) => (
              <KatalogEintrag key={eintrag.id} eintrag={eintrag} isSelected={eintrag.id === selectedEintragId} onClick={onSelectEintrag} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
