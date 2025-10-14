import { LagekarteView } from '@organisms/lagekarte/LagekarteView/LagekarteView';
import { createFileRoute } from '@tanstack/react-router';
import 'leaflet/dist/leaflet.css';

export const Route = createFileRoute('/app/einsatz/$einsatzId/übersicht/karte')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();

  return <LagekarteView einsatzId={einsatzId} />;
}
