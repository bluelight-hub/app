import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SicherungspostenPage } from '@/features/eigenschutz/ui/pages/SicherungspostenPage';

/**
 * Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten`
 * (Story 4.1, T6).
 *
 * Mountet die `SicherungspostenPage` für den aktuellen Einsatz.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten')({
  validateSearch: (search: Record<string, unknown>) => ({
    action: search.action === 'new-sicherungsposten' ? 'new-sicherungsposten' : undefined,
  }),
  component: SicherungspostenRouteComponent,
});

function SicherungspostenRouteComponent() {
  const { einsatzId } = Route.useParams();
  const { action } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <SicherungspostenPage
      einsatzId={einsatzId}
      initialAction={action}
      onActionConsumed={() => {
        void (
          navigate as unknown as (opts: {
            to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten';
            params: { einsatzId: string };
            search: (prev: Record<string, unknown>) => Record<string, unknown>;
            replace: boolean;
          }) => void
        )({
          to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten',
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
