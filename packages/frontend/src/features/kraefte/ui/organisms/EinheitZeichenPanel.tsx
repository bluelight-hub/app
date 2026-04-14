/**
 * Panel zum Zuweisen und Bearbeiten des taktischen Zeichens einer Einheit.
 *
 * Zeigt das aktuelle Zeichen mit Vorschau und bietet den ZeichenEditor
 * zum Erstellen bzw. Bearbeiten. Nutzt SlideIn-Dialog wie die anderen
 * Kräfte-Panels (PersonZuweisungPanel, FahrzeugZuweisungPanel).
 *
 * Issue #667 — Einsatz-Einheiten: Taktische Zeichen zuweisen & Lagekarte anzeigen
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PiMapPin, PiPaintBrush } from 'react-icons/pi';

import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { ZeichenPreview } from '@/features/taktische-zeichen/rendering/ZeichenPreview';
import type { ZeichenDefinition } from '@/features/taktische-zeichen/rendering/renderer';
import type { ZeichenDefinitionRequestDto } from '@bluelight-hub/shared/client';
import { ZeichenEditor } from '@/features/taktische-zeichen/ui/molecules/ZeichenEditor';

import { useCreateZeichen } from '@/features/taktische-zeichen/api/use-create-zeichen';
import { KRAEFTE_QUERY_KEYS } from '@/features/kraefte/api/queries';
import { useEinheitZeichen } from '@/features/kraefte/api/use-einheit-zeichen';
import { useUpdateEinheitZeichen } from '@/features/kraefte/api/use-update-einheit-zeichen';

interface EinheitZeichenPanelProps {
  /** Ob das Panel geöffnet ist */
  isOpen: boolean;
  /** Handler zum Schließen */
  onClose: () => void;
  /** Einsatz-ID */
  einsatzId: string;
  /** Einheit-ID */
  einheitId: string;
  /** Name der Einheit (für den Panel-Titel) */
  einheitName: string;
}

/**
 * Slide-In Panel für die Zuweisung und Bearbeitung des taktischen Zeichens einer Einheit.
 *
 * Zeigt drei Bereiche:
 * 1. Aktuelle Zeichen-Vorschau (falls vorhanden)
 * 2. Hinweis "Auf Karte platzieren" (falls Zeichen existiert aber nicht platziert)
 * 3. ZeichenEditor zum Erstellen/Bearbeiten der Zeichendefinition
 */
export function EinheitZeichenPanel({ isOpen, onClose, einsatzId, einheitId, einheitName }: EinheitZeichenPanelProps) {
  const queryClient = useQueryClient();
  const { data: zeichen, isLoading } = useEinheitZeichen(einsatzId, einheitId);
  const { mutate: updateZeichen, isPending: isUpdating } = useUpdateEinheitZeichen(einsatzId, einheitId);
  const { mutate: createZeichenMutation, isPending: isCreating } = useCreateZeichen(einsatzId);

  const isPending = isUpdating || isCreating;

  /** Aktuelle Definition aus dem Response DTO in die Renderer-Definition konvertieren */
  const aktuelleDefinition: ZeichenDefinition | undefined = zeichen?.zeichenDefinition ? (zeichen.zeichenDefinition as unknown as ZeichenDefinition) : undefined;

  /** Zeichen existiert, ist aber nicht auf der Karte platziert */
  const istNichtPlatziert = zeichen && !zeichen.lat && !zeichen.lng;

  const handleSave = useCallback(
    (definition: ZeichenDefinition, label: string) => {
      if (zeichen) {
        // Bestehendes Zeichen aktualisieren
        updateZeichen({
          dto: {
            zeichenDefinition: definition as unknown as ZeichenDefinitionRequestDto,
            label: label || undefined,
          },
        });
      } else {
        // Neues Zeichen erstellen mit Einheit-Verknüpfung
        createZeichenMutation(
          {
            zeichenDefinition: definition as unknown as ZeichenDefinitionRequestDto,
            referenzTyp: 'EINHEIT',
            referenzId: einheitId,
            label: label || undefined,
          },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: KRAEFTE_QUERY_KEYS.einheitZeichen(einsatzId, einheitId) });
            },
          },
        );
      }
    },
    [zeichen, updateZeichen, createZeichenMutation, einheitId, queryClient, einsatzId],
  );

  return (
    <Dialog.SlideIn
      isOpen={isOpen}
      onClose={onClose}
      title={`Taktisches Zeichen \u2014 ${einheitName}`}
      description={zeichen ? 'Zeichen bearbeiten' : 'Neues Zeichen erstellen'}
      size="md"
      position="right"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingState message="Lade Zeichendaten..." fullScreen={false} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Aktuelle Zeichen-Vorschau */}
          {aktuelleDefinition && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <PiPaintBrush className="h-4 w-4" />
                Aktuelles Zeichen
              </h3>
              <div className="flex flex-col items-center gap-3 rounded-panel border border-border-subtle bg-surface-panel p-4">
                <ZeichenPreview definition={aktuelleDefinition} size="lg" />
                {zeichen?.label && <p className="text-sm font-medium text-text-secondary">{zeichen.label}</p>}
              </div>
            </section>
          )}

          {/* Hinweis: Nicht auf Karte platziert */}
          {istNichtPlatziert && (
            <section>
              <div className="flex items-center gap-3 rounded-panel border border-status-warning-border bg-status-warning-surface p-3">
                <PiMapPin className="h-5 w-5 shrink-0 text-status-warning-text" />
                <div>
                  <p className="text-sm font-medium text-status-warning-text">Noch nicht auf Karte platziert</p>
                  <p className="text-xs text-text-muted">Das Zeichen wurde erstellt, aber noch nicht auf der Lagekarte positioniert. Öffne die Lagekarte, um es zu platzieren.</p>
                </div>
              </div>
            </section>
          )}

          {/* Empty State: Noch kein Zeichen */}
          {!zeichen && (
            <section>
              <div className="rounded-panel border border-border-subtle bg-surface-raised px-4 py-6 text-center">
                <PiPaintBrush className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">Noch kein taktisches Zeichen zugewiesen</p>
                <p className="mt-1 text-xs text-text-muted">Erstelle unten ein neues Zeichen für diese Einheit.</p>
              </div>
            </section>
          )}

          {/* Zeichen-Editor */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <PiPaintBrush className="h-4 w-4" />
              {aktuelleDefinition ? 'Zeichen bearbeiten' : 'Neues Zeichen erstellen'}
            </h3>
            <ZeichenEditor
              initialDefinition={aktuelleDefinition ?? { grundzeichen: 'taktische-formation' }}
              initialLabel={zeichen?.label ?? einheitName}
              onSave={handleSave}
              isSaving={isPending}
              onCancel={onClose}
            />
          </section>
        </div>
      )}
    </Dialog.SlideIn>
  );
}
