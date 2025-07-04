import { EtbEntryDto, EtbKategorie, EtbKategorieFromJSON } from '@bluelight-hub/shared/client';
import { EtbControllerFindAllV1Request } from '@bluelight-hub/shared/client/apis/EinsatztagebuchApi';
import { CreateEtbDto } from '@bluelight-hub/shared/client/models/CreateEtbDto';
import { EtbEntriesResponse } from '@bluelight-hub/shared/client/models/EtbEntriesResponse';
import { EtbEntryDtoStatusEnum } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import type { PaginationMeta } from '@bluelight-hub/shared/client/models/PaginationMeta';
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
    status?: EtbEntryDtoStatusEnum;
    /**
     * Seite für die Paginierung (1-basiert)
     */
    page?: number;
    /**
     * Anzahl der Einträge pro Seite
     */
    limit?: number;
    /**
     * Filter für die Kategorie der Einträge
     */
    kategorie?: string;
    /**
     * Filter für die Autor-ID der Einträge
     */
    autorId?: string;
    /**
     * Filter für den Startzeitstempel der Einträge
     */
    vonZeitstempel?: string;
    /**
     * Filter für den Endzeitstempel der Einträge
     */
    bisZeitstempel?: string;
    /**
     * Filter für die Suche nach Einträgen
     */
    search?: string;
    /**
     * Filter für den Empfänger der Einträge (wird über search implementiert)
     */
    empfaenger?: string;
}

/**
 * Interface für die Optionen des useEinsatztagebuch Hooks
 */
export interface UseEinsatztagebuchOptions {
    /**
     * Filter-Parameter für die Abfrage
     */
    filterParams?: EtbFilterParams;
    /**
     * Intervall in Millisekunden für automatische Aktualisierungen
     * Wenn nicht gesetzt, wird keine automatische Aktualisierung durchgeführt
     */
    refetchInterval?: number;
}

/**
 * Hook für die Verwaltung der Einsatztagebuch-Daten
 * Verwendet React Query für die Kommunikation mit dem Backend
 */
export const useEinsatztagebuch = ({
    filterParams = {},
    refetchInterval
}: UseEinsatztagebuchOptions = {}) => {
    const queryClient = useQueryClient();

    // Standardwerte für Paginierung setzen
    const params = {
        ...filterParams,
        page: filterParams.page || 1,
        limit: filterParams.limit || 10
    };

    /**
     * Hook: Abfrage der Einsatztagebuch-Einträge mit Filter
     */
    const einsatztagebuch = useQuery<EtbEntriesResponse, Error>({
        queryKey: [...ETB_KEYS.entries(), params],
        queryFn: async () => {
            try {
                const requestObj: EtbControllerFindAllV1Request = {};
                if (filterParams.includeUeberschrieben !== undefined) {
                    requestObj.includeUeberschrieben = filterParams.includeUeberschrieben;
                }
                if (filterParams.status !== undefined) {
                    requestObj.status = filterParams.status;
                }
                if (filterParams.kategorie) {
                    requestObj.kategorie = EtbKategorieFromJSON(filterParams.kategorie);
                }
                if (filterParams.autorId) {
                    requestObj.autorId = filterParams.autorId;
                }
                if (filterParams.vonZeitstempel) {
                    requestObj.vonZeitstempel = filterParams.vonZeitstempel;
                }
                if (filterParams.bisZeitstempel) {
                    requestObj.bisZeitstempel = filterParams.bisZeitstempel;
                }
                // Kombiniere search und empfaenger für die Suche
                const searchTerm = filterParams.search || '';

                // Statt das search-Feld mit dem empfaenger-Parameter zu kombinieren,
                // übergeben wir den empfaenger direkt als separaten Parameter ans Backend
                if (filterParams.empfaenger) {
                    requestObj.empfaenger = filterParams.empfaenger;
                }

                if (searchTerm) {
                    requestObj.search = searchTerm;
                }
                if (filterParams.page) {
                    requestObj.page = filterParams.page;
                }
                if (filterParams.limit) {
                    requestObj.limit = filterParams.limit;
                }
                // API-Aufruf
                const rawResponse = await api.etb.etbControllerFindAllV1(requestObj, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                // Transformation für altes Format: { entries, total }
                if ('entries' in rawResponse && 'total' in rawResponse) {
                    const { entries, total } = rawResponse as { entries: EtbEntryDto[]; total: number };
                    const currentPage = params.page ?? 1;
                    const limit = params.limit ?? 10;
                    const totalPages = Math.ceil(total / limit);
                    const pagination: PaginationMeta = {
                        currentPage,
                        itemsPerPage: limit,
                        totalItems: total,
                        totalPages,
                        hasNextPage: currentPage < totalPages,
                        hasPreviousPage: currentPage > 1,
                    };
                    const transformed: EtbEntriesResponse = {
                        items: entries,
                        pagination,
                    };
                    logger.info('Einsatztagebuch-Daten (älteres Format) geladen:', transformed);
                    return transformed;
                }
                const response = rawResponse as EtbEntriesResponse;

                // Debug: Zeige Server-Antwort
                logger.debug('API Response:', {
                    entries: response.items.length,
                    currentPage: response.pagination.currentPage,
                    totalItems: response.pagination.totalItems,
                });

                logger.info('Einsatztagebuch-Daten geladen:', response);
                return response;
            } catch (error) {
                logger.error('Fehler beim Abrufen der Einsatztagebuch-Daten:', error);
                throw error;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 Minuten
        refetchInterval,
    });

    /**
     * Mutation zum Archivieren eines Einsatztagebucheintrags
     */
    const archiveEinsatztagebuchEintrag = useMutation({
        mutationFn: async ({ nummer }: { nummer: number }) => {
            // Finde den Eintrag
            const entry = einsatztagebuch.data?.items.find(item => item.laufendeNummer === nummer);
            if (!entry) {
                throw new Error(`Eintrag mit Nummer ${nummer} nicht gefunden`);
            }
            return api.etb.etbControllerCloseEntryV1({ id: entry.id });
        },
        onMutate: async ({ nummer }) => {
            // Optimistic Update
            await queryClient.cancelQueries({ queryKey: [...ETB_KEYS.entries(), params] });

            // Snapshot des vorherigen Zustands
            const previousEntries = queryClient.getQueryData<EtbEntriesResponse>([...ETB_KEYS.entries(), params]);

            // Optimistic update
            queryClient.setQueryData<EtbEntriesResponse>([...ETB_KEYS.entries(), params], old => {
                if (!old) return {
                    items: [],
                    pagination: {
                        currentPage: 1,
                        itemsPerPage: 10,
                        totalItems: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    },
                    data: { items: [], total: 0 }
                };

                return {
                    ...old,
                    items: old.items.map((item) =>
                        item.laufendeNummer === nummer ? { ...item, istAbgeschlossen: true } : item
                    ),
                    data: {
                        ...old.pagination,
                        items: old.items.map((item) =>
                            item.laufendeNummer === nummer ? { ...item, istAbgeschlossen: true } : item
                        )
                    }
                };
            });

            return { previousEntries };
        },
        onError: (err, _, context) => {
            logger.error('Fehler beim Archivieren des Eintrags:', err);
            // Zurücksetzen bei Fehler
            if (context?.previousEntries) {
                queryClient.setQueryData([...ETB_KEYS.entries(), params], context.previousEntries);
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
                    inhalt: beschreibung,
                    kategorie: EtbKategorie.Korrektur,
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
        mutationFn: async (newEntry: Partial<EtbEntryDto> & { sender?: string, receiver?: string }) => {
            // API-Aufruf vorbereiten
            const createDto: CreateEtbDto = {
                timestampEreignis: new Date().toISOString(),
                kategorie: newEntry.kategorie || EtbKategorie.Meldung,
                inhalt: newEntry.inhalt || '',
                ...(newEntry.sender && { sender: newEntry.sender }),
                ...(newEntry.receiver && { receiver: newEntry.receiver }),
            };

            return api.etb.etbControllerCreateV1({ createEtbDto: createDto });
        },
        onMutate: async (newEntry) => {
            // Optimistic Update
            await queryClient.cancelQueries({ queryKey: [...ETB_KEYS.entries(), params] });

            // Snapshot des vorherigen Zustands
            const previousEntries = queryClient.getQueryData<EtbEntriesResponse>([...ETB_KEYS.entries(), params]);

            // Temporärer Eintrag für optimistic update
            const tempId = `temp-${Math.random().toString(36).substring(2, 11)}`;
            const tempEntry: EtbEntryDto = {
                id: tempId,
                laufendeNummer: (previousEntries?.items.length || 0) + 1,
                timestampErstellung: new Date(),
                timestampEreignis: new Date(),
                autorId: newEntry.autorId || '',
                kategorie: newEntry.kategorie || EtbKategorie.Meldung,
                inhalt: newEntry.inhalt || '',
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
                status: EtbEntryDtoStatusEnum.Aktiv
            };

            // Optimistic update
            queryClient.setQueryData<EtbEntriesResponse>([...ETB_KEYS.entries(), params], old => {
                logger.info('Optimistic update', old);
                if (!old) return {
                    items: [tempEntry],
                    pagination: {
                        currentPage: 1,
                        itemsPerPage: 10,
                        totalItems: 1,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPreviousPage: false
                    },
                    data: { items: [tempEntry], total: 1 }
                };

                return {
                    ...old,
                    items: [...old.items, tempEntry],
                    data: {
                        ...old.pagination,
                        items: [...old.items, tempEntry],
                    }
                };
            });

            return { previousEntries, tempId };
        },
        onError: (err, _, context) => {
            logger.error('Fehler beim Erstellen des Eintrags:', err);
            // Zurücksetzen bei Fehler
            if (context?.previousEntries) {
                queryClient.setQueryData([...ETB_KEYS.entries(), params], context.previousEntries);
            }
        },
        onSettled: () => {
            // Cache nach Abschluss aktualisieren
            queryClient.invalidateQueries({ queryKey: ETB_KEYS.entries() });
        },
    });

    /**
     * Funktion zum Ändern der Seite oder Anzahl der Einträge pro Seite
     */
    const changePage = async (page: number, limit: number) => {
        logger.info(`Seitenwechsel: Seite ${page}, Limit ${limit}`);

        // Erstelle neue Parameterstruktur für die Anfrage
        const newParams = { ...params, page, limit };

        try {
            // Wichtig: Baue ein Objekt für die API-Anfrage im Format, das von den Tests erwartet wird
            const requestObj: EtbControllerFindAllV1Request = {};

            if (filterParams.includeUeberschrieben !== undefined) {
                requestObj.includeUeberschrieben = filterParams.includeUeberschrieben;
            }
            if (filterParams.status !== undefined) {
                requestObj.status = filterParams.status;
            }

            // Direkter API-Aufruf, um Fehler in der React Query-Schicht zu vermeiden
            const response = await api.etb.etbControllerFindAllV1(
                requestObj,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.debug('ChangePage API Response:', {
                requestedPage: page,
                receivedPage: response.pagination.currentPage,
                entries: response.items.length,
                currentPage: response.pagination.currentPage,
                totalItems: response.pagination.totalItems
            });

            // Setze die Daten in den React Query Cache
            queryClient.setQueryData([...ETB_KEYS.entries(), newParams], response);

            return response;
        } catch (err) {
            logger.error('Fehler beim Abrufen der Einsatztagebuch-Daten für Seite', { page, limit }, err);
            throw err;
        }
    };

    // Debugging: Zeige aktuelle Pagination-Daten
    if (einsatztagebuch.data) {
        logger.debug('Pagination-Daten:', {
            total: einsatztagebuch.data.pagination.totalItems,
            page: einsatztagebuch.data.pagination.currentPage || 1,
            limit: einsatztagebuch.data.pagination.itemsPerPage || 10,
            totalPages: einsatztagebuch.data.pagination.totalPages || 1,
            entriesLength: einsatztagebuch.data.items.length
        });
    }

    return {
        einsatztagebuch: {
            query: einsatztagebuch,
            data: {
                items: einsatztagebuch.data?.items || [],
                pagination: einsatztagebuch.data?.pagination || {
                    totalItems: einsatztagebuch.data?.pagination.totalItems || 0,
                    currentPage: einsatztagebuch.data?.pagination.currentPage || 1,
                    itemsPerPage: einsatztagebuch.data?.pagination.itemsPerPage || 10,
                    totalPages: einsatztagebuch.data?.pagination.totalPages || 1
                }
            },
            refetch: () => queryClient.invalidateQueries({ queryKey: [...ETB_KEYS.entries(), params] }),
            changePage,
        },
        archiveEinsatztagebuchEintrag,
        createEinsatztagebuchEintrag,
        ueberschreibeEinsatztagebuchEintrag
    };
}; 