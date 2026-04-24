import { EigenschutzEntryPage } from '@/features/eigenschutz';
import { Outlet, createFileRoute, useLocation } from '@tanstack/react-router';

/**
 * Layout-Route für den Eigenschutz-Bereich.
 *
 * Rendert den Eigenschutz-Bereich unter dem bereits geladenen Einsatz-
 * Workspace. Das konkrete Eigenschutz-Rollen-/Freigabemodell ist aktuell
 * kein Scope; der Einstieg darf deshalb nicht durch einen zusätzlichen
 * Health-/Scope-Gate blockiert werden.
 *
 * **Warum Layout-Route statt Leaf-Route:** Story 2.1 ergänzt die Dot-
 * Notation-Child-Route `eigenschutz.gefaehrdungen.tsx`; TanStack Router
 * behandelt `eigenschutz.tsx` dadurch automatisch als Parent. Ohne
 * `<Outlet />` würden Child-Routes niemals sichtbar werden.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz')({
  component: EigenschutzRouteComponent,
});

function EigenschutzRouteComponent() {
  const { einsatzId } = Route.useParams();
  const location = useLocation();

  const isEigenschutzRoot = location.pathname.replace(/\/+$/, '').endsWith('/sicherheit/eigenschutz');

  if (isEigenschutzRoot) {
    return <EigenschutzEntryPage einsatzId={einsatzId} />;
  }

  return <Outlet />;
}
