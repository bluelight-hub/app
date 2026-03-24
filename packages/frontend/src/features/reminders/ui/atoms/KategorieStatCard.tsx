import { cn } from '@/shared/ui/cn';

interface KategorieStatCardProps {
  name: string;
  farbe: string;
  activeCount: number;
  overdueCount: number;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Kompakte Karte zur Anzeige einer Kategorie mit Aktiv-/Überfällig-Statistiken.
 *
 * Wird im Erinnerungen-Dashboard als filterbarer Statistik-Button verwendet.
 */
export function KategorieStatCard({ name, farbe, activeCount, overdueCount, isActive, onClick }: KategorieStatCardProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex cursor-pointer flex-col gap-1 rounded-panel border border-border-subtle p-3 text-left transition-colors',
        'bg-surface-panel hover:bg-surface-raised',
        isActive && 'border-primary-300 ring-2 ring-primary-500 dark:border-primary-600',
      )}
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`Kategorie ${name}: ${activeCount} aktiv, ${overdueCount} überfällig`}
    >
      {/* Zeile 1: Farbpunkt + Name */}
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: farbe }} aria-hidden="true" />
        <span className="truncate font-medium text-sm">{name}</span>
      </div>
      {/* Zeile 2: Statistiken */}
      <div className="flex items-center gap-3 text-text-muted text-xs">
        <span>{activeCount} aktiv</span>
        <span className={cn(overdueCount > 0 && 'font-semibold text-status-danger-text')}>{overdueCount} überfällig</span>
      </div>
    </button>
  );
}
