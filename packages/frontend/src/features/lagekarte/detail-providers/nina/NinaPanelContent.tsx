/**
 * NinaPanelContent - Vollständige Detail-Ansicht für NINA-Warnungen
 *
 * Zeigt alle Informationen zu NINA-Warnungen im Side-Panel:
 * Warntyp, Beschreibung, Gültigkeit, Gebiet, Handlungsempfehlung, Herausgeber.
 * Lädt bei Bedarf die vollständigen Details über die Backend-API nach.
 * Design: Badge-Pill + flaches Layout mit Sektions-Trennlinien.
 */

import { fetchNinaWarnungDetail } from '../../api/fetch-nina-warnung-detail';
import { cn } from '@/shared/ui/cn';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { useQuery } from '@tanstack/react-query';
import { PiCalendar, PiGlobe, PiInfo, PiMapPin, PiMegaphone, PiShieldWarning, PiTag, PiUser } from 'react-icons/pi';
import DOMPurify from 'dompurify';
import { DEFAULT_BADGE_STYLE, SEVERITY_BADGE_STYLES, formatWarnungDateTime } from '../severity-styles';
import type { NinaWarnung } from './nina-api';

/** NINA-spezifische Labels für Warnstufen */
const NINA_SEVERITY_LABELS: Record<string, string> = {
  Minor: 'Geringfügig',
  Moderate: 'Mäßig',
  Severe: 'Schwer',
  Extreme: 'Extrem',
};

/**
 * Bereinigt HTML aus NINA-API-Texten für sichere Darstellung.
 *
 * Reihenfolge: Erst Entities decoden, dann Zeilenumbrüche normalisieren und
 * anschließend mit DOMPurify alle HTML-Tags sicher entfernen.
 */
function sanitizeNinaText(html: string): string {
  const decoded = html
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/<br\s*\/?>/gi, '\n');
  return DOMPurify.sanitize(decoded, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

interface NinaPanelContentProps {
  warnungen: NinaWarnung[];
  /** ID der Warnung für Detail-Nachladen über die Backend-API */
  warnungId?: string;
}

function WarnungSection({ warnung, index, total }: { warnung: NinaWarnung; index: number; total: number }) {
  const style = SEVERITY_BADGE_STYLES[warnung.severity] ?? DEFAULT_BADGE_STYLE;
  const label = NINA_SEVERITY_LABELS[warnung.severity] ?? 'Warnung';

  return (
    <div>
      {/* Badge + Titel */}
      <div className="mb-4">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase', style.bg, style.text)}>
          <PiMegaphone className="h-3 w-3" aria-hidden="true" />
          {label}
        </span>
        {total > 1 && (
          <span className="ml-2 text-xs text-text-muted">
            ({index + 1}/{total})
          </span>
        )}
        <h3 className="mt-1.5 text-base leading-snug font-semibold text-text-primary">{warnung.headline || warnung.event}</h3>
        <p className="mt-0.5 text-xs text-text-muted">NINA · BBK Warn-App</p>
      </div>

      {/* Detail-Sektionen */}
      <div className="space-y-3.5 border-t border-border-subtle pt-3">
        {warnung.description && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiInfo className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Beschreibung</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{sanitizeNinaText(warnung.description)}</p>
          </section>
        )}

        {warnung.instruction && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiShieldWarning className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Handlungsempfehlung</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{sanitizeNinaText(warnung.instruction)}</p>
          </section>
        )}

        {(warnung.onset || warnung.expires) && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiCalendar className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Gültigkeit</h4>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-text-primary">
              <div>
                <span className="text-xs text-text-muted">Von: </span>
                {formatWarnungDateTime(warnung.onset)}
              </div>
              <div>
                <span className="text-xs text-text-muted">Bis: </span>
                {formatWarnungDateTime(warnung.expires)}
              </div>
            </div>
          </section>
        )}

        {warnung.areaDesc && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiMapPin className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Betroffenes Gebiet</h4>
            </div>
            <p className="mt-1 text-sm text-text-primary">{warnung.areaDesc}</p>
          </section>
        )}

        {warnung.sender && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiUser className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Herausgeber</h4>
            </div>
            <p className="mt-1 text-sm text-text-primary">{warnung.sender}</p>
          </section>
        )}
      </div>
    </div>
  );
}

/** Zeigt die nachgeladenen Detail-Informationen einer NINA-Warnung */
function DetailSection({ warnungId }: { warnungId: string }) {
  const {
    data: detail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['nina-warnung-detail', warnungId],
    queryFn: () => fetchNinaWarnungDetail(warnungId),
    enabled: !!warnungId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="sm" type="ring" label="Details werden geladen..." />
      </div>
    );
  }

  if (isError || !detail) {
    return <p className="py-2 text-center text-sm text-text-muted">Details konnten nicht geladen werden.</p>;
  }

  return (
    <div className="space-y-3.5">
      {detail.description && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiInfo className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Beschreibung</h4>
          </div>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{sanitizeNinaText(detail.description)}</p>
        </section>
      )}

      {detail.instruction && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiShieldWarning className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Handlungsempfehlung</h4>
          </div>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{sanitizeNinaText(detail.instruction)}</p>
        </section>
      )}

      {(detail.effective || detail.expires) && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiCalendar className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Gültigkeit</h4>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-text-primary">
            <div>
              <span className="text-xs text-text-muted">Von: </span>
              {formatWarnungDateTime(detail.effective)}
            </div>
            <div>
              <span className="text-xs text-text-muted">Bis: </span>
              {formatWarnungDateTime(detail.expires)}
            </div>
          </div>
        </section>
      )}

      {detail.areas && detail.areas.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiMapPin className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Betroffene Gebiete</h4>
          </div>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-text-primary">
            {detail.areas.map((area: string, idx: number) => (
              <li key={idx}>{area}</li>
            ))}
          </ul>
        </section>
      )}

      {detail.senderName && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiUser className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Herausgeber</h4>
          </div>
          <p className="mt-1 text-sm text-text-primary">{detail.senderName}</p>
        </section>
      )}

      {detail.msgType && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiTag className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Meldungstyp</h4>
          </div>
          <p className="mt-1 text-sm text-text-primary">{detail.msgType}</p>
        </section>
      )}

      {detail.web && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiGlobe className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Weitere Informationen</h4>
          </div>
          <a href={detail.web} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-action-primary underline hover:text-action-primary-hover">
            {detail.web}
          </a>
        </section>
      )}
    </div>
  );
}

export function NinaPanelContent({ warnungen, warnungId }: NinaPanelContentProps) {
  if (warnungen.length === 0) {
    return <p className="py-4 text-center text-sm text-text-muted">Keine aktiven NINA-Warnungen an dieser Stelle.</p>;
  }

  return (
    <div className="space-y-6">
      {warnungen.map((warnung, idx) => (
        <WarnungSection key={warnung.id} warnung={warnung} index={idx} total={warnungen.length} />
      ))}

      {/* Nachgeladene Detail-Informationen */}
      {warnungId && <DetailSection warnungId={warnungId} />}

      {/* Quellenangabe */}
      <p className="text-xs text-text-muted">Quelle: Bundesamt für Bevölkerungsschutz und Katastrophenhilfe (BBK) — NINA Warn-App</p>
    </div>
  );
}
