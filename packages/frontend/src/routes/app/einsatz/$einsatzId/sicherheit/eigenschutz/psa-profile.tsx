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
  validateSearch: (search: Record<string, unknown>) => ({
    focusGroup: typeof search.focusGroup === 'string' && search.focusGroup.trim().length > 0 ? search.focusGroup : undefined,
    einheitId: typeof search.einheitId === 'string' && search.einheitId.trim().length > 0 ? search.einheitId : undefined,
  }),
  component: PsaProfileRouteComponent,
});

function PsaProfileRouteComponent() {
  const { einsatzId } = Route.useParams();
  const { focusGroup, einheitId } = Route.useSearch();
  return <PsaProfilePage einsatzId={einsatzId} focusGroup={focusGroup} focusEinheitId={einheitId} />;
}
