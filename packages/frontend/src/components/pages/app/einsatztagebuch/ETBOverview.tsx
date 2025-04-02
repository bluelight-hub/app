import { EtbEntryDto } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import { ETBFormWrapper } from '@molecules/etb/ETBFormWrapper';
import { ETBHeader } from '@molecules/etb/ETBHeader';
import { ETBCardList } from '@organisms/etb/ETBCardList';
import { ETBEntryForm } from '@organisms/etb/ETBEntryForm';
import { ETBTable } from '@organisms/etb/ETBTable';
import { Alert, Drawer, Spin } from 'antd';
import { format } from 'date-fns';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEinsatztagebuch } from '../../../../hooks/etb/useEinsatztagebuch';
import { useFahrzeuge } from '../../../../hooks/etb/useFahrzeuge';
// Mock für natoDateTime
const natoDateTime = 'dd.MM.yyyy HH:mm';

/**
 * Vereinfachter Mobile-Check
 */
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

/**
 * Komponente zur Anzeige des Einsatztagebuchs
 */
export const ETBOverview: React.FC = () => {
    // Hooks für Daten
    const { einsatztagebuch, archiveEinsatztagebuchEintrag, createEinsatztagebuchEintrag } = useEinsatztagebuch();
    const { fahrzeuge, error: fahrzeugeError, refreshFahrzeuge } = useFahrzeuge();

    // States für UI
    const [inputVisible, setInputVisible] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [editingEintrag, setEditingEintrag] = useState<EtbEntryDto | null>(null);
    const parentRef = useRef<HTMLDivElement>(null);

    // Periodisches Aktualisieren der Daten
    useEffect(() => {
        const interval = setInterval(() => {
            refreshFahrzeuge();
        }, 30000); // Alle 30 Sekunden aktualisieren

        return () => clearInterval(interval);
    }, [refreshFahrzeuge]);

    /**
     * Öffnet den Drawer zur Bearbeitung eines Eintrags
     */
    const modifyEntry = useCallback((entry: EtbEntryDto) => {
        setIsOpen(true);
        setEditingEintrag(entry);
    }, []);

    /**
     * Schließt den Drawer
     */
    const onDrawerClose = useCallback(() => {
        setEditingEintrag(null);
        setIsOpen(false);
    }, []);

    /**
     * Submit-Handler für das Formular zur Bearbeitung eines Eintrags
     */
    const handleEditFormSubmit = async (data: Partial<EtbEntryDto>) => {
        if (editingEintrag) {
            await createEinsatztagebuchEintrag.mutateAsync({
                ...data,
                kategorie: 'KORREKTUR',
                timestampEreignis: editingEintrag.timestampEreignis,
            });
            await archiveEinsatztagebuchEintrag.mutateAsync({ nummer: editingEintrag.laufendeNummer });
            setIsOpen(false);
            setEditingEintrag(null);
        }
    };

    /**
     * Rendert den Inhalt basierend auf dem Ladezustand
     */
    const renderContent = () => {
        // Zeige Ladeanimation, wenn Daten geladen werden
        if (einsatztagebuch.isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Spin size="large" tip="Lade Einsatztagebuch..." />
                </div>
            );
        }

        // Zeige Fehler an, falls vorhanden
        if (einsatztagebuch.error) {
            return (
                <Alert
                    message="Fehler beim Laden des Einsatztagebuchs"
                    description={einsatztagebuch.error.toString()}
                    type="error"
                    showIcon
                    className="mb-4"
                    action={
                        <button
                            onClick={() => {
                                einsatztagebuch.refetch();
                            }}
                            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                        >
                            Erneut versuchen
                        </button>
                    }
                />
            );
        }

        // Zeige die Tabelle oder Karten-Liste
        return (
            <div ref={parentRef} className="mt-8">
                {isMobile ? (
                    // Mobile-Ansicht
                    <ETBCardList
                        entries={einsatztagebuch?.data.items || []}
                        onEditEntry={modifyEntry}
                        onArchiveEntry={(nummer) => archiveEinsatztagebuchEintrag.mutate({ nummer })}
                    />
                ) : (
                    // Desktop-Ansicht
                    <ETBTable
                        entries={einsatztagebuch?.data.items || []}
                        onEditEntry={modifyEntry}
                        onArchiveEntry={(nummer) => archiveEinsatztagebuchEintrag.mutate({ nummer })}
                            fahrzeugeImEinsatz={fahrzeuge.data?.fahrzeugeImEinsatz || []}
                            isLoading={einsatztagebuch.isLoading}
                        isEditing={isOpen}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <ETBHeader inputVisible={inputVisible} setInputVisible={setInputVisible} />

            {/* Fahrzeug-Fehler anzeigen, falls vorhanden */}
            {fahrzeugeError && (
                <Alert
                    message="Fehler beim Laden der Fahrzeugdaten"
                    description={fahrzeugeError.toString()}
                    type="warning"
                    showIcon
                    closable
                    className="mt-4 mb-2"
                />
            )}

            {/* Formular für neuen Eintrag */}
            <ETBFormWrapper inputVisible={inputVisible} closeForm={() => setInputVisible(false)}>
                <ETBEntryForm
                    onSubmitSuccess={(data) => {
                        createEinsatztagebuchEintrag.mutate({
                            ...data,
                            kategorie: 'USER',
                        });
                        setInputVisible(false);
                    }}
                    onCancel={() => setInputVisible(false)}
                />
            </ETBFormWrapper>

            {/* Hauptinhalt */}
            {renderContent()}

            {/* Drawer für Bearbeitung */}
            <Drawer
                open={isOpen}
                onClose={onDrawerClose}
                title={
                    editingEintrag && `Eintrag ${editingEintrag.laufendeNummer} von 
          ${format(editingEintrag.timestampEreignis, natoDateTime)} bearbeiten`
                }
            >
                {editingEintrag && (
                    <ETBEntryForm
                        editingEntry={editingEintrag}
                        onSubmitSuccess={handleEditFormSubmit}
                        onCancel={onDrawerClose}
                        isEditMode
                    />
                )}
            </Drawer>
        </div>
    );
}; 