import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/etb')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
