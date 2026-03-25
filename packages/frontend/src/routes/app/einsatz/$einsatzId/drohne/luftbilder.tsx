import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/drohne/luftbilder')(() => {
  return {
    component: LuftbilderComponent,
  };
});

function LuftbilderComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Luftbilder</h1>
        <p className="mt-1 text-sm text-text-muted">Aufnahmen und Bildverwaltung</p>
      </div>

      <div className="rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Luftbild-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
