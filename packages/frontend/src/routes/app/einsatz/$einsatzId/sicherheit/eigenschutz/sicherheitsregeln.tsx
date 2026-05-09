import { Outlet, createFileRoute } from '@tanstack/react-router';

/**
 * Layout-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln`.
 *
 * Die Übersicht liegt unter `./index.tsx`, Detail-Deep-Links unter `./$id.tsx`.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln')({
  component: SicherheitsregelnLayout,
});

function SicherheitsregelnLayout() {
  return <Outlet />;
}
