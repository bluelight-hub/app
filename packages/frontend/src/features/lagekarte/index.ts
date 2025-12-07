/**
 * Lagekarte Feature Module
 *
 * Konsolidierte Feature-Struktur für Lagekarte mit zentralem State Management.
 *
 * ## Architektur
 *
 * - **stores/** - TanStack Store für zentralen State
 * - **api/** - TanStack Query Hooks für Backend-Kommunikation
 * - **hooks/** - Business Logic Hooks (Shape Actions, Drawing Tools)
 *
 * ## Migration von alten Hooks
 *
 * Siehe HOOK-ANALYSIS.md für Details zur Konsolidierung.
 *
 * ### Legacy Hooks (in hooks/legacy/)
 * ```tsx
 * // Noch von DrawingLayer.tsx verwendet - TODO: migrieren
 * import { useShapeSelection, ... } from '@/features/lagekarte/hooks/legacy';
 * ```
 *
 * ### Neue Hooks (empfohlen)
 * ```tsx
 * import { useLagekarteState, useShapeActions, useDrawingTools } from '@/features/lagekarte';
 * ```
 */

// API Exports
export * from './api';

// Store Exports
export * from './stores';

// Hook Exports
export * from './hooks';

// Utils Exports
export * from './utils';

// UI Exports
export * from './ui';
