import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kräfte/fahrzeuge')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/app/einsatz/$einsatzId/kräfte/fahrzeuge"!</div>;
}
