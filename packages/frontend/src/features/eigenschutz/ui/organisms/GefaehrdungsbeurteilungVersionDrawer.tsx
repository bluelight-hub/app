/**
 * GefaehrdungsbeurteilungVersionDrawer — Read-Only-Drawer für eine
 * einzelne Versions-Ansicht (Story 415-2-4, Task 12, AC4, AC5, AC13).
 *
 * Rendert eine Drawer-artige Headless-UI-`Dialog`-Komponente (480 px breit,
 * sliding von rechts). Zeigt den vollständigen Stand einer Aggregat-
 * Version: Header mit Versionsnummer + Gültigkeitszeitraum, dann pro
 * Gefährdungs-Item dieselbe Read-Only-Shape wie im Editor über
 * `GefaehrdungItemEditor`.
 *
 * **Kein Form-Context, keine Writes:** Der Drawer nutzt `GefaehrdungItemEditor`
 * im `readOnly`-Modus. Inputs/Textareas bleiben fokussierbar via `readOnly`,
 * die Matrix arbeitet mit `readOnly`, und Remove-/Save-Controls bleiben
 * ausgeblendet.
 *
 * **Entry-Null-Handling (AC13):** Wenn `entry === null`, rendert die
 * Komponente `null` — das Dialog-Root taucht nicht im DOM auf. Das ist
 * bewusst so gewählt, damit die DetailPage `entry` einfach zwischen
 * `null` und einem konkreten Eintrag toggeln kann, ohne einen zusätzlichen
 * `open`-State pflegen zu müssen.
 *
 * **Header-Text:**
 * - Aktuelle Version (`entry.version === aggregateVersion`): „Version N — aktuell".
 * - Historische Version: „Version N von M — gültig {von} bis {bis|'aktuell'}".
 *
 * **Footer-Buttons:**
 * - Immer „Schließen" (Tertiary/Ghost) → `onClose`.
 * - Aktuelle Version: zusätzlich „Zurück zum Editor" (Secondary) → `onClose`.
 *   Kein Redirect — der Editor ist dieselbe Page wie der Drawer-Parent.
 *
 * **A11y:**
 * - `aria-readonly="true"` auf dem Panel, damit Assistive Tech den Read-
 *   Only-Kontext erkennt.
 * - `aria-labelledby` referenziert den Header-Titel.
 * - Escape schließt (Headless-UI-default).
 */

import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import { GefaehrdungItemEditor } from '@/features/eigenschutz/ui/molecules/GefaehrdungItemEditor';
import type { GefaehrdungsbeurteilungHistorieEintrag } from '@bluelight-hub/shared/schemas';
import { Dialog as HeadlessDialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useId } from 'react';

export interface GefaehrdungsbeurteilungVersionDrawerProps {
  readonly entry: GefaehrdungsbeurteilungHistorieEintrag | null;
  readonly aggregateVersion: number;
  readonly onClose: () => void;
}

/**
 * Formatiert einen ISO-Zeitstempel als „DD.MM. HH:mm" (ohne Jahr —
 * kompakter für den Drawer-Header). Fällt auf einen Dash zurück, wenn
 * der Input ungültig ist.
 */
function formatShortTimestamp(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}. ${hours}:${minutes}`;
}

/**
 * Mappt `gueltigBis` auf einen menschenlesbaren Zeitstempel oder „aktuell",
 * wenn `null` (= die Version ist noch aktiv).
 */
function formatGueltigBis(gueltigBis: string | null): string {
  if (gueltigBis === null) return 'aktuell';
  return formatShortTimestamp(gueltigBis);
}

/**
 * Berechnet den Drawer-Header-Text. Für die aktuelle Version (wenn
 * `entry.version === aggregateVersion`) verkürzt sich der Text auf
 * „Version N — aktuell"; historische Versionen zeigen ihren
 * Gültigkeitszeitraum an.
 */
export function formatHeaderText(entry: GefaehrdungsbeurteilungHistorieEintrag, aggregateVersion: number): string {
  if (entry.version === aggregateVersion) {
    return `Version ${entry.version} — aktuell`;
  }
  const vonLabel = formatShortTimestamp(entry.gueltigVon);
  const bisLabel = formatGueltigBis(entry.gueltigBis);
  return `Version ${entry.version} von ${aggregateVersion} — gültig ${vonLabel} bis ${bisLabel}`;
}

export function GefaehrdungsbeurteilungVersionDrawer({ entry, aggregateVersion, onClose }: GefaehrdungsbeurteilungVersionDrawerProps) {
  const titleId = useId();

  // `entry === null` ⇒ gar nichts rendern. So bleibt die DOM-Struktur
  // sauber (kein leerer Dialog-Wrapper) und Tests können mit
  // `queryByRole('dialog')` auf `null` prüfen.
  if (entry === null) return null;

  const isCurrent = entry.version === aggregateVersion;
  const headerText = formatHeaderText(entry, aggregateVersion);

  return (
    <HeadlessDialog open={true} as="div" className="relative z-50" onClose={onClose}>
      <DialogBackdrop transition className="fixed inset-0 bg-black/25 backdrop-blur-sm duration-300 ease-in-out data-[closed]:opacity-0" />
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex w-[480px] max-w-full">
            <DialogPanel
              transition
              aria-readonly="true"
              aria-labelledby={titleId}
              data-testid="version-drawer-panel"
              className={cn('pointer-events-auto relative w-screen transform transition duration-300 ease-in-out data-[closed]:translate-x-full')}
            >
              <div className="flex h-full flex-col bg-surface-panel shadow-2xl">
                {/* Header */}
                <div className="border-b border-border-subtle px-5 py-3">
                  <DialogTitle id={titleId} as="h3" className="text-base leading-6 font-semibold text-text-primary" data-testid="version-drawer-title">
                    {headerText}
                  </DialogTitle>
                </div>

                {/* Body: Items als Read-Only-Blocks */}
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4" data-testid="version-drawer-body">
                  {entry.items.length === 0 ? (
                    <p className="text-sm text-text-muted" data-testid="version-drawer-empty-items">
                      Diese Version enthält keine Gefährdungen.
                    </p>
                  ) : (
                    entry.items.map((item, index) => (
                      <div key={item.id ?? index} data-testid={`version-drawer-item-${index}`}>
                        <GefaehrdungItemEditor value={item} onChange={() => {}} readOnly={true} index={index} />
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-border-subtle px-5 py-3" data-testid="version-drawer-footer">
                  {isCurrent ? (
                    <Button intent="secondary" appearance="solid" type="button" onClick={onClose} data-testid="version-drawer-back-to-editor">
                      Zurück zum Editor
                    </Button>
                  ) : null}
                  <Button intent="secondary" appearance="ghost" type="button" onClick={onClose} data-testid="version-drawer-close">
                    Schließen
                  </Button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </HeadlessDialog>
  );
}
