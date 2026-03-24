import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz')(() => {
  return {
    component: EigenschutzComponent,
  };
});

function EigenschutzComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-2xl text-text-primary">Eigenschutz</h1>
        <p className="mt-1 text-text-muted text-sm">Arbeitsschutz und Sicherheitsmaßnahmen</p>
      </div>

      <div className="rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Eigenschutz-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
