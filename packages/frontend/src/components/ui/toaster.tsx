'use client';

import { Toaster as ChakraToaster, Portal, Spinner, Stack, Toast } from '@chakra-ui/react';
import { toaster } from './toaster.instance';

/**
 * Toaster-Komponente für die Anzeige von Benachrichtigungen.
 *
 * Rendert Toast-Benachrichtigungen mit Unterstützung für:
 * - Verschiedene Typen (success, error, warning, info, loading)
 * - Titel und Beschreibung
 * - Optionale Aktions-Buttons
 * - Schließen-Button bei schließbaren Toasts
 * - Responsive Darstellung mit angepassten Abständen auf mobilen Geräten
 *
 * Diese Komponente sollte einmal in der Anwendung (typischerweise im Root-Layout)
 * eingebunden werden. Die Benachrichtigungen werden dann über die `toaster`-Instanz
 * aus './toaster.instance' ausgelöst.
 *
 * @returns Die Toaster-Komponente mit Portal-Rendering
 *
 * @example
 * // In der Root-Komponente:
 * <Toaster />
 *
 * // Verwendung der toaster-Instanz:
 * import { toaster } from './toaster.instance';
 * toaster.create({
 *   title: 'Erfolgreich gespeichert',
 *   description: 'Die Änderungen wurden übernommen.',
 *   type: 'success'
 * })
 */
export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: '4' }}>
        {(toast) => (
          <Toast.Root width={{ md: 'sm' }}>
            {toast.type === 'loading' ? <Spinner size="sm" color="blue.solid" /> : <Toast.Indicator />}
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            </Stack>
            {toast.action && <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>}
            {toast.closable && <Toast.CloseTrigger />}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
};
