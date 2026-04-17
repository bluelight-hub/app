import { LagekarteView, type LagekarteSearchParams } from '@/features/lagekarte/ui';
import { createFileRoute } from '@tanstack/react-router';

/** Lagekarte-Search-Params — erweitert um Deep-Link-`focus` (Issue #627, G3). */
type LagekarteRouteSearch = LagekarteSearchParams & { focus?: string };

export const Route = createFileRoute('/app/einsatz/$einsatzId/übersicht/karte')({
  validateSearch: (search: Record<string, unknown>): LagekarteRouteSearch => {
    const mode = search.mode;
    const validMode = mode === 'fullscreen' || mode === 'presentation' || mode === 'standard' ? mode : 'standard';
    const focus = typeof search.focus === 'string' ? search.focus : undefined;
    return { mode: validMode, focus };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();
  const { mode, focus } = Route.useSearch();

  return (
    <div className={mode === 'standard' ? 'h-[calc(100dvh-14rem)] lg:h-[calc(100dvh-6rem)]' : undefined}>
      <LagekarteView einsatzId={einsatzId} mode={mode} focus={focus} />
    </div>
  );
}
