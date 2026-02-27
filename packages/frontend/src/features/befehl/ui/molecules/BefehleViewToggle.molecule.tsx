import { PiList, PiSquaresFour, PiTable } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { useBefehleView, setBefehleView, type BefehleView } from '../../hooks/use-befehle-view-store';

/** Toggle-Buttons fuer Kanban/Tabellen-Ansicht */
export function BefehleViewToggle({ className }: { className?: string }) {
  const [currentView] = useBefehleView();

  const buttons: { view: BefehleView; icon: typeof PiSquaresFour; label: string }[] = [
    { view: 'kanban', icon: PiSquaresFour, label: 'Kanban-Ansicht' },
    { view: 'tabelle', icon: PiTable, label: 'Tabellen-Ansicht' },
    { view: 'liste', icon: PiList, label: 'Listenansicht' },
  ];

  return (
    <div className={cn('inline-flex rounded-lg border border-gray-200 dark:border-gray-700', className)} role="toolbar" aria-label="Ansicht wechseln">
      {buttons.map(({ view, icon: Icon, label }) => (
        <button
          key={view}
          type="button"
          aria-pressed={currentView === view}
          aria-label={label}
          onClick={() => setBefehleView(view)}
          className={cn(
            'inline-flex items-center justify-center p-2 transition-colors motion-reduce:transition-none',
            'first:rounded-l-lg last:rounded-r-lg',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            currentView === view
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
          )}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}
