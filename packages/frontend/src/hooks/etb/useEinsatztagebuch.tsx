import { EtbEntryDto } from '@bluelight-hub/shared/client';
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
 * Hook für die Verwaltung der Einsatztagebuch-Daten
 * Verwendet React Query für die Kommunikation mit dem Backend
 */
export const useEinsatztagebuch = () => {
    const queryClient = useQueryClient();

    /**
     * Abfrage der Einsatztagebuch-Daten
     */
    const {
        data: entriesData,
        isLoading,
        error,
    } = useQuery({
        queryKey: ETB_KEYS.entries(),
        queryFn: async () => {
            try {
                const response = await api.etb.etbControllerFindAllV1({}, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
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
            await queryClient.cancelQueries({ queryKey: ETB_KEYS.entries() });

            // Snapshot des vorherigen Zustands
            const previousEntries = queryClient.getQueryData<EtbEntryDto[]>(ETB_KEYS.entries());

            // Optimistic update
            queryClient.setQueryData<EtbEntryDto[]>(ETB_KEYS.entries(), old => {
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
                queryClient.setQueryData(ETB_KEYS.entries(), context.previousEntries);
            }
        },
        onSettled: () => {
            // Cache nach Abschluss aktualisieren
            queryClient.invalidateQueries({ queryKey: ETB_KEYS.entries() });
        },
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
            await queryClient.cancelQueries({ queryKey: ETB_KEYS.entries() });

            // Snapshot des vorherigen Zustands
            const previousEntries = queryClient.getQueryData<EtbEntryDto[]>(ETB_KEYS.entries());

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
                abgeschlossenVon: null
            };

            // Optimistic update
            queryClient.setQueryData<EtbEntryDto[]>(ETB_KEYS.entries(), old => {
                if (!old) return [tempEntry];
                return [...old, tempEntry];
            });

            return { previousEntries, tempId };
        },
        onError: (err, _, context) => {
            logger.error('Fehler beim Erstellen des Eintrags:', err);
            // Zurücksetzen bei Fehler
            if (context?.previousEntries) {
                queryClient.setQueryData(ETB_KEYS.entries(), context.previousEntries);
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
            refetch: () => queryClient.invalidateQueries({ queryKey: ETB_KEYS.entries() }),
        },
        archiveEinsatztagebuchEintrag,
        createEinsatztagebuchEintrag,
    };
}; 