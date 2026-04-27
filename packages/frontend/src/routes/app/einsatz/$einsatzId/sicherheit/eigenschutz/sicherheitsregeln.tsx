import { SicherheitsregelnPage } from '@/features/eigenschutz/ui/pages/SicherheitsregelnPage';
import { createFileRoute } from '@tanstack/react-router';

/**
 * Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln`
 * (Story 2.6, Task 9.2).
 *
 * Rendert die `SicherheitsregelnPage` für den aktuellen Einsatz. Explizites
 * `component`-Mapping (KEIN reiner `<Outlet/>`) gemäß Lesson-Learned aus
 * Story 2.5: Routen ohne Kind-Routen müssen die Zielkomponente direkt
 * montieren, sonst bleibt der Slot leer.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln')({
  component: SicherheitsregelnRouteComponent,
});

function SicherheitsregelnRouteComponent() {
  const { einsatzId } = Route.useParams();
  return <SicherheitsregelnPage einsatzId={einsatzId} />;
}
