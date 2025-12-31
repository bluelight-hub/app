/**
 * Kräfte Feature - Public API
 *
 * Zentrale Export-Datei für das gesamte Kräfte-Feature.
 * Definiert die öffentliche API und kapselt interne Implementierungen.
 *
 * **Story 6.1a - Taktische Stärke-Anzeige:**
 * - useTaktischeStaerke Hook für Dashboard
 * - StaerkeCard Komponente für Darstellung
 * - KRAEFTE_QUERY_KEYS für Cache-Invalidierung
 *
 * **Story 6.1b - Fahrzeug-Status Liste:**
 * - useEinsatzFahrzeuge Hook für Fahrzeug-Abfrage
 * - FahrzeugCard Komponente für einzelne Fahrzeuge
 * - FahrzeugStatusListe Container für alle Fahrzeuge
 *
 * **Story 6.1c - Rollen-Übersicht:**
 * - useRollenBesetzungen Hook für Rollen-Abfrage
 * - useBesetzeRolle, useFreigebeRolle Mutation Hooks
 * - RollenKarte Komponente für einzelne Rollen
 * - RollenUebersicht Container für alle Rollen
 * - BesetzeRolleDialog, FreigebeRolleDialog für Interaktionen
 *
 * **Story 6.2 - Fullscreen & Compact Modus:**
 * - DashboardModeContext für Mode-Propagation ohne Prop-Drilling
 * - useDashboardMode Hook für Mode-spezifische Styles in Child-Komponenten
 */

// ============================================
// Contexts (Story 6.2)
// ============================================
export {
  DashboardModeProvider,
  useDashboardMode,
  type DashboardMode,
} from './contexts';

// ============================================
// API Layer (Queries & Mutations)
// ============================================
export {
  // Query Keys & Utilities
  KRAEFTE_QUERY_KEYS,
  calculateRetryDelay,
  // Query Hooks
  useTaktischeStaerke,
  type TaktischeStaerke,
  useEinsatzFahrzeuge,
  useRollenBesetzungen,
  // Mutation Hooks (Story 6.1c)
  useBesetzeRolle,
  useFreigebeRolle,
} from './api';

// ============================================
// UI Components
// ============================================
export {
  // Story 6.1a
  StaerkeCard,
  // Story 6.1b
  FahrzeugCard,
  FahrzeugStatusListe,
  // Story 6.1c
  RollenKarte,
  RollenKarteSkeleton,
  RollenUebersicht,
  BesetzeRolleDialog,
  FreigebeRolleDialog,
  // Story 6.1d - Dashboard Page
  KraefteDashboard,
} from './ui';
