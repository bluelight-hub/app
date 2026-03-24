import { createFileRoute } from '@tanstack/react-router';
import { Pinnwand } from '@/features/einsatz';
import { EinsatzRolleGate } from '@/features/einsatz/ui/molecules/EinsatzRolleGate';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/pinnwand')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();
  return (
    <EinsatzRolleGate einsatzId={einsatzId}>
      <Pinnwand einsatzId={einsatzId} />
    </EinsatzRolleGate>
  );
}
