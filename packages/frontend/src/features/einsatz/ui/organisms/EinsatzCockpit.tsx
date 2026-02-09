import { PiBellRinging, PiNotepad } from 'react-icons/pi';
import { ErinnerungenList, useErinnerungenByEinsatz, ErinnerungUebersicht, PersonStatistikTabelle, ZeitverlaufDiagramm } from '@/features/reminders';
import { NotizList } from '@/features/notizen';

interface EinsatzCockpitProps {
  einsatzId: string;
}

export function EinsatzCockpit({ einsatzId }: EinsatzCockpitProps) {
  const { data: erinnerungen = [] } = useErinnerungenByEinsatz({ einsatzId });

  return (
    <div className="flex flex-col gap-6 p-6">
      <ErinnerungUebersicht erinnerungen={erinnerungen} />
      <PersonStatistikTabelle einsatzId={einsatzId} />
      <ZeitverlaufDiagramm einsatzId={einsatzId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-label="Zeitkritisch">
          <div className="mb-3 flex items-center gap-2">
            <PiBellRinging className="h-5 w-5 text-amber-500" aria-hidden="true" />
            <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Zeitkritisch</h2>
          </div>
          <ErinnerungenList einsatzId={einsatzId} />
        </section>

        <section aria-label="Informationen">
          <div className="mb-3 flex items-center gap-2">
            <PiNotepad className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Informationen</h2>
          </div>
          <NotizList einsatzId={einsatzId} />
        </section>
      </div>
    </div>
  );
}
