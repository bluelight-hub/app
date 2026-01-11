/**
 * OnboardingErrorCard Komponente
 *
 * Generische Fehleranzeige-Komponente für den Onboarding-Prozess.
 * Unterstützt verschiedene Fehlertypen mit passender Darstellung
 * (Inline oder Fullscreen) basierend auf Schweregrad.
 *
 * @module server/ui/molecules/OnboardingErrorCard
 */

import { getOnboardingErrorDetails } from '../../constants/error-codes.constants';
import { cn } from '@/shared/ui/cn';
import { PiWarningFill, PiXCircleFill } from 'react-icons/pi';

/**
 * Props für die OnboardingErrorCard Komponente
 */
export interface OnboardingErrorCardProps {
  /** Fehlercode aus OnboardingErrorCode enum */
  errorCode: string;
  /** Optionaler Override für den Fehlertitel */
  title?: string;
  /** Optionaler Override für die Fehlermeldung */
  message?: string;
  /** Optionaler Override für den CTA-Text */
  cta?: string;
  /** Callback für Wiederholungsversuche */
  onRetry?: () => void;
  /** Callback für manuelle Server-Einrichtung */
  onManualSetup?: () => void;
  /** Admin-Kontaktinformation */
  adminContact?: string;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * OnboardingErrorCard - Generische Fehleranzeige für Onboarding
 *
 * Zeigt Fehlermeldungen basierend auf dem Fehlercode an.
 * Unterstützt Fullscreen-Modus für kritische Fehler und
 * Inline-Modus für weniger kritische Meldungen.
 *
 * @example
 * ```tsx
 * <OnboardingErrorCard
 *   errorCode="INVITE_EXPIRED"
 *   onManualSetup={() => navigate('/server/manual')}
 *   adminContact="admin@example.com"
 * />
 * ```
 */
export function OnboardingErrorCard({ errorCode, title, message, cta, onRetry, onManualSetup, adminContact, className }: OnboardingErrorCardProps) {
  const errorDetails = getOnboardingErrorDetails(errorCode);

  // Verwende Override-Props falls vorhanden, sonst Defaults aus errorDetails
  const displayTitle = title ?? errorDetails.title;
  const displayMessage = message ?? errorDetails.message;
  const displayCta = cta ?? errorDetails.cta;

  const isError = errorDetails.severity === 'error';
  const showRetryButton = onRetry && errorDetails.retryable;

  // Style-Varianten basierend auf Schweregrad
  const severityStyles = {
    error: {
      container: 'border-red-200 bg-red-50',
      icon: 'text-red-600',
      title: 'text-red-800',
      message: 'text-red-700',
      cta: 'text-red-700',
      primaryButton: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      secondaryButton: 'border-red-300 text-red-700 hover:bg-red-100 focus:ring-red-500',
    },
    warning: {
      container: 'border-yellow-200 bg-yellow-50',
      icon: 'text-yellow-600',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      cta: 'text-yellow-700',
      primaryButton: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
      secondaryButton: 'border-yellow-300 text-yellow-700 hover:bg-yellow-100 focus:ring-yellow-500',
    },
  };

  const styles = severityStyles[errorDetails.severity];

  // Icon basierend auf Schweregrad
  const Icon = isError ? PiXCircleFill : PiWarningFill;

  // Render-Funktion für Action-Buttons
  const renderActionButtons = (fullscreen: boolean) => {
    const hasActions = showRetryButton || onManualSetup;
    if (!hasActions) return null;

    const buttonBaseClasses = fullscreen
      ? 'rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
      : 'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

    return (
      <div className={cn('flex gap-3', fullscreen ? 'mt-6' : 'mt-4')} data-testid="action-buttons">
        {showRetryButton && (
          <button type="button" onClick={onRetry} className={cn(buttonBaseClasses, styles.primaryButton)} data-testid="retry-button">
            Erneut versuchen
          </button>
        )}
        {onManualSetup && (
          <button type="button" onClick={onManualSetup} className={cn(buttonBaseClasses, 'border', showRetryButton ? styles.secondaryButton : styles.primaryButton)} data-testid="manual-setup-button">
            Manuell einrichten
          </button>
        )}
      </div>
    );
  };

  // Render-Funktion für Admin-Kontakt
  const renderAdminContact = () => {
    if (!adminContact) return null;

    return (
      <p className={cn('mt-3 text-sm', styles.message)} data-testid="admin-contact">
        Administrator kontaktieren: <span className="font-medium">{adminContact}</span>
      </p>
    );
  };

  // Fullscreen-Layout für kritische Fehler
  if (errorDetails.fullscreen) {
    return (
      <div
        className={cn('flex min-h-[400px] items-center justify-center p-4', className)}
        role="alert"
        aria-live="assertive"
        data-testid="onboarding-error-card"
        data-error-code={errorCode}
        data-layout="fullscreen"
      >
        <div className={cn('w-full max-w-md rounded-lg border p-6 shadow-lg', styles.container)}>
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <Icon className={cn('h-12 w-12', styles.icon)} aria-hidden="true" data-testid="error-icon" />
          </div>

          {/* Title */}
          <h2 className={cn('text-center font-semibold text-lg', styles.title)} data-testid="error-title">
            {displayTitle}
          </h2>

          {/* Message */}
          <p className={cn('mt-2 text-center text-sm', styles.message)} data-testid="error-message">
            {displayMessage}
          </p>

          {/* CTA Text */}
          <p className={cn('mt-4 text-center text-sm', styles.cta)} data-testid="error-cta">
            {displayCta}
          </p>

          {/* Admin Contact */}
          {adminContact && (
            <p className={cn('mt-3 text-center text-sm', styles.message)} data-testid="admin-contact">
              Administrator kontaktieren: <span className="font-medium">{adminContact}</span>
            </p>
          )}

          {/* Action Buttons */}
          {(showRetryButton || onManualSetup) && (
            <div className="mt-6 flex justify-center gap-3" data-testid="action-buttons">
              {showRetryButton && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={cn('rounded-md px-4 py-2 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2', styles.primaryButton)}
                  data-testid="retry-button"
                >
                  Erneut versuchen
                </button>
              )}
              {onManualSetup && (
                <button
                  type="button"
                  onClick={onManualSetup}
                  className={cn(
                    'rounded-md border px-4 py-2 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                    showRetryButton ? styles.secondaryButton : styles.primaryButton,
                  )}
                  data-testid="manual-setup-button"
                >
                  Manuell einrichten
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline-Layout für weniger kritische Fehler
  return (
    <div
      className={cn('flex gap-3 rounded-lg border p-4', styles.container, className)}
      role="alert"
      aria-live="polite"
      data-testid="onboarding-error-card"
      data-error-code={errorCode}
      data-layout="inline"
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <Icon className={cn('h-5 w-5', styles.icon)} aria-hidden="true" data-testid="error-icon" />
      </div>

      {/* Content */}
      <div className="flex-1">
        {/* Title */}
        <h3 className={cn('font-medium text-sm', styles.title)} data-testid="error-title">
          {displayTitle}
        </h3>

        {/* Message */}
        <p className={cn('mt-1 text-sm', styles.message)} data-testid="error-message">
          {displayMessage}
        </p>

        {/* CTA Text */}
        <p className={cn('mt-2 text-sm', styles.cta)} data-testid="error-cta">
          {displayCta}
        </p>

        {/* Admin Contact */}
        {renderAdminContact()}

        {/* Action Buttons */}
        {renderActionButtons(false)}
      </div>
    </div>
  );
}
