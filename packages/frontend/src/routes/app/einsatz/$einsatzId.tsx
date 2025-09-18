import { createFileRoute } from '@tanstack/react-router';
import { SingleEinsatzLayout } from '@templates/SingleEinsatzLayout';

export const Route = createFileRoute('/app/einsatz/$einsatzId')({
  component: SingleEinsatzLayout,
});
