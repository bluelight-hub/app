import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/befehle')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/app/einsatz/$einsatzId/führung/befehle"!</div>;
}
