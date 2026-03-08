import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { PiArrowBendUpRight, PiChatCircleDots, PiCheckCircle, PiClock, PiEnvelopeSimple, PiPencilSimpleLine, PiQuestion, PiWarningCircle } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { getEigenerEmpfaengerStatus, getOffeneRueckfragenCount, getZustellHaekchenFarbe, EMPFAENGER_STATUS_FARBEN, type EmpfaengerStatus } from '../../lib/befehl-utils';
import { getBefehlKritikalitaet, isBefehlUeberfaellig } from '../../lib/befehl-priority';
import type { Kritikalitaet } from '../../lib/befehl-priority';
import { AlarmDot } from '../atoms/AlarmDot.atom';
import { BefehlStatusBadge } from '../atoms/BefehlStatusBadge.atom';
import { KritikalitaetBadge } from '../atoms/KritikalitaetBadge.atom';
import type { KritikalitaetBadgeType } from '../atoms/KritikalitaetBadge.atom';
import { ZustellHaekchen } from '../atoms/ZustellHaekchen.atom';
import { BefehlKommentarThread } from './BefehlKommentarThread.molecule';
import { ZustellstatusAnzeige } from './ZustellstatusAnzeige.molecule';
import type { BefehlDto, BefehlEmpfaengerDto, BefehlKommentarDto } from '@bluelight-hub/shared/client';
import type { AendereEmpfaengerStatusInput } from '../../api/use-aendere-empfaenger-status';

interface BefehlKarteProps {
  nummer: string;
  auftrag: string;
  status: 'ERTEILT' | 'ZUGESTELLT' | 'QUITTIERT' | 'KORRIGIERT';
  empfaenger: BefehlEmpfaengerDto[];
  erteiltAm: string | Date;
  kommentare?: BefehlKommentarDto[];
  einsatzId?: string;
  className?: string;
  befehlId?: string;
  currentUserId?: string;
  onQuittieren?: (befehlId: string) => void;
  /** Zeigt den eigenen Empfaenger-Status als farbcodierten Rand an */
  showMeineBefehle?: boolean;
  /** Optional: Zeitvorgabe fuer Ueberfaelligkeits-Berechnung */
  zeitvorgabe?: string;
  /** Optional: ID des korrigierten Original-Befehls (fuer Korrektur-Badge) */
  originalBefehlId?: string;
  /** Optional: Alle Befehle fuer Korrektur-Lookup (Nummer-Anzeige) */
  allBefehle?: BefehlDto[];
  /** RBAC: Darf der aktuelle User quittieren? (Einsatz-Rolle EMPFAENGER) */
  canQuittieren?: boolean;
  /** Klick-Handler fuer Detail-Panel (Karte anklicken) */
  onClick?: () => void;
  /** Callback fuer Empfaenger-Status-Aenderung (inline auf der Karte) */
  onStatusChange?: (input: AendereEmpfaengerStatusInput) => void;
  /** RBAC: Darf der aktuelle User Empfaenger-Status verwalten? */
  canManageStatus?: boolean;
}

/** Labels fuer Empfaenger-Status (WCAG: Text zusaetzlich zur Farbe) */
const EMPFAENGER_STATUS_LABELS: Record<EmpfaengerStatus, string> = {
  NICHT_EMPFAENGER: 'Kein Empfänger',
  AUSSTEHEND: 'Zustellung ausstehend',
  ZUGESTELLT: 'Zugestellt',
  QUITTIERT: 'Quittiert',
  RUECKFRAGE: 'Rückfrage offen',
};

/** Icons fuer Empfaenger-Status (WCAG: Icon zusaetzlich zur Farbe) */
const EMPFAENGER_STATUS_ICONS: Record<EmpfaengerStatus, React.ComponentType<{ className?: string }>> = {
  NICHT_EMPFAENGER: PiQuestion,
  AUSSTEHEND: PiClock,
  ZUGESTELLT: PiEnvelopeSimple,
  QUITTIERT: PiCheckCircle,
  RUECKFRAGE: PiWarningCircle,
};

/** Quittierungsart-Labels für Anzeige */
const QUITTIERUNG_LABELS: Record<string, string> = {
  VERSTANDEN: 'Verstanden',
  RUECKFRAGE: 'Rückfrage',
  NICHT_VERSTANDEN: 'Nicht verstanden',
};

/**
 * Kompakte Befehlskarte mit Status-Badge und Zustellhäkchen.
 *
 * Zeigt: Nummer, Auftrag, Status-Badge, Zustellhäkchen, Empfänger-Count, Zeitstempel.
 * Unterstützt optional Quittierungs-Interaktion wenn befehlId und currentUserId gesetzt sind.
 */
/** Ermittelt den KritikalitaetBadge-Typ basierend auf Befehl-Daten */
function getKritikalitaetBadgeType(befehlData: BefehlDto): KritikalitaetBadgeType | null {
  if (isBefehlUeberfaellig(befehlData)) return 'ueberfaellig';
  if (befehlData.empfaenger.some((e) => e.quittierungArt === 'NICHT_VERSTANDEN')) return 'nicht-verstanden';
  if (getOffeneRueckfragenCount(befehlData) > 0) return 'rueckfrage';
  return null;
}

export function BefehlKarte({
  nummer,
  auftrag,
  status,
  empfaenger,
  erteiltAm,
  kommentare,
  einsatzId,
  className,
  befehlId,
  currentUserId,
  onQuittieren,
  showMeineBefehle,
  zeitvorgabe,
  originalBefehlId,
  allBefehle,
  canQuittieren = false,
  onClick,
  onStatusChange,
  canManageStatus = false,
}: BefehlKarteProps) {
  const zugestelltCount = empfaenger.filter((e) => e.zugestelltAm != null).length;
  const erteiltAmDate = typeof erteiltAm === 'string' ? new Date(erteiltAm) : erteiltAm;
  const [showKommentare, setShowKommentare] = useState(false);
  const kommentarCount = kommentare?.length ?? 0;
  const offeneRueckfragenCount = getOffeneRueckfragenCount({ kommentare });

  /** Kritikalitaets-Berechnung (nutzt BefehlDto-kompatibles Objekt) */
  const befehlData: BefehlDto = {
    id: befehlId ?? '',
    nummer,
    einsatzId: einsatzId ?? '',
    auftrag,
    befehlsgeberName: '',
    erstellerId: '',
    status,
    befehlstyp: 'KURZBEFEHL',
    zeitvorgabe,
    erteiltAm: erteiltAmDate,
    empfaenger,
    kommentare: kommentare ?? [],
    createdAt: erteiltAmDate,
    updatedAt: erteiltAmDate,
  };
  const kritikalitaet: Kritikalitaet = getBefehlKritikalitaet(befehlData);
  const istKritisch = kritikalitaet === 'KRITISCH';
  const istWarnung = kritikalitaet === 'WARNUNG';
  const badgeType = getKritikalitaetBadgeType(befehlData);
  const istUeberfaellig = isBefehlUeberfaellig(befehlData);

  const eigenerStatus = getEigenerEmpfaengerStatus(empfaenger, currentUserId);
  const meineEmpfaengerInfo = eigenerStatus.empfaengerInfo;
  const istEmpfaenger = eigenerStatus.istEmpfaenger;
  const bereitsQuittiert = eigenerStatus.status === 'QUITTIERT';
  const zeigeQuittierung = istEmpfaenger && !bereitsQuittiert;

  /** Farbcodierung fuer "Meine Befehle"-Modus */
  const meineBefehleStyles = showMeineBefehle ? EMPFAENGER_STATUS_FARBEN[eigenerStatus.status] : null;

  /** Meine-Befehle Badge (vorab berechnet statt IIFE im JSX) */
  const MeineBefehleStatusIcon = showMeineBefehle && istEmpfaenger ? EMPFAENGER_STATUS_ICONS[eigenerStatus.status] : null;
  const meineBefehleFarben = showMeineBefehle && istEmpfaenger ? EMPFAENGER_STATUS_FARBEN[eigenerStatus.status] : null;
  const meineBefehleLabel =
    showMeineBefehle && istEmpfaenger
      ? bereitsQuittiert && meineEmpfaengerInfo?.quittierungArt
        ? (QUITTIERUNG_LABELS[meineEmpfaengerInfo.quittierungArt] ?? EMPFAENGER_STATUS_LABELS[eigenerStatus.status])
        : EMPFAENGER_STATUS_LABELS[eigenerStatus.status]
      : null;

  /** Korrektur-Hinweis Labels (statt IIFE im JSX) */
  const korrekturBefehlLabel = useMemo(() => {
    const korrekturBefehl = allBefehle?.find((b) => b.originalBefehlId === befehlId);
    return korrekturBefehl ? `Korrigiert durch Befehl #${korrekturBefehl.nummer}` : 'Befehl korrigiert';
  }, [allBefehle, befehlId]);

  const originalBefehlLabel = useMemo(() => {
    const originalBefehl = allBefehle?.find((b) => b.id === originalBefehlId);
    return originalBefehl ? `Korrektur von #${originalBefehl.nummer}` : 'Korrektur-Befehl';
  }, [allBefehle, originalBefehlId]);

  /** Kritikalitaets-Label fuer aria-label */
  const kritikalitaetAriaLabel = istKritisch ? ' – Kritisch' : istWarnung ? ' – Warnung' : '';
  const baseAriaLabel = kritikalitaetAriaLabel ? `Befehl ${nummer}${kritikalitaetAriaLabel}` : undefined;

  return (
    <article
      aria-label={baseAriaLabel}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      className={cn(
        'relative rounded-lg border p-4 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-gray-900',
        onClick && 'cursor-pointer',
        // Kritikalitaets-Styling hat Vorrang vor Quittierungs-Styling
        istKritisch && !zeigeQuittierung && ['border-red-400 ring-2 ring-red-500/40', 'dark:border-red-500 dark:ring-red-500/30'],
        istWarnung && !zeigeQuittierung && !meineBefehleStyles && ['border-yellow-300 ring-2 ring-yellow-300/40', 'dark:border-yellow-600 dark:ring-yellow-500/30'],
        zeigeQuittierung && [
          'cursor-pointer border-yellow-400 ring-1 ring-yellow-400/50',
          'hover:border-yellow-500 hover:bg-yellow-50/50',
          'dark:border-yellow-500 dark:ring-yellow-500/30 dark:hover:border-yellow-400 dark:hover:bg-yellow-950/20',
        ],
        !zeigeQuittierung &&
          !meineBefehleStyles &&
          !istKritisch &&
          !istWarnung && ['border-gray-200 hover:border-gray-300 hover:bg-gray-50', 'dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800/50'],
        !zeigeQuittierung && meineBefehleStyles && !istKritisch && [meineBefehleStyles.border, meineBefehleStyles.bg],
        className,
      )}
    >
      {/* AlarmDot oben-rechts fuer ueberfaellige Befehle */}
      {istUeberfaellig && <AlarmDot className="absolute top-2 right-2" />}
      {/* Obere Zeile: Nummer + Status-Badge + Kritikalitaet-Badge + Zustellhäkchen + Quittierungs-Badge */}
      <div className="flex items-center gap-3">
        <span className="font-bold text-3xl text-gray-900 dark:text-gray-100">{nummer}</span>
        <BefehlStatusBadge status={status} />
        {badgeType && <KritikalitaetBadge type={badgeType} />}
        <ZustellHaekchen empfaengerGesamt={empfaenger.length} empfaengerZugestellt={zugestelltCount} quittierungStatus={getZustellHaekchenFarbe(empfaenger)} />

        {/* Quittierungs-Badge (Standard-Modus) */}
        {!showMeineBefehle && zeigeQuittierung && (
          <span className="ml-auto inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 font-medium text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            Quittierung ausstehend
          </span>
        )}
        {!showMeineBefehle && bereitsQuittiert && meineEmpfaengerInfo?.quittierungArt && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-300">
            <PiCheckCircle className="h-3.5 w-3.5" />
            {QUITTIERUNG_LABELS[meineEmpfaengerInfo.quittierungArt] ?? 'Quittiert'}
          </span>
        )}

        {/* Empfaenger-Status-Badge (Meine Befehle-Modus, WCAG: Icon + Text) */}
        {MeineBefehleStatusIcon && meineBefehleFarben && meineBefehleLabel && (
          <span className={cn('ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-xs', meineBefehleFarben.bg, meineBefehleFarben.text)}>
            <MeineBefehleStatusIcon className="h-3.5 w-3.5" />
            {meineBefehleLabel}
          </span>
        )}
      </div>

      {/* Korrektur-Hinweise */}
      {status === 'KORRIGIERT' && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 font-medium text-amber-800 text-xs dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <PiPencilSimpleLine className="h-3.5 w-3.5 flex-shrink-0" />
          {korrekturBefehlLabel}
        </div>
      )}
      {originalBefehlId && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300">
          <PiArrowBendUpRight className="h-3 w-3 flex-shrink-0" />
          {originalBefehlLabel}
        </div>
      )}

      {/* Auftrag */}
      <p className="mt-2 line-clamp-2 text-gray-700 text-sm dark:text-gray-300">{auftrag}</p>

      {/* Quittierungsfortschritt mit interaktiven Empfaenger-Chips */}
      <div className="mt-3">
        <ZustellstatusAnzeige variant="expanded" empfaenger={empfaenger} interactive={canManageStatus} befehlId={befehlId} onStatusChange={onStatusChange} isKorrigiert={status === 'KORRIGIERT'} />
      </div>

      {/* Untere Zeile: Zeitstempel + Kommentar-Toggle */}
      <div className="mt-2 flex items-center gap-3 text-gray-500 text-xs dark:text-gray-400">
        <time dateTime={erteiltAmDate.toISOString()}>{format(erteiltAmDate, 'dd.MM.yyyy HH:mm')}</time>

        {/* Kommentar-Toggle */}
        {befehlId && einsatzId && (
          <>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowKommentare((prev) => !prev);
              }}
              className={cn('inline-flex items-center gap-1 transition-colors', 'hover:text-gray-700 dark:hover:text-gray-200', showKommentare && 'text-primary-600 dark:text-primary-400')}
            >
              <PiChatCircleDots className="h-3.5 w-3.5" />
              <span>
                {kommentarCount} Kommentar{kommentarCount !== 1 ? 'e' : ''}
              </span>
            </button>
            {offeneRueckfragenCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowKommentare(true);
                  // Nach Render zum Kommentar-Thread scrollen (AC5)
                  requestAnimationFrame(() => {
                    const threadEl = document.getElementById(`befehl-thread-${befehlId}`);
                    threadEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    threadEl?.focus();
                  });
                }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full',
                  'border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-yellow-800',
                  'dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                  'hover:bg-yellow-200 dark:hover:bg-yellow-900/50',
                  'min-h-[48px] min-w-[48px] [@media(pointer:fine)]:min-h-0 [@media(pointer:fine)]:min-w-0',
                )}
                aria-label={`${offeneRueckfragenCount} offene Rückfrage${offeneRueckfragenCount !== 1 ? 'n' : ''} anzeigen`}
              >
                <PiQuestion className="h-3.5 w-3.5" />
                <span>
                  {offeneRueckfragenCount} Rückfrage{offeneRueckfragenCount !== 1 ? 'n' : ''}
                </span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Expliziter Quittieren-Button (WCAG: kein nested interactive im article) */}
      {zeigeQuittierung &&
        befehlId &&
        onQuittieren &&
        (canQuittieren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuittieren(befehlId);
            }}
            className="mt-3 w-full rounded-md bg-yellow-100 py-2 font-medium text-sm text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
          >
            Quittieren
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Nur Empfänger dürfen Befehle quittieren"
            className="mt-3 w-full cursor-not-allowed rounded-md bg-gray-100 py-2 font-medium text-gray-400 text-sm dark:bg-gray-800 dark:text-gray-600"
          >
            Quittieren
          </button>
        ))}

      {/* Kommentar-Thread (expandierbar) */}
      {showKommentare && befehlId && einsatzId && <BefehlKommentarThread befehlId={befehlId} einsatzId={einsatzId} kommentare={kommentare ?? []} />}
    </article>
  );
}
