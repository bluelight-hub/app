import { PiCheck, PiChecks } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import type { QuittierungHaekchenStatus } from '../../lib/befehl-utils';

/** Farbklassen je Quittierungs-Status */
const QUITTIERUNG_FARBEN: Record<QuittierungHaekchenStatus, string> = {
  none: 'text-text-muted',
  partial: 'text-text-muted',
  all_verstanden: 'text-status-success-text',
  mixed: 'text-status-warning-text',
  has_nicht_verstanden: 'text-status-danger-text',
};

/** Lesbare Labels für aria-label */
const QUITTIERUNG_LABELS: Record<QuittierungHaekchenStatus, string> = {
  none: '',
  partial: 'teilweise quittiert',
  all_verstanden: 'alle verstanden',
  mixed: 'gemischte Quittierung',
  has_nicht_verstanden: 'nicht verstanden',
};

interface ZustellHaekchenProps {
  /** Anzahl der Empfänger insgesamt */
  empfaengerGesamt: number;
  /** Anzahl der Empfänger mit zugestelltAm !== null */
  empfaengerZugestellt: number;
  /** Quittierungs-Status für Farbgebung (grün/gelb/rot) */
  quittierungStatus?: QuittierungHaekchenStatus;
  className?: string;
}

/**
 * WhatsApp-Style Zustellhäkchen für Befehle.
 *
 * - ✓ grau: Erteilt (noch nicht alle zugestellt)
 * - ✓✓ grau: Zugestellt (an alle Empfänger)
 * - ✓✓ grün: Alle haben "verstanden" quittiert
 * - ✓✓ gelb: Gemischte Quittierung
 * - ✓✓ rot: Mindestens ein "nicht verstanden"
 */
export function ZustellHaekchen({ empfaengerGesamt, empfaengerZugestellt, quittierungStatus, className }: ZustellHaekchenProps) {
  const alleZugestellt = empfaengerGesamt > 0 && empfaengerZugestellt === empfaengerGesamt;

  const farbKlasse = QUITTIERUNG_FARBEN[quittierungStatus ?? 'none'];

  const quittierungLabel = quittierungStatus ? QUITTIERUNG_LABELS[quittierungStatus] : '';
  const ariaLabel = alleZugestellt
    ? `Zugestellt an alle ${empfaengerGesamt} Empfänger${quittierungLabel ? `, ${quittierungLabel}` : ''}`
    : `Zugestellt an ${empfaengerZugestellt} von ${empfaengerGesamt} Empfängern${quittierungLabel ? `, ${quittierungLabel}` : ''}`;

  return (
    <span role="img" aria-label={ariaLabel} title={ariaLabel} className={cn('inline-flex items-center', farbKlasse, className)}>
      {alleZugestellt ? <PiChecks className="h-5 w-5" aria-hidden="true" /> : <PiCheck className="h-5 w-5" aria-hidden="true" />}
    </span>
  );
}
