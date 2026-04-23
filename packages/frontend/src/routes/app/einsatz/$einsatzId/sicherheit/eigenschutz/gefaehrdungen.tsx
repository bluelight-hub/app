import { Outlet, createFileRoute } from '@tanstack/react-router';

/**
 * Layout-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen`
 * (Story 2.1 Task 8).
 *
 * Die Parent-Route rendert ausschließlich `<Outlet />`, damit die Geschwister-
 * Routen `./index.tsx` (Listen-/Create-Seite) und `./$id.tsx` (Detail-Stub
 * für Story 2.2) sichtbar werden. Die Layout-Trennung ist in TanStack
 * File-Based-Routing erforderlich, sobald eine geteilte Route mehrere Kinder
 * bekommt — analog zur Layout-Umstellung bei `../eigenschutz.tsx` und zum
 * Muster `führung/etb.tsx` + `führung/etb/index.tsx`.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen')({
  component: GefaehrdungenLayout,
});

function GefaehrdungenLayout() {
  return <Outlet />;
}
