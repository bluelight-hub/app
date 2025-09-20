import { Dialog } from '@/components/molecules/dialog.molecule';
import { useState } from 'react';

/**
 * Beispiele für die Verwendung der neuen Dialog.Alert Variante
 *
 * Zeigt verschiedene Alert-Varianten und deren Anwendungsfälle
 */
export const AlertDialogExamples = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      {/* Success Alert */}
      <Dialog.Alert
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Erfolgreich gespeichert"
        message="Die Änderungen wurden erfolgreich übernommen und sind ab sofort aktiv."
        variant="success"
      />

      {/* Error Alert */}
      <Dialog.Alert
        isOpen={showError}
        onClose={() => setShowError(false)}
        title="Fehler aufgetreten"
        message={
          <div className="space-y-2">
            <p>Die Aktion konnte nicht durchgeführt werden.</p>
            <p className="text-sm">Fehlercode: AUTH_001</p>
          </div>
        }
        variant="error"
      />

      {/* Warning Alert */}
      <Dialog.Alert
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        title="Achtung"
        message="Die Verbindung zum Server ist instabil. Bitte speichern Sie Ihre Arbeit regelmäßig."
        variant="warning"
      />

      {/* Info Alert */}
      <Dialog.Alert
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        title="Neue Funktion verfügbar"
        message={
          <div className="space-y-2">
            <p>Die Dialog-Komponente wurde erweitert!</p>
            <ul className="list-disc pl-5 text-sm">
              <li>Neue vordefinierte Varianten</li>
              <li>Size-Property für verschiedene Größen</li>
              <li>Keyboard-Shortcuts</li>
              <li>Loading-States</li>
            </ul>
          </div>
        }
        variant="info"
      />
    </>
  );
};