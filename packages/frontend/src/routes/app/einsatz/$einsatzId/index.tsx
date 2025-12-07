import { SingleEinsatzDashboard } from '@/features/einsatz/ui/organisms/SingleEinsatzDashboard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/')({
  component: SingleEinsatzDashboard,
});
