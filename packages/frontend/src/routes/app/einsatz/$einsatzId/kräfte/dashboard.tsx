/**
 * Kräfte-Dashboard Route (Story 6.1d)
 *
 * Zeigt das zentrale Kräfte-Dashboard mit allen drei Widgets:
 * - Taktische Stärke (Story 6.1a)
 * - Fahrzeug-Status Liste (Story 6.1b)
 * - Rollen-Übersicht (Story 6.1c)
 *
 * **AC6:** Route unter `/app/einsatz/$einsatzId/kräfte/dashboard`
 */

import { createFileRoute, useParams } from '@tanstack/react-router';
import { KraefteDashboard } from '@/features/kraefte';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kräfte/dashboard')({
  component: KraefteDashboardRoute,
});

function KraefteDashboardRoute() {
  const { einsatzId } = useParams({
    from: '/app/einsatz/$einsatzId/kräfte/dashboard',
  });

  return (
    <div className="container mx-auto p-4 md:p-6">
      <KraefteDashboard einsatzId={einsatzId} />
    </div>
  );
}
