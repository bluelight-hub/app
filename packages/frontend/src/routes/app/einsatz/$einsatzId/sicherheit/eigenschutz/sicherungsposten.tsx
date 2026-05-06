import { createFileRoute } from '@tanstack/react-router';
import { SicherungspostenPage } from '@/features/eigenschutz/ui/pages/SicherungspostenPage';

/**
 * Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten`
 * (Story 4.1, T6).
 *
 * Mountet die `SicherungspostenPage` für den aktuellen Einsatz.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten')({
  component: SicherungspostenRouteComponent,
});

function SicherungspostenRouteComponent() {
  const { einsatzId } = Route.useParams();
  return <SicherungspostenPage einsatzId={einsatzId} />;
}
