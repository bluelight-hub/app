import { createFileRoute } from '@tanstack/react-router';
import { FuehrungsrhythmusTemplateList } from '@/features/templates';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/rhythmus')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="mx-auto max-w-3xl p-4">
      <FuehrungsrhythmusTemplateList einsatzId={einsatzId} context="einsatz" />
    </div>
  );
}
