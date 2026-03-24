import { cn } from '@/shared/ui/cn';
import type { AddEintragDtoKategorieEnum as EtbKategorie } from '@/shared';
import { EtbVersionBadge } from './EtbVersionBadge';
import { EtbKategorieBadge } from './EtbKategorieBadge';
import { formatDisplayDateTime } from '@/shared/lib/dateFormatter';

interface EtbHistoryCardProps {
  version: number;
  timestamp: Date;
  text: string;
  kategorie: EtbKategorie;
  isCurrent?: boolean;
  username?: string | null;
  changeReason?: string | null;
  className?: string;
}

/**
 * Card zur Anzeige eines ETB-Eintrags in der Versionshistorie
 *
 * @param version - Versionsnummer
 * @param timestamp - Zeitstempel der Änderung
 * @param text - Eintragtext
 * @param kategorie - Kategorie des Eintrags
 * @param isCurrent - Ob es die aktuelle Version ist
 * @param username - Benutzername des Bearbeiters
 * @param changeReason - Grund für die Änderung
 * @param className - Zusätzliche CSS-Klassen
 */
export function EtbHistoryCard({ version, timestamp, text, kategorie, isCurrent = false, username, changeReason, className }: EtbHistoryCardProps) {
  return (
    <div className={cn('rounded-lg p-4', isCurrent ? 'border-2 border-status-info-border bg-status-info-surface' : 'border border-border-subtle bg-surface-panel', className)}>
      {/* Header mit Version und Timestamp */}
      <div className="mb-2 flex items-center gap-2">
        <EtbVersionBadge version={version} isCurrent={isCurrent} variant="solid" />
        <span className="text-sm text-text-secondary">{formatDisplayDateTime(timestamp)}</span>
      </div>

      {/* Username */}
      {username && <p className="mb-2 text-sm text-text-secondary">Bearbeitet von: {username}</p>}

      {/* Change Reason */}
      {changeReason && <p className="mb-2 text-sm text-text-muted italic">Grund: {changeReason}</p>}

      {/* Kategorie Badge */}
      <div className="mb-2">
        <EtbKategorieBadge kategorie={kategorie} />
      </div>

      {/* Text Content */}
      <p className={cn('text-sm', isCurrent ? 'text-text-primary' : 'text-text-secondary')}>{text}</p>
    </div>
  );
}
