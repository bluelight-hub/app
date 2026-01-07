'use client';

import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { CopyButton } from '@/shared/ui/molecules';
import { PiWarning, PiArrowRight } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

interface TokenDisplayProps {
  token: string;
  onContinue: () => void;
  className?: string;
}

/**
 * Token-Anzeige nach erfolgreichem Setup
 *
 * Zeigt den generierten Access-Token mit Kopier-Funktion
 * und einer Warnung, dass der Token nur einmal sichtbar ist.
 */
export function TokenDisplay({ token, onContinue, className }: TokenDisplayProps) {
  return (
    <section className={cn('space-y-6', className)} aria-label="Setup erfolgreich abgeschlossen">
      {/* Success Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-semibold text-gray-900 text-xl dark:text-white">Setup abgeschlossen!</h2>
        <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">Ihr Server ist jetzt einsatzbereit.</p>
      </div>

      {/* Warning Banner */}
      <Alert
        status="warning"
        icon={<PiWarning className="h-5 w-5" />}
        title="Wichtig - Nur einmal sichtbar!"
        description="Speichern Sie diesen Token sicher. Er wird nach Verlassen dieser Seite nicht erneut angezeigt und kann nicht wiederhergestellt werden."
      />

      {/* Token Display Box */}
      <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50" aria-live="polite">
        <div className="mb-2 font-medium text-gray-700 text-sm dark:text-gray-300">Server Access Token</div>
        <div className="flex items-center gap-3">
          <code className="flex-1 break-all rounded bg-white px-3 py-2 font-mono text-gray-900 text-sm dark:bg-gray-900 dark:text-gray-100">{token}</code>
          <CopyButton text={token} size="sm" />
        </div>
      </div>

      {/* Continue Button */}
      <Button type="button" intent="primary" appearance="heavy" fullWidth onClick={onContinue} className="gap-2">
        <span>Weiter zur Anmeldung</span>
        <PiArrowRight className="h-4 w-4" />
      </Button>
    </section>
  );
}
