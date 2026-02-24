/**
 * BefehlDetailPanel Organism
 *
 * Slide-Over Panel von rechts das Befehl-Details anzeigt.
 * Nutzt Headless UI Dialog fuer Focus-Trap, Escape-to-close
 * und Click-Outside-to-close.
 */

import { Dialog as HeadlessDialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { format } from 'date-fns';
import { useState } from 'react';
import { PiPencilSimpleLine, PiX } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Tooltip } from '@/shared/ui/atoms/tooltip.atom';
import { type BefehlDto, BefehlDtoStatusEnum } from '@bluelight-hub/shared/client';
import { useBefehlPermissions } from '../../hooks/use-befehl-permissions';
import { BefehlStatusBadge } from '../atoms/BefehlStatusBadge.atom';
import { ZustellstatusAnzeige } from '../molecules/ZustellstatusAnzeige.molecule';
import { BefehlHistorieTimeline } from './BefehlHistorieTimeline.organism';
import { KorrekturBefehlDialog } from './KorrekturBefehlDialog.organism';

interface BefehlDetailPanelProps {
  befehl: BefehlDto | null;
  isOpen: boolean;
  onClose: () => void;
  einsatzId: string;
}

export function BefehlDetailPanel({ befehl, isOpen, onClose, einsatzId }: BefehlDetailPanelProps) {
  const { canKorrigieren } = useBefehlPermissions(einsatzId);
  const [isKorrekturDialogOpen, setIsKorrekturDialogOpen] = useState(false);

  return (
    <>
      <HeadlessDialog open={isOpen && befehl != null} as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <DialogBackdrop transition className="fixed inset-0 bg-black/30 duration-300 ease-in-out data-[closed]:opacity-0 motion-reduce:duration-0" />

        {/* Panel Container */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-md">
              <DialogPanel transition className={cn('pointer-events-auto relative w-screen max-w-md transform', 'duration-300 ease-in-out data-[closed]:translate-x-full', 'motion-reduce:duration-0')}>
                {befehl && (
                  <div className="flex h-full flex-col bg-white shadow-2xl dark:bg-gray-900">
                    {/* Header */}
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="font-mono text-xl font-bold text-gray-900 dark:text-white">{befehl.nummer}</DialogTitle>
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                          aria-label="Schließen"
                        >
                          <PiX className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                      <BefehlStatusBadge status={befehl.status} className="mt-2" />
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                      <div className="space-y-5">
                        {/* Auftrag */}
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Auftrag</h3>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{befehl.auftrag}</p>
                        </section>

                        {/* Befehlsgeber */}
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Befehlsgeber</h3>
                          <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{befehl.befehlsgeberName}</p>
                        </section>

                        {/* Zeitstempel */}
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Erteilt am</h3>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{format(befehl.erteiltAm, 'dd.MM.yyyy, HH:mm')} Uhr</p>
                        </section>

                        {/* Empfaenger */}
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Empfänger</h3>
                          <div className="mt-2">
                            <ZustellstatusAnzeige empfaenger={befehl.empfaenger} variant="expanded" />
                          </div>
                        </section>

                        {/* Verlauf (Story 4.2) */}
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Verlauf</h3>
                          <div className="mt-3">
                            <BefehlHistorieTimeline befehlId={befehl.id} />
                          </div>
                        </section>

                        {/* Korrektur-Button (nur wenn nicht bereits korrigiert) */}
                        {befehl.status !== BefehlDtoStatusEnum.Korrigiert && (
                          <section>
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
