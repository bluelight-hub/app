import { FunkverkehrPage } from '@/features/funkverkehr/ui/pages/FunkverkehrPage';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { z } from 'zod';

// `.catch` fängt fehlende UND ungültige Werte ab (z. B. wenn ein `tab`-Param von
// einer Schwester-Route via `search={(prev) => prev}` durchgereicht wird).
const searchSchema = z.object({
  tab: z.enum(['kanalplan', 'protokoll']).catch('kanalplan'),
});

export const Route = createFileRoute('/app/einsatz/$einsatzId/kommunikation/funk')({
  validateSearch: (search) => searchSchema.parse(search),
  component: FunkverkehrRouteComponent,
});

function FunkverkehrRouteComponent() {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId/kommunikation/funk' });
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: '/app/einsatz/$einsatzId/kommunikation/funk' });

  return (
    <FunkverkehrPage
      einsatzId={einsatzId}
      tab={tab}
      onTabChange={(next) => {
        void navigate({ search: { tab: next } });
      }}
    />
  );
}
