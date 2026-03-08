import { cn } from '@/shared/ui/cn';
import { isPasswordBlocked, PASSWORD_CRITERIA, PASSWORD_MIN_SCORE } from '@bluelight-hub/shared';
import { useMemo } from 'react';
import { PiWarning } from 'react-icons/pi';
import zxcvbn from 'zxcvbn';
import { ProgressBar } from '../atoms/progress-bar.atom';
import { Text, type TextProps } from '../atoms/text.atom';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
  showLabel?: boolean;
  /**
   * @deprecated NIST SP 800-63B-4 verbietet Composition Rules.
   * Dieser Parameter wird ignoriert - nur noch Länge und zxcvbn-Score werden angezeigt.
   */
  showCriteria?: boolean;
  minScore?: number;
}

/**
 * Konstanten für die Passwort-Stärke-Bewertung
 */
const STRENGTH_THRESHOLDS = {
  STRONG: 4,
  MEDIUM: 2,
  WEAK: 0,
} as const;

const STRENGTH_LABELS = {
  STRONG: 'Stark',
  MEDIUM: 'Mittel',
  WEAK: 'Schwach',
} as const;

const VARIANT_TO_COLOR: Record<'error' | 'warning' | 'success', TextProps['color']> = {
  error: 'error',
  warning: 'warning',
  success: 'success',
};

/**
 * Berechnet die Stärke eines Passworts basierend auf zxcvbn (NIST SP 800-63B-4 konform)
 *
 * NIST-Compliance:
 * - Keine Composition Rules (Groß/Klein/Zahlen/Sonderzeichen)
 * - Nur Länge + zxcvbn Entropie-Analyse
 * - Blocklist-Prüfung für häufige Passwörter
 *
 * @param password - Das zu prüfende Passwort
 * @returns Objekt mit Score, Label, Variant und Blocklist-Status
 *
 * @example
 * ```tsx
 * const strength = calculatePasswordStrength('myPassword123');
 * if (strength.score >= PASSWORD_MIN_SCORE && !strength.isBlocked) {
 *   // Passwort ist akzeptabel
 * }
 * ```
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  variant: 'error' | 'warning' | 'success';
  isBlocked: boolean;
  meetsMinLength: boolean;
} {
  const meetsMinLength = password.length >= PASSWORD_CRITERIA.minLength;
  const isBlocked = isPasswordBlocked(password);

  // zxcvbn Score (0-4) - erkennt automatisch gängige Passwörter und Muster
  const { score: zxScore } = zxcvbn(password);

  // Mapping gemäß Akzeptanzkriterien mit Konstanten
  let label: string;
  let variant: 'error' | 'warning' | 'success';

  // Blocklist-Passwörter sind immer "Schwach"
  if (isBlocked) {
    label = 'Zu häufig';
    variant = 'error';
  } else if (zxScore >= STRENGTH_THRESHOLDS.STRONG) {
    label = STRENGTH_LABELS.STRONG;
    variant = 'success';
  } else if (zxScore >= STRENGTH_THRESHOLDS.MEDIUM) {
    label = STRENGTH_LABELS.MEDIUM;
    variant = 'warning';
  } else {
    label = STRENGTH_LABELS.WEAK;
    variant = 'error';
  }

  return {
    score: zxScore,
    label,
    variant,
    isBlocked,
    meetsMinLength,
  };
}

/**
 * Password Strength Indicator Komponente (NIST SP 800-63B-4 konform)
 *
 * Zeigt die Stärke eines Passworts visuell mit einem Fortschrittsbalken an.
 * Verwendet zxcvbn für die Bewertung - KEINE Composition Rules gemäß NIST.
 *
 * Features:
 * - zxcvbn Entropie-Analyse
 * - Blocklist-Warnung für häufige Passwörter
 * - Mindestlänge-Indikator
 */
export function PasswordStrengthIndicator({ password, className, showLabel = true, showCriteria: _showCriteria = false, minScore = PASSWORD_MIN_SCORE }: PasswordStrengthIndicatorProps) {
  if (_showCriteria) {
    console.warn(
      '[PasswordStrengthIndicator] showCriteria prop is deprecated and will be removed in a future version. ' +
        'NIST SP 800-63B-4 prohibits composition rules. The criteria checklist has been replaced with a strength indicator.',
    );
  }

  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Verstecke den Indikator wenn kein Passwort eingegeben wurde
  if (!password) {
    return null;
  }

  const progressValue = (strength.score / 4) * 100;
  const meetsMinimum = strength.score >= minScore && !strength.isBlocked && strength.meetsMinLength;

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="space-y-1">
        <ProgressBar value={progressValue} max={100} variant={strength.variant} size="sm" animated aria-label={`Passwort-Stärke: ${strength.label}`} />

        {showLabel && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {strength.isBlocked && <PiWarning className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />}
              <Text size="xs" color={VARIANT_TO_COLOR[strength.variant]} className="font-medium">
                {strength.label}
              </Text>
            </div>
            {minScore > 0 && (
              <Text size="xs" color={meetsMinimum ? 'success' : 'muted'}>
                {meetsMinimum ? '✓ Erfüllt' : `Min. Score: ${minScore}/4`}
              </Text>
            )}
          </div>
        )}
      </div>

      {/* Hinweis bei Blocklist-Passwörtern */}
      {strength.isBlocked && (
        <div className="rounded-md bg-red-50 p-2 dark:bg-red-900/20" role="alert">
          <Text size="xs" color="error">
            Dieses Passwort ist zu häufig und nicht erlaubt. Bitte wählen Sie ein einzigartiges Passwort.
          </Text>
        </div>
      )}

      {/* Hinweis bei zu kurzem Passwort */}
      {!strength.meetsMinLength && !strength.isBlocked && (
        <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-900/20" role="alert">
          <Text size="xs" color="warning">
            Mindestens {PASSWORD_CRITERIA.minLength} Zeichen erforderlich.
          </Text>
        </div>
      )}
    </div>
  );
}
