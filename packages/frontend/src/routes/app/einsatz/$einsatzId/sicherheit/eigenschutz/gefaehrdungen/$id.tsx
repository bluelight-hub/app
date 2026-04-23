import { GefaehrdungenDetailPage } from '@/features/eigenschutz';
import { createFileRoute } from '@tanstack/react-router';

/**
 * Detail-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id`.
 *
 * Story 2.2 ersetzt den Stub durch die vollständige Item-Erfassung mit
 * 5×5-Risikomatrix. Die Route delegiert die komplette Rendering-Logik an
 * `GefaehrdungenDetailPage`, damit die Page unabhängig von TanStack-Router
 * in Storybook / Specs gerendert werden kann.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id')({
  component: GefaehrdungenDetailPageRoute,
});

function GefaehrdungenDetailPageRoute() {
  const { einsatzId, id } = Route.useParams();
  return <GefaehrdungenDetailPage einsatzId={einsatzId} id={id} />;
}
