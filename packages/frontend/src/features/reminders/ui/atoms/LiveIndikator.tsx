import { cn } from '@/shared/ui/cn';

interface LiveIndikatorProps {
  isConnected: boolean;
}

export function LiveIndikator({ isConnected }: LiveIndikatorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium text-xs',
        isConnected ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', isConnected ? 'animate-pulse bg-green-500' : 'bg-amber-500')} />
      {isConnected ? 'Live - aktualisiert sich automatisch' : 'Verbindung unterbrochen'}
    </div>
  );
}
