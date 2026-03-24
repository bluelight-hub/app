import { useErinnerungStatistik } from '../../api/queries';
import { formatDuration } from '@/shared/lib/dateFormatter';
import { PiChartBar, PiWarningCircle } from 'react-icons/pi';

interface ErinnerungStatistikProps {
  einsatzId: string;
}

export const ErinnerungStatistik = ({ einsatzId }: ErinnerungStatistikProps) => {
  const { data: stats, isLoading, error } = useErinnerungStatistik(einsatzId);

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-panel bg-surface-raised" />;
  }

  if (error) {
    return <p className="text-sm text-status-danger-text">Fehler beim Laden der Statistik</p>;
  }

  if (!stats || stats.totalEscalated === 0) {
    return (
      <>
        <h3 className="mb-4 font-semibold text-lg text-text-primary">Eskalations-Statistik</h3>
        <div className="py-4 text-center text-text-muted">
          <PiChartBar className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Noch keine Eskalationen</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h3 className="mb-4 font-semibold text-lg text-text-primary">Eskalations-Statistik</h3>

      {/* Kompakte Stats */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="font-bold text-2xl text-status-danger-text">{stats.totalEscalated}</p>
          <p className="text-text-muted text-xs">Eskaliert</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl text-status-warning-text">{formatDuration(stats.avgEscalationTimeSeconds)}</p>
          <p className="text-text-muted text-xs">Ø Zeit</p>
        </div>
      </div>

      {/* Top Empfänger */}
      {stats.topReceivers.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-text-secondary text-xs">Top Empfänger</p>
          {stats.topReceivers.slice(0, 3).map((receiver) => (
            <div key={receiver.userId} className="flex items-center justify-between rounded-control bg-surface-raised p-2">
              <div className="flex items-center gap-2">
                <PiWarningCircle className="h-4 w-4 text-text-muted" />
                <span className="text-sm text-text-primary">{receiver.userName}</span>
              </div>
              <span className="rounded bg-status-danger-surface px-2 py-0.5 text-status-danger-text text-xs">{receiver.count}×</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
