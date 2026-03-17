import { getCanonicalWorkspaceRoute, isWorkspaceRouteAccessible } from '@/features/workspace/registry';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { SingleEinsatzLayout } from '@/shared/ui/templates/SingleEinsatzLayout';

export const Route = createFileRoute('/app/einsatz/$einsatzId')({
  beforeLoad: ({ location, params }) => {
    if (isWorkspaceRouteAccessible(location.pathname, params.einsatzId)) {
      return;
    }

    throw redirect({
      to: getCanonicalWorkspaceRoute(),
      params,
    });
  },
  component: SingleEinsatzLayout,
});
