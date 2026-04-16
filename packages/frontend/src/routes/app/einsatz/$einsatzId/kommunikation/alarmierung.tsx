import { AlarmierungPage } from '@/features/alarmierung/ui/pages/AlarmierungPage';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { z } from 'zod';

const searchSchema = z.object({
  tab: z.enum(['liste', 'timeline']).optional().default('liste'),
});

export const Route = createFileRoute('/app/einsatz/$einsatzId/kommunikation/alarmierung')({
  validateSearch: (search) => searchSchema.parse(search),
  component: AlarmierungRouteComponent,
});

function AlarmierungRouteComponent() {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId/kommunikation/alarmierung' });
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: '/app/einsatz/$einsatzId/kommunikation/alarmierung' });

  return (
    <AlarmierungPage
      einsatzId={einsatzId}
      tab={tab}
      onTabChange={(next) => {
        void navigate({ search: { tab: next } });
      }}
    />
  );
}
