/**
 * OsmMarkierungPopup - Status-Auswahl für OSM-Gebäudemarkierungen
 *
 * Wird als Inhalt eines Map-Popups gerendert, wenn ein OSM-Feature
 * zur Markierung angeklickt wurde. Ermöglicht die Auswahl zwischen
 * "Betroffen", "Gesperrt" und "Evakuiert".
 */

import { cn } from '@/shared/ui/cn';
import type { OsmMarkierungStatus } from '../../drawing/types';
import type { PendingOsmMark } from '../../hooks/use-osm-markierung';

/** Props für die OsmMarkierungPopup-Komponente */
export interface OsmMarkierungPopupProps {
  /** Pending OSM-Markierung */
  pendingMark: PendingOsmMark;
  /** Status zuweisen */
  onConfirm: (status: OsmMarkierungStatus) => void;
  /** Markierung abbrechen */
  onCancel: () => void;
}

/** Status-Optionen mit Darstellung */
const STATUS_OPTIONS: { status: OsmMarkierungStatus; label: string; bgClass: string }[] = [
  { status: 'betroffen', label: 'Betroffen', bgClass: 'bg-amber-400 hover:bg-amber-500' },
  { status: 'gesperrt', label: 'Gesperrt', bgClass: 'bg-red-500 hover:bg-red-600' },
  { status: 'evakuiert', label: 'Evakuiert', bgClass: 'bg-purple-500 hover:bg-purple-600' },
];

export function OsmMarkierungPopup({ pendingMark, onConfirm, onCancel }: OsmMarkierungPopupProps) {
  return (
    <div className="min-w-48 p-1">
      <p className="mb-2 text-sm text-text-primary">
        <span className="font-bold">{pendingMark.featureName}</span> markieren als:
      </p>

      <div className="flex gap-1.5">
        {STATUS_OPTIONS.map(({ status, label, bgClass }) => (
          <button
            key={status}
            type="button"
            onClick={() => onConfirm(status)}
            className={cn('rounded px-2.5 py-1.5 text-xs font-medium text-white transition-colors duration-100', 'focus-visible:shadow-focus-ring focus-visible:outline-none', bgClass)}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className={cn('mt-2 text-xs text-text-muted transition-colors duration-100', 'hover:text-text-primary focus-visible:shadow-focus-ring focus-visible:outline-none')}
      >
        Abbrechen
      </button>
    </div>
  );
}
