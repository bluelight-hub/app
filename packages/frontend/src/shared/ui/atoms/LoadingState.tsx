import { cn } from '@/shared/ui/cn';
import { PiSpinner } from 'react-icons/pi';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message = 'Lade Daten...', fullScreen = true }: LoadingStateProps) {
  return (
    <div className={cn('flex items-center justify-center', fullScreen ? 'h-screen' : 'h-96')}>
      <output className="text-center" aria-live="polite" aria-atomic="true" aria-busy="true">
        <PiSpinner className="mx-auto h-12 w-12 animate-spin text-action-primary" />
        <p className="mt-4 text-text-secondary">{message}</p>
      </output>
    </div>
  );
}
