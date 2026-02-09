/**
 * KategorieSelector Komponente
 *
 * **Story 8.2:** Kategorie fuer Notiz auswaehlen
 * AC1: "sehe ich alle Kategorien des Einsatzes als Auswahl"
 * AC2: "Jede Kategorie wird mit Name angezeigt"
 * AC3: "Ich kann optional eine Kategorie auswaehlen"
 *
 * Nutzt die Combobox-Komponente fuer Such- und Auswahl-Funktionalitaet.
 * Laedt Kategorien ueber useKategorienByEinsatz Hook.
 */

import { useCallback, useMemo } from 'react';
import { PiTag } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Combobox, type ComboboxItem } from '@/shared/ui/headless/combobox';
import { useKategorienByEinsatz } from '../../api';

interface KategorieSelectorProps {
  /** Einsatz ID fuer das Laden der Kategorien */
  einsatzId: string;
  /** Aktuell ausgewaehlte Kategorie ID (optional) */
  value?: string | null;
  /** Handler fuer Auswahl-Aenderung */
  onChange: (kategorieId: string | null) => void;
  /** Handler fuer Blur Event (fuer Form-Integration) */
  onBlur?: () => void;
  /** Ob das Feld deaktiviert ist */
  disabled?: boolean;
  /** Fehlermeldung */
  error?: string;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
  /** Platzhalter Text fuer leere Auswahl */
  placeholder?: string;
}

/**
 * Dropdown zur Auswahl einer Kategorie fuer Notizen.
 *
 * **Felder im Dropdown:**
 * - Primary: Kategorie Name
 *
 * **Verhalten:**
 * - Optional: Leere Auswahl bedeutet "Keine Kategorie"
 * - Suchbar: Filtert nach Kategorie-Namen
 * - Loading State: Zeigt Skeleton waehrend API-Abruf
 *
 * @example
 * ```tsx
 * <KategorieSelector
 *   einsatzId={einsatzId}
 *   value={selectedKategorieId}
 *   onChange={(kategorieId) => setSelectedKategorieId(kategorieId)}
 * />
 * ```
 */
export function KategorieSelector({ einsatzId, value, onChange, onBlur, disabled = false, error, className, placeholder = 'Kategorie waehlen (optional)' }: KategorieSelectorProps) {
  const { data: kategorien, isLoading, isError } = useKategorienByEinsatz(einsatzId);

  // Formatiere Kategorien fuer Combobox
  const comboboxItems: ComboboxItem[] = useMemo(() => {
    if (!kategorien) return [];

    return kategorien.map((k) => ({
      value: k.id,
      label: k.name,
    }));
  }, [kategorien]);

  // Handler fuer Auswahl
  const handleChange = useCallback(
    (selectedValue: string) => {
      // Leerer String = keine Kategorie
      onChange(selectedValue || null);
    },
    [onChange],
  );

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="animate-pulse">
          <div className="h-[52px] rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className={cn('w-full', className)}>
        <div role="alert" aria-live="polite" className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          Kategorien konnten nicht geladen werden
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <Combobox
        items={comboboxItems}
        value={value ?? ''}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled || comboboxItems.length === 0}
        leadingIcon={<PiTag className="h-5 w-5" />}
        error={error}
        openOnFocus
      />
      {comboboxItems.length === 0 && !isLoading && <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">Keine Kategorien in diesem Einsatz</p>}
    </div>
  );
}
