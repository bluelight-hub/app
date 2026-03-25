import { cn } from '@/shared/ui/cn';

interface LiveIndikatorProps {
  isConnected: boolean;
}

export function LiveIndikator({ isConnected }: LiveIndikatorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
        isConnected ? 'bg-status-success-surface text-status-success-text' : 'bg-status-warning-surface text-status-warning-text',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', isConnected ? 'animate-pulse bg-status-success-text' : 'bg-status-warning-text')} />
      {isConnected ? 'Live - aktualisiert sich automatisch' : 'Verbindung unterbrochen'}
    </div>
  );
}
