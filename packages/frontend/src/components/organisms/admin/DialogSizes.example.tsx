import { Dialog } from '@/components/molecules/dialog.molecule';
import { Button } from '@/components/atoms/button.atom';
import { useState } from 'react';

/**
 * Beispiele für die verschiedenen Dialog-Größen
 *
 * Zeigt die Verwendung der neuen size-Property
 */
export const DialogSizesExample = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLargeContentOpen, setIsLargeContentOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simuliere API-Call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setIsFormOpen(false);
  };

  return (
    <>
      {/* Small Dialog - für einfache Bestätigungen */}
      <Dialog.Confirm
        isOpen={false} // Example only
        onClose={() => {}}
        onConfirm={() => {}}
        title="Kleine Dialog-Box"
        message="Perfekt für kurze Bestätigungen (max-w-sm: 384px)"
        variant="info"
      />

      {/* Medium Dialog (Default) - für Standard-Formulare */}
      <Dialog isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} size="md">
        <Dialog.Title>Standard Formular</Dialog.Title>
        <Dialog.Body>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Standard-Größe für die meisten Anwendungsfälle (max-w-md: 448px)
            </p>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Name</label>
              <input type="text" className="w-full rounded-lg border p-2" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">E-Mail</label>
              <input type="email" className="w-full rounded-lg border p-2" />
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer loading={isSubmitting}>
          <Button onClick={() => setIsFormOpen(false)} intent="secondary" appearance="ghost">
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            Speichern
          </Button>
        </Dialog.Footer>
      </Dialog>

      {/* Large Dialog - für komplexere Formulare */}
      <Dialog isOpen={isLargeContentOpen} onClose={() => setIsLargeContentOpen(false)} size="lg">
        <Dialog.Title>Große Dialog-Box</Dialog.Title>
        <Dialog.Body>
          <p className="text-gray-600 dark:text-gray-400">
            Für komplexere Formulare mit mehr Inhalt (max-w-lg: 512px)
          </p>
          {/* Mehr Formularfelder würden hier stehen */}
        </Dialog.Body>
        <Dialog.Footer>
          <Button onClick={() => setIsLargeContentOpen(false)}>Schließen</Button>
        </Dialog.Footer>
      </Dialog>

      {/* Extra Large Dialog - für sehr umfangreiche Inhalte */}
      <Dialog isOpen={false} onClose={() => {}} size="xl">
        <Dialog.Title>Extra große Dialog-Box</Dialog.Title>
        <Dialog.Body>
          <p>Für umfangreiche Inhalte wie Tabellen (max-w-xl: 576px)</p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button onClick={() => {}}>Schließen</Button>
        </Dialog.Footer>
      </Dialog>

      {/* Full Size Dialog - maximale Breite */}
      <Dialog isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} size="full">
        <Dialog.Title>Mobile Filter Dialog</Dialog.Title>
        <Dialog.Body>
          <p className="text-gray-600 dark:text-gray-400">
            Maximale Breite für mobile Ansichten oder sehr breite Inhalte (max-w-2xl: 672px)
          </p>
          {/* Filter-Optionen würden hier stehen */}
        </Dialog.Body>
        <Dialog.Footer>
          <Button onClick={() => setIsMobileOpen(false)} intent="secondary" appearance="ghost">
            Zurücksetzen
          </Button>
          <Button onClick={() => setIsMobileOpen(false)}>Filter anwenden</Button>
        </Dialog.Footer>
      </Dialog>
    </>
  );
};