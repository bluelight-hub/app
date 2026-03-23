import { BefehlWorkspace } from '@/features/befehl';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/befehl/$befehlId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId, befehlId } = Route.useParams();
  const navigate = Route.useNavigate();

  return (
    <BefehlWorkspace
      einsatzId={einsatzId}
      selectedBefehlId={befehlId}
      onSelectBefehl={(id) =>
        navigate({
          to: '/app/einsatz/$einsatzId/befehl/$befehlId',
          params: { einsatzId, befehlId: id },
        })
      }
      onClosePanel={() =>
        navigate({
          to: '/app/einsatz/$einsatzId/befehl',
          params: { einsatzId },
        })
      }
    />
  );
}
