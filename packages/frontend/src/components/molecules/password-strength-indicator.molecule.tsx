import { cn } from '@/utils/cn';
import { ProgressBar } from '@atoms/progress-bar.atom';
import { Text } from '@atoms/text.atom';
import { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
  showLabel?: boolean;
  showCriteria?: boolean;
  minScore?: number;
}

interface PasswordCriterion {
  label: string;
  regex: RegExp;
  met: boolean;
}

/**
 * Berechnet die Stärke eines Passworts basierend auf verschiedenen Kriterien
 */
function calculatePasswordStrength(password: string): {
  score: number;
  criteria: PasswordCriterion[];
  label: string;
  variant: 'error' | 'warning' | 'success';
} {
  const criteria: PasswordCriterion[] = [
    {
      label: 'Mindestens 8 Zeichen',
      regex: /.{8,}/,
      met: false,
    },
    {
      label: 'Kleinbuchstaben',
      regex: /[a-z]/,
      met: false,
    },
    {
      label: 'Großbuchstaben',
      regex: /[A-Z]/,
      met: false,
    },
    {
      label: 'Zahl',
      regex: /[0-9]/,
      met: false,
    },
    {
      label: 'Sonderzeichen',
      regex: /[^a-zA-Z0-9]/,
      met: false,
    },
  ];

  // Prüfe jedes Kriterium
  criteria.forEach((criterion) => {
    criterion.met = criterion.regex.test(password);
  });

  // Berechne Score (0-5)
  const metCount = criteria.filter((c) => c.met).length;

  // Zusätzliche Punkte für Länge
  let score = metCount;
  if (password.length >= 12) score = Math.min(5, score + 0.5);
  if (password.length >= 16) score = Math.min(5, score + 0.5);

  // Bestimme Label und Variante
  let label = 'Sehr schwach';
  let variant: 'error' | 'warning' | 'success' = 'error';

  if (score >= 4) {
    label = 'Stark';
    variant = 'success';
  } else if (score >= 3) {
    label = 'Mittel';
    variant = 'warning';
  } else if (score >= 2) {
    label = 'Schwach';
    variant = 'warning';
  }

  return {
    score,
    criteria,
    label,
    variant,
  };
}

/**
 * Password Strength Indicator Komponente
 *
 * Zeigt die Stärke eines Passworts visuell mit einem Fortschrittsbalken an.
 * Verwendet eine einfache Bewertungslogik basierend auf Passwort-Kriterien.
 */
export function PasswordStrengthIndicator({
  password,
  className,
  showLabel = true,
  showCriteria = false,
  minScore = 0,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Verstecke den Indikator wenn kein Passwort eingegeben wurde
  if (!password) {
    return null;
  }

  const progressValue = (strength.score / 5) * 100;
  const meetsMinimum = strength.score >= minScore;

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="space-y-1">
        <ProgressBar
          value={progressValue}
          max={100}
          variant={strength.variant}
          size="sm"
          animated
          aria-label={`Passwort-Stärke: ${strength.label}`}
        />

        {showLabel && (
          <div className="flex items-center justify-between">
            <Text
              size="xs"
              color={strength.variant === 'error' ? 'error' : strength.variant === 'warning' ? 'warning' : 'success'}
              className="font-medium"
            >
              {strength.label}
            </Text>
            {minScore > 0 && (
              <Text
                size="xs"
                color={meetsMinimum ? 'success' : 'muted'}
              >
                {meetsMinimum ? '✓ Erfüllt' : `Min. Score: ${minScore}/5`}
              </Text>
            )}
          </div>
        )}
      </div>

      {showCriteria && (
        <div
          className="space-y-1 rounded-md bg-gray-50 p-3 dark:bg-gray-800"
          role="list"
          aria-label="Passwort-Kriterien"
        >
          {strength.criteria.map((criterion, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-xs"
              role="listitem"
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-white',
                  criterion.met
                    ? 'bg-green-500 dark:bg-green-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
                aria-hidden="true"
              >
                {criterion.met && (
                  <svg
                    className="h-2.5 w-2.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              <Text
                size="xs"
                color={criterion.met ? 'default' : 'muted'}
                className={cn(
                  'transition-colors',
                  criterion.met && 'font-medium'
                )}
              >
                {criterion.label}
              </Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}