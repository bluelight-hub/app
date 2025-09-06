import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsaetze')({
  component: EinsaetzeLayout,
});

function EinsaetzeLayout() {
  return <Outlet />;
}
