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
    <div className={cn('inline-flex rounded-lg border border-border-subtle bg-surface-panel', className)} role="toolbar" aria-label="Ansicht wechseln">
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
            'focus-visible:shadow-focus-ring focus-visible:outline-none',
            currentView === view ? 'bg-action-secondary text-action-primary' : 'text-text-muted hover:bg-action-secondary hover:text-text-secondary',
          )}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}
