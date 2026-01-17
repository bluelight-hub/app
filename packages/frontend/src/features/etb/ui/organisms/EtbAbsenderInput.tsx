/**
 * ETB Absender/Empfaenger Input Komponente
 *
 * Eingabefelder für Absender und Empfänger in ETB-Einträgen.
 * Absender wird automatisch mit dem Funkrufnamen des Users vorausgefüllt.
 */

import { cn } from '@/shared/ui/cn';
import { Input } from '@/shared/ui/atoms/input.atom';

interface EtbAbsenderInputProps {
  absenderValue: string;
  empfaengerValue: string;
  onAbsenderChange: (value: string) => void;
  onEmpfaengerChange: (value: string) => void;
  absenderError?: string;
  empfaengerError?: string;
  className?: string;
}

/**
 * Eingabefelder für Absender und Empfänger
 *
 * Der Absender wird für die Dokumentation verwendet, wer eine Nachricht
 * gesendet oder eine Meldung gemacht hat. Der Empfänger dokumentiert,
 * an wen die Nachricht gerichtet war.
 */
export function EtbAbsenderInput({ absenderValue, empfaengerValue, onAbsenderChange, onEmpfaengerChange, absenderError, empfaengerError, className }: EtbAbsenderInputProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', className)}>
      <div className="space-y-1">
        <label htmlFor="etb-absender" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
          Absender (Funkrufname)
        </label>
        <Input
          id="etb-absender"
          type="text"
          value={absenderValue}
          onChange={(e) => onAbsenderChange(e.target.value)}
          placeholder="z.B. Florian Musterstadt 11/1"
          maxLength={100}
          variant={absenderError ? 'error' : 'default'}
        />
        {absenderError && (
          <p className="text-red-600 text-sm dark:text-red-400" role="alert">
            {absenderError}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="etb-empfaenger" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
          Empfänger (Funkrufname)
        </label>
        <Input
          id="etb-empfaenger"
          type="text"
          value={empfaengerValue}
          onChange={(e) => onEmpfaengerChange(e.target.value)}
          placeholder="z.B. Leitstelle"
          maxLength={100}
          variant={empfaengerError ? 'error' : 'default'}
        />
        {empfaengerError && (
          <p className="text-red-600 text-sm dark:text-red-400" role="alert">
            {empfaengerError}
          </p>
        )}
      </div>
    </div>
  );
}
