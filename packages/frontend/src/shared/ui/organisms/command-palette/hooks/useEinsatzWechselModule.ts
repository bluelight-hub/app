import { useActiveEinsaetzeWithCounts } from '@/features/einsatz/api';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useMemo } from 'react';
import { PiSiren } from 'react-icons/pi';
import type { ModuleConfig } from '../types';

/**
 * Liefert ein ModuleConfig „Einsätze" für die Command Palette, das den
 * Wechsel zwischen aktiven Einsätzen ermöglicht. Der aktuelle Einsatz
 * wird ausgeblendet; bei höchstens einem verfügbaren Einsatz bleibt die
 * subPages-Liste leer, sodass die Gruppe in der Palette nicht erscheint.
 */
export const useEinsatzWechselModule = (): ModuleConfig => {
  const navigate = useNavigate();
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId', shouldThrow: false }) ?? {};
  const { data: einsaetze = [] } = useActiveEinsaetzeWithCounts();

  return useMemo<ModuleConfig>(
    () => ({
      id: 'einsatz-wechsel',
      name: 'Einsätze',
      color: 'red',
      icon: PiSiren,
      subPages: einsaetze
        .filter((einsatz) => einsatz.id !== einsatzId)
        .map((einsatz) => ({
          id: `einsatz-${einsatz.id}`,
          name: einsatz.nummer,
          description: einsatz.alarmstichwort,
          icon: PiSiren,
          action: () => {
            navigate({
              to: '/app/einsatz/$einsatzId/übersicht',
              params: { einsatzId: einsatz.id },
            });
          },
        })),
    }),
    [einsaetze, einsatzId, navigate],
  );
};
