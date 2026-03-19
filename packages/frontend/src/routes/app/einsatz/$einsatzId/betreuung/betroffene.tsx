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
        <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">Betroffene</h1>
        <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">Betreuung von betroffenen Personen</p>
      </div>

      <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">Betreuung-Modul für Einsatz {einsatzId} - Coming soon</p>
      </div>
    </div>
  );
}
