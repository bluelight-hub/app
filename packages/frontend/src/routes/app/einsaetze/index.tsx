import { EinsatzDashboard } from '@organisms/einsatz/EinsatzDashboard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsaetze/')({
  component: EinsatzDashboard,
});
