'use client';

import { createToaster } from '@chakra-ui/react';

/**
 * Globale Toaster-Instanz für Benachrichtigungen.
 *
 * Konfiguriert mit:
 * - Positionierung unten rechts
 * - Pausiert automatisch bei Inaktivität der Seite
 *
 * @example
 * // Verwendung der toaster-Instanz:
 * import { toaster } from './toaster.instance';
 *
 * toaster.create({
 *   title: 'Erfolgreich gespeichert',
 *   description: 'Die Änderungen wurden übernommen.',
 *   type: 'success'
 * })
 */
export const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
});
