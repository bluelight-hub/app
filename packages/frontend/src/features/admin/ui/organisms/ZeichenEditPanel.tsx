/**
 * ZeichenEditPanel — Panel zum Zuweisen eines Default-Zeichens.
 *
 * Bietet Tab-Switch zwischen "Baukasten" (4-Schritt-Editor) und "Katalog" (DV-102-Auswahl mit Suche).
 * Wird im Admin-Bereich für Default-Zeichen-Zuweisung verwendet.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ZeichenDefinition } from '@/features/taktische-zeichen/rendering/renderer';
import { ZeichenEditor } from '@/features/taktische-zeichen/ui/molecules/ZeichenEditor';
import { ZeichenKatalog } from '@/features/taktische-zeichen/ui/organisms/ZeichenKatalog';
import type { KatalogEintragData } from '@/features/taktische-zeichen/ui/molecules/KatalogEintrag';
import { ZeichenPreview } from '@/features/taktische-zeichen/rendering/ZeichenPreview';
import { TAKTISCHE_ZEICHEN_QUERY_KEYS } from '@/features/taktische-zeichen/api/queries';
import { api } from '@/shared/api/api';
import { Tabs } from '@/shared/ui/molecules/tabs.molecule';

interface ZeichenEditPanelProps {
  /** Typ-Bezeichnung (wird als Titel angezeigt) */
  typBezeichnung: string;
  /** Initiale Zeichendefinition (falls bereits ein Default existiert) */
  initialDefinition?: ZeichenDefinition;
  /** Callback beim Speichern */
  onSave: (definition: ZeichenDefinition) => void;
  /** Speichern läuft */
  isSaving: boolean;
  /** Panel schließen */
  onClose: () => void;
}

/**
 * Panel zum Bearbeiten eines Default-Zeichens mit Baukasten oder Katalog.
 */
export function ZeichenEditPanel({ typBezeichnung, initialDefinition, onSave, isSaving, onClose }: ZeichenEditPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">Default-Zeichen: {typBezeichnung}</h3>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Schließen">
          &times;
        </button>
      </div>

      {/* Aktuelle Vorschau */}
      {initialDefinition && (
        <div className="bg-surface-base flex items-center gap-3 rounded-lg border border-border-subtle p-3">
          <ZeichenPreview definition={initialDefinition} size="md" />
          <span className="text-sm text-text-secondary">Aktuelles Default-Zeichen</span>
        </div>
      )}

      <Tabs
        items={[
          {
            label: 'Baukasten',
            content: (
              <ZeichenEditor
                initialDefinition={initialDefinition ?? { grundzeichen: 'kraftfahrzeug-gelaendegaengig' }}
                onSave={(definition, _label) => onSave(definition)}
                isSaving={isSaving}
                onCancel={onClose}
              />
            ),
          },
          {
            label: 'Katalog',
            content: <KatalogTab onSave={onSave} isSaving={isSaving} />,
          },
        ]}
      />
    </div>
  );
}

/**
 * Katalog-Tab: Nutzt den globalen Katalog-Endpoint mit Suche und Kategorie-Filter.
 */
function KatalogTab({ onSave, isSaving }: { onSave: (definition: ZeichenDefinition) => void; isSaving: boolean }) {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const katalogQuery = useQuery<KatalogEintragData[]>({
    queryKey: [...TAKTISCHE_ZEICHEN_QUERY_KEYS.katalog(), 'global'],
    queryFn: async () => {
      const response = await api.taktischeZeichen().taktischeZeichenControllerGetGlobalKatalogVAlpha({});
      return response.data.map((entry: any) => ({
        id: entry.id,
        name: entry.name,
        kategorie: entry.kategorie,
        beschreibung: entry.beschreibung,
        zeichenDefinition: entry.zeichenDefinition as unknown as ZeichenDefinition,
        tags: entry.tags ?? [],
        sortOrder: entry.sortOrder ?? 0,
        istStandard: entry.istStandard ?? true,
      }));
    },
    staleTime: 5 * 60_000,
  });

  const handleSelect = (eintrag: KatalogEintragData) => {
    setSelectedId(eintrag.id);
    onSave(eintrag.zeichenDefinition);
  };

  return (
    <div className="flex flex-col" style={{ maxHeight: '60vh' }}>
      <ZeichenKatalog
        eintraege={katalogQuery.data ?? []}
        isLoading={katalogQuery.isLoading}
        error={katalogQuery.error ? 'Katalog konnte nicht geladen werden.' : undefined}
        onSelectEintrag={handleSelect}
        selectedEintragId={selectedId}
      />
      {isSaving && <p className="mt-2 text-center text-sm text-text-muted">Wird gespeichert…</p>}
    </div>
  );
}
