import { SingleEinsatzDashboard } from '@organisms/einsatz/SingleEinsatzDashboard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/')({
  component: SingleEinsatzDashboard,
});
