import { LagekarteView, type LagekarteSearchParams } from '@/features/lagekarte/ui';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/übersicht/karte')({
  validateSearch: (search: Record<string, unknown>): LagekarteSearchParams => {
    // Validate mode parameter and default to 'standard' if invalid
    const mode = search.mode;

    if (mode === 'fullscreen' || mode === 'presentation' || mode === 'standard') {
      return { mode };
    }

    // Default to 'standard' for any invalid or missing mode
    return { mode: 'standard' };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();
  const { mode } = Route.useSearch();

  return (
    <div className={mode === 'standard' ? 'h-[calc(100dvh-14rem)] lg:h-[calc(100dvh-6rem)]' : undefined}>
      <LagekarteView einsatzId={einsatzId} mode={mode} />
    </div>
  );
}
