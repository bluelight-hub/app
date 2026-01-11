/**
 * Server Constants Module
 *
 * Exportiert alle Konstanten für das Server-Feature,
 * insbesondere Fehlercodes und Mapping-Funktionen.
 */

export {
  OnboardingErrorCode,
  type OnboardingErrorDetails,
  getOnboardingErrorDetails,
  parseOnboardingErrorCode,
} from './error-codes.constants';
