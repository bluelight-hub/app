/**
 * Server Utility Exports
 *
 * @module features/server/utils
 */

export { getHostSafe } from './url';

// Server Color Utilities
export {
  SERVER_COLOR_PRESETS,
  type ServerColorPreset,
  type ServerColorValue,
  type ColorVariant,
  isValidServerColor,
  getServerColorClass,
  getServerColorHex,
  getDefaultServerColor,
} from './server-color.utils';

// Server Icon Utilities
export { isValidServerIcon, getServerIconComponent, getDefaultServerIcon, getServerIconName, getServerIconPreset } from './server-icon.utils';
