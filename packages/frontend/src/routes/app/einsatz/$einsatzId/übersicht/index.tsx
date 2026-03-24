import { useEinsatzRolleContext } from '@/features/einsatz/contexts';
import { SecondaryRoleDashboard } from '@/features/einsatz/ui/organisms/SecondaryRoleDashboard';
import { SingleEinsatzDashboard } from '@/features/einsatz/ui/organisms/SingleEinsatzDashboard';
import { createFileRoute, useParams } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/übersicht/')({
  component: OverviewRouteComponent,
});

/** Story 5.5: Sekundaere Rollen sehen reduziertes Dashboard (via Layout-Context) */
function OverviewRouteComponent() {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId' });
  const { meineRolle } = useEinsatzRolleContext();

  if (meineRolle?.permissions?.isSecondaryRole) {
    return <SecondaryRoleDashboard einsatzId={einsatzId} rolle={meineRolle.rolle} />;
  }

  return <SingleEinsatzDashboard />;
}
