import { WarnstufeBadge } from '../atoms/WarnstufeBadge';
import { WARNSTUFEN, WARNSTUFE_LABELS, type WarnstufeValue } from '../../schemas/gefahrenmatrix.schema';

const WARNSTUFE_BESCHREIBUNGEN: Record<WarnstufeValue, string> = {
  KEINE: 'Gefahr liegt nicht vor',
  NIEDRIG: 'Beherrschbar mit Standardmaßnahmen',
  MITTEL: 'Gezielte Schutzmaßnahmen nötig',
  HOCH: 'Sofortige Maßnahmen zwingend',
  AKUT: 'Lebensbedrohend — ggf. Rückzug',
};

/**
 * Kompakte Inline-Legende für die Warnstufen der Gefahrenmatrix.
 */
export function GefahrenmatrixLegende() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
      <span className="font-medium text-text-secondary">Legende:</span>
      {WARNSTUFEN.map((stufe) => (
        <span key={stufe} className="inline-flex items-center gap-1.5">
          <WarnstufeBadge warnstufe={stufe} />
          <span>{WARNSTUFE_BESCHREIBUNGEN[stufe]}</span>
        </span>
      ))}
    </div>
  );
}
