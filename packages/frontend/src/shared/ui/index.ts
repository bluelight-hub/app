/**
 * Shared UI Components
 *
 * Zentrale Exports aller wiederverwendbaren UI-Komponenten nach Atomic Design.
 * Diese Komponenten sind feature-unabhängig und können überall im Frontend verwendet werden.
 *
 * @example
 * ```typescript
 * import { Button, Card, Dialog } from '@/shared/ui';
 * import { Combobox } from '@/shared/ui/headless';
 * import { AuthLayout } from '@/shared/ui/templates';
 * ```
 */

// Atoms - Basis-Komponenten
export * from './atoms';

// Molecules - Kombinierte Komponenten
export * from './molecules';

// Headless UI Wrapper (nicht automatisch exportiert, da spezielle Imports)
export * from './headless';

// Templates - Layout-Templates (nicht automatisch exportiert, da spezielle Imports)
export * from './templates';

// Organisms werden NICHT re-exportiert, da aktuell alle feature-spezifisch sind
// (admin, auth, command-palette, dashboard, einsaetze, einsatz, etb, lagekarte)

// UI Utilities
export * from './cn';
export * from './module-colors';
export * from './timeBasedBackground';
