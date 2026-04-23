import { GefaehrdungenPage } from '@/features/eigenschutz';
import { createFileRoute } from '@tanstack/react-router';

/**
 * Listen-/Create-Route für Gefährdungsbeurteilungen (Story 2.1 Task 8).
 *
 * Liegt unter der Layout-Route `../gefaehrdungen.tsx`; rendert die
 * `GefaehrdungenPage` mit Primary-Button (Permission-gated, siehe AC5),
 * dem `GefaehrdungseditorDrawer` und dem Empty-State-Platzhalter.
 * Navigation nach erfolgreicher Erstellung geht an
 * `../gefaehrdungen/$id` (Detail-Stub; echte Item-Erfassung folgt Story 2.2).
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/')({
  component: GefaehrdungenIndexRoute,
});

function GefaehrdungenIndexRoute() {
  const { einsatzId } = Route.useParams();
  return <GefaehrdungenPage einsatzId={einsatzId} />;
}
