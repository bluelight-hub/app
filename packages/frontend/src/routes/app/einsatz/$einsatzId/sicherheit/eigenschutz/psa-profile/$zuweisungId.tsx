import { PsaProfilePage } from '@/features/eigenschutz/ui/pages/PsaProfilePage';
import { createFileRoute } from '@tanstack/react-router';

/**
 * Detail-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile/$zuweisungId`.
 *
 * Die Ziel-Page nutzt weiterhin die bestehenden Einheiten- und PSA-Queries.
 * `zuweisungId` ist die echte `PsaProfileByEinheitDto.id` und wird nicht mit
 * `propagationGroupId` vermischt.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile/$zuweisungId')({
  component: PsaZuweisungRouteComponent,
});

function PsaZuweisungRouteComponent() {
  const { einsatzId, zuweisungId } = Route.useParams();
  return <PsaProfilePage einsatzId={einsatzId} focusZuweisungId={zuweisungId} />;
}
