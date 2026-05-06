import { SicherungspostenDetailPage } from '@/features/eigenschutz';
import { createFileRoute } from '@tanstack/react-router';

/**
 * Detail-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id`
 * (Story 4.4 Task 4, AC3).
 *
 * Mountet die `SicherungspostenDetailPage` mit den Route-Params. Die Route
 * delegiert die komplette Rendering-Logik an die Page-Komponente, damit
 * sie unabhängig vom TanStack-Router in Storybook und Specs gerendert
 * werden kann.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id')({
  component: SicherungspostenDetailRoute,
});

function SicherungspostenDetailRoute() {
  const { einsatzId, id } = Route.useParams();
  return <SicherungspostenDetailPage einsatzId={einsatzId} id={id} />;
}
