import { FunkverkehrPage } from '@/features/funkverkehr/ui/pages/FunkverkehrPage';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { z } from 'zod';

const searchSchema = z.object({
  tab: z.enum(['kanalplan', 'protokoll']).optional().default('kanalplan'),
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
