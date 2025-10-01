import { useEtbEntryHistory } from '@/hooks/useEtb';
import { Button } from '@atoms/button.atom';
import type { EtbEintragDto } from '@bluelight-hub/shared/client';
import { Dialog } from '@molecules/dialog.molecule';
import { Timeline, TimelineDot, TimelineItem } from '@molecules/timeline.molecule';
import { useEffect, useRef } from 'react';
import { PiCircleNotch } from 'react-icons/pi';
import { EtbHistoryCard } from './EtbHistoryCard';

interface EtbHistoryModalProps {
  entry: EtbEintragDto | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal zur Anzeige der Versionshistorie eines ETB-Eintrags
 *
 * Zeigt alle Versionen eines Eintrags in einer Timeline-Ansicht an.
 * Verwendet einen Ref um Flackern beim Schließen zu vermeiden.
 */
export function EtbHistoryModal({ entry, isOpen, onClose }: EtbHistoryModalProps) {
  // Speichere die letzte gültige entry, um Flackern beim Schließen zu vermeiden
  const lastValidEntry = useRef<EtbEintragDto | null>(null);

  useEffect(() => {
    if (isOpen && entry) {
      lastValidEntry.current = entry;
    }
  }, [isOpen, entry]);

  const activeEntry = isOpen ? entry : lastValidEntry.current;
  const { data, isLoading } = useEtbEntryHistory(activeEntry?.id, 1, 50);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="xl">
      <Dialog.Title>
        Versionshistorie
        {activeEntry && <span className="ml-2 text-gray-500 text-sm dark:text-gray-400">Eintrag #{activeEntry.sequenceNumber}</span>}
      </Dialog.Title>

      <Dialog.Body className="max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <PiCircleNotch className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <Timeline>
            {/* Current Version */}
            {activeEntry && (
              <TimelineItem showLine={data.data.length > 0}>
                <TimelineDot variant="primary" />
                <EtbHistoryCard
                  version={activeEntry.version}
                  timestamp={new Date(activeEntry.updatedAt)}
                  text={activeEntry.text}
                  kategorie={activeEntry.kategorie}
                  isCurrent
                  username={activeEntry.updatedBy}
                />
              </TimelineItem>
            )}

            {/* History Timeline */}
            {data.data.map((historyEntry, index) => (
              <TimelineItem key={historyEntry.id} showLine={index < data.data.length - 1}>
                <TimelineDot variant="secondary" />
                <EtbHistoryCard
                  version={historyEntry.version}
                  timestamp={new Date(historyEntry.changedAt)}
                  text={historyEntry.text}
                  kategorie={historyEntry.kategorie}
                  username={historyEntry.changedByUsername}
                  changeReason={historyEntry.changeReason}
                />
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">Keine Versionshistorie verfügbar</div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button intent="secondary" onClick={onClose} className="w-full">
          Schließen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
