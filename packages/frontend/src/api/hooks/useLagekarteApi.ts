import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type {
  CreatePoiDto,
  LagekarteControllerGetLagekarteVAlpha200Response,
  PoiControllerGetPoisVAlpha200Response,
  PoiResponseDto,
  SaveLagekarteStateDto,
  UpdatePoiDto,
} from '@bluelight-hub/shared/client';
import { api } from '../api';
import type * as GeoJSON from 'geojson';

/**
 * TanStack Query Hook zum Abrufen aller POIs einer Lagekarte
 *
 * @param einsatzId - Die ID des Einsatzes
 * @returns Query result mit POI-Daten, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query für automatisches Caching und Refetching
 * - Query Key: `['pois', einsatzId]`
 * - Die API returned POIs im `data` Array der Response als `PoiResponseDto[]`
 * - `PoiResponseDto` ist der generierte Typ aus dem Backend
 *
 * @example
 * ```tsx
 * const { data: pois, isLoading, error } = usePois('einsatz-123');
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage />;
 *
 * return pois?.map(poi => <PoiMarker key={poi.id} poi={poi} />);
 * ```
 */
export const usePois = (einsatzId: string): UseQueryResult<PoiResponseDto[], Error> => {
  return useQuery({
    queryKey: ['pois', einsatzId],
    queryFn: async () => {
      const response: PoiControllerGetPoisVAlpha200Response = await api.poi().poiControllerGetPoisVAlpha({ einsatzId });
      // Response hat Struktur: { data: PoiResponseDto[], meta: {}, pagination?: {} }
      return response.data;
    },
    enabled: !!einsatzId, // Nur fetchen wenn einsatzId vorhanden
  });
};

/**
 * TanStack Query Hook zum Abrufen der Lagekarte eines Einsatzes
 *
 * @param einsatzId - Die ID des Einsatzes
 * @returns Query result mit Lagekarten-Daten, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query für automatisches Caching und Refetching
 * - Query Key: `['lagekarte', einsatzId]`
 * - Lazy Creation: API erstellt Lagekarte automatisch falls nicht vorhanden
 *
 * @example
 * ```tsx
 * const { data: lagekarte, isLoading } = useLagekarte('einsatz-123');
 * ```
 */
export const useLagekarte = (einsatzId: string): UseQueryResult<LagekarteControllerGetLagekarteVAlpha200Response, Error> => {
  return useQuery({
    queryKey: ['lagekarte', einsatzId],
    queryFn: async () => {
      return await api.lagekarte().lagekarteControllerGetLagekarteVAlpha({ einsatzId });
    },
    enabled: !!einsatzId, // Nur fetchen wenn einsatzId vorhanden
    networkMode: 'offlineFirst', // Enable offline-first mode (AC: IV2)
  });
};

/**
 * TanStack Mutation Hook zum Erstellen eines POI
 *
 * @param einsatzId - Die ID des Einsatzes (für Query Invalidation)
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query Mutation für optimistic updates
 * - Nach erfolgreicher Erstellung wird die POI-Liste neu gefetcht (invalidateQueries)
 * - Mutation Key: keine (einmaliger API-Call)
 * - OnSuccess: Invalidiert `['pois', einsatzId]` Query
 *
 * @example
 * ```tsx
 * const createPoiMutation = useCreatePoi('einsatz-123');
 *
 * createPoiMutation.mutate({
 *   lagekarteId: 'lagekarte-456',
 *   type: 'FAHRZEUG',
 *   name: 'Fahrzeug 1',
 *   latitude: 51.1,
 *   longitude: 10.1,
 * });
 * ```
 */
export const useCreatePoi = (einsatzId: string): UseMutationResult<PoiResponseDto, Error, CreatePoiDto> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePoiDto) => {
      const response = await api.poi().poiControllerCreatePoiVAlpha({ createPoiDto: data });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate POI-Liste um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: ['pois', einsatzId] });
    },
  });
};

/**
 * TanStack Mutation Hook zum Aktualisieren eines POI
 *
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Mutation-Data enthält `{ id: string, einsatzId: string, data: UpdatePoiDto }`
 * - Nach Update wird die POI-Liste invalidiert (automatischer Refetch)
 * - OnSuccess: Invalidiert `['pois', einsatzId]` Query
 *
 * @example
 * ```tsx
 * const updatePoiMutation = useUpdatePoi();
 *
 * updatePoiMutation.mutate({
 *   id: 'poi-123',
 *   einsatzId: 'einsatz-456',
 *   data: { latitude: 51.2, longitude: 10.2 },
 * });
 * ```
 */
export const useUpdatePoi = (): UseMutationResult<PoiResponseDto, Error, { id: string; einsatzId: string; data: UpdatePoiDto }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.poi().poiControllerUpdatePoiVAlpha({ poiId: id, updatePoiDto: data });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate POI-Liste um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: ['pois', variables.einsatzId] });
    },
  });
};

/**
 * TanStack Mutation Hook zum Löschen eines POI
 *
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Mutation-Data enthält `{ id: string, einsatzId: string }`
 * - Nach Löschen wird die POI-Liste invalidiert (automatischer Refetch)
 * - OnSuccess: Invalidiert `['pois', einsatzId]` Query
 *
 * @example
 * ```tsx
 * const deletePoiMutation = useDeletePoi();
 *
 * deletePoiMutation.mutate({
 *   id: 'poi-123',
 *   einsatzId: 'einsatz-456',
 * });
 * ```
 */
export const useDeletePoi = (): UseMutationResult<PoiResponseDto, Error, { id: string; einsatzId: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await api.poi().poiControllerDeletePoiVAlphaRaw({ poiId: id });
      return (await response.value()).data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate POI-Liste um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: ['pois', variables.einsatzId] });
    },
  });
};

/**
 * TanStack Mutation Hook zum Speichern des Lagekarte-State (GeoJSON)
 *
 * @param einsatzId - Die ID des Einsatzes (für Query Invalidation)
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Verwendet TanStack Query Mutation für State-Persistierung
 * - State enthält GeoJSON FeatureCollection mit Zeichnungen (Polygone, Linien, Rechtecke)
 * - Nach erfolgreicher Speicherung wird die Lagekarte-Query neu gefetcht (invalidateQueries)
 * - OnSuccess: Invalidiert `['lagekarte', einsatzId]` Query
 * - Security: Validiert GeoJSON-Struktur und Payload-Größe (max 2MB)
 *
 * @example
 * ```tsx
 * const saveLagekarteStateMutation = useSaveLagekarteState('einsatz-123');
 *
 * saveLagekarteStateMutation.mutate({
 *   type: 'FeatureCollection',
 *   features: [...shapes]
 * });
 * ```
 */
export const useSaveLagekarteState = (einsatzId: string): UseMutationResult<LagekarteControllerGetLagekarteVAlpha200Response, Error, GeoJSON.FeatureCollection> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (state: GeoJSON.FeatureCollection) => {
      // Validate GeoJSON structure
      if (!state || state.type !== 'FeatureCollection' || !Array.isArray(state.features)) {
        throw new Error('Invalid GeoJSON FeatureCollection');
      }

      // Validate payload size (max 2MB)
      const payloadSize = JSON.stringify(state).length;
      const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2MB
      if (payloadSize > MAX_PAYLOAD_SIZE) {
        throw new Error(`Payload zu groß: ${Math.round(payloadSize / 1024)}KB (max 2MB)`);
      }

      // Call API
      const dto: SaveLagekarteStateDto = {
        einsatzId,
        state: state as unknown as object, // Type assertion (API erwartet object)
      };

      return await api.lagekarte().lagekarteControllerSaveLagekarteStateVAlpha({
        einsatzId,
        saveLagekarteStateDto: dto,
      });
    },
    onSuccess: () => {
      // Invalidate Lagekarte-Query um Neuabfrage zu triggern
      queryClient.invalidateQueries({ queryKey: ['lagekarte', einsatzId] });
    },
    networkMode: 'offlineFirst', // Queue mutations when offline (AC: IV2)
  });
};

/**
 * TanStack Mutation Hook zum Geocoding einer Adresse
 *
 * @param einsatzId - Die ID des Einsatzes (für API-Kontext)
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Konvertiert Textadresse zu geografischen Koordinaten via Nominatim API
 * - Rate-Limited (Backend: 10 req/min, Service: 1 req/s)
 * - Gibt `null` zurück bei Fehler oder wenn keine Ergebnisse gefunden
 * - Sollte mit Debouncing verwendet werden (1s delay empfohlen)
 *
 * @example
 * ```tsx
 * const geocodeMutation = useGeocodeAddress('einsatz-123');
 *
 * geocodeMutation.mutate('Hauptstraße 1, 10115 Berlin', {
 *   onSuccess: (coords) => {
 *     if (coords) {
 *       setLatitude(coords.lat);
 *       setLongitude(coords.lon);
 *     } else {
 *       showToast('Adresse nicht gefunden');
 *     }
 *   },
 * });
 * ```
 */
export const useGeocodeAddress = (einsatzId: string): UseMutationResult<{ lat: number; lon: number } | null, Error, string> => {
  return useMutation({
    mutationFn: async (address: string) => {
      const response = await api.geocoding().geocodingControllerGeocodeAddressVAlpha({
        einsatzId,
        geocodeAddressDto: { address },
      });

      // Response hat Struktur: { data: { lat, lon } | null }
      return response.data as { lat: number; lon: number } | null;
    },
  });
};
