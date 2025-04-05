import { formatNatoDateTime } from '@/utils/date';
import { EtbEntryDto } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import { ETBFormWrapper } from '@molecules/etb/ETBFormWrapper';
import { ETBHeader } from '@molecules/etb/ETBHeader';
import { ETBCardList } from '@organisms/etb/ETBCardList';
import { ETBEntryForm, ETBEntryFormData } from '@organisms/etb/ETBEntryForm';
import { ETBTable } from '@organisms/etb/ETBTable';
import { Alert, Drawer, Space, Spin, Switch, Typography } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEinsatztagebuch } from '../../../../hooks/etb/useEinsatztagebuch';
import { useFahrzeuge } from '../../../../hooks/etb/useFahrzeuge';

/**
 * Vereinfachter Mobile-Check
 */
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

/**
 * Komponente zur Anzeige des Einsatztagebuchs
 */
export const ETBOverview: React.FC = () => {
    // State für Filter
    const [includeUeberschrieben, setIncludeUeberschrieben] = useState(false);

    // Hooks für Daten
    const {
        einsatztagebuch,
        archiveEinsatztagebuchEintrag,
        createEinsatztagebuchEintrag,
        ueberschreibeEinsatztagebuchEintrag
    } = useEinsatztagebuch({
        includeUeberschrieben
    });
    const { fahrzeuge, error: fahrzeugeError, refreshFahrzeuge } = useFahrzeuge();

    // States für UI
    const [inputVisible, setInputVisible] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [editingEintrag, setEditingEintrag] = useState<EtbEntryDto | null>(null);
    const [isUeberschreibeModus, setIsUeberschreibeModus] = useState(false);
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
        setIsUeberschreibeModus(true);
    }, []);

    /**
     * Schließt den Drawer
     */
    const onDrawerClose = useCallback(() => {
        setEditingEintrag(null);
        setIsOpen(false);
        setIsUeberschreibeModus(false);
    }, []);

    /**
     * Submit-Handler für das Formular
     */
    const handleEditFormSubmit = async (data: Partial<ETBEntryFormData>) => {
        if (editingEintrag && isUeberschreibeModus) {
            // Überschreiben des Eintrags
            await ueberschreibeEinsatztagebuchEintrag.mutateAsync({
                id: editingEintrag.id,
                beschreibung: data.content || ''
            });
            setIsOpen(false);
            setEditingEintrag(null);
            setIsUeberschreibeModus(false);
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
                        onUeberschreibeEntry={modifyEntry}
                    />
                ) : (
                    // Desktop-Ansicht
                    <ETBTable
                        entries={einsatztagebuch?.data.items || []}
                        onEditEntry={modifyEntry}
                        onArchiveEntry={(nummer) => archiveEinsatztagebuchEintrag.mutate({ nummer })}
                            onUeberschreibeEntry={modifyEntry}
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

            {/* Filter-Optionen */}
            <div className="mt-4 mb-2">
                <Space align="center">
                    <Typography.Text>Überschriebene Einträge anzeigen:</Typography.Text>
                    <Switch
                        checked={includeUeberschrieben}
                        onChange={setIncludeUeberschrieben}
                        data-testid="toggle-ueberschrieben-switch"
                    />
                </Space>
            </div>

            {/* Formular für neuen Eintrag */}
            <ETBFormWrapper inputVisible={inputVisible} closeForm={() => setInputVisible(false)}>
                <ETBEntryForm
                    onSubmitSuccess={(data) => {
                        createEinsatztagebuchEintrag.mutate({
                            autorName: data.sender,
                            abgeschlossenVon: data.receiver,
                            beschreibung: data.content,
                            kategorie: 'USER',
                        });
                        setInputVisible(false);
                    }}
                    onCancel={() => setInputVisible(false)}
                />
            </ETBFormWrapper>

            {/* Hauptinhalt */}
            {renderContent()}

            {/* Drawer für Überschreiben */}
            <Drawer
                open={isOpen}
                onClose={onDrawerClose}
                title={
                    editingEintrag && isUeberschreibeModus
                        ? `Eintrag ${editingEintrag.laufendeNummer} von 
                            ${formatNatoDateTime(editingEintrag.timestampEreignis)} überschreiben`
                        : (editingEintrag ? `Eintrag ${editingEintrag.laufendeNummer} bearbeiten` : '')
                }
            >
                {editingEintrag && (
                    <ETBEntryForm
                        editingEntry={editingEintrag}
                        onSubmitSuccess={handleEditFormSubmit}
                        onCancel={onDrawerClose}
                        isEditMode={!isUeberschreibeModus}
                    />
                )}
            </Drawer>
        </div>
    );
}; 