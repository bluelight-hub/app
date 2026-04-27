import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';
import type { EinsatzEinheitDto } from '@/shared';

const STORAGE_PREFIX = 'eigenschutz:aktive-einheit';

const storageKey = (einsatzId: string): string => `${STORAGE_PREFIX}:${einsatzId}`;

/**
 * Lädt alle EinsatzEinheiten eines Einsatzes — Basis-Lookup für die Auswahl
 * der „aktiven Einheit" im Eigenschutz-Modul.
 *
 * Story 2.7 nutzt das Listing für eine schlichte Auswahl-UI — eine
 * server-seitige „my-einheit"-Resolution kommt erst, wenn die Plattform-
 * Permission-Story die Caller-Authorization-Logik bündelt (PO-Decision
 * 2026-04-24).
 */
export function useEinsatzEinheiten(einsatzId: string) {
  return useQuery({
    queryKey: ['einsatz', einsatzId, 'einheiten', 'list'],
    queryFn: async (): Promise<EinsatzEinheitDto[]> => {
      const response = await api.einsatzEinheiten().einsatzEinheitenControllerFindAllVAlpha({ einsatzId });
      return Array.isArray(response?.data) ? (response.data as EinsatzEinheitDto[]) : [];
    },
    enabled: Boolean(einsatzId),
    staleTime: 30_000,
  });
}

export interface UseAktiveEinsatzEinheitResult {
  /** Aktuell gewählte Einheit-ID, oder `null` wenn nicht gewählt. */
  einheitId: string | null;
  /** Anzeigename der gewählten Einheit, oder `null`. */
  einheitName: string | null;
  /** Alle Einheiten des Einsatzes (für Selector-UI). */
  einheiten: EinsatzEinheitDto[];
  /** Setter für die aktive Einheit — persistiert in `localStorage`. */
  setAktiveEinheit: (einheitId: string | null) => void;
  /** Loading-Indikator für die Einheiten-Liste. */
  isLoading: boolean;
}

/**
 * Hook: aktive Einsatz-Einheit des aktuellen Users im Einsatz (Story 2.7 AC11/AC13).
 *
 * **MVP-Implementierung**: Die Auswahl der Einheit ist explizit (User wählt
 * aus Combobox), persistiert in `localStorage` pro Einsatz. Sobald die
 * Plattform-Permission-Story die Server-Side-Resolution
 * (`EinsatzPersonEinheit`-Lookup für den eingeloggten User) bündelt, wird
 * dieser Hook auf einen reinen Server-Read umgestellt — die Auswahl-UI
 * kann dann optional als Override bleiben, da ein User in mehreren
 * Einheiten Mitglied sein kann.
 *
 * **Konsumiert von**:
 * - `useSicherheitsregelLiveBanner` — filtert eingehende WS-Events auf
 *   die aktuell aktive Einheit
 * - `SicherheitsregelEmpfangBanner` — sendet `einheitId` an
 *   `useAckSicherheitsregel`
 * - `SicherheitsregelnPage` — entscheidet, ob der Empfangs-Bereich
 *   überhaupt rendert
 */
export function useAktiveEinsatzEinheit(einsatzId: string): UseAktiveEinsatzEinheitResult {
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const einheiten = useMemo(() => einheitenQuery.data ?? [], [einheitenQuery.data]);

  const [einheitId, setEinheitId] = useState<string | null>(() => {
    if (typeof window === 'undefined' || !einsatzId) return null;
    try {
      return window.localStorage.getItem(storageKey(einsatzId));
    } catch {
      return null;
    }
  });

  // Sync mit localStorage bei einsatzId-Wechsel.
  useEffect(() => {
    if (typeof window === 'undefined' || !einsatzId) {
      setEinheitId(null);
      return;
    }
    try {
      const stored = window.localStorage.getItem(storageKey(einsatzId));
      setEinheitId(stored);
    } catch {
      setEinheitId(null);
    }
  }, [einsatzId]);

  // Wenn die gewählte Einheit nicht mehr in der Liste ist (z. B. gelöscht),
  // Auswahl zurücksetzen — verhindert Banner-Filter auf eine stale ID.
  useEffect(() => {
    if (einheitId !== null && einheiten.length > 0 && !einheiten.some((e) => e.id === einheitId)) {
      setEinheitId(null);
      // Story 2.7 Code-Review-Patch: SSR-/Test-Umgebungen ohne globales
      // `window` würden hier crashen, wenn der Effekt server-seitig läuft
      // (z. B. unter Vitest mit jsdom-Mock-Reset). Defense-in-Depth-Guard
      // analog zu den anderen Effekten.
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(storageKey(einsatzId));
      } catch {
        // best-effort
      }
    }
  }, [einsatzId, einheitId, einheiten]);

  const setAktiveEinheit = useCallback(
    (next: string | null) => {
      setEinheitId(next);
      if (typeof window === 'undefined' || !einsatzId) return;
      try {
        if (next === null) {
          window.localStorage.removeItem(storageKey(einsatzId));
        } else {
          window.localStorage.setItem(storageKey(einsatzId), next);
        }
      } catch {
        // best-effort
      }
    },
    [einsatzId],
  );

  const einheitName = useMemo(() => {
    if (einheitId === null) return null;
    const match = einheiten.find((e) => e.id === einheitId);
    return match?.name ?? null;
  }, [einheitId, einheiten]);

  return {
    einheitId,
    einheitName,
    einheiten,
    setAktiveEinheit,
    isLoading: einheitenQuery.isLoading,
  };
}
