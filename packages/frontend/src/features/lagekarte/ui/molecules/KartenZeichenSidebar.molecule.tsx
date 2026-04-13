/**
 * KartenZeichenSidebar — Slide-In-Panel für taktische Zeichen auf der Lagekarte.
 *
 * Enthält zwei Tabs:
 * - Katalog: Durchsuchbare Liste aller Standard-Zeichen (aus Backend-API)
 * - Baukasten: Geführter 4-Schritt-Wizard zum Erstellen eigener Zeichen
 *
 * Ein ausgewähltes Zeichen aus dem Katalog oder ein neu erstelltes Zeichen
 * wird dem Einsatz hinzugefügt. Die Platzierung auf der Karte erfolgt anschließend
 * per Drag & Drop oder über das Zeichen-Panel.
 */

import type * as React from 'react';
import { useCallback, useState } from 'react';
import { PiList, PiWrench, PiX } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { ZeichenKatalog } from '@/features/taktische-zeichen/ui/organisms/ZeichenKatalog';
import { ZeichenBaukasten } from '@/features/taktische-zeichen/ui/organisms/ZeichenBaukasten';
import type { KatalogEintragData } from '@/features/taktische-zeichen/ui/molecules/KatalogEintrag';
import type { ZeichenDefinition } from '@/features/taktische-zeichen/rendering/renderer';
import { useZeichenKatalog, useCreateZeichen } from '@/features/taktische-zeichen';
import type { ZeichenKatalogEintragResponseDto } from '@bluelight-hub/shared/client';
import { drawStore, setZeichenSidebarTab, toggleZeichenSidebar, setPendingZeichenPlacement, clearPendingZeichenPlacement } from '@/features/lagekarte/stores/draw.store';
import { useStore } from '@tanstack/react-store';

/** Konvertiert ein API-DTO in das lokale KatalogEintragData-Format */
function dtoZuKatalogEintrag(dto: ZeichenKatalogEintragResponseDto): KatalogEintragData {
  return {
    id: dto.id,
    name: dto.name,
    kategorie: dto.kategorie,
    beschreibung: dto.beschreibung,
    zeichenDefinition: {
      grundzeichen: dto.zeichenDefinition.grundzeichen as import('taktische-zeichen-core').GrundzeichenId,
      organisation: dto.zeichenDefinition.organisation as import('taktische-zeichen-core').OrganisationId | undefined,
      fachaufgabe: dto.zeichenDefinition.fachaufgabe as import('taktische-zeichen-core').FachaufgabeId | undefined,
      einheit: dto.zeichenDefinition.einheit as import('taktische-zeichen-core').EinheitId | undefined,
      verwaltungsstufe: dto.zeichenDefinition.verwaltungsstufe as import('taktische-zeichen-core').VerwaltungsstufeId | undefined,
    },
    tags: dto.tags,
    sortOrder: dto.sortOrder,
    istStandard: dto.istStandard,
  };
}

interface KartenZeichenSidebarProps {
  /** Einsatz-ID für API-Calls */
  einsatzId: string;
  /** Ob die Sidebar sichtbar ist */
  isVisible: boolean;
}

/**
 * Slide-In-Sidebar für taktische Zeichen auf der Lagekarte.
 */
export function KartenZeichenSidebar({ einsatzId, isVisible }: KartenZeichenSidebarProps) {
  const activeTab = useStore(drawStore, (s) => s.zeichenSidebarTab);
  const pendingPlacement = useStore(drawStore, (s) => s.pendingZeichenPlacement);
  const [selectedEintragId, setSelectedEintragId] = useState<string | undefined>(undefined);

  // Zeichen-Katalog vom Backend laden
  const { data: katalogDtos = [], isLoading: isKatalogLoading, error: katalogError } = useZeichenKatalog(einsatzId);

  // Zeichen-Erstellung
  const { mutate: createZeichen, isPending: isCreating } = useCreateZeichen(einsatzId);

  // Katalog-DTOs in lokales Format konvertieren
  const katalogEintraege: KatalogEintragData[] = katalogDtos.map(dtoZuKatalogEintrag);

  /** Aus Katalog: Zeichen dem Einsatz hinzufügen und Platzierungsmodus aktivieren */
  const handleKatalogSelect = useCallback(
    (eintrag: KatalogEintragData) => {
      setSelectedEintragId(eintrag.id);
      createZeichen(
        {
          zeichenDefinition: {
            grundzeichen: eintrag.zeichenDefinition.grundzeichen ?? 'kraftfahrzeug-gelaendegaengig',
            organisation: eintrag.zeichenDefinition.organisation,
            fachaufgabe: eintrag.zeichenDefinition.fachaufgabe,
            einheit: eintrag.zeichenDefinition.einheit,
            verwaltungsstufe: eintrag.zeichenDefinition.verwaltungsstufe,
          },
          katalogEintragId: eintrag.id,
        },
        {
          onSuccess: (created) => {
            setPendingZeichenPlacement(created.id, eintrag.zeichenDefinition);
          },
        },
      );
    },
    [createZeichen],
  );

  /** Aus Baukasten: Eigenes Zeichen erstellen und Platzierungsmodus aktivieren */
  const handleBaukastenErstellen = useCallback(
    (definition: ZeichenDefinition, label?: string) => {
      createZeichen(
        {
          zeichenDefinition: {
            grundzeichen: definition.grundzeichen ?? 'kraftfahrzeug-gelaendegaengig',
            organisation: definition.organisation,
            fachaufgabe: definition.fachaufgabe,
            einheit: definition.einheit,
            verwaltungsstufe: definition.verwaltungsstufe,
          },
          ...(label && { label }),
        },
        {
          onSuccess: (created) => {
            setPendingZeichenPlacement(created.id, definition);
          },
        },
      );
    },
    [createZeichen],
  );

  return (
    <div
      className={cn(
        'absolute top-0 right-0 z-20 flex h-full flex-col border-l border-border-subtle bg-surface-panel shadow-xl transition-transform duration-300 ease-out',
        'w-80',
        isVisible ? 'translate-x-0' : 'translate-x-full',
      )}
      aria-hidden={!isVisible}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Taktische Zeichen</h2>
        <button
          type="button"
          aria-label="Zeichen-Sidebar schließen"
          onClick={toggleZeichenSidebar}
          className="rounded p-1 text-text-muted transition-colors hover:bg-action-secondary hover:text-text-primary focus-visible:shadow-focus-ring focus-visible:outline-none"
        >
          <PiX className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle" role="tablist" aria-label="Zeichen-Auswahl">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'katalog'}
          aria-controls="zeichen-tab-katalog"
          id="zeichen-tab-btn-katalog"
          onClick={() => setZeichenSidebarTab('katalog')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none',
            activeTab === 'katalog' ? 'border-b-2 border-action-primary text-action-primary' : 'text-text-muted hover:text-text-primary',
          )}
        >
          <PiList className="h-3.5 w-3.5" aria-hidden="true" />
          Katalog
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'baukasten'}
          aria-controls="zeichen-tab-baukasten"
          id="zeichen-tab-btn-baukasten"
          onClick={() => setZeichenSidebarTab('baukasten')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none',
            activeTab === 'baukasten' ? 'border-b-2 border-action-primary text-action-primary' : 'text-text-muted hover:text-text-primary',
          )}
        >
          <PiWrench className="h-3.5 w-3.5" aria-hidden="true" />
          Baukasten
        </button>
      </div>

      {/* Tab-Inhalte */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Katalog-Tab */}
        <div id="zeichen-tab-katalog" role="tabpanel" aria-labelledby="zeichen-tab-btn-katalog" hidden={activeTab !== 'katalog'} className="flex min-h-0 flex-1 flex-col">
          <ZeichenKatalog
            eintraege={katalogEintraege}
            isLoading={isKatalogLoading}
            error={katalogError ? 'Katalog konnte nicht geladen werden.' : undefined}
            onSelectEintrag={handleKatalogSelect}
            selectedEintragId={selectedEintragId}
            isPendingPlacement={!!pendingPlacement}
            onCancelPlacement={clearPendingZeichenPlacement}
          />
        </div>

        {/* Baukasten-Tab */}
        <div id="zeichen-tab-baukasten" role="tabpanel" aria-labelledby="zeichen-tab-btn-baukasten" hidden={activeTab !== 'baukasten'} className="flex min-h-0 flex-1 flex-col p-3">
          <ZeichenBaukasten onErstelleZeichen={handleBaukastenErstellen} isCreating={isCreating} isPendingPlacement={!!pendingPlacement} onCancelPlacement={clearPendingZeichenPlacement} />
        </div>
      </div>
    </div>
  );
}
