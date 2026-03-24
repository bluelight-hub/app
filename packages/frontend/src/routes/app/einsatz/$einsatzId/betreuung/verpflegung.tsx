import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/betreuung/verpflegung')(() => {
  return {
    component: VerpflegungComponent,
  };
});

function VerpflegungComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-2xl text-text-primary">Verpflegung</h1>
        <p className="mt-1 text-text-muted text-sm">Verwaltung von Essen und Trinken</p>
      </div>

      <div className="rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Verpflegung-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
