import { createFileRoute } from '@tanstack/react-router';
import { VorfallDetailPage } from '@/features/eigenschutz/ui/pages/VorfallDetailPage';

/**
 * Detail-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle/$vorfallId`
 * (Story 5.2 AC12).
 *
 * Mountet die `VorfallDetailPage` mit den Route-Params. Die Page rendert
 * Loading/Error/NotFound-States und delegiert die Snapshot-Anzeige an
 * `IncidentContextSnapshot`.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle/$vorfallId')({
  component: VorfallDetailRouteComponent,
});

function VorfallDetailRouteComponent() {
  const { einsatzId, vorfallId } = Route.useParams();
  return <VorfallDetailPage einsatzId={einsatzId} vorfallId={vorfallId} />;
}
