import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz')({
  component: EinsatzLayout,
});

function EinsatzLayout() {
  return <Outlet />;
}
