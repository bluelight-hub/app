import { EtbPage } from '@/features/etb';
import { createFileRoute } from '@tanstack/react-router';

export type EtbSearchParams = {
  mode: 'standard' | 'fullscreen';
};

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/etb/')({
  validateSearch: (search: Record<string, unknown>): EtbSearchParams => {
    // Validate mode parameter and default to 'standard' if invalid
    const mode = search.mode;

    if (mode === 'fullscreen' || mode === 'standard') {
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

  return <EtbPage einsatzId={einsatzId} mode={mode} />;
}
