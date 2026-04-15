/**
 * useFunkprotokollEintraege
 *
 * Wrappt den ETB-List-Endpoint (`GET /etb/einsatz/:einsatzId`) mit
 * `kontextType=funkspruch` + `kanalId`-Filter serverseitig und zieht
 * die UI-Filter (Priorität, Zeitraum, Absender, Volltext) clientseitig
 * aus dem `funkprotokollFilterStore` nach.
 */

import { api } from '@/shared';
import type { EtbDto, EintragDto } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { EtbCqrsControllerGetEtbByEinsatzIdVAlphaKontextTypeEnum } from '@bluelight-hub/shared/client';
import { DEFAULT_FILTER, funkprotokollFilterStore, type FunkprotokollFilter } from '../stores/funkprotokoll-filter.store';
import { FUNKVERKEHR_QUERY_KEYS } from '../api/queries';

export interface UseFunkprotokollEintraegeOptions {
  einsatzId: string;
  enabled?: boolean;
}

export interface UseFunkprotokollEintraegeResult {
  eintraege: EintragDto[];
  etb: EtbDto | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Extrahiert einen FunkKontext-Payload (`{ kanalId, funkPrioritaet }`) aus
 * einem ETB-Eintrag. Liefert `undefined` für Einträge ohne FunkKontext.
 */
type FunkKontextShape = { type: 'funkspruch'; kanalId: string; funkPrioritaet: FunkprotokollFilter['prioritaeten'][number] };
const getFunkKontext = (eintrag: EintragDto): FunkKontextShape | undefined => {
  const kontext = eintrag.kontext as unknown;
  if (kontext && typeof kontext === 'object' && (kontext as { type?: string }).type === 'funkspruch' && typeof (kontext as FunkKontextShape).kanalId === 'string') {
    return kontext as FunkKontextShape;
  }
  return undefined;
};

/**
 * Filtert Einträge gemäss der restlichen Frontend-Filter, die der Server
 * (noch) nicht unterstützt.
 */
export const applyClientFilters = (eintraege: EintragDto[], filter: FunkprotokollFilter): EintragDto[] => {
  const { prioritaeten, vonDate, bisDate, absenderQuery, volltextQuery, kanalIds } = filter;
  const priSet = new Set(prioritaeten);
  const absenderLc = absenderQuery?.trim().toLowerCase();
  const volltextLc = volltextQuery?.trim().toLowerCase();
  const von = vonDate ? new Date(vonDate).getTime() : undefined;
  const bis = bisDate ? new Date(bisDate).getTime() : undefined;

  return eintraege.filter((eintrag) => {
    const kontext = getFunkKontext(eintrag);
    if (!kontext) return false;

    if (kanalIds.length > 1 && !kanalIds.includes(kontext.kanalId)) {
      return false;
    }

    if (priSet.size > 0 && !priSet.has(kontext.funkPrioritaet)) {
      return false;
    }

    const eventMs = new Date(eintrag.ereignisZeitpunkt).getTime();
    if (von !== undefined && eventMs < von) return false;
    if (bis !== undefined && eventMs > bis) return false;

    if (absenderLc && !(eintrag.absender?.toLowerCase().includes(absenderLc) ?? false)) {
      return false;
    }

    if (volltextLc && !eintrag.text.toLowerCase().includes(volltextLc)) {
      return false;
    }

    return true;
  });
};

/**
 * Lädt Funkprotokoll-Einträge (ETB mit FunkKontext) für einen Einsatz.
 *
 * Serverseitige Filter: `kontextType=funkspruch` + ggf. `kanalId` (wenn
 * genau EIN Kanal gewählt ist — bei mehreren Kanälen nehmen wir alle
 * Funksprüche und filtern clientseitig).
 * Clientseitige Filter: Priorität, Zeitraum, Absender, Volltext,
 * Mehrfach-Kanal-Filter.
 */
export function useFunkprotokollEintraege({ einsatzId, enabled = true }: UseFunkprotokollEintraegeOptions): UseFunkprotokollEintraegeResult {
  const filter = useStore(funkprotokollFilterStore, (s) => s.byEinsatz[einsatzId] ?? DEFAULT_FILTER);
  const singleKanalId = filter.kanalIds.length === 1 ? filter.kanalIds[0] : undefined;

  const query = useQuery<EtbDto | undefined>({
    enabled: enabled && Boolean(einsatzId),
    queryKey: FUNKVERKEHR_QUERY_KEYS.funkprotokoll(einsatzId, { kanalId: singleKanalId, filter }),
    queryFn: async () => {
      try {
        const response = await api.etb().etbCqrsControllerGetEtbByEinsatzIdVAlpha({
          einsatzId,
          kontextType: EtbCqrsControllerGetEtbByEinsatzIdVAlphaKontextTypeEnum.Funkspruch,
          kanalId: singleKanalId,
        });
        return response.data;
      } catch (error) {
        const statusCode = (error as { status?: number })?.status ?? (error as { response?: { status?: number } })?.response?.status;
        if (statusCode === 404) return undefined;
        throw error;
      }
    },
    staleTime: 10_000,
  });

  const eintraege = query.data?.eintraege ?? [];
  return {
    eintraege: applyClientFilters(eintraege, filter),
    etb: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
