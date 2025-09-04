import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/einsaetze')({
  component: EinsaetzeLayout,
});

function EinsaetzeLayout() {
  return <Outlet />;
}
