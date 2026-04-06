import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/shared/ui/cn';
import {
  GEFAHRENTYPEN,
  GEFAHRENTYP_LABELS,
  GEFAHRENTYP_KUERZEL,
  SCHUTZOBJEKTE_ERKANNT,
  SCHUTZOBJEKTE_EINSATZKRAEFTE,
  SCHUTZOBJEKT_LABELS,
  isKombinationGueltig,
  type GefahrentypValue,
  type SchutzobjektValue,
  type WarnstufeValue,
} from '../../schemas/gefahrenmatrix.schema';
import { useGefahrenmatrix, useUpdateGefahrenmatrixBewertung } from '../../api';
import { GefahrenmatrixCell } from '../molecules/GefahrenmatrixCell';

interface GefahrenmatrixGridProps {
  einsatzId: string;
  /** Readonly-Modus: Keine Dropdowns, nur Text-Anzeige (für Dashboard/Fullscreen) */
  readonly?: boolean;
  /** Fullscreen-Modus: Tabelle füllt verfügbaren Platz, größere Schrift und Zellen */
  fullscreen?: boolean;
  /** Polling-Intervall in ms für automatische Aktualisierung */
  refetchInterval?: number;
}

/**
 * Vollständige Gefahrenmatrix als interaktive Tabelle.
 * Bildet das Papierformular der Gefahrenmatrix (5A-B-C-D-5E) ab.
 */
export function GefahrenmatrixGrid({ einsatzId, readonly = false, fullscreen = false, refetchInterval }: GefahrenmatrixGridProps) {
  const { data, isLoading, isError } = useGefahrenmatrix(einsatzId, { refetchInterval });
  const { mutate: updateBewertung } = useUpdateGefahrenmatrixBewertung();

  // Bewertungen als Map: "GEFAHRENTYP:SCHUTZOBJEKT" → WarnstufeValue
  const bewertungMap = useMemo(() => {
    const map = new Map<string, WarnstufeValue>();
    if (data?.bewertungen) {
      for (const b of data.bewertungen) {
        map.set(`${b.gefahrentyp}:${b.schutzobjekt}`, b.warnstufe as WarnstufeValue);
      }
    }
    return map;
  }, [data]);

  const getWarnstufe = useCallback(
    (typ: GefahrentypValue, objekt: SchutzobjektValue): WarnstufeValue => {
      return bewertungMap.get(`${typ}:${objekt}`) ?? 'KEINE';
    },
    [bewertungMap],
  );

  const handleChange = useCallback(
    (typ: GefahrentypValue, objekt: SchutzobjektValue, warnstufe: WarnstufeValue) => {
      updateBewertung(
        {
          einsatzId,
          data: { gefahrentyp: typ, schutzobjekt: objekt, warnstufe },
        },
        {
          onError: () => {
            toast.error('Fehler beim Aktualisieren der Bewertung');
          },
        },
      );
    },
    [einsatzId, updateBewertung],
  );

  if (isLoading) {
    return <div className="flex items-center justify-center p-8 text-text-muted">Gefahrenmatrix wird geladen...</div>;
  }

  if (isError) {
    return <div className="flex items-center justify-center p-8 text-status-danger-text">Gefahrenmatrix konnte nicht geladen werden.</div>;
  }

  const renderSection = (title: string, schutzobjekte: SchutzobjektValue[]) => (
    <>
      <tr>
        <td colSpan={GEFAHRENTYPEN.length + 1} className={cn('bg-surface-raised text-center font-semibold text-action-primary', fullscreen ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm')}>
          {title}
        </td>
      </tr>
      {schutzobjekte.map((objekt) => (
        <tr key={objekt}>
          <th
            className={cn(
              'border border-border-subtle bg-surface-panel text-left font-semibold whitespace-nowrap text-text-secondary uppercase',
              fullscreen ? 'px-4 py-3 text-sm' : 'px-3 py-1.5 text-xs',
            )}
          >
            {SCHUTZOBJEKT_LABELS[objekt]}
          </th>
          {GEFAHRENTYPEN.map((typ) =>
            isKombinationGueltig(typ, objekt) ? (
              <GefahrenmatrixCell
                key={`${typ}:${objekt}`}
                warnstufe={getWarnstufe(typ, objekt)}
                onChange={(warnstufe) => handleChange(typ, objekt, warnstufe)}
                readonly={readonly}
                fullscreen={fullscreen}
              />
            ) : (
              <td
                key={`${typ}:${objekt}`}
                className="cursor-not-allowed border border-border-subtle p-0 text-center"
                style={{ background: 'repeating-linear-gradient(-45deg, transparent, transparent 3px, var(--color-border-subtle) 3px, var(--color-border-subtle) 4px)' }}
                title={`${GEFAHRENTYP_LABELS[typ]} ist für ${SCHUTZOBJEKT_LABELS[objekt]} nicht anwendbar`}
              />
            ),
          )}
        </tr>
      ))}
    </>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-border-subtle">
        {/* Header: Gefahrentyp Labels */}
        <thead>
          <tr>
            <th className={cn('border border-border-subtle bg-surface-raised text-left font-bold text-text-primary uppercase', fullscreen ? 'p-3 text-sm' : 'p-2 text-xs')}>Gefahrenmatrix</th>
            {GEFAHRENTYPEN.map((typ) => (
              <th key={typ} className={cn('border border-border-subtle bg-surface-raised text-center', fullscreen ? 'p-2' : 'p-1')}>
                <div className={cn('flex flex-col items-center', fullscreen ? 'gap-1' : 'gap-0.5')}>
                  <span className={cn('leading-tight text-text-muted', fullscreen ? 'text-xs' : 'text-[10px]')}>{GEFAHRENTYP_LABELS[typ]}</span>
                  {GEFAHRENTYP_KUERZEL[typ] && <span className={cn('font-bold text-red-600', fullscreen ? 'text-2xl' : 'text-lg')}>{GEFAHRENTYP_KUERZEL[typ]}</span>}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {renderSection('Welche Gefahren sind erkannt?', SCHUTZOBJEKTE_ERKANNT)}
          {renderSection('Vor welchen Gefahren müssen sich Einsatzkräfte schützen?', SCHUTZOBJEKTE_EINSATZKRAEFTE)}
        </tbody>
      </table>
    </div>
  );
}
