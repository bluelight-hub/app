/**
 * useIntegrationStatus Hook
 *
 * Verwaltet den Status externer Integrationen (Circuit Breaker States)
 * via WebSocket Events und TanStack Store.
 *
 * **Story 5.3 AC5/AC6:**
 * - Empfaengt `integration.status_changed` Events via bestehende WebSocket-Verbindung
 * - Speichert Status in TanStack Store (kein Server State → kein Query Cache)
 * - Auto-Dismiss bei Circuit Close
 *
 * @module features/befehl/api
 */

import { Store, useStore } from '@tanstack/react-store';

// ============================================
// Types
// ============================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface IntegrationStatus {
  serviceName: string;
  state: CircuitState;
  timestamp: string;
}

export interface IntegrationStatusStoreState {
  /** Map von ServiceName → Status */
  integrations: Record<string, IntegrationStatus>;
}

// ============================================
// Store
// ============================================

export const integrationStatusStore = new Store<IntegrationStatusStoreState>({
  integrations: {},
});

// ============================================
// Store Actions
// ============================================

/** Aktualisiert den Status einer Integration */
export const updateIntegrationStatus = (status: IntegrationStatus): void => {
  integrationStatusStore.setState((state) => ({
    ...state,
    integrations: {
      ...state.integrations,
      [status.serviceName]: status,
    },
  }));
};

/** Setzt alle Integration-Status zurueck */
export const resetIntegrationStatus = (): void => {
  integrationStatusStore.setState(() => ({ integrations: {} }));
};

// ============================================
// Hooks
// ============================================

/**
 * Hook fuer alle Integration-Status.
 * @returns Array aller degradierten (OPEN/HALF_OPEN) Integrationen
 */
export function useDegradedIntegrations(): IntegrationStatus[] {
  const integrations = useStore(integrationStatusStore, (state) => state.integrations);
  return Object.values(integrations).filter((s) => s.state === 'OPEN' || s.state === 'HALF_OPEN');
}

/**
 * Hook der prueft ob mindestens eine Integration degradiert ist.
 */
export function useHasDegradedIntegrations(): boolean {
  const integrations = useStore(integrationStatusStore, (state) => state.integrations);
  return Object.values(integrations).some((s) => s.state === 'OPEN' || s.state === 'HALF_OPEN');
}
