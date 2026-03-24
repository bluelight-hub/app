import { cn } from '@/shared/ui/cn';

interface AlarmDotProps {
  className?: string;
}

/**
 * Pulsierender roter Dot fuer ueberfaellige Befehle.
 *
 * Respektiert prefers-reduced-motion (Tailwind motion-reduce: Prefix).
 * aria-hidden da rein dekorativ - die Kritikalitaet wird per Badge kommuniziert.
 */
export function AlarmDot({ className }: AlarmDotProps) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)} aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-danger-text opacity-75 motion-reduce:animate-none" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-status-danger-text" />
    </span>
  );
}
