import { useState } from 'react';
import { JournalEntryDto } from '../../components/organisms/etb/ETBEntryForm';

/**
 * Hook für die Verwaltung der Einsatztagebuch-Daten
 * Später kann dieser Hook durch einen API-Client ersetzt werden
 */
export const useEinsatztagebuch = () => {
    // Mock-Daten als Ausgangspunkt
    const [einsatztagebuchData, setEinsatztagebuchData] = useState<{
        data: { items: JournalEntryDto[] };
    }>({
        data: {
            items: [
                {
                    id: '1',
                    nummer: 1,
                    type: 'USER',
                    timestamp: new Date(),
                    sender: 'ELRD',
                    receiver: 'RTW-1',
                    content: 'Fahren Sie zum Einsatzort',
                    archived: false,
                },
                {
                    id: '2',
                    nummer: 2,
                    type: 'LAGEMELDUNG',
                    timestamp: new Date(),
                    sender: 'RTW-1',
                    receiver: 'ELRD',
                    content: 'Am Einsatzort eingetroffen',
                    archived: false,
                },
                {
                    id: '3',
                    nummer: 3,
                    type: 'RESSOURCEN',
                    timestamp: new Date(),
                    sender: 'ELRD',
                    receiver: 'NEF-1',
                    content: 'Nachforderung eines NEF',
                    archived: false,
                },
            ],
        },
    });

    /**
     * Archiviert einen Einsatztagebucheintrag
     */
    const archiveEinsatztagebuchEintrag = {
        mutate: ({ nummer }: { nummer: number }) => {
            setEinsatztagebuchData((prev) => ({
                data: {
                    items: prev.data.items.map((item) =>
                        item.nummer === nummer ? { ...item, archived: true } : item
                    ),
                },
            }));
        },
        mutateAsync: ({ nummer }: { nummer: number }) =>
            new Promise<void>((resolve) => {
                setEinsatztagebuchData((prev) => ({
                    data: {
                        items: prev.data.items.map((item) =>
                            item.nummer === nummer ? { ...item, archived: true } : item
                        ),
                    },
                }));
                resolve();
            }),
    };

    /**
     * Erstellt einen neuen Einsatztagebucheintrag
     */
    const createEinsatztagebuchEintrag = {
        mutate: (newEntry: Partial<JournalEntryDto>) => {
            setEinsatztagebuchData((prev) => ({
                data: {
                    items: [
                        ...prev.data.items,
                        {
                            ...newEntry,
                            id: Math.random().toString(),
                            nummer: prev.data.items.length + 1,
                            timestamp: new Date(),
                            archived: false,
                            type: newEntry.type || 'USER',
                        } as JournalEntryDto,
                    ],
                },
            }));
        },
        mutateAsync: (newEntry: Partial<JournalEntryDto>) =>
            new Promise<void>((resolve) => {
                setEinsatztagebuchData((prev) => ({
                    data: {
                        items: [
                            ...prev.data.items,
                            {
                                ...newEntry,
                                id: Math.random().toString(),
                                nummer: prev.data.items.length + 1,
                                timestamp: new Date(),
                                archived: false,
                                type: newEntry.type || 'USER',
                            } as JournalEntryDto,
                        ],
                    },
                }));
                resolve();
            }),
    };

    return {
        einsatztagebuch: einsatztagebuchData,
        archiveEinsatztagebuchEintrag,
        createEinsatztagebuchEintrag,
    };
}; 