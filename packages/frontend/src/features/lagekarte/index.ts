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
 * ### Vorher (10+ Hooks)
 * ```tsx
 * import { useShapeSelection } from '@/hooks/lagekarte/useShapeSelection';
 * import { useShapeHighlighting } from '@/hooks/lagekarte/useShapeHighlighting';
 * import { useDrawingToolSelection } from '@/hooks/lagekarte/useDrawingToolSelection';
 * // ... 7+ weitere Hooks
 * ```
 *
 * ### Nachher (4 Hooks)
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
