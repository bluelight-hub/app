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
 * // Utils
 * import { cn, logger, getApiErrorMessage } from '@/shared/utils';
 *
 * // API
 * import { api } from '@/shared/api/client';
 * ```
 */

// UI Components (Atomic Design)
export * from './ui';

// Hooks
export * from './hooks';

// Utilities
export * from './utils';

// API Client
export * from './api/client';
