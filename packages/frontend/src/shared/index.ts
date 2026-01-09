/**
 * Shared Module - Zentrale Exports
 *
 * Dieses Modul exportiert alle wiederverwendbaren, feature-unabhängigen Komponenten,
 * Hooks, Utilities und Services der Anwendung.
 *
 * Struktur nach Atomic Design:
 * - UI Components: atoms, molecules (organisms sind feature-spezifisch)
 * - Hooks: Wiederverwendbare React Hooks
 * - Utils: Utility-Funktionen
 * - API: Backend-API-Client
 *
 * @example
 * ```typescript
 * // UI Components
 * import { Button, Card, Dialog } from '@/shared/ui';
 *
 * // Hooks
 * import { useColorMode, useConfirm } from '@/shared/hooks';
 *
 * // Utils & Library Functions
 * import { cn, logger, getApiErrorMessage, formatNatoDateTime } from '@/shared/lib';
 * import { getCurrentBackgroundImage } from '@/shared/ui';
 *
 * // API
 * import { api } from '@bluelight-hub/shared/client';
 * ```
 */

// UI Components (Atomic Design)
export * from './ui';

// Hooks
export * from './hooks';

// Library Utilities
export * from './lib';

// API Client
export * from './api/client';
