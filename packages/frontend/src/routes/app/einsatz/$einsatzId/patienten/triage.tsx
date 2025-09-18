import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/patienten/triage')(() => {
  return {
    component: TriageComponent,
  };
});

function TriageComponent() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">Triage</h1>
        <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">Sichtung und Priorisierung von Patienten</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">Triage-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
