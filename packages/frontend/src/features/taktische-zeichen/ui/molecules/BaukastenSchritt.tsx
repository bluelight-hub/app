/**
 * BaukastenSchritt — Einzelner Schritt im Zeichen-Baukasten-Wizard.
 *
 * Zeigt Schrittnummer, Titel, Beschreibung und den eingebetteten Picker.
 */

import { cn } from '@/shared/ui/cn';

export interface BaukastenSchrittProps {
  /** Schrittnummer (1-basiert) */
  nummer: number;
  /** Gesamtanzahl Schritte */
  gesamtAnzahl: number;
  /** Schritt-Titel */
  titel: string;
  /** Optionale Beschreibung */
  beschreibung?: string;
  /** Picker-Komponente */
  children: React.ReactNode;
  /** Ist dieser Schritt abgeschlossen? */
  istAbgeschlossen?: boolean;
}

export function BaukastenSchritt({ nummer, gesamtAnzahl, titel, beschreibung, children, istAbgeschlossen }: BaukastenSchrittProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Schritt-Header */}
      <div className="flex items-center gap-3">
        <div className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold', istAbgeschlossen ? 'bg-green-500 text-white' : 'bg-action-primary text-white')}>
          {istAbgeschlossen ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            nummer
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium text-text-primary">{titel}</h3>
            <span className="text-xs text-text-muted">
              Schritt {nummer} / {gesamtAnzahl}
            </span>
          </div>
          {beschreibung && <p className="text-xs text-text-muted">{beschreibung}</p>}
        </div>
      </div>

      {/* Picker */}
      <div className="ml-10">{children}</div>
    </div>
  );
}
