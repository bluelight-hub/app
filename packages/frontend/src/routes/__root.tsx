import { Provider } from '@/shared/ui/headless/provider';
import { ConfirmProvider } from '@/shared/hooks/useConfirm';
import { useWindowOrientation } from '@/shared/hooks/useWindowOrientation';
import { setSetupRedirectInProgress } from '@/shared/lib/server-access-token';
import { useDeepLinkEffect } from '@/features/server/hooks/useDeepLinkEffect';
import { useLoadServers } from '@/features/server/hooks';
import { urlParamsSchema } from '@/features/server/schemas/url-params.schema';
import { useNotificationNavigation } from '@/features/reminders/hooks';
import { useBefehlNotificationNavigation } from '@/features/befehl';
import { useCrossWindowSync } from '@/shared/lib/cross-window-sync';
import { useQueryClient } from '@tanstack/react-query';

// Reset Setup-Redirect-Flag beim App-Start - ABER NICHT wenn wir auf /server/setup sind!
// Grund: Nach einem Full-Page-Redirect zu /server/setup (via window.location.href) wird die App
// komplett neu geladen. Wenn wir das Flag hier bedingungslos zurücksetzen, ist es false
// BEVOR der /server/setup Route beforeLoad laufen kann. Background-Requests (React Query) könnten
// dann erneut 503 bekommen und handleServerNotSetup() triggern - was einen neuen Redirect
// startet obwohl wir gerade auf dem Weg zu /server/setup sind → Endlos-Loop.
//
// Lösung: Nur zurücksetzen wenn wir NICHT auf /server/setup sind. Die /server/setup Route selbst
// setzt das Flag nach ihrem beforeLoad Check zurück.
if (!window.location.pathname.startsWith('/server/setup') && !window.location.pathname.startsWith('/server/manage')) {
  setSetupRedirectInProgress(false);
}
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from 'sonner';

interface RootContext {
  pageTitle?: string;
}

export const Route = createRootRouteWithContext<RootContext>()({
  validateSearch: urlParamsSchema,
  component: RootComponent,
});

function RootComponent() {
  // Server Store Hydration - lädt Server-Konfiguration aus localStorage
  // MUSS vor anderen Server-abhängigen Hooks aufgerufen werden!
  useLoadServers();

  // Automatisches Fenster-Resizing basierend auf Route (nur in Tauri)
  useWindowOrientation();

  // Deep Link Integration für Desktop App
  useDeepLinkEffect();

  // Notification Navigation - registriert Callbacks fuer Deep Links bei Notification-Klick
  useNotificationNavigation();
  useBefehlNotificationNavigation();

  // Cross-Window-Sync: spiegelt Admin-Mutationen zwischen Haupt- und Admin-Fenster (Tauri).
  useCrossWindowSync(useQueryClient());

  return (
    <Provider>
      <ConfirmProvider>
        <Outlet />
        <ReactQueryDevtools initialIsOpen={false} />
        <TanStackRouterDevtools />
        <Toaster duration={4000} position="bottom-right" closeButton theme="system" richColors />
      </ConfirmProvider>
    </Provider>
  );
}
