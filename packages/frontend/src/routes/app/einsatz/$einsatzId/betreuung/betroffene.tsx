import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/betreuung/betroffene')(() => {
  return {
    component: BetroffeneComponent,
  };
});

function BetroffeneComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-2xl text-text-primary">Betroffene</h1>
        <p className="mt-1 text-text-muted text-sm">Betreuung von betroffenen Personen</p>
      </div>

      <div className="rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Betreuung-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
