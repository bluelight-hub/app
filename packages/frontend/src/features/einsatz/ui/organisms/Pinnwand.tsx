import { useState } from 'react';
import { PiChartBar, PiCaretDown, PiCaretUp } from 'react-icons/pi';
import {
  PinnwandErinnerungen,
  useErinnerungenByEinsatz,
  ErinnerungUebersicht,
  PersonStatistikTabelle,
  ZeitverlaufDiagramm,
  EskalationsAnalyse,
  ReaktionszeitStatistik,
  FuehrungsrhythmusStatistik,
  EinsatzVergleich,
} from '@/features/reminders';
import { NotizList } from '@/features/notizen';

interface PinnwandProps {
  einsatzId: string;
}

export function Pinnwand({ einsatzId }: PinnwandProps) {
  const { data: erinnerungen = [] } = useErinnerungenByEinsatz({ einsatzId });
  const [showStatistiken, setShowStatistiken] = useState(false);

  return (
    <div className="mx-auto flex max-w-[1920px] flex-col gap-4 p-4">
      {/* Hauptbereich: Erinnerungen (70%) & Notizen (30%) nebeneinander */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-10">
        <section className="lg:col-span-7" aria-label="Zeitkritisch">
          <PinnwandErinnerungen einsatzId={einsatzId} />
        </section>

        <section className="lg:col-span-3" aria-label="Informationen">
          <NotizList einsatzId={einsatzId} mode="sidebar" />
        </section>
      </div>

      {/* Statistiken - einklappbar, Card-Style */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setShowStatistiken(!showStatistiken)}
          className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <div className="flex items-center gap-2.5">
            <PiChartBar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="font-bold text-gray-700 text-sm uppercase tracking-wider dark:text-gray-300">Statistiken &amp; Analysen</span>
          </div>
          {showStatistiken ? <PiCaretUp className="h-4 w-4 text-gray-400" /> : <PiCaretDown className="h-4 w-4 text-gray-400" />}
        </button>

        {showStatistiken && (
          <div className="border-gray-200 border-t p-4 dark:border-gray-800">
            <div className="flex flex-col gap-4">
              <ErinnerungUebersicht erinnerungen={erinnerungen} />
              <PersonStatistikTabelle einsatzId={einsatzId} />
              <ZeitverlaufDiagramm einsatzId={einsatzId} />
              <EskalationsAnalyse einsatzId={einsatzId} />
              <ReaktionszeitStatistik einsatzId={einsatzId} />
              <FuehrungsrhythmusStatistik einsatzId={einsatzId} />
              <EinsatzVergleich einsatzId={einsatzId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
