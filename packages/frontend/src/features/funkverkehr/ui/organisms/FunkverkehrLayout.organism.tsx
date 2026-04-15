/**
 * FunkverkehrLayout
 *
 * Tab-Layout für `Kanalplan` und `Funkprotokoll`. Der aktive Tab wird via
 * Prop (aus der Route-Search) gesteuert, damit die URL kanonische Quelle
 * bleibt.
 */

import { useEtb } from '@/features/etb/api/use-etb';
import { useArchiveFunkkanal, useExportKanalplanPdf, useKanalplan, useUpdateFunkkanal } from '@/features/funkverkehr/api';
import { FunkprotokollFilterSidebar } from '@/features/funkverkehr/ui/organisms/FunkprotokollFilterSidebar.organism';
import { FunkprotokollView } from '@/features/funkverkehr/ui/organisms/FunkprotokollView.organism';
import { FunkspruchComposer } from '@/features/funkverkehr/ui/organisms/FunkspruchComposer.organism';
import { KanalEditDrawer } from '@/features/funkverkehr/ui/organisms/KanalEditDrawer.organism';
import { KanalplanTable } from '@/features/funkverkehr/ui/organisms/KanalplanTable.organism';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import { useMemo, useState } from 'react';
import { PiPlus, PiFilePdf } from 'react-icons/pi';

export type FunkverkehrTab = 'kanalplan' | 'protokoll';

export interface FunkverkehrLayoutProps {
  einsatzId: string;
  tab: FunkverkehrTab;
  onTabChange: (tab: FunkverkehrTab) => void;
  className?: string;
}

export function FunkverkehrLayout({ einsatzId, tab, onTabChange, className }: FunkverkehrLayoutProps) {
  const { data: kanalplan } = useKanalplan({ einsatzId, includeArchived: true });
  const kanaele = useMemo(() => kanalplan?.data ?? [], [kanalplan]);
  const etbQuery = useEtb({ einsatzId });
  const exportPdf = useExportKanalplanPdf(einsatzId);
  const archiveMutation = useArchiveFunkkanal(einsatzId);
  const updateMutation = useUpdateFunkkanal(einsatzId);

  const [editKanal, setEditKanal] = useState<FunkkanalResponseDto | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleArchive = (kanal: FunkkanalResponseDto) => {
    if (!window.confirm(`Kanal „${kanal.name}" wirklich archivieren?`)) return;
    archiveMutation.mutate({ kanalId: kanal.id });
  };

  const handleToggleStatus = (kanal: FunkkanalResponseDto) => {
    const nextStatus = kanal.status === 'aktiv' ? 'inaktiv' : 'aktiv';
    updateMutation.mutate({ kanalId: kanal.id, dto: { status: nextStatus } });
  };

  return (
    <div className={cn('flex h-[calc(100dvh-10rem)] min-h-0 flex-col overflow-hidden', className)}>
      <nav aria-label="Funkverkehr-Ansicht" className="flex gap-1 border-b border-slate-200 bg-white px-3 pt-2 dark:border-slate-800 dark:bg-slate-900">
        <TabButton active={tab === 'kanalplan'} onClick={() => onTabChange('kanalplan')}>
          Kanalplan
        </TabButton>
        <TabButton active={tab === 'protokoll'} onClick={() => onTabChange('protokoll')}>
          Funkprotokoll
        </TabButton>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === 'kanalplan' ? (
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Kanalplan</h2>
              <div className="flex items-center gap-2">
                <Button intent="secondary" appearance="outline" size="sm" type="button" onClick={() => exportPdf.mutate()} disabled={exportPdf.isPending || kanaele.length === 0}>
                  <PiFilePdf className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  PDF exportieren
                </Button>
                <Button intent="primary" size="sm" type="button" onClick={() => setIsCreateOpen(true)}>
                  <PiPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Kanal hinzufügen
                </Button>
              </div>
            </div>

            <KanalplanTable einsatzId={einsatzId} kanaele={kanaele} onEdit={(kanal) => setEditKanal(kanal)} onArchive={handleArchive} onToggleStatus={handleToggleStatus} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
            <FunkprotokollFilterSidebar einsatzId={einsatzId} />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <FunkprotokollView einsatzId={einsatzId} kanaele={kanaele} className="min-h-0 flex-1" />
              {etbQuery.data?.id ? (
                <FunkspruchComposer einsatzId={einsatzId} etbId={etbQuery.data.id} kanaele={kanaele} className="shrink-0" />
              ) : (
                <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                  Einsatztagebuch wird geladen oder existiert noch nicht — Funksprüche können erst nach Anlage gesendet werden.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {(editKanal || isCreateOpen) && (
        <KanalEditDrawer
          einsatzId={einsatzId}
          isOpen
          onClose={() => {
            setEditKanal(null);
            setIsCreateOpen(false);
          }}
          kanal={editKanal ?? undefined}
        />
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-t px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-white text-blue-700 shadow-[inset_0_-2px_0_0_theme(colors.blue.600)] dark:bg-slate-900 dark:text-blue-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  );
}
