import { createFileRoute } from '@tanstack/react-router';
import { EinsatzCockpit } from '@/features/einsatz';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/cockpit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();
  return <EinsatzCockpit einsatzId={einsatzId} />;
}
