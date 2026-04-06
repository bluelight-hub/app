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
  type GefahrentypValue,
  type SchutzobjektValue,
  type WarnstufeValue,
} from '../../schemas/gefahrenmatrix.schema';
import { useGefahrenmatrix, useUpdateGefahrenmatrixBewertung } from '../../api';
import { GefahrenmatrixCell } from '../molecules/GefahrenmatrixCell';

interface GefahrenmatrixGridProps {
  einsatzId: string;
}

/**
 * Vollständige Gefahrenmatrix als interaktive Tabelle.
 * Bildet das Papierformular der Gefahrenmatrix (4A-C-5E + Zusätzliche) ab.
 */
export function GefahrenmatrixGrid({ einsatzId }: GefahrenmatrixGridProps) {
  const { data, isLoading } = useGefahrenmatrix(einsatzId);
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

  const renderSection = (title: string, schutzobjekte: SchutzobjektValue[]) => (
    <>
      <tr>
        <td colSpan={GEFAHRENTYPEN.length + 1} className="bg-surface-raised px-3 py-2 text-center text-sm font-semibold text-action-primary">
          {title}
        </td>
      </tr>
      {schutzobjekte.map((objekt) => (
        <tr key={objekt}>
          <th className="border border-border-subtle bg-surface-panel px-3 py-1.5 text-left text-xs font-semibold whitespace-nowrap text-text-secondary uppercase">{SCHUTZOBJEKT_LABELS[objekt]}</th>
          {GEFAHRENTYPEN.map((typ) => (
            <GefahrenmatrixCell key={`${typ}:${objekt}`} warnstufe={getWarnstufe(typ, objekt)} onChange={(warnstufe) => handleChange(typ, objekt, warnstufe)} />
          ))}
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
            <th className="border border-border-subtle bg-surface-raised p-2 text-left text-xs font-bold text-text-primary uppercase">Gefahrenmatrix</th>
            {GEFAHRENTYPEN.map((typ) => (
              <th key={typ} className="border border-border-subtle bg-surface-raised p-1 text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] leading-tight text-text-muted">{GEFAHRENTYP_LABELS[typ]}</span>
                  {GEFAHRENTYP_KUERZEL[typ] && (
                    <span
                      className={cn(
                        'text-lg font-bold',
                        GEFAHRENTYP_KUERZEL[typ] === 'A' && 'text-red-600',
                        GEFAHRENTYP_KUERZEL[typ] === 'C' && 'text-red-600',
                        GEFAHRENTYP_KUERZEL[typ] === 'E' && 'text-red-600',
                      )}
                    >
                      {GEFAHRENTYP_KUERZEL[typ]}
                    </span>
                  )}
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
