import { BefehlWorkspace } from '@/features/befehl';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const searchSchema = z.object({
  befehlId: z.string().optional(),
});

export const Route = createFileRoute('/app/einsatz/$einsatzId/befehl/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();
  const { befehlId } = Route.useSearch();
  const navigate = Route.useNavigate();

  return <BefehlWorkspace einsatzId={einsatzId} selectedBefehlId={befehlId} onSelectBefehl={(id) => navigate({ search: { befehlId: id } })} onClosePanel={() => navigate({ search: {} })} />;
}
