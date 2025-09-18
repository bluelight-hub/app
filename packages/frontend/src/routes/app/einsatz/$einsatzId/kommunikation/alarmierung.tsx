import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kommunikation/alarmierung')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/app/einsatz/$einsatzId/kommunikation/alarmierung"!</div>;
}
