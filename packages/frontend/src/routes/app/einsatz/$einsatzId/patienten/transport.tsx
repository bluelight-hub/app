import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/patienten/transport')(() => {
  return {
    component: TransportComponent,
  };
});

function TransportComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Transport</h1>
        <p className="mt-1 text-sm text-text-muted">Verwaltung von Krankentransporten</p>
      </div>

      <div className="rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Transport-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
