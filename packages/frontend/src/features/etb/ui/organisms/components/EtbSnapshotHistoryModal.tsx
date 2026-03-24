import { api } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import type { EtbSnapshotDto } from '@/shared';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Timeline, TimelineDot, TimelineItem } from '@/shared/ui/molecules/timeline.molecule';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { PiCaretDown, PiCaretRight, PiCircleNotch } from 'react-icons/pi';
import { formatDisplayDateTime } from '@/shared/lib/dateFormatter';
import { cn } from '@/shared/ui/cn';
import { EtbVersionBadge } from './EtbVersionBadge';

interface EtbSnapshotHistoryModalProps {
  etbId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Hook zum Abrufen der ETB Snapshot-Historie
 *
 * Nutzt den generierten API-Client und TanStack Query für optimales Caching.
 * Gibt alle Snapshots sortiert nach Version (neueste zuerst) zurück.
 */
function useEtbHistory(etbId: string | undefined) {
  return useQuery({
    queryKey: ['etb', 'history', etbId],
    queryFn: () => {
      if (!etbId) {
        return Promise.resolve([]);
      }
      return api.etb().etbCqrsControllerGetEtbHistoryVAlpha({ etbId });
    },
    enabled: !!etbId,
    staleTime: 1000 * 30, // 30 Sekunden - Historie ändert sich nicht oft
  });
}

/**
 * Einzelne Snapshot-Card mit expandierbaren Einträgen
 */
function SnapshotCard({ snapshot, isFirst }: { snapshot: EtbSnapshotDto; isFirst: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const entryCount = snapshot.eintraege?.length ?? 0;
  const entryKeyCounts = new Map<string, number>();

  return (
    <div className={cn('rounded-lg p-4', isFirst ? 'border-2 border-status-info-border bg-status-info-surface' : 'border border-border-subtle bg-surface-panel')}>
      {/* Header mit Version, Timestamp und Einträge-Anzahl */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <EtbVersionBadge version={snapshot.version} isCurrent={isFirst} variant="solid" />
          <span className="text-sm text-text-secondary">{formatDisplayDateTime(snapshot.snapshotAt)}</span>
        </div>
        <span className="text-sm text-text-secondary">
          {entryCount} {entryCount === 1 ? 'Eintrag' : 'Einträge'}
        </span>
      </div>

      {/* Aktuell-Label für den neuesten Snapshot */}
      {isFirst && <p className="mt-1 text-action-primary text-xs">Aktueller Stand</p>}

      {/* Expandable Einträge-Liste */}
      {entryCount > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary focus-visible:shadow-focus-ring focus-visible:outline-none"
          >
            {isExpanded ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
            <span>{isExpanded ? 'Einträge ausblenden' : 'Einträge anzeigen'}</span>
          </button>

          {isExpanded && (
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md border border-border-subtle bg-surface-raised p-3">
              {snapshot.eintraege.map((eintrag) => {
                const text = Array.isArray(eintrag) ? eintrag.join(' | ') : String(eintrag);
                const occurrence = (entryKeyCounts.get(text) ?? 0) + 1;
                entryKeyCounts.set(text, occurrence);

                return (
                  <div key={`entry-${snapshot.version}-${text}-${occurrence}`} className="border-border-subtle border-b pb-2 text-sm text-text-secondary last:border-b-0 last:pb-0">
                    {text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Modal zur Anzeige der ETB Snapshot-Historie
 *
 * Zeigt alle Snapshots eines Einsatztagebuchs in einer Timeline-Ansicht an.
 * Jeder Snapshot kann expandiert werden um die enthaltenen Einträge zu sehen.
 *
 * @param etbId - ID des Einsatztagebuchs
 * @param isOpen - Ob das Modal geöffnet ist
 * @param onClose - Callback zum Schließen des Modals
 */
export function EtbSnapshotHistoryModal({ etbId, isOpen, onClose }: EtbSnapshotHistoryModalProps) {
  // Speichere die letzte gültige etbId, um Flackern beim Schließen zu vermeiden
  const lastValidEtbId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && etbId) {
      lastValidEtbId.current = etbId;
    }
  }, [isOpen, etbId]);

  const activeEtbId = isOpen ? etbId : lastValidEtbId.current;
  const { data: snapshots, isLoading } = useEtbHistory(activeEtbId ?? undefined);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="xl">
      <Dialog.Title>ETB Versionshistorie</Dialog.Title>

      <Dialog.Body className="max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <PiCircleNotch className="h-8 w-8 animate-spin text-action-primary" />
          </div>
        ) : snapshots && snapshots.length > 0 ? (
          <Timeline>
            {snapshots.map((snapshot, index) => (
              <TimelineItem key={`snapshot-${snapshot.version}`} showLine={index < snapshots.length - 1}>
                <TimelineDot variant={index === 0 ? 'primary' : 'secondary'} />
                <SnapshotCard snapshot={snapshot} isFirst={index === 0} />
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <div className="flex h-64 items-center justify-center text-text-secondary">Keine Historie vorhanden</div>
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
