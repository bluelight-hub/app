import { cn } from '@/utils/cn';
import { ProgressBar } from '@atoms/progress-bar.atom';
import { Text } from '@atoms/text.atom';
import { useMemo } from 'react';
import zxcvbn from 'zxcvbn';

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
 * Berechnet die Stärke eines Passworts basierend auf zxcvbn
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

  // zxcvbn Score (0-4)
  const { score: zxScore } = zxcvbn(password);

  // Mapping gemäß Akzeptanzkriterien
  let label: string;
  let variant: 'error' | 'warning' | 'success';

  if (zxScore >= 4) {
    label = 'Stark';
    variant = 'success';
  } else if (zxScore >= 2) {
    label = 'Mittel';
    variant = 'warning';
  } else {
    label = 'Schwach';
    variant = 'error';
  }

  return {
    score: zxScore,
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
export function PasswordStrengthIndicator({ password, className, showLabel = true, showCriteria = false, minScore = 0 }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Verstecke den Indikator wenn kein Passwort eingegeben wurde
  if (!password) {
    return null;
  }

  const progressValue = (strength.score / 4) * 100;
  const meetsMinimum = strength.score >= minScore;

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="space-y-1">
        <ProgressBar value={progressValue} max={100} variant={strength.variant} size="sm" animated aria-label={`Passwort-Stärke: ${strength.label}`} />

        {showLabel && (
          <div className="flex items-center justify-between">
            <Text size="xs" color={strength.variant === 'error' ? 'error' : strength.variant === 'warning' ? 'warning' : 'success'} className="font-medium">
              {strength.label}
            </Text>
            {minScore > 0 && (
              <Text size="xs" color={meetsMinimum ? 'success' : 'muted'}>
                {meetsMinimum ? '✓ Erfüllt' : `Min. Score: ${minScore}/4`}
              </Text>
            )}
          </div>
        )}
      </div>

      {showCriteria && (
        <ul className="space-y-1 rounded-md bg-gray-50 p-3 dark:bg-gray-800" aria-label="Passwort-Kriterien">
          {strength.criteria.map((criterion) => (
            <li key={criterion.label} className="flex items-center gap-2 text-xs">
              <span
                className={cn('flex h-4 w-4 items-center justify-center rounded-full text-white', criterion.met ? 'bg-green-500 dark:bg-green-600' : 'bg-gray-300 dark:bg-gray-600')}
                aria-hidden="true"
              >
                {criterion.met && (
                  <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20" aria-label="Erfüllt">
                    <title>Erfüllt</title>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <Text size="xs" color={criterion.met ? 'default' : 'muted'} className={cn('transition-colors', criterion.met && 'font-medium')}>
                {criterion.label}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
