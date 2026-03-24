import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/patienten/')(() => {
  return {
    component: PatientenComponent,
  };
});

function PatientenComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-2xl text-text-primary">Patientenübersicht</h1>
        <p className="mt-1 text-text-muted text-sm">Verwaltung aller Patienten im Einsatz</p>
      </div>

      <div className="rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Patienten-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
