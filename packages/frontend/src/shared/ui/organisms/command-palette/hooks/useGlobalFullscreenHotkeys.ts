import { useHotkeys } from 'react-hotkeys-hook';
import { useMatchRoute, useNavigate } from '@tanstack/react-router';
import type { EtbSearchParams } from '@routes/app/einsatz/$einsatzId/führung/etb/';
import type { LagekarteSearchParams } from '@/features/lagekarte/ui';
import type { GefahrenmatrixSearchParams } from '@routes/app/einsatz/$einsatzId/sicherheit/gefahren';

/**
 * Globale Keyboard-Shortcuts für Fullscreen-Modi
 *
 * Registriert Cmd+E (Mac) / Ctrl+E (Windows) als globalen Shortcut für Fullscreen-Modus
 * auf unterstützten Routes (/karte und /etb).
 *
 * Diese Shortcuts funktionieren UNABHÄNGIG vom Command Palette State (im Gegensatz
 * zu Command-spezifischen Shortcuts, die nur aktiv sind wenn das Palette offen ist).
 *
 * @example
 * // In CommandPalette.tsx:
 * useGlobalFullscreenHotkeys();
 */
export function useGlobalFullscreenHotkeys() {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  type FullscreenSearchParams = LagekarteSearchParams | EtbSearchParams | GefahrenmatrixSearchParams;

  const setFullscreenSearch = (prev: FullscreenSearchParams) => ({
    ...prev,
    mode: 'fullscreen' as const,
  });

  // Prüfe ob auf Karte-Route
  const isOnKarteRoute = !!matchRoute({
    to: '/app/einsatz/$einsatzId/übersicht/karte',
    fuzzy: false,
  });

  // Prüfe ob auf ETB-Route
  const isOnEtbRoute = !!matchRoute({
    to: '/app/einsatz/$einsatzId/führung/etb',
    fuzzy: false,
  });

  // Prüfe ob auf Gefahrenmatrix-Route
  const isOnGefahrenRoute = !!matchRoute({
    to: '/app/einsatz/$einsatzId/sicherheit/gefahren',
    fuzzy: false,
  });

  // Fullscreen-Toggle: Cmd+E (nur wenn auf unterstützten Routes)
  useHotkeys(
    'mod+e',
    () => {
      navigate({
        to: '.',
        search: setFullscreenSearch,
      });
    },
    {
      enabled: isOnKarteRoute || isOnEtbRoute || isOnGefahrenRoute,
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      preventDefault: true,
    },
    [isOnKarteRoute, isOnEtbRoute, isOnGefahrenRoute, navigate],
  );
}
