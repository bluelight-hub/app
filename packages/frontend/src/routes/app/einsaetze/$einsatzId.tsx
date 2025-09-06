import { EinsatzDetailView } from '@organisms/einsatz/EinsatzDetailView';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsaetze/$einsatzId')({
  component: EinsatzDetailView,
});
