import { PsaProfilePage } from '@/features/eigenschutz/ui/pages/PsaProfilePage';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

/**
 * Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile`
 * (Story 3.1, Task 5.4).
 *
 * Rendert die `PsaProfilePage` für den aktuellen Einsatz. Kein eigener
 * Outlet (Lessons aus Story 2.5: Routen ohne Kind-Routen müssen die
 * Zielkomponente direkt montieren, sonst bleibt der Slot leer).
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile')({
  validateSearch: (search: Record<string, unknown>) => {
    const einheitId = typeof search.einheitId === 'string' && search.einheitId.trim().length > 0 ? search.einheitId : undefined;
    return {
      focusGroup: typeof search.focusGroup === 'string' && search.focusGroup.trim().length > 0 ? search.focusGroup : undefined,
      einheitId,
      action: search.action === 'psa-change' && einheitId ? 'psa-change' : undefined,
    };
  },
  component: PsaProfileRouteComponent,
});

function PsaProfileRouteComponent() {
  const { einsatzId } = Route.useParams();
  const { focusGroup, einheitId, action } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <PsaProfilePage
      einsatzId={einsatzId}
      focusGroup={focusGroup}
      focusEinheitId={einheitId}
      initialAction={action}
      onActionConsumed={() => {
        void (
          navigate as unknown as (opts: {
            to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile';
            params: { einsatzId: string };
            search: (prev: Record<string, unknown>) => Record<string, unknown>;
            replace: boolean;
          }) => void
        )({
          to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile',
          params: { einsatzId },
          search: (prev) => {
            const next = { ...prev };
            delete next.action;
            return next;
          },
          replace: true,
        });
      }}
    />
  );
}
