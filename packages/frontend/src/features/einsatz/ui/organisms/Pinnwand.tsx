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
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-panel">
        <button type="button" onClick={() => setShowStatistiken(!showStatistiken)} className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-action-secondary">
          <div className="flex items-center gap-2.5">
            <PiChartBar className="h-4 w-4 text-text-muted" />
            <span className="font-bold text-body-sm uppercase tracking-wider text-text-secondary">Statistiken &amp; Analysen</span>
          </div>
          {showStatistiken ? <PiCaretUp className="h-4 w-4 text-text-muted" /> : <PiCaretDown className="h-4 w-4 text-text-muted" />}
        </button>

        {showStatistiken && (
          <div className="border-border-subtle border-t p-4">
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
