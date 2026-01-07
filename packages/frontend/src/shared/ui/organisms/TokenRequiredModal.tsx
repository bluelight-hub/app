'use client';

import { useEffect, useState, useRef } from 'react';
import { Dialog } from '../molecules/dialog.molecule';
import { Button } from '../atoms/button.atom';
import { Input } from '../atoms/input.atom';
import { Alert } from '../atoms/alert.atom';
import { PiKey, PiWarning } from 'react-icons/pi';
import { onTokenEvent, setServerAccessToken, isValidTokenFormat } from '@/shared/lib/server-access-token';

/**
 * Modal zur Eingabe des Server Access Tokens
 *
 * Wird angezeigt wenn das Backend "Server access token required" zurueckgibt.
 * Der User kann seinen Token eingeben, der dann gespeichert wird.
 */
export function TokenRequiredModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Listener fuer 'token-required' Events
    const unsubscribe = onTokenEvent((event) => {
      if (event === 'token-required') {
        setIsOpen(true);
        setToken('');
        setError(null);
      }
    });

    return unsubscribe;
  }, []);

  const handleSubmit = () => {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setError('Bitte geben Sie einen Token ein.');
      return;
    }

    if (!isValidTokenFormat(trimmedToken)) {
      setError('Ungueltiges Token-Format. Der Token muss mit "blh_" beginnen.');
      return;
    }

    // Token speichern
    setServerAccessToken(trimmedToken);
    setIsOpen(false);

    // Seite neu laden um API-Requests mit neuem Token zu wiederholen
    window.location.reload();
  };

  const handleClose = () => {
    // Modal kann nicht geschlossen werden ohne Token
    // User muss Token eingeben oder Seite verlassen
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md" closeOnEscape={false} closeOnClickOutside={false} initialFocus={inputRef as React.RefObject<HTMLElement>}>
      <Dialog.Title>
        <div className="flex items-center gap-2">
          <PiKey className="h-5 w-5 text-primary-500" />
          <span>Server Access Token erforderlich</span>
        </div>
      </Dialog.Title>

      <Dialog.Body>
        <Alert
          status="warning"
          icon={<PiWarning className="h-5 w-5" />}
          title="Authentifizierung erforderlich"
          description="Um auf diesen Server zugreifen zu koennen, benoetigen Sie einen gueltigen Server Access Token. Diesen haben Sie beim Setup des Servers erhalten."
          className="mb-4"
        />

        <div className="space-y-4">
          <div>
            <label htmlFor="server-token" className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
              Server Access Token
            </label>
            <Input
              ref={inputRef}
              id="server-token"
              type="text"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError(null);
              }}
              placeholder="blh_xxx..."
              className="font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
            {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
          </div>

          <p className="text-gray-500 text-xs dark:text-gray-400">Der Token wird sicher in Ihrem Browser gespeichert und bei jedem API-Request automatisch mitgesendet.</p>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button intent="primary" onClick={handleSubmit} disabled={!token.trim()}>
          Token speichern
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
