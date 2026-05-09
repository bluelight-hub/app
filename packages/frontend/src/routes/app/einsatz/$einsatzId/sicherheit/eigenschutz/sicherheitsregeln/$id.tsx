import { SicherheitsregelnPage } from '@/features/eigenschutz/ui/pages/SicherheitsregelnPage';
import { createFileRoute } from '@tanstack/react-router';

/**
 * Detail-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln/$id`.
 *
 * Öffnet die bestehende Sicherheitsregeln-Liste und fokussiert die Regel über
 * den vorhandenen `SicherheitsregelDrawer`; es gibt keine parallele
 * Detail-Implementierung.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln/$id')({
  component: SicherheitsregelDetailRouteComponent,
});

function SicherheitsregelDetailRouteComponent() {
  const { einsatzId, id } = Route.useParams();
  return <SicherheitsregelnPage einsatzId={einsatzId} focusRegelId={id} />;
}
