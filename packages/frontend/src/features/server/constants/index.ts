/**
 * Server Constants Module
 *
 * Exportiert alle Konstanten für das Server-Feature,
 * insbesondere Fehlercodes, Mapping-Funktionen und Icon-Presets.
 */

export {
  OnboardingErrorCode,
  type OnboardingErrorDetails,
  getOnboardingErrorDetails,
  parseOnboardingErrorCode,
} from './error-codes.constants';

export {
  SERVER_ICON_PRESETS,
  DEFAULT_SERVER_ICON,
  type ServerIconProps,
  type ServerIconComponent,
  type ServerIconValue,
  type ServerIconPreset,
} from './server-icons';
