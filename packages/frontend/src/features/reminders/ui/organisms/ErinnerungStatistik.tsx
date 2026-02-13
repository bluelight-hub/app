import { useErinnerungStatistik } from '../../api/queries';
import { formatDuration } from '@/shared/lib/dateFormatter';
import { PiChartBar, PiWarningCircle } from 'react-icons/pi';

interface ErinnerungStatistikProps {
  einsatzId: string;
}

export const ErinnerungStatistik = ({ einsatzId }: ErinnerungStatistikProps) => {
  const { data: stats, isLoading, error } = useErinnerungStatistik(einsatzId);

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />;
  }

  if (error) {
    return <p className="text-red-500 text-sm dark:text-red-400">Fehler beim Laden der Statistik</p>;
  }

  if (!stats || stats.totalEscalated === 0) {
    return (
      <>
        <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-gray-100">Eskalations-Statistik</h3>
        <div className="py-4 text-center text-gray-500 dark:text-gray-400">
          <PiChartBar className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Noch keine Eskalationen</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-gray-100">Eskalations-Statistik</h3>

      {/* Kompakte Stats */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="font-bold text-2xl text-red-600 dark:text-red-400">{stats.totalEscalated}</p>
          <p className="text-gray-500 text-xs dark:text-gray-400">Eskaliert</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl text-yellow-600 dark:text-yellow-400">{formatDuration(stats.avgEscalationTimeSeconds)}</p>
          <p className="text-gray-500 text-xs dark:text-gray-400">Ø Zeit</p>
        </div>
      </div>

      {/* Top Empfänger */}
      {stats.topReceivers.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-gray-700 text-xs dark:text-gray-300">Top Empfänger</p>
          {stats.topReceivers.slice(0, 3).map((receiver) => (
            <div key={receiver.userId} className="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
              <div className="flex items-center gap-2">
                <PiWarningCircle className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 text-sm dark:text-gray-100">{receiver.userName}</span>
              </div>
              <span className="rounded bg-red-100 px-2 py-0.5 text-red-700 text-xs dark:bg-red-900/30 dark:text-red-400">{receiver.count}×</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
