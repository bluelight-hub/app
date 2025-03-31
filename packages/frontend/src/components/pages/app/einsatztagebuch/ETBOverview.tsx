import { ETBFormWrapper } from '@molecules/etb/ETBFormWrapper';
import { ETBHeader } from '@molecules/etb/ETBHeader';
import { ETBCardList } from '@organisms/etb/ETBCardList';
import { ETBEntryForm, JournalEntryDto } from '@organisms/etb/ETBEntryForm';
import { ETBTable } from '@organisms/etb/ETBTable';
import { Drawer } from 'antd';
import { format } from 'date-fns';
import React, { useCallback, useRef, useState } from 'react';
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
    const { fahrzeuge } = useFahrzeuge();

    // States für UI
    const [inputVisible, setInputVisible] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [editingEintrag, setEditingEintrag] = useState<JournalEntryDto | null>(null);
    const parentRef = useRef<HTMLDivElement>(null);

    /**
     * Öffnet den Drawer zur Bearbeitung eines Eintrags
     */
    const modifyEntry = useCallback((entry: JournalEntryDto) => {
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
    const handleEditFormSubmit = async (data: Partial<JournalEntryDto>) => {
        if (editingEintrag) {
            await createEinsatztagebuchEintrag.mutateAsync({
                ...data,
                type: 'KORREKTUR',
                timestamp: editingEintrag.timestamp,
            });
            await archiveEinsatztagebuchEintrag.mutateAsync({ nummer: editingEintrag.nummer });
            setIsOpen(false);
            setEditingEintrag(null);
        }
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <ETBHeader inputVisible={inputVisible} setInputVisible={setInputVisible} />

            {/* Formular für neuen Eintrag */}
            <ETBFormWrapper inputVisible={inputVisible} closeForm={() => setInputVisible(false)}>
                <ETBEntryForm
                    onSubmitSuccess={(data) => {
                        createEinsatztagebuchEintrag.mutate({
                            ...data,
                            type: 'USER',
                        });
                        setInputVisible(false);
                    }}
                    onCancel={() => setInputVisible(false)}
                />
            </ETBFormWrapper>

            {/* Tabelle oder Karten-Liste */}
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
                        fahrzeugeImEinsatz={fahrzeuge.data?.data.fahrzeugeImEinsatz || []}
                        isLoading={!einsatztagebuch}
                        isEditing={isOpen}
                    />
                )}
            </div>

            {/* Drawer für Bearbeitung */}
            <Drawer
                open={isOpen}
                onClose={onDrawerClose}
                title={
                    editingEintrag && `Eintrag ${editingEintrag.nummer} von 
          ${format(editingEintrag.timestamp, natoDateTime)} bearbeiten`
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