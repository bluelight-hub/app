import { formatDisplayDateTime } from '@/shared/lib/dateFormatter';
import type { EintragDto } from '@/shared';
import { format, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { PiClockCounterClockwise, PiPencil, PiTrashSimple, PiUser } from 'react-icons/pi';
import { ScreenshotLightbox } from './ScreenshotLightbox';
import { ErinnerungTimelineWidget } from './ErinnerungTimelineWidget';

interface EtbEntryDetailsProps {
  entry: EintragDto;
  getUserName: (id: string) => string | undefined;
  /** ETB-ID fuer Timeline-Abfrage (Story 5.5) */
  etbId?: string;
  /** Callback wenn auf einen ETB-Eintrag in der Timeline geklickt wird (Story 5.5) */
  onEntryClick?: (entryId: string) => void;
  /** Alle Eintraege fuer Bearbeitungshistorie */
  allEntries?: EintragDto[];
}

/**
 * Expandierte Details fuer einen ETB-Eintrag
 *
 * **Story 5.5:** Zeigt zusaetzlich das Erinnerung Timeline Widget an,
 * wenn der Eintrag mit einer Erinnerung verknuepft ist.
 *
 */
export function EtbEntryDetails({ entry, getUserName, etbId, onEntryClick, allEntries = [] }: EtbEntryDetailsProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Check if screenshot exists in metadata
  const screenshotUrl =
    entry.metadata && typeof entry.metadata === 'object' && 'screenshot' in entry.metadata && entry.metadata.screenshot && typeof entry.metadata.screenshot === 'object'
      ? (() => {
          const { url } = entry.metadata.screenshot as { url?: unknown };
          return typeof url === 'string' ? url : null;
        })()
      : null;

  // Sanitize URL (XSS prevention)
  const sanitizedUrl = screenshotUrl ? encodeURI(screenshotUrl) : null;

  // Story 5.5: linkedErinnerung extrahieren - Timeline nur fuer Original-Eintrag (aus dem Erinnerung erstellt wurde)
  // NICHT metadata.erinnerungId verwenden, da das in ALLEN automatischen Eintraegen vorhanden ist
  const linkedErinnerung =
    entry.linkedErinnerung && typeof entry.linkedErinnerung === 'object' && 'id' in entry.linkedErinnerung && typeof entry.linkedErinnerung.id === 'string' && entry.linkedErinnerung.id !== ''
      ? (entry.linkedErinnerung as { id: string; titel: string })
      : null;

  const updatedAtDate = entry.updatedAt ? new Date(entry.updatedAt) : null;
  const updatedAtDisplay = updatedAtDate && isValid(updatedAtDate) ? format(updatedAtDate, 'HH:mm', { locale: de }) : null;

  const deletedAtDate = entry.deletedAt ? new Date(entry.deletedAt as unknown as string) : null;
  const deletedAtDisplay = deletedAtDate && isValid(deletedAtDate) ? format(deletedAtDate, 'HH:mm', { locale: de }) : null;

  return (
    <div className="space-y-4">
      {/* Vollstaendiger Text */}
      <div className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-sm">
        <h4 className="mb-2 text-xs font-medium text-text-secondary">Vollständiger Eintrag</h4>
        <p className="text-sm break-words whitespace-pre-wrap text-text-primary">{entry.text}</p>
      </div>

      {/* Screenshot Preview (if exists) */}
      {sanitizedUrl && (
        <div className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-sm">
          <h4 className="mb-2 text-xs font-medium text-text-secondary">Lagekarten-Screenshot</h4>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative overflow-hidden rounded-lg shadow transition-shadow hover:shadow-lg"
            aria-label="Lagekarten-Screenshot anzeigen"
          >
            <img src={sanitizedUrl} alt="Lagekarten-Screenshot" className="h-auto max-w-full cursor-pointer rounded-lg transition-transform group-hover:scale-[1.02]" loading="lazy" />
            {/* Overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-surface-inverse/0 text-sm text-text-inverse opacity-0 transition-all group-hover:bg-surface-inverse/50 group-hover:opacity-100">
              <span className="font-semibold">Klicken zum Vergrößern</span>
            </div>
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {sanitizedUrl && <ScreenshotLightbox isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} screenshotUrl={screenshotUrl} title="Lagekarten-Screenshot" />}

      {/* Story 5.5: Erinnerung Timeline Widget - nur im Original-Eintrag anzeigen */}
      {linkedErinnerung && etbId && <ErinnerungTimelineWidget etbId={etbId} erinnerungId={linkedErinnerung.id} onEntryClick={onEntryClick} />}

      {/* Bearbeitungshistorie (fuer Korrektur-Eintraege) */}
      <EditHistory entry={entry} allEntries={allEntries} getUserName={getUserName} />

      {/* Meta-Informationen */}
      <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-3">
        <div>
          <span className="font-medium text-text-secondary">Lfd. Nr.:</span>
          <p className="mt-1 font-mono text-text-primary">#{entry.sequenceNumber}</p>
        </div>

        <div>
          <span className="font-medium text-text-secondary">Erstellt von:</span>
          <p className="mt-1 flex items-center gap-1 text-text-primary">
            <PiUser className="h-3 w-3" />
            {getUserName(entry.createdBy) ?? 'Unbekannt'}
          </p>
        </div>

        <div>
          <span className="font-medium text-text-secondary">Zeitstempel:</span>
          <p className="mt-1 text-text-primary">{formatDisplayDateTime(entry.timestamp)}</p>
        </div>

        {entry.funkrufname && (
          <div>
            <span className="font-medium text-text-secondary">Funkrufname:</span>
            <p className="mt-1 text-text-primary">{entry.funkrufname}</p>
          </div>
        )}

        {entry.standort && (
          <div>
            <span className="font-medium text-text-secondary">Standort:</span>
            <p className="mt-1 text-text-primary">{entry.standort}</p>
          </div>
        )}

        {entry.updatedBy && entry.updatedAt !== entry.createdAt && (
          <div>
            <span className="font-medium text-text-secondary">Bearbeitet von:</span>
            <p className="mt-1 flex items-center gap-1 text-text-primary">
              <PiPencil className="h-3 w-3" />
              {getUserName(entry.updatedBy) ?? 'Unbekannt'}
              {updatedAtDisplay && <span className="text-text-secondary">({updatedAtDisplay})</span>}
            </p>
          </div>
        )}

        {entry.version > 1 && (
          <div>
            <span className="font-medium text-text-secondary">Version:</span>
            <p className="mt-1 text-text-primary">{entry.version}</p>
          </div>
        )}

        {entry.isAutomatic && (
          <div>
            <span className="inline-flex items-center rounded bg-status-info-surface px-2 py-1 text-xs text-status-info-text">Automatisch generiert</span>
          </div>
        )}

        {entry.deletedAt && (
          <div>
            <span className="font-medium text-text-secondary">Gelöscht:</span>
            <p className="mt-1 flex items-center gap-1 text-status-danger-text">
              <PiTrashSimple className="h-3 w-3" />
              {entry.deleterUsername ?? 'Unbekannt'}
              {deletedAtDisplay && <span className="text-text-secondary">({deletedAtDisplay})</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Bearbeitungshistorie: Zeigt die Vorgaengerversionen eines Korrektur-Eintrags.
 * Geht die Kette korrigiertEintragId → korrigiertEintragId → ... zurueck.
 */
function EditHistory({ entry, allEntries, getUserName }: { entry: EintragDto; allEntries: EintragDto[]; getUserName: (id: string) => string | undefined }) {
  const history = useMemo(() => {
    if (!entry.isKorrektur || !entry.korrigiertEintragId || allEntries.length === 0) return [];

    const versions: EintragDto[] = [];
    let currentId: string | null | undefined = entry.korrigiertEintragId;

    // Kette rueckwaerts verfolgen (max 20 um Endlosschleifen zu vermeiden)
    let safety = 0;
    while (currentId && safety < 20) {
      const found = allEntries.find((e) => e.id === currentId);
      if (!found) break;
      versions.push(found);
      currentId = found.korrigiertEintragId;
      safety++;
    }

    return versions;
  }, [entry, allEntries]);

  if (history.length === 0) return null;

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-sm">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-medium text-text-secondary">
        <PiClockCounterClockwise className="h-4 w-4" />
        Bearbeitungshistorie ({history.length} {history.length === 1 ? 'vorherige Version' : 'vorherige Versionen'})
      </h4>
      <div className="space-y-3">
        {history.map((prev, idx) => {
          const ts = prev.timestamp ? new Date(prev.timestamp) : null;
          const timeStr = ts && isValid(ts) ? format(ts, 'dd.MM.yyyy HH:mm', { locale: de }) : '–';
          return (
            <div key={prev.id} className="relative border-l-2 border-border-subtle pl-4">
              <div className="absolute top-1 -left-1.5 h-3 w-3 rounded-full border-2 border-border-subtle bg-surface-panel" />
              <div className="flex items-baseline gap-2 text-xs text-text-muted">
                <span className="font-mono">#{prev.sequenceNumber}</span>
                <span>{timeStr}</span>
                <span>von {getUserName(prev.createdBy) ?? 'Unbekannt'}</span>
                {idx === 0 && <span className="rounded bg-status-warning-surface px-1.5 py-0.5 text-[10px] font-medium text-status-warning-text">Ersetzt</span>}
              </div>
              <p className="mt-1 text-sm text-text-secondary line-through">{prev.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
