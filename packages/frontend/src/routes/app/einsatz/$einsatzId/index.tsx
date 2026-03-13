import { loadEinsatzWorkspaceHref } from '@/features/einsatz/stores/persistence/einsatz-persistence';
import { Navigate, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();
  const lastWorkspaceHref = loadEinsatzWorkspaceHref(einsatzId);

  if (lastWorkspaceHref) {
    return <Navigate to={lastWorkspaceHref} replace />;
  }

  return <Navigate to="/app/einsatz/$einsatzId/übersicht" params={{ einsatzId }} replace />;
}
