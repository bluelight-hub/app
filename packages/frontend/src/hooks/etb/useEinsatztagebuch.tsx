import { EtbEntryDto } from '@bluelight-hub/shared/client';
import { EtbControllerFindAllV1StatusEnum } from '@bluelight-hub/shared/client/apis/EinsatztagebuchApi';
import { CreateEtbDto } from '@bluelight-hub/shared/client/models/CreateEtbDto';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { logger } from '../../utils/logger';

/**
 * Query keys für die Einsatztagebuch-Abfragen
 */
const ETB_KEYS = {
    all: ['etb'] as const,
    entries: () => [...ETB_KEYS.all, 'entries'] as const,
    entry: (id: string) => [...ETB_KEYS.entries(), id] as const,
};

/**
 * Interface für die Filter-Parameter der Einsatztagebuch-Abfrage
 */
export interface EtbFilterParams {
    /**
     * Gibt an, ob überschriebene Einträge eingeschlossen werden sollen
     */
    includeUeberschrieben?: boolean;
    /**
     * Filter für den Status der Einträge
     */
    status?: EtbControllerFindAllV1StatusEnum;
}

/**
 * Hook für die Verwaltung der Einsatztagebuch-Daten
 * Verwendet React Query für die Kommunikation mit dem Backend
 */
export const useEinsatztagebuch = (filterParams: EtbFilterParams = {}) => {
    const queryClient = useQueryClient();

    /**
     * Abfrage der Einsatztagebuch-Daten
     */
    const {
        data: entriesData,
        isLoading,
        error,
    } = useQuery({
        queryKey: [...ETB_KEYS.entries(), filterParams],
        queryFn: async () => {
            try {
                const response = await api.etb.etbControllerFindAllV1(
                    {
                        includeUeberschrieben: filterParams.includeUeberschrieben,
                        status: filterParams.status
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );
                return response.data.entries || [];
            } catch (err) {
                logger.error('Fehler beim Abrufen der Einsatztagebuch-Daten:', err);
                throw err;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 Minuten
    });

    /**
     * Mutation zum Archivieren eines Einsatztagebucheintrags
     */
    const archiveEinsatztagebuchEintrag = useMutation({
        mutationFn: async ({ nummer }: { nummer: number }) => {
            // Finde den Eintrag
            const entry = entriesData?.find(item => item.laufendeNummer === nummer);
            if (!entry) {
                throw new Error(`Eintrag mit Nummer ${nummer} nicht gefunden`);
            }
            return api.etb.etbControllerCloseEntryV1({ id: entry.id });
        },
        onMutate: async ({ nummer }) => {
            // Optimistic Update
            await queryClient.cancelQueries({ queryKey: [...ETB_KEYS.entries(), filterParams] });

            // Snapshot des vorherigen Zustands
            const previousEntries = queryClient.getQueryData<EtbEntryDto[]>([...ETB_KEYS.entries(), filterParams]);

            // Optimistic update
            queryClient.setQueryData<EtbEntryDto[]>([...ETB_KEYS.entries(), filterParams], old => {
                if (!old) return [];
                return old.map((item) =>
                    item.laufendeNummer === nummer ? { ...item, istAbgeschlossen: true } : item
                );
            });

            return { previousEntries };
        },
        onError: (err, _, context) => {
            logger.error('Fehler beim Archivieren des Eintrags:', err);
            // Zurücksetzen bei Fehler
            if (context?.previousEntries) {
                queryClient.setQueryData([...ETB_KEYS.entries(), filterParams], context.previousEntries);
            }
        },
        onSettled: () => {
            // Cache nach Abschluss aktualisieren
            queryClient.invalidateQueries({ queryKey: ETB_KEYS.entries() });
        },
    });

    /**
     * Mutation zum Überschreiben eines Einsatztagebucheintrags
     */
    const ueberschreibeEinsatztagebuchEintrag = useMutation({
        mutationFn: async ({
            id,
            beschreibung
        }: {
            id: string;
            beschreibung: string;
        }) => {
            return api.etb.etbControllerUeberschreibeEintragV1({
                id,
                ueberschreibeEtbDto: {
                    beschreibung,
                    kategorie: 'KORREKTUR',
                    timestampEreignis: new Date().toISOString()
                }
            });
        },
        onSuccess: () => {
            // Cache nach Abschluss aktualisieren
            queryClient.invalidateQueries({ queryKey: ETB_KEYS.entries() });
        },
        onError: (err) => {
            logger.error('Fehler beim Überschreiben des Eintrags:', err);
        }
    });

    /**
     * Mutation zum Erstellen eines neuen Einsatztagebucheintrags
     */
    const createEinsatztagebuchEintrag = useMutation({
        mutationKey: ['createEinsatztagebuchEintrag'],
        mutationFn: async (newEntry: Partial<EtbEntryDto>) => {
            // API-Aufruf vorbereiten
            const createDto: CreateEtbDto = {
                timestampEreignis: new Date().toISOString(),
                kategorie: newEntry.kategorie || 'USER',
                beschreibung: newEntry.beschreibung || '',
                titel: `${newEntry.autorName} -> ${newEntry.abgeschlossenVon}`,
            };

            return api.etb.etbControllerCreateV1({ createEtbDto: createDto });
        },
        onMutate: async (newEntry) => {
            // Optimistic Update
            await queryClient.cancelQueries({ queryKey: [...ETB_KEYS.entries(), filterParams] });

            // Snapshot des vorherigen Zustands
            const previousEntries = queryClient.getQueryData<EtbEntryDto[]>([...ETB_KEYS.entries(), filterParams]);

            // Temporärer Eintrag für optimistic update
            const tempId = `temp-${Math.random().toString(36).substring(2, 11)}`;
            const tempEntry: EtbEntryDto = {
                id: tempId,
                laufendeNummer: (previousEntries?.length || 0) + 1,
                timestampErstellung: new Date(),
                timestampEreignis: new Date(),
                autorId: newEntry.autorId || '',
                kategorie: newEntry.kategorie || 'USER',
                beschreibung: newEntry.beschreibung || '',
                titel: `${newEntry.autorName} -> ${newEntry.abgeschlossenVon}`,
                autorName: `${newEntry.autorName} -> ${newEntry.abgeschlossenVon}`,
                autorRolle: null,
                referenzEinsatzId: null,
                referenzPatientId: null,
                referenzEinsatzmittelId: null,
                systemQuelle: null,
                version: 0,
                istAbgeschlossen: false,
                timestampAbschluss: null,
                abgeschlossenVon: null,
                status: EtbControllerFindAllV1StatusEnum.Aktiv
            };

            // Optimistic update
            queryClient.setQueryData<EtbEntryDto[]>([...ETB_KEYS.entries(), filterParams], old => {
                if (!old) return [tempEntry];
                return [...old, tempEntry];
            });

            return { previousEntries, tempId };
        },
        onError: (err, _, context) => {
            logger.error('Fehler beim Erstellen des Eintrags:', err);
            // Zurücksetzen bei Fehler
            if (context?.previousEntries) {
                queryClient.setQueryData([...ETB_KEYS.entries(), filterParams], context.previousEntries);
            }
        },
        onSettled: () => {
            // Cache nach Abschluss aktualisieren
            queryClient.invalidateQueries({ queryKey: ETB_KEYS.entries() });
        },
    });

    return {
        einsatztagebuch: {
            data: { items: entriesData || [] },
            isLoading,
            error,
            refetch: () => queryClient.invalidateQueries({ queryKey: [...ETB_KEYS.entries(), filterParams] }),
        },
        archiveEinsatztagebuchEintrag,
        createEinsatztagebuchEintrag,
        ueberschreibeEinsatztagebuchEintrag
    };
}; 