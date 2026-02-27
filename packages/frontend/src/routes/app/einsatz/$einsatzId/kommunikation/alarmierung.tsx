import { ComingSoon } from '@/shared/ui/atoms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kommunikation/alarmierung')({
  component: () => <ComingSoon title="Alarmierung" description="Nachalarmierung und Alarmierungsübersicht." />,
});
