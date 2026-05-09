import { SicherheitsregelnPage } from '@/features/eigenschutz/ui/pages/SicherheitsregelnPage';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

/**
 * Index-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln`
 * (Story 2.6, Task 9.2).
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln/')({
  validateSearch: (search: Record<string, unknown>) => ({
    action: search.action === 'new-sicherheitsregel' ? 'new-sicherheitsregel' : undefined,
  }),
  component: SicherheitsregelnRouteComponent,
});

function SicherheitsregelnRouteComponent() {
  const { einsatzId } = Route.useParams();
  const { action } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <SicherheitsregelnPage
      einsatzId={einsatzId}
      initialAction={action}
      onActionConsumed={() => {
        void (
          navigate as unknown as (opts: {
            to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln/';
            params: { einsatzId: string };
            search: (prev: Record<string, unknown>) => Record<string, unknown>;
            replace: boolean;
          }) => void
        )({
          to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln/',
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
