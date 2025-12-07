import { EinsatzDetailView } from '@/features/einsatz/ui/organisms/EinsatzDetailView';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsaetze/$einsatzId')({
  component: () => <EinsatzDetailView />,
});
