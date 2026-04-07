/**
 * NinaPanelContent - Vollständige Detail-Ansicht für NINA-Warnungen
 *
 * Zeigt alle Informationen zu NINA-Warnungen im Side-Panel:
 * Warntyp, Beschreibung, Gültigkeit, Gebiet, Handlungsempfehlung, Herausgeber.
 * Lädt bei Bedarf die vollständigen Details über die Backend-API nach.
 */

import { fetchNinaWarnungDetail } from '../../api/fetch-nina-warnung-detail';
import { cn } from '@/shared/ui/cn';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { useQuery } from '@tanstack/react-query';
import { PiCalendar, PiGlobe, PiInfo, PiMapPin, PiMegaphone, PiShieldWarning, PiTag, PiUser } from 'react-icons/pi';
import { DEFAULT_CARD_STYLE, SEVERITY_CARD_STYLES, formatWarnungDateTime } from '../severity-styles';
import type { NinaWarnung } from './nina-api';

/**
 * Bereinigt HTML aus NINA-API-Texten für sichere Darstellung.
 * Konvertiert <br/> zu Zeilenumbrüchen und decoded HTML-Entities.
 */
function sanitizeNinaText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .trim();
}

interface NinaPanelContentProps {
  warnungen: NinaWarnung[];
  /** ID der Warnung für Detail-Nachladen über die Backend-API */
  warnungId?: string;
}

function WarnungSection({ warnung, index, total }: { warnung: NinaWarnung; index: number; total: number }) {
  const style = SEVERITY_CARD_STYLES[warnung.severity] ?? DEFAULT_CARD_STYLE;

  return (
    <div className={cn('rounded-lg border p-4', style.border, style.bg)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <PiMegaphone className={cn('mt-0.5 h-5 w-5 flex-shrink-0', style.text)} aria-hidden="true" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold tracking-wider uppercase', style.text)}>{style.label}</span>
            {total > 1 && (
              <span className="text-xs text-text-muted">
                ({index + 1}/{total})
              </span>
            )}
          </div>
          <h3 className="mt-0.5 text-base font-semibold text-text-primary">{warnung.headline || warnung.event}</h3>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {/* Beschreibung */}
        {warnung.description && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiInfo className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Beschreibung</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{sanitizeNinaText(warnung.description)}</p>
          </section>
        )}

        {/* Gültigkeitszeitraum */}
        {(warnung.onset || warnung.expires) && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiCalendar className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Gültigkeit</h4>
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

        {/* Betroffenes Gebiet */}
        {warnung.areaDesc && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiMapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Betroffenes Gebiet</h4>
            </div>
            <p className="mt-1 text-sm text-text-primary">{warnung.areaDesc}</p>
          </section>
        )}

        {/* Handlungsempfehlung */}
        {warnung.instruction && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiShieldWarning className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Handlungsempfehlung</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{sanitizeNinaText(warnung.instruction)}</p>
          </section>
        )}

        {/* Herausgeber */}
        {warnung.sender && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiUser className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Herausgeber</h4>
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
    <div className="bg-surface-secondary space-y-3 rounded-lg border border-border-subtle p-4">
      <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Erweiterte Details</h4>

      {/* Beschreibung (aus Detail-API, falls vorhanden und nicht schon in der Warnung) */}
      {detail.description && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiInfo className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Beschreibung</h4>
          </div>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{sanitizeNinaText(detail.description)}</p>
        </section>
      )}

      {/* Handlungsempfehlung */}
      {detail.instruction && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiShieldWarning className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Handlungsempfehlung</h4>
          </div>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{sanitizeNinaText(detail.instruction)}</p>
        </section>
      )}

      {/* Gültigkeit (effective → expires) */}
      {(detail.effective || detail.expires) && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiCalendar className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Gültigkeit</h4>
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

      {/* Betroffene Gebiete */}
      {detail.areas && detail.areas.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiMapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Betroffene Gebiete</h4>
          </div>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-text-primary">
            {detail.areas.map((area: string, idx: number) => (
              <li key={idx}>{area}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Herausgeber */}
      {detail.senderName && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiUser className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Herausgeber</h4>
          </div>
          <p className="mt-1 text-sm text-text-primary">{detail.senderName}</p>
        </section>
      )}

      {/* Meldungstyp */}
      {detail.msgType && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiTag className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Meldungstyp</h4>
          </div>
          <p className="mt-1 text-sm text-text-primary">{detail.msgType}</p>
        </section>
      )}

      {/* Web-Link */}
      {detail.web && (
        <section>
          <div className="flex items-center gap-1.5">
            <PiGlobe className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Weitere Informationen</h4>
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
    <div className="space-y-4">
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
