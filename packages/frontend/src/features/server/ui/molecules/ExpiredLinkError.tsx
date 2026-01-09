import { cn } from '@/shared/ui/cn';

interface ExpiredLinkErrorProps {
  className?: string;
  onRequestNew?: () => void;
}

export const ExpiredLinkError: React.FC<ExpiredLinkErrorProps> = ({ className, onRequestNew }) => {
  return (
    <div className={cn('rounded-lg border border-red-200 bg-red-50 p-4', className)} role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>

        <div className="flex-1">
          <h3 className="font-medium text-red-800 text-sm">Dieser Einladungslink ist abgelaufen.</h3>
          <p className="mt-2 text-red-700 text-sm">Fordere einen neuen Link bei deinem Administrator an.</p>

          {onRequestNew && (
            <button
              type="button"
              onClick={onRequestNew}
              className="mt-3 font-medium text-red-800 text-sm underline hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              Neuen Link anfordern
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
