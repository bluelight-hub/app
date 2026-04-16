/**
 * AlarmierungPage
 *
 * Einstiegspunkt für die Alarmierungs-Verwaltung eines Einsatzes
 * (`/app/einsatz/:einsatzId/kommunikation/alarmierung`).
 *
 * Layout: Zwei Spalten —
 * - links die Liste aller Alarmierungen (inkl. Status-Filter und
 *   „+ Alarmierung auslösen"-Button)
 * - rechts ein Tab-Panel mit Detail-Ansicht (Empfänger-Tabelle) oder
 *   chronologischer Timeline.
 *
 * Der WebSocket-Hook `useEinsatzEvents` invalidiert Liste, Detail und
 * Timeline live, sobald das Backend ein `alarmierung:*`-Event broadcasted.
 */

import { showNotfallAlertToast } from '@/features/funkverkehr/ui/molecules/NotfallAlertToast.molecule';
import { useEinsatzEvents } from '@/features/funkverkehr/api/use-einsatz-events';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useStore } from '@tanstack/react-store';
import type { AlarmierungResponseDto } from '@bluelight-hub/shared/client';
import { useEffect, useMemo, useState } from 'react';
import { PiCheck, PiMegaphone, PiPlus } from 'react-icons/pi';
import { useAbschliesseAlarmierung } from '../../api/mutations';
import { useAlarmierung, useAlarmierungen } from '../../api/queries';
import { alarmierungStore, getAlarmierungFilter, setAlarmierungFilter, type AlarmierungStatusFilter } from '../../stores/alarmierung.store';
import { AlarmierungStatusBadge, type AlarmierungStatus } from '../atoms/AlarmierungStatusBadge.atom';
import { NachalarmierungBadge } from '../atoms/NachalarmierungBadge.atom';
import { AlarmierungListItem } from '../molecules/AlarmierungListItem.molecule';
import { AlarmierungEmpfaengerTabelle } from '../organisms/AlarmierungEmpfaengerTabelle.organism';
import { AlarmierungErstellenDrawer } from '../organisms/AlarmierungErstellenDrawer.organism';
import { AlarmierungTimeline } from '../organisms/AlarmierungTimeline.organism';
import { NachalarmierungDialog } from '../organisms/NachalarmierungDialog.organism';

export type AlarmierungTab = 'liste' | 'timeline';

export interface AlarmierungPageProps {
  einsatzId: string;
  tab: AlarmierungTab;
  onTabChange: (tab: AlarmierungTab) => void;
}

const STATUS_FILTER_OPTIONS: Array<{ value: AlarmierungStatusFilter; label: string }> = [
  { value: 'alle', label: 'Alle' },
  { value: 'aktiv', label: 'Aktiv' },
  { value: 'abgeschlossen', label: 'Abgeschlossen' },
];

function formatDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

export function AlarmierungPage({ einsatzId, tab, onTabChange }: AlarmierungPageProps) {
  useEinsatzEvents({ einsatzId, onNotfall: showNotfallAlertToast });

  const filter = useStore(alarmierungStore, (state) => state.byEinsatz[einsatzId] ?? getAlarmierungFilter(einsatzId));

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nachalarmierungQuelle, setNachalarmierungQuelle] = useState<AlarmierungResponseDto | null>(null);
  const [isAbschliessenConfirmOpen, setIsAbschliessenConfirmOpen] = useState(false);

  const listeQuery = useAlarmierungen({ einsatzId, filter: { status: filter.status } });
  const alarmierungen = useMemo(() => listeQuery.data?.data ?? [], [listeQuery.data]);

  const selectedId = filter.selectedAlarmierungId;

  // Automatische Auswahl: wenn noch nichts selektiert ist, nimm die erste Alarmierung.
  useEffect(() => {
    if (selectedId) {
      // Sicherstellen, dass die aktuelle Selektion noch in der Liste existiert —
      // sonst auf erste zurückfallen.
      const stillPresent = alarmierungen.some((a) => a.id === selectedId);
      if (!stillPresent && alarmierungen.length > 0) {
        setAlarmierungFilter(einsatzId, { selectedAlarmierungId: alarmierungen[0].id });
      }
      return;
    }
    if (alarmierungen.length > 0) {
      setAlarmierungFilter(einsatzId, { selectedAlarmierungId: alarmierungen[0].id });
    }
  }, [einsatzId, alarmierungen, selectedId]);

  const detailQuery = useAlarmierung({ einsatzId, alarmierungId: selectedId ?? '', enabled: Boolean(selectedId) });
  const selectedAlarmierung = detailQuery.data?.data;

  const abschliessenMutation = useAbschliesseAlarmierung(einsatzId);

  const handleStatusChange = (next: AlarmierungStatusFilter) => {
    setAlarmierungFilter(einsatzId, { status: next });
  };

  const handleSelect = (alarmierungId: string) => {
    setAlarmierungFilter(einsatzId, { selectedAlarmierungId: alarmierungId });
    if (tab !== 'liste') onTabChange('liste');
  };

  // `window.confirm` wird in Tauri-WebView nicht zuverlässig unterstützt → Dialog.Confirm.
  const handleAbschliessen = () => {
    if (!selectedAlarmierung) return;
    setIsAbschliessenConfirmOpen(true);
  };
  const handleAbschliessenBestaetigen = () => {
    if (!selectedAlarmierung) return;
    abschliessenMutation.mutate({ alarmierungId: selectedAlarmierung.id, dto: {} }, { onSettled: () => setIsAbschliessenConfirmOpen(false) });
  };

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <PiMegaphone className="h-5 w-5 text-red-500" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Alarmierungen</h1>
        </div>
        <Button intent="primary" size="sm" type="button" onClick={() => setIsCreateOpen(true)}>
          <PiPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Alarmierung auslösen
        </Button>
      </div>

      <nav aria-label="Alarmierungs-Ansicht" className="flex gap-1 border-b border-slate-200 bg-white px-3 pt-2 dark:border-slate-800 dark:bg-slate-900">
        <TabButton active={tab === 'liste'} onClick={() => onTabChange('liste')}>
          Liste
        </TabButton>
        <TabButton active={tab === 'timeline'} onClick={() => onTabChange('timeline')}>
          Timeline
        </TabButton>
      </nav>

      {tab === 'liste' ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950" aria-label="Alarmierungs-Liste">
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 p-3 dark:border-slate-800">
              {STATUS_FILTER_OPTIONS.map((option) => {
                const active = filter.status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleStatusChange(option.value)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {listeQuery.isLoading && <p className="p-4 text-sm text-slate-500">Lade Alarmierungen…</p>}
              {listeQuery.isError && <p className="p-4 text-sm text-red-600">Alarmierungen konnten nicht geladen werden.</p>}
              {!listeQuery.isLoading && !listeQuery.isError && alarmierungen.length === 0 && <p className="p-4 text-sm text-slate-500">Keine Alarmierungen im aktuellen Filter.</p>}
              {alarmierungen.length > 0 && (
                <ul className="space-y-1.5">
                  {alarmierungen.map((a) => (
                    <li key={a.id}>
                      <AlarmierungListItem
                        alarmierung={a}
                        selected={a.id === selectedId}
                        onClick={() => handleSelect(a.id)}
                        onNachalarmieren={a.status === 'aktiv' ? () => setNachalarmierungQuelle(a) : undefined}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-label="Alarmierungs-Detail">
            {!selectedAlarmierung ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">{detailQuery.isLoading ? 'Lade Details…' : 'Bitte eine Alarmierung auswählen.'}</div>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto p-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{selectedAlarmierung.bezeichnung}</h2>
                      <AlarmierungStatusBadge status={selectedAlarmierung.status as AlarmierungStatus} size="sm" />
                      {selectedAlarmierung.istNachalarmierung && <NachalarmierungBadge size="sm" />}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Ausgelöst am {formatDateTime(selectedAlarmierung.alarmierungszeit)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {selectedAlarmierung.status === 'aktiv' && (
                      <>
                        <Button intent="secondary" appearance="outline" size="sm" type="button" onClick={() => setNachalarmierungQuelle(selectedAlarmierung)}>
                          Nachalarmieren
                        </Button>
                        <Button
                          intent="primary"
                          appearance="outline"
                          size="sm"
                          type="button"
                          onClick={handleAbschliessen}
                          disabled={abschliessenMutation.isPending}
                          loading={abschliessenMutation.isPending}
                        >
                          <PiCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
                          Abschließen
                        </Button>
                      </>
                    )}
                  </div>
                </header>

                <AlarmierungEmpfaengerTabelle einsatzId={einsatzId} alarmierung={selectedAlarmierung} disabled={selectedAlarmierung.status === 'abgeschlossen'} />
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="min-h-0 flex-1 overflow-hidden p-4" aria-label="Alarmierungs-Timeline">
          <AlarmierungTimeline einsatzId={einsatzId} className="h-full" />
        </section>
      )}

      {isCreateOpen && <AlarmierungErstellenDrawer einsatzId={einsatzId} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />}
      {nachalarmierungQuelle && <NachalarmierungDialog einsatzId={einsatzId} ursprung={nachalarmierungQuelle} isOpen={Boolean(nachalarmierungQuelle)} onClose={() => setNachalarmierungQuelle(null)} />}

      <Dialog.Confirm
        isOpen={isAbschliessenConfirmOpen}
        onClose={() => setIsAbschliessenConfirmOpen(false)}
        onConfirm={handleAbschliessenBestaetigen}
        title="Alarmierung abschließen"
        message={selectedAlarmierung ? `Alarmierung „${selectedAlarmierung.bezeichnung}" wirklich abschließen?` : ''}
        confirmLabel="Abschließen"
        variant="warning"
        isProcessing={abschliessenMutation.isPending}
      />
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
