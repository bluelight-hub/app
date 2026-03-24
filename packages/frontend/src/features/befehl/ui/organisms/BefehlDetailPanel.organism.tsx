/**
 * BefehlDetailPanel Organism (Inspector-Panel)
 *
 * Slide-Over Panel von rechts das Befehl-Details anzeigt.
 * Nutzt Headless UI Dialog fuer Focus-Trap, Escape-to-close
 * und Click-Outside-to-close.
 *
 * Story 4.3: Erweitert zum Inspector-Panel mit drei Sektionen:
 * 1. Befehlsinhalt (Auftrag, EAMZW, Befehlsgeber, Zeitstempel)
 * 2. Weitergabe-/Zustellstatus (ZustellstatusAnzeige + WeitergabeStatusListe)
 * 3. Verlauf/Timeline + Kommentare
 *
 * Rollenabhaengige Sichtbarkeit (AC2):
 * - BEFEHLSGEBER/ERSTELLER: Alle Sektionen + Aktionen
 * - EMPFAENGER: Befehlsinhalt + eigener Status + Quittierung + Kommentare
 * - BEOBACHTER: Befehlsinhalt + Zustellstatus (readonly), KEINE Kommentare/Aktionen
 */

import { Dialog as HeadlessDialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import { PiCheckCircle, PiPencilSimpleLine, PiX } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Tooltip } from '@/shared/ui/atoms/tooltip.atom';
import { type BefehlDto, BefehlDtoStatusEnum, type BefehlEmpfaengerDtoQuittierungArtEnum } from '@bluelight-hub/shared/client';
import { useAendereEmpfaengerStatus } from '../../api/use-aendere-empfaenger-status';
import type { AendereEmpfaengerStatusInput } from '../../api/use-aendere-empfaenger-status';
import { BefehlStatusBadge } from '../atoms/BefehlStatusBadge.atom';
import { ZustellstatusAnzeige } from '../molecules/ZustellstatusAnzeige.molecule';
import { WeitergabeStatusListe } from '../molecules/WeitergabeStatusListe.molecule';
import { BefehlKommentarThread } from '../molecules/BefehlKommentarThread.molecule';
import { getEigenerEmpfaengerStatus } from '../../lib/befehl-utils';
import { BefehlHistorieTimeline } from './BefehlHistorieTimeline.organism';
import { KorrekturBefehlDialog } from './KorrekturBefehlDialog.organism';

/** Labels fuer Quittierungsarten */
const QUITTIERUNG_ART_LABELS: Record<BefehlEmpfaengerDtoQuittierungArtEnum, string> = {
  VERSTANDEN: 'Verstanden',
  RUECKFRAGE: 'Rückfrage',
  NICHT_VERSTANDEN: 'Nicht verstanden',
};

interface BefehlDetailPanelProps {
  befehl: BefehlDto | null;
  isOpen: boolean;
  onClose: () => void;
  einsatzId: string;
  /** Callback fuer Quittierung */
  onQuittieren?: (befehlId: string) => void;
  /** ID des aktuellen Users (fuer Quittierungs-Anzeige) */
  currentUserId?: string;
  /** RBAC: Darf der aktuelle User quittieren? */
  canQuittieren?: boolean;
  /** RBAC: Darf der aktuelle User Korrekturen erstellen? */
  canKorrigieren?: boolean;
  /** RBAC: Darf der aktuelle User Empfaenger-Status verwalten? */
  canManageStatus?: boolean;
  /** Ist der aktuelle User nur Beobachter? */
  isBeobachter?: boolean;
  /** RBAC: Darf der aktuelle User alle Empfaenger sehen? */
  canViewAll?: boolean;
}

export function BefehlDetailPanel({
  befehl,
  isOpen,
  onClose,
  einsatzId,
  onQuittieren,
  currentUserId,
  canQuittieren,
  canKorrigieren,
  canManageStatus,
  isBeobachter,
  canViewAll,
}: BefehlDetailPanelProps) {
  const [isKorrekturDialogOpen, setIsKorrekturDialogOpen] = useState(false);
  const statusMutation = useAendereEmpfaengerStatus(einsatzId);

  const handleStatusChange = useCallback(
    (input: AendereEmpfaengerStatusInput) => {
      statusMutation.mutate(input);
    },
    [statusMutation],
  );

  return (
    <>
      <HeadlessDialog
        open={isOpen && befehl != null}
        as="div"
        className="relative z-50"
        onClose={onClose}
        // Keep global overlays (e.g. Sonner toasts) interactive while the flyout is open.
        // Headless UI's default inert behavior blocks clicks on visible toast actions.
        __demoMode
      >
        {/* Backdrop */}
        <DialogBackdrop transition className="fixed inset-0 bg-black/30 duration-300 ease-in-out data-[closed]:opacity-0 motion-reduce:duration-0" />

        {/* Panel Container */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-md">
              <DialogPanel transition className={cn('pointer-events-auto relative w-screen max-w-md transform', 'duration-300 ease-in-out data-[closed]:translate-x-full', 'motion-reduce:duration-0')}>
                {befehl && (
                  <div className="flex h-full flex-col bg-surface-panel shadow-2xl">
                    {/* Header */}
                    <div className="border-border-subtle border-b px-6 py-4">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="font-bold font-mono text-text-primary text-xl">{befehl.nummer}</DialogTitle>
                        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-raised hover:text-text-secondary" aria-label="Schließen">
                          <PiX className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                      <BefehlStatusBadge status={befehl.status} className="mt-2" />
                    </div>

                    {/* Quittierungs-Banner fuer Empfaenger */}
                    {(() => {
                      const eigenerStatus = getEigenerEmpfaengerStatus(befehl.empfaenger, currentUserId);
                      if (!eigenerStatus.istEmpfaenger) return null;

                      if (eigenerStatus.status === 'QUITTIERT' && eigenerStatus.quittierungArt) {
                        return (
                          <div className="flex items-center gap-2 border-status-success-border border-b bg-status-success-surface px-6 py-3">
                            <PiCheckCircle className="h-5 w-5 text-status-success-text" aria-hidden="true" />
                            <span className="font-medium text-status-success-text text-sm">Quittiert: {QUITTIERUNG_ART_LABELS[eigenerStatus.quittierungArt]}</span>
                          </div>
                        );
                      }

                      if (canQuittieren && onQuittieren && befehl.status !== BefehlDtoStatusEnum.Korrigiert) {
                        return (
                          <div className="border-status-warning-border border-b bg-status-warning-surface px-6 py-3">
                            <button
                              type="button"
                              onClick={() => onQuittieren(befehl.id)}
                              className="flex w-full items-center justify-center gap-2 rounded-control bg-status-warning-text px-4 py-2.5 font-semibold text-sm text-text-inverse shadow-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:shadow-focus-ring"
                            >
                              <PiCheckCircle className="h-5 w-5" aria-hidden="true" />
                              Befehl quittieren
                            </button>
                          </div>
                        );
                      }

                      return null;
                    })()}

                    {/* Body — drei Inspector-Sektionen (Story 4.3 AC2) */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                      <div className="space-y-4">
                        {/* === Sektion 1: Befehlsinhalt (alle Rollen) === */}

                        {/* Auftrag */}
                        <section>
                          <h3 className="font-semibold text-text-muted text-xs uppercase tracking-wider">Auftrag</h3>
                          <p className="mt-1 whitespace-pre-wrap text-text-primary text-sm">{befehl.auftrag}</p>
                        </section>

                        {/* EAMZW-Felder (nur bei entsprechendem Befehlstyp) */}
                        {(befehl.befehlstyp === 'EAMZW' || befehl.befehlstyp === 'ERWEITERT') && (
                          <>
                            {befehl.ereignis && (
                              <section>
                                <h3 className="font-semibold text-text-muted text-xs uppercase tracking-wider">Ereignis</h3>
                                <p className="mt-1 whitespace-pre-wrap text-text-primary text-sm">{befehl.ereignis}</p>
                              </section>
                            )}
                            {befehl.mittel && (
                              <section>
                                <h3 className="font-semibold text-text-muted text-xs uppercase tracking-wider">Mittel</h3>
                                <p className="mt-1 whitespace-pre-wrap text-text-primary text-sm">{befehl.mittel}</p>
                              </section>
                            )}
                            {befehl.ziel && (
                              <section>
                                <h3 className="font-semibold text-text-muted text-xs uppercase tracking-wider">Ziel</h3>
                                <p className="mt-1 whitespace-pre-wrap text-text-primary text-sm">{befehl.ziel}</p>
                              </section>
                            )}
                            {befehl.weg && (
                              <section>
                                <h3 className="font-semibold text-text-muted text-xs uppercase tracking-wider">Weg</h3>
                                <p className="mt-1 whitespace-pre-wrap text-text-primary text-sm">{befehl.weg}</p>
                              </section>
                            )}
                          </>
                        )}

                        {/* Zeitvorgabe (falls vorhanden) */}
                        {befehl.zeitvorgabe && (
                          <section>
                            <h3 className="font-semibold text-text-muted text-xs uppercase tracking-wider">Zeitvorgabe</h3>
                            <p className="mt-1 text-text-primary text-sm">{befehl.zeitvorgabe}</p>
                          </section>
                        )}

                        {/* Befehlsgeber */}
                        <section>
                          <h3 className="font-semibold text-text-muted text-xs uppercase tracking-wider">Befehlsgeber</h3>
                          <p className="mt-1 text-text-primary text-sm">{befehl.befehlsgeberName}</p>
                        </section>

                        {/* Zeitstempel */}
                        <section>
                          <h3 className="font-semibold text-text-muted text-xs uppercase tracking-wider">Erteilt am</h3>
                          <p className="mt-1 text-text-secondary text-sm">{format(befehl.erteiltAm, 'dd.MM.yyyy, HH:mm')} Uhr</p>
                        </section>

                        {/* === Sektion 2: Weitergabe-/Zustellstatus === */}
                        {(() => {
                          /** EMPFAENGER sieht nur eigenen Status (AC2), BEFEHLSGEBER/ERSTELLER sehen alle */
                          const isEmpfaengerOnly = !canViewAll && !isBeobachter;
                          const eigenerStatus = getEigenerEmpfaengerStatus(befehl.empfaenger, currentUserId);
                          const sichtbareEmpfaenger = isEmpfaengerOnly && eigenerStatus.empfaengerInfo ? [eigenerStatus.empfaengerInfo] : befehl.empfaenger;

                          return (
                            <section className="border-border-subtle border-t pt-4" aria-label="Weitergabe- und Zustellstatus">
                              <h3 className="mb-2 font-semibold text-text-muted text-xs uppercase tracking-wider">{isEmpfaengerOnly ? 'Eigener Zustellstatus' : 'Zustellstatus'}</h3>

                              {/* Fortschrittsbalken + interaktive Chips (fuer canManageStatus) */}
                              <ZustellstatusAnzeige
                                empfaenger={sichtbareEmpfaenger}
                                variant="expanded"
                                interactive={canManageStatus && !isBeobachter}
                                befehlId={befehl.id}
                                onStatusChange={handleStatusChange}
                                isKorrigiert={befehl.status === BefehlDtoStatusEnum.Korrigiert}
                              />

                              {/* Detaillierte Weitergabe-Liste (Story 4.3 AC2) */}
                              <div className="mt-3">
                                <h3 className="mb-1 font-semibold text-text-muted text-xs uppercase tracking-wider">{isEmpfaengerOnly ? 'Mein Status' : 'Weitergabe-Details'}</h3>
                                <WeitergabeStatusListe empfaenger={sichtbareEmpfaenger} showHandlungsbedarf={!isBeobachter} />
                              </div>
                            </section>
                          );
                        })()}

                        {/* === Sektion 3: Verlauf + Kommentare (nicht fuer BEOBACHTER) === */}
                        {!isBeobachter && (
                          <div className="border-border-subtle border-t pt-4">
                            {/* Verlauf */}
                            <section>
                              <h3 className="font-semibold text-text-muted text-xs uppercase tracking-wider">Verlauf</h3>
                              <div className="mt-3">
                                <BefehlHistorieTimeline befehlId={befehl.id} />
                              </div>
                            </section>

                            {/* Kommentare (Story 4.3 AC2) */}
                            <section className="mt-4">
                              <h3 className="font-semibold text-text-muted text-xs uppercase tracking-wider">Kommentare</h3>
                              <div className="mt-2">
                                <BefehlKommentarThread befehlId={befehl.id} einsatzId={einsatzId} kommentare={befehl.kommentare ?? []} />
                              </div>
                            </section>
                          </div>
                        )}

                        {/* Korrektur-Button (nur wenn nicht BEOBACHTER und nicht bereits korrigiert) */}
                        {!isBeobachter && befehl.status !== BefehlDtoStatusEnum.Korrigiert && (
                          <section className="border-border-subtle border-t pt-4">
                            {!canKorrigieren ? (
                              <Tooltip content="Nur Ersteller/Befehlsgeber dürfen Korrekturen erstellen" position="bottom">
                                <Button intent="warning" appearance="outline" size="sm" onClick={() => setIsKorrekturDialogOpen(true)} disabled aria-disabled="true">
                                  <PiPencilSimpleLine className="mr-1.5 h-4 w-4" />
                                  Korrektur erstellen
                                </Button>
                              </Tooltip>
                            ) : (
                              <Button intent="warning" appearance="outline" size="sm" onClick={() => setIsKorrekturDialogOpen(true)}>
                                <PiPencilSimpleLine className="mr-1.5 h-4 w-4" />
                                Korrektur erstellen
                              </Button>
                            )}
                          </section>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </DialogPanel>
            </div>
          </div>
        </div>
      </HeadlessDialog>

      {/* Korrektur-Dialog */}
      {befehl && <KorrekturBefehlDialog isOpen={isKorrekturDialogOpen} onClose={() => setIsKorrekturDialogOpen(false)} originalBefehl={befehl} einsatzId={einsatzId} />}
    </>
  );
}
