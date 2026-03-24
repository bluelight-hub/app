import { cn } from '@/shared/ui/cn';

interface ServerConnectLoadingProps {
  className?: string;
  message?: string;
}

export const ServerConnectLoading: React.FC<ServerConnectLoadingProps> = ({ className, message = 'Verbinde mit Server...' }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 p-6', className)}>
      {/* Spinner - Tailwind CSS Animation */}
      <output className="h-12 w-12 animate-spin rounded-full border-4 border-border-subtle border-t-action-primary" aria-label="Lädt" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
};
