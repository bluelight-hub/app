/**
 * Shared Hooks
 *
 * Feature-unabhängige React Hooks für die Verwendung in der gesamten Anwendung.
 *
 * @example
 * ```typescript
 * import { useColorMode, useConfirm, useIsTauri } from '@/shared/hooks';
 * ```
 */

// Theme
export * from './use-color-mode';

// Dialogs & Confirmation
export { useConfirm, ConfirmProvider } from './useConfirm';

// Platform Detection
export * from './useIsTauri';

// Window Management
export * from './useWindowOrientation';

// Storage & Persistence
export * from './use-store';
