/**
 * Kräfte-Dashboard Route (Story 6.1d, Story 6.2)
 *
 * Zeigt das zentrale Kräfte-Dashboard mit allen drei Widgets:
 * - Taktische Stärke (Story 6.1a)
 * - Fahrzeug-Status Liste (Story 6.1b)
 * - Rollen-Übersicht (Story 6.1c)
 *
 * **Story 6.2 - Fullscreen & Compact Modus:**
 * - AC1: Fullscreen-Modus für Beamer (3m lesbar)
 * - AC2: Compact-Modus für Tablet
 * - AC5: Mode-Persistenz via localStorage
 *
 * **AC6:** Route unter `/app/einsatz/$einsatzId/kräfte/dashboard`
 */

import { createFileRoute } from '@tanstack/react-router';
import { EinsatzRolleGate } from '@/features/einsatz/ui/molecules/EinsatzRolleGate';
import { KraefteDashboard } from '@/features/kraefte';
import type { DashboardMode } from '@/features/kraefte';

/**
 * Story 6.2 - Search Parameter für Dashboard-Modus.
 *
 * URL-basierte Modi ermöglichen Bookmarks und Sharing.
 * Pattern aus ETB und Lagekarte übernommen.
 */
export type KraefteDashboardSearchParams = {
  mode?: DashboardMode;
};

export const Route = createFileRoute('/app/einsatz/$einsatzId/kräfte/dashboard')({
  validateSearch: (search: Record<string, unknown>): KraefteDashboardSearchParams => {
    const mode = search.mode;
    const validModes: DashboardMode[] = ['standard', 'fullscreen', 'compact'];

    if (mode && validModes.includes(mode as DashboardMode)) {
      return { mode: mode as DashboardMode };
    }

    // AC5: localStorage als Default-Fallback
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('kraefte-dashboard-mode');
      if (savedMode && validModes.includes(savedMode as DashboardMode)) {
        return { mode: savedMode as DashboardMode };
      }
    }

    return { mode: 'standard' };
  },
  component: KraefteDashboardRoute,
});

function KraefteDashboardRoute() {
  const { einsatzId } = Route.useParams();
  const { mode = 'standard' } = Route.useSearch();

  // Fullscreen-Modus: Keine Container-Padding
  if (mode === 'fullscreen') {
    return (
      <EinsatzRolleGate einsatzId={einsatzId}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <KraefteDashboard einsatzId={einsatzId} mode="fullscreen" />
        </div>
      </EinsatzRolleGate>
    );
  }

  return (
    <EinsatzRolleGate einsatzId={einsatzId}>
      <div className="container mx-auto p-4">
        <KraefteDashboard einsatzId={einsatzId} mode={mode} />
      </div>
    </EinsatzRolleGate>
  );
}
