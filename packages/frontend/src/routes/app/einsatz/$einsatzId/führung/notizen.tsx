import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { NotizList } from '@/features/notizen';
import { ItemTypeFilterControl, type ItemTypeFilter } from '@/features/notizen';
import { ErinnerungenList } from '@/features/reminders';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/notizen')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();
  const [filter, setFilter] = useState<ItemTypeFilter>('alle');

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      {/* Story 7.5 AC2: Typ-Filter */}
      <ItemTypeFilterControl value={filter} onChange={setFilter} />

      {/* Notizen anzeigen wenn "alle" oder "notizen" */}
      {(filter === 'alle' || filter === 'notizen') && <NotizList einsatzId={einsatzId} />}

      {/* Erinnerungen anzeigen wenn "alle" oder "erinnerungen" */}
      {(filter === 'alle' || filter === 'erinnerungen') && <ErinnerungenList einsatzId={einsatzId} />}
    </div>
  );
}
