/**
 * Detail-Panel für ein Fahrzeug (SlideIn von rechts).
 *
 * Zeigt alle Fahrzeug-Informationen und ermöglicht direkte
 * Bearbeitung von FMS-Status und Einheit-Zuweisung.
 */

import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FmsStatusDropdown } from '@/features/einsatz/ui/molecules/FmsStatusDropdown.molecule';
import { isFmsStatus, type FmsStatus } from '@/features/einsatz/constants/fms-status.constants';
import { EinheitCombobox } from '@/features/kraefte/ui/molecules';
import { ZeichenPreview } from '@/features/taktische-zeichen/rendering/ZeichenPreview';
import type { ZeichenDefinition } from '@/features/taktische-zeichen/rendering/renderer';
import type { EinsatzFahrzeugDto } from '@/shared';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { PiMapPin, PiTruck, PiUser } from 'react-icons/pi';

interface FahrzeugDetailPanelProps {
  /** Panel geöffnet? */
  isOpen: boolean;
  /** Callback zum Schließen */
  onClose: () => void;
  /** Einsatz-ID, in dem das Fahrzeug bewegt wird */
  einsatzId: string;
  /** Fahrzeug-Daten */
  fahrzeug: EinsatzFahrzeugDto;
  /** Verknüpftes taktisches Zeichen */
  zeichen?: TaktischesZeichenResponseDto | null;
  /** Callback bei FMS-Status-Änderung */
  onStatusChange: (fahrzeugId: string, newStatus: FmsStatus) => void;
  /** Callback bei Einheit-Zuweisung */
  onEinheitAssign: (fahrzeugId: string, einheitId: string | null) => void;
  /** Callback für "Zeichen bearbeiten" */
  onManageZeichen: (fahrzeugId: string) => void;
  /** Lädt die Einheit-Zuweisung gerade? */
  isAssigning?: boolean;
}

export function FahrzeugDetailPanel({ isOpen, onClose, einsatzId, fahrzeug, zeichen, onStatusChange, onEinheitAssign, onManageZeichen, isAssigning = false }: FahrzeugDetailPanelProps) {
  const validFmsStatus: FmsStatus = isFmsStatus(fahrzeug.fmsStatus) ? fahrzeug.fmsStatus : 0;
  const besatzung = fahrzeug.besatzung ?? [];

  return (
    <Dialog.SlideIn isOpen={isOpen} onClose={onClose} title={fahrzeug.funkrufname} size="sm" position="right">
      <div className="space-y-6">
        {/* Taktisches Zeichen Sektion */}
        <div className="rounded-panel bg-surface-raised p-4 text-center">
          {zeichen ? <ZeichenPreview definition={zeichen.zeichenDefinition as unknown as ZeichenDefinition} size="lg" /> : <PiTruck className="mx-auto h-16 w-16 text-text-muted opacity-50" />}
          <div className="mt-2 space-y-0.5">
            {fahrzeug.kennzeichen && <p className="text-sm text-text-secondary">{fahrzeug.kennzeichen}</p>}
            {fahrzeug.fahrzeugtyp && <p className="text-xs text-text-muted">{typeof fahrzeug.fahrzeugtyp === 'object' && 'name' in fahrzeug.fahrzeugtyp ? String(fahrzeug.fahrzeugtyp.name) : ''}</p>}
          </div>
          <Button
            intent="secondary"
            appearance="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              onManageZeichen(fahrzeug.id);
              onClose();
            }}
          >
            <PiMapPin className="mr-1.5 h-3.5 w-3.5" />
            {zeichen ? 'Zeichen bearbeiten' : 'Zeichen zuweisen'}
          </Button>
        </div>

        {/* FMS-Status */}
        <div>
          <label className="mb-1.5 block text-xs font-medium tracking-wide text-text-muted uppercase">FMS-Status</label>
          <FmsStatusDropdown value={validFmsStatus} onChange={(newStatus) => onStatusChange(fahrzeug.id, newStatus)} />
        </div>

        {/* Einheit-Zuweisung */}
        <div>
          <EinheitCombobox
            einsatzId={einsatzId}
            value={fahrzeug.einheitId ?? ''}
            onChange={(einheitId) => onEinheitAssign(fahrzeug.id, einheitId.length > 0 ? einheitId : null)}
            disabled={isAssigning}
            label="Einheit"
            placeholder="Einheit zuweisen…"
            allowEmpty
          />
        </div>

        {/* Besatzung */}
        <div>
          <label className="mb-1.5 block text-xs font-medium tracking-wide text-text-muted uppercase">Besatzung ({besatzung.length})</label>
          {besatzung.length > 0 ? (
            <div className="space-y-1.5">
              {besatzung.map((person) => (
                <div key={person.id} className="flex items-center gap-2 rounded-panel bg-surface-raised px-3 py-2 text-sm text-text-secondary">
                  <PiUser className="h-4 w-4 flex-shrink-0 text-text-muted" />
                  <span>
                    {person.vorname} {person.nachname}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Keine Besatzung zugewiesen</p>
          )}
        </div>
      </div>
    </Dialog.SlideIn>
  );
}
