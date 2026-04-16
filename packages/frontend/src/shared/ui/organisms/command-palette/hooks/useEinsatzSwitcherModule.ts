import { useActiveEinsaetzeWithCounts } from '@/features/einsatz/api';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { PiSiren } from 'react-icons/pi';
import type { ModuleConfig } from '../types';

/**
 * Command-Palette-Modul „Einsatz wechseln".
 *
 * Listet alle aktiven Einsätze als Unterbefehle auf. Beim Auswählen eines
 * Eintrags wird direkt in die Übersicht des gewählten Einsatzes navigiert.
 * Der aktuell geöffnete Einsatz wird aus der Liste ausgeblendet, da ein
 * Wechsel auf sich selbst keinen Mehrwert hat.
 *
 * Wenn nur ein Einsatz aktiv ist, liefert das Modul leere `subPages` –
 * der Consumer (z. B. `SingleEinsatzLayout`) filtert solche leeren Module
 * aus der Command-Palette heraus.
 *
 * @param currentEinsatzId - ID des aktuell geöffneten Einsatzes
 */
export function useEinsatzSwitcherModule(currentEinsatzId: string): ModuleConfig {
  const navigate = useNavigate();
  const { data: einsaetze = [] } = useActiveEinsaetzeWithCounts();

  return useMemo<ModuleConfig>(() => {
    const otherEinsaetze = einsaetze.filter((einsatz) => einsatz.id !== currentEinsatzId);

    return {
      id: 'einsatz-switcher',
      name: 'Einsatz wechseln',
      color: 'red',
      icon: PiSiren,
      subPages: otherEinsaetze.map((einsatz) => ({
        id: `switch-${einsatz.id}`,
        name: einsatz.name,
        description: einsatz.alarmstichwort ?? undefined,
        icon: PiSiren,
        action: () => {
          navigate({
            to: '/app/einsatz/$einsatzId/übersicht',
            params: { einsatzId: einsatz.id },
          });
        },
      })),
    };
  }, [einsaetze, currentEinsatzId, navigate]);
}
