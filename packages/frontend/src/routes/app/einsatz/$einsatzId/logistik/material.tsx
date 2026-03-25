import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/logistik/material')(() => {
  return {
    component: MaterialComponent,
  };
});

function MaterialComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Material</h1>
        <p className="mt-1 text-sm text-text-muted">Materialverwaltung und Bestände</p>
      </div>

      <div className="rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Material-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
