import { EigenschutzEntryPage } from '@/features/eigenschutz';
import { createFileRoute } from '@tanstack/react-router';

/**
 * Index-Route für den Eigenschutz-Bereich (Story 1.6 + 2.1 Task 8).
 *
 * Rendert die `EigenschutzEntryPage`, wenn die URL exakt auf
 * `/sicherheit/eigenschutz` landet. Der Layout-Parent (`../eigenschutz.tsx`)
 * hat den Health-Check bereits durchlaufen — hier geht es nur um den
 * Content-Slot.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/')({
  component: EigenschutzIndexRouteComponent,
});

function EigenschutzIndexRouteComponent() {
  const { einsatzId } = Route.useParams();
  return <EigenschutzEntryPage einsatzId={einsatzId} />;
}
