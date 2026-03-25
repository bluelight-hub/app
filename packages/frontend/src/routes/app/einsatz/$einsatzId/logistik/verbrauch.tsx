import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/logistik/verbrauch')(() => {
  return {
    component: VerbrauchComponent,
  };
});

function VerbrauchComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Verbrauch</h1>
        <p className="mt-1 text-sm text-text-muted">Verbrauchsmaterial und Bestandsverwaltung</p>
      </div>

      <div className="rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Verbrauch-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
