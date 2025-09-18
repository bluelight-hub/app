import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/übersicht/karte')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();
  return <div>Hello "/app/einsatz/$einsatzId/karte"! for einsatz ${einsatzId}</div>;
}
