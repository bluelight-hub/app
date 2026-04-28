import { PsaProfilePage } from '@/features/eigenschutz/ui/pages/PsaProfilePage';
import { createFileRoute } from '@tanstack/react-router';

/**
 * Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile`
 * (Story 3.1, Task 5.4).
 *
 * Rendert die `PsaProfilePage` für den aktuellen Einsatz. Kein eigener
 * Outlet (Lessons aus Story 2.5: Routen ohne Kind-Routen müssen die
 * Zielkomponente direkt montieren, sonst bleibt der Slot leer).
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile')({
  component: PsaProfileRouteComponent,
});

function PsaProfileRouteComponent() {
  const { einsatzId } = Route.useParams();
  return <PsaProfilePage einsatzId={einsatzId} />;
}
