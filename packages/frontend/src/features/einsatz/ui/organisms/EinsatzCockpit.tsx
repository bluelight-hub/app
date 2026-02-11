import { useCallback, useState } from 'react';
import { PiBellRinging, PiExport, PiNotepad } from 'react-icons/pi';
import {
  ErinnerungenList,
  useErinnerungenByEinsatz,
  ErinnerungUebersicht,
  PersonStatistikTabelle,
  ZeitverlaufDiagramm,
  EskalationsAnalyse,
  ReaktionszeitStatistik,
  FuehrungsrhythmusStatistik,
  EinsatzVergleich,
  StatistikExportDialog,
  RohdatenExportDialog,
  LiveIndikator,
} from '@/features/reminders';
import { NotizList } from '@/features/notizen';
import { useEinsatzDetail } from '../../api/use-einsatz-detail';

interface EinsatzCockpitProps {
  einsatzId: string;
}

const EXPORT_ALLOWED_STATUS = new Set(['ABGESCHLOSSEN', 'ARCHIVIERT']);
const LIVE_EINSATZ_STATUS = new Set(['IN_BEARBEITUNG', 'ANGELEGT']);

export function EinsatzCockpit({ einsatzId }: EinsatzCockpitProps) {
  const { data: erinnerungen = [] } = useErinnerungenByEinsatz({ einsatzId });
  const { einsatz } = useEinsatzDetail(einsatzId);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRohdatenExportOpen, setIsRohdatenExportOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const isLiveEinsatz = einsatz?.status != null && LIVE_EINSATZ_STATUS.has(einsatz.status);
  const canExport = einsatz?.status != null && EXPORT_ALLOWED_STATUS.has(einsatz.status);

  // M2: Connection-Status Callback verursacht extra Re-Render, ist aber akzeptabel:
  // Tritt nur bei Connect/Disconnect auf (selten), Auswirkung auf Children minimal.
  const handleConnectionStatusChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ErinnerungUebersicht erinnerungen={erinnerungen} />
          {isLiveEinsatz && <LiveIndikator isConnected={isConnected} />}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            disabled={!canExport}
            title={canExport ? 'Statistiken exportieren' : 'Export nur nach Einsatz-Ende verfuegbar'}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PiExport className="h-4 w-4" />
            Statistik Export
          </button>
          <button
            type="button"
            onClick={() => setIsRohdatenExportOpen(true)}
            disabled={!canExport}
            title={canExport ? 'Rohdaten exportieren' : 'Export nur nach Einsatz-Ende verfuegbar'}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PiExport className="h-4 w-4" />
            Rohdaten Export
          </button>
        </div>
      </div>
      <PersonStatistikTabelle einsatzId={einsatzId} />
      <ZeitverlaufDiagramm einsatzId={einsatzId} />
      <EskalationsAnalyse einsatzId={einsatzId} />
      <ReaktionszeitStatistik einsatzId={einsatzId} />
      <FuehrungsrhythmusStatistik einsatzId={einsatzId} />
      <EinsatzVergleich einsatzId={einsatzId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-label="Zeitkritisch">
          <div className="mb-3 flex items-center gap-2">
            <PiBellRinging className="h-5 w-5 text-amber-500" aria-hidden="true" />
            <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Zeitkritisch</h2>
          </div>
          <ErinnerungenList einsatzId={einsatzId} onConnectionStatusChange={handleConnectionStatusChange} />
        </section>

        <section aria-label="Informationen">
          <div className="mb-3 flex items-center gap-2">
            <PiNotepad className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Informationen</h2>
          </div>
          <NotizList einsatzId={einsatzId} />
        </section>
      </div>

      <StatistikExportDialog einsatzId={einsatzId} isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <RohdatenExportDialog einsatzId={einsatzId} isOpen={isRohdatenExportOpen} onClose={() => setIsRohdatenExportOpen(false)} />
    </div>
  );
}
