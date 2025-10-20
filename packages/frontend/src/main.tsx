import '@fontsource-variable/nunito/index.css';
import './index.tailwind.css';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { routeTree } from '@/routeTree.gen';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { cleanupExpiredTiles } from '@/utils/offline-cleanup';

// Initialize offline tile cleanup on app startup
cleanupExpiredTiles('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').catch((error) => {
  console.error('[App-Startup] Offline-Cleanup fehlgeschlagen:', error);
});

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
