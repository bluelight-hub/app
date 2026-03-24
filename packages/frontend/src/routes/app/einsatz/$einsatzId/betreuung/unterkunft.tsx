import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/betreuung/unterkunft')(() => {
  return {
    component: UnterkunftComponent,
  };
});

function UnterkunftComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-2xl text-text-primary">Unterkunft</h1>
        <p className="mt-1 text-text-muted text-sm">Verwaltung von Notunterkünften</p>
      </div>

      <div className="rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Unterkunft-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
