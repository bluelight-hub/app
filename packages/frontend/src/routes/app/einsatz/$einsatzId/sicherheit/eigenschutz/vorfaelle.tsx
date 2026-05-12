import { Outlet, createFileRoute } from '@tanstack/react-router';

/**
 * Layout-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle`.
 *
 * Sobald `vorfaelle/$vorfallId.tsx` (Story 5.2) als Kind existiert, behandelt
 * TanStack File-Based-Routing `vorfaelle.tsx` automatisch als Parent — ohne
 * `<Outlet />` würden Detail-Klicks der Vorfall-Liste „ins Leere" navigieren.
 * Listen-/Filter-Seite liegt deshalb in `vorfaelle/index.tsx`; analog
 * `gefaehrdungen.tsx` und `führung/etb.tsx`.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle')({
  component: VorfaelleLayout,
});

function VorfaelleLayout() {
  return <Outlet />;
}
