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
        <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">Patientenübersicht</h1>
        <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">Verwaltung aller Patienten im Einsatz</p>
      </div>

      <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">Patienten-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
