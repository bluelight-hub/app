import { cn } from '@/shared/ui/cn';
import { PiBellRinging, PiCheck, PiCheckCircle, PiClock, PiMoon, PiTrendUp } from 'react-icons/pi';

/**
 * Erinnerung Status Typen (API generiert)
 */
type ErinnerungStatus = 'GEPLANT' | 'AUSGELOEST' | 'ACKNOWLEDGED' | 'SNOOZED' | 'ERLEDIGT' | 'ESKALIERT';

/**
 * Urgency Level für progressive Farbwechsel bei GEPLANT Status
 */
type UrgencyLevel = 'normal' | 'warning' | 'urgent';

/**
 * Intensivierungs-Level für AUSGELOEST Status (Story 2.3)
 */
type IntensityLevel = 'none' | 'warning' | 'urgent';

/**
 * Props für AlarmStateBadge Komponente
 */
interface AlarmStateBadgeProps {
  /** Aktueller Status der Erinnerung */
  status: ErinnerungStatus;
  /** Verbleibende Minuten bis Fälligkeit (nur für GEPLANT relevant) */
  minutesUntilDue?: number;
  /** Größenvariante */
  size?: 'sm' | 'md' | 'lg';
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /**
   * Intensivierungs-Level bei AUSGELOEST Status (Story 2.3)
   *
   * - 'none': Standard-Animation (normales Pulsieren)
   * - 'warning': Schnelleres Pulsieren nach 30s ohne Reaktion
   * - 'urgent': Intensivstes Pulsieren nach 60s (Story 2.4)
   */
  intensityLevel?: IntensityLevel;
  /**
   * Flag ob Audio-Wiedergabe fehlgeschlagen ist (Story 2.8)
   *
   * Wenn true, wird der visuelle Alarm verstärkt:
   * - Animation beschleunigt auf 0.5s
   * - Intensivere rote Farbe
   */
  audioFailed?: boolean;
}

/**
 * Deutsche Status-Labels
 */
const STATUS_LABELS: Record<ErinnerungStatus, string> = {
  GEPLANT: 'Geplant',
  AUSGELOEST: 'Ausgelöst',
  ACKNOWLEDGED: 'Bestätigt',
  SNOOZED: 'Verschoben',
  ERLEDIGT: 'Erledigt',
  ESKALIERT: 'Eskaliert',
};

/**
 * Icon-Mapping für jeden Status
 */
const STATUS_ICONS: Record<ErinnerungStatus, React.ComponentType<{ className?: string }>> = {
  GEPLANT: PiClock,
  AUSGELOEST: PiBellRinging,
  ACKNOWLEDGED: PiCheck,
  SNOOZED: PiMoon,
  ERLEDIGT: PiCheckCircle,
  ESKALIERT: PiTrendUp,
};

/**
 * Farb-Mapping für jeden Status (Light + Dark Mode)
 */
const STATUS_COLORS: Record<ErinnerungStatus, { bg: string; text: string }> = {
  GEPLANT: {
    bg: 'bg-status-success-surface',
    text: 'text-status-success-text',
  },
  AUSGELOEST: {
    bg: 'bg-status-danger-surface',
    text: 'text-status-danger-text',
  },
  ACKNOWLEDGED: {
    bg: 'bg-status-info-surface',
    text: 'text-status-info-text',
  },
  SNOOZED: {
    bg: 'bg-status-warning-surface',
    text: 'text-status-warning-text',
  },
  ERLEDIGT: {
    bg: 'bg-surface-raised',
    text: 'text-text-muted',
  },
  ESKALIERT: {
    bg: 'bg-action-secondary',
    text: 'text-action-primary',
  },
};

/**
 * Progressive Farben für GEPLANT Status basierend auf Urgency Level
 */
const URGENCY_COLORS: Record<UrgencyLevel, { bg: string; text: string }> = {
  normal: {
    bg: 'bg-status-success-surface',
    text: 'text-status-success-text',
  },
  warning: {
    bg: 'bg-status-warning-surface',
    text: 'text-status-warning-text',
  },
  urgent: {
    bg: 'bg-status-danger-surface',
    text: 'text-status-danger-text',
  },
};

/**
 * Intensivierte Farben bei Audio-Ausfall (Story 2.8)
 * Verwendet dunkleres Rot für maximale Aufmerksamkeit ohne Sound
 */
const AUDIO_FAILED_COLORS = {
  bg: 'bg-status-danger-text',
  text: 'text-text-inverse',
};

/**
 * Issue #10 WCAG Fix: Text-Suffixe für Urgency Level (nicht nur Farbe)
 * Stellt sicher, dass Dringlichkeit auch ohne Farbe erkennbar ist.
 */
const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  normal: '',
  warning: ' (bald)',
  urgent: ' (dringend)',
};

/**
 * Größen-Mapping für Badge und Icon
 */
const SIZE_CLASSES = {
  sm: { badge: 'text-xs px-2 py-0.5 gap-1', icon: 'h-3 w-3' },
  md: { badge: 'text-sm px-2.5 py-1 gap-1.5', icon: 'h-4 w-4' },
  lg: { badge: 'text-base px-3 py-1.5 gap-2', icon: 'h-5 w-5' },
};

/**
 * Berechnet Urgency Level basierend auf verbleibenden Minuten
 *
 * - > 5 Minuten: normal (grün)
 * - 2-5 Minuten: warning (gelb)
 * - < 2 Minuten: urgent (orange)
 */
function getUrgencyLevel(minutesUntilDue: number | undefined): UrgencyLevel {
  if (minutesUntilDue === undefined) return 'normal';
  if (minutesUntilDue > 5) return 'normal';
  if (minutesUntilDue >= 2) return 'warning';
  return 'urgent';
}

/**
 * Holt die Farben basierend auf Status, Urgency Level und Audio-Status
 *
 * @param status - Aktueller Erinnerungs-Status
 * @param minutesUntilDue - Verbleibende Minuten (nur für GEPLANT)
 * @param audioFailed - true wenn Audio fehlgeschlagen (Story 2.8)
 */
function getColors(status: ErinnerungStatus, minutesUntilDue?: number, audioFailed?: boolean): { bg: string; text: string } {
  // Story 2.8: Audio-Ausfall = intensiveres Rot bei AUSGELOEST
  if (status === 'AUSGELOEST' && audioFailed) {
    return AUDIO_FAILED_COLORS;
  }

  // Nur GEPLANT bekommt progressive Farbwechsel
  if (status === 'GEPLANT') {
    const urgencyLevel = getUrgencyLevel(minutesUntilDue);
    return URGENCY_COLORS[urgencyLevel];
  }
  return STATUS_COLORS[status];
}

/**
 * Holt die Animations-Klasse basierend auf Status, Intensivierungs-Level und Audio-Status
 *
 * @param status - Aktueller Erinnerungs-Status
 * @param intensityLevel - Aktuelles Intensivierungs-Level
 * @param audioFailed - true wenn Audio-Wiedergabe fehlgeschlagen ist (Story 2.8)
 * @returns Animations-Klassen für Badge und Icon
 */
function getAnimationClasses(status: ErinnerungStatus, intensityLevel: IntensityLevel, audioFailed: boolean): { badge: string; icon: string } {
  // Nur AUSGELOEST bekommt Animationen
  if (status !== 'AUSGELOEST') {
    return { badge: '', icon: '' };
  }

  // Story 2.8 AC2: audioFailed takes precedence over intensity levels
  // When audio is unavailable, we use the most aggressive visual alarm regardless of intensity
  if (audioFailed) {
    return { badge: 'animate-pulse-audio-failed animate-border-glow-urgent', icon: 'animate-bounce' };
  }

  // Story 2.3/2.4: Intensivierte Animationen mit visueller Differenzierung
  if (intensityLevel === 'urgent') {
    // Stufe 2 (Story 2.4): Schnellstes Pulsieren + intensiver Glow
    return { badge: 'animate-pulse-urgent animate-border-glow-urgent', icon: 'animate-bounce' };
  }

  if (intensityLevel === 'warning') {
    // Stufe 1 (Story 2.3): Schnelleres Pulsieren + moderater Glow
    return { badge: 'animate-pulse-fast animate-border-glow', icon: 'animate-bounce' };
  }

  // Standard: Normales Pulsieren
  return { badge: 'animate-pulse', icon: 'animate-bounce' };
}

/**
 * AlarmStateBadge - Visuelles Status-Badge für Erinnerungen
 *
 * Zeigt den aktuellen Status einer Erinnerung mit:
 * - Status-spezifischer Farbe
 * - Passendem Icon
 * - Deutschem Status-Text
 * - Progressive Farbwechsel bei GEPLANT (basierend auf verbleibender Zeit)
 * - Pulse-Animation bei AUSGELOEST
 * - Intensivierte Animation bei Nicht-Reaktion (Story 2.3)
 *
 * @example
 * <AlarmStateBadge status="GEPLANT" minutesUntilDue={3} />
 * <AlarmStateBadge status="AUSGELOEST" />
 * <AlarmStateBadge status="AUSGELOEST" intensityLevel="warning" />
 */
export function AlarmStateBadge({ status, minutesUntilDue, size = 'md', className, intensityLevel = 'none', audioFailed = false }: AlarmStateBadgeProps) {
  const Icon = STATUS_ICONS[status];
  const label = STATUS_LABELS[status];
  const colors = getColors(status, minutesUntilDue, audioFailed);
  const sizeClasses = SIZE_CLASSES[size];
  const animationClasses = getAnimationClasses(status, intensityLevel, audioFailed);

  // Issue #10 WCAG Fix: Text-Indikation der Urgency (nicht nur Farbe)
  const urgencyLevel = status === 'GEPLANT' ? getUrgencyLevel(minutesUntilDue) : 'normal';
  const urgencySuffix = status === 'GEPLANT' ? URGENCY_LABELS[urgencyLevel] : '';

  // H4 Fix: Differenzierter Intensivierungs-Suffix für Screen Reader (Story 2.3/2.4)
  const INTENSITY_LABELS: Record<IntensityLevel, string> = {
    none: '',
    warning: ' (Intensiviert - 30s)',
    urgent: ' (Dringend - 60s)',
  };

  // Story 2.8: Audio-Ausfall Suffix für Screen Reader
  const audioFailedSuffix = audioFailed && status === 'AUSGELOEST' ? ' (Kein Audio!)' : '';
  const intensitySuffix = status === 'AUSGELOEST' && !audioFailed ? INTENSITY_LABELS[intensityLevel] : '';
  const displayLabel = `${label}${urgencySuffix}${intensitySuffix}${audioFailedSuffix}`;

  return (
    <output
      aria-label={`Status: ${displayLabel}`}
      className={cn(
        // Base styles
        'inline-flex items-center rounded-full font-medium',
        // Size
        sizeClasses.badge,
        // Colors
        colors.bg,
        colors.text,
        // Animation (Story 2.3: intensitätsabhängig)
        animationClasses.badge,
        // Custom classes
        className,
      )}
    >
      <Icon className={cn(sizeClasses.icon, animationClasses.icon)} aria-hidden="true" />
      {/* Story 2.3: Visuellen Suffix nur bei Intensivierung anzeigen */}
      {label}
      {urgencySuffix}
    </output>
  );
}
