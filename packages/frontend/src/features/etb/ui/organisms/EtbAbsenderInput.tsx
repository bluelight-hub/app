/**
 * ETB Absender/Empfaenger Input Komponente
 *
 * Combobox-Felder für Absender und Empfänger in ETB-Einträgen mit Auto-Vervollständigung.
 * Absender wird automatisch mit dem Funkrufnamen des Users vorausgefüllt.
 */

import { cn } from '@/shared/ui/cn';
import { Combobox, type ComboboxItem } from '@/shared/ui/headless/combobox';
import { useMemo } from 'react';

/**
 * Standard-Vorschläge für häufig verwendete Empfänger
 */
const DEFAULT_EMPFAENGER_SUGGESTIONS: ComboboxItem[] = [
  { value: 'Leitstelle', label: 'Leitstelle' },
  { value: 'EL', label: 'EL (Einsatzleiter)' },
  { value: 'ZF', label: 'ZF (Zugführer)' },
  { value: 'GF', label: 'GF (Gruppenführer)' },
  { value: 'TEL', label: 'TEL (Technische Einsatzleitung)' },
  { value: 'OrgL', label: 'OrgL (Organisatorischer Leiter)' },
  { value: 'LNA', label: 'LNA (Leitender Notarzt)' },
];

interface EtbAbsenderInputProps {
  absenderValue: string;
  empfaengerValue: string;
  onAbsenderChange: (value: string) => void;
  onEmpfaengerChange: (value: string) => void;
  absenderError?: string;
  empfaengerError?: string;
  /** Vorschläge für Absender (z.B. aus EinsatzTeilnehmer) */
  absenderSuggestions?: ComboboxItem[];
  /** Zusätzliche Vorschläge für Empfänger */
  empfaengerSuggestions?: ComboboxItem[];
  className?: string;
}

/**
 * Combobox-Felder für Absender und Empfänger mit Auto-Vervollständigung
 *
 * Der Absender wird für die Dokumentation verwendet, wer eine Nachricht
 * gesendet oder eine Meldung gemacht hat. Der Empfänger dokumentiert,
 * an wen die Nachricht gerichtet war.
 *
 * Beide Felder erlauben auch freie Texteingabe für nicht vorgeschlagene Werte.
 */
export function EtbAbsenderInput({
  absenderValue,
  empfaengerValue,
  onAbsenderChange,
  onEmpfaengerChange,
  absenderError,
  empfaengerError,
  absenderSuggestions = [],
  empfaengerSuggestions = [],
  className,
}: EtbAbsenderInputProps) {
  // Kombiniere Standard-Vorschläge mit übergebenen Vorschlägen (ohne Duplikate)
  const allEmpfaengerSuggestions = useMemo(() => {
    const combined = [...empfaengerSuggestions, ...DEFAULT_EMPFAENGER_SUGGESTIONS];
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (seen.has(item.value)) return false;
      seen.add(item.value);
      return true;
    });
  }, [empfaengerSuggestions]);

  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', className)}>
      <Combobox
        label="Absender (Funkrufname)"
        items={absenderSuggestions}
        value={absenderValue}
        onChange={onAbsenderChange}
        placeholder="z.B. Florian Musterstadt 11/1"
        allowCustomValue
        error={absenderError}
      />

      <Combobox
        label="Empfänger (Funkrufname)"
        items={allEmpfaengerSuggestions}
        value={empfaengerValue}
        onChange={onEmpfaengerChange}
        placeholder="z.B. Leitstelle"
        allowCustomValue
        error={empfaengerError}
      />
    </div>
  );
}
