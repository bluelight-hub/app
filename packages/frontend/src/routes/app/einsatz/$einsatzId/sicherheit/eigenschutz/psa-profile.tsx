import { Outlet, createFileRoute } from '@tanstack/react-router';

/**
 * Layout-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile`.
 *
 * Sobald die PSA-Fläche Detail-Kindrouten besitzt, muss der Parent nur noch den
 * Outlet-Slot bereitstellen. Die Übersicht selbst liegt unter `./index.tsx`.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile')({
  component: PsaProfileLayout,
});

function PsaProfileLayout() {
  return <Outlet />;
}
