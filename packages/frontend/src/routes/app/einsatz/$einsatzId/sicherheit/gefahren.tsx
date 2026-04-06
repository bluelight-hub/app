import { createFileRoute } from '@tanstack/react-router';
import { GefahrenmatrixGrid } from '@/features/gefahrenmatrix/ui';

export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/gefahren')({
  component: GefahrenPage,
});

function GefahrenPage() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Gefahrenmatrix</h2>
        <p className="text-sm text-text-muted">Bewertung der Gefahrenlage nach dem 4A-C-5E-Schema</p>
      </div>
      <GefahrenmatrixGrid einsatzId={einsatzId} />
    </div>
  );
}
