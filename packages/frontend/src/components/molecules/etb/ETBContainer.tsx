import { useEinsatztagebuch } from '@/hooks/etb/useEinsatztagebuch';
import { logger } from '@/utils/logger';
import { Form, Input, Modal } from 'antd';
import { useState } from 'react';
import { ETBTable } from '../../organisms/etb/ETBTable';

/**
 * Props für die ETBContainer-Komponente
 */
interface ETBContainerProps {
    /**
     * Gibt an, ob automatische Aktualisierungen aktiviert werden sollen
     */
    enableAutoRefresh?: boolean;
    /**
     * Intervall für automatische Aktualisierungen in Millisekunden
     */
    refreshInterval?: number;
}

/**
 * Container-Komponente für das Einsatztagebuch
 * Verwaltet die Datenabfrage und Paginierung
 */
export const ETBContainer: React.FC<ETBContainerProps> = ({
    enableAutoRefresh = true,
    refreshInterval = 15000, // 15 Sekunden
}) => {
    // Paginierungs-Status
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Überschreiben-Modal Status
    const [isUeberschreibenModalVisible, setIsUeberschreibenModalVisible] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<{ id: string; beschreibung: string } | null>(null);
    const [form] = Form.useForm();

    // Hook für die Einsatztagebuch-Daten
    const {
        einsatztagebuch,
        archiveEinsatztagebuchEintrag,
        ueberschreibeEinsatztagebuchEintrag
    } = useEinsatztagebuch({
        filterParams: { page, limit: pageSize },
        refetchInterval: enableAutoRefresh ? refreshInterval : undefined
    });

    /**
     * Handler für Seitenwechsel
     */
    const handlePageChange = async (newPage: number, newPageSize: number) => {
        logger.info('Seitenwechsel angefordert:', { newPage, newPageSize, currentPage: page, currentPageSize: pageSize });

        try {
            // Nur API-Aufruf wenn sich die Werte geändert haben
            if (newPage !== page || newPageSize !== pageSize) {
                await einsatztagebuch.changePage(newPage, newPageSize);
                setPage(newPage);
                setPageSize(newPageSize);
                logger.info('Seitenwechsel abgeschlossen:', { page: newPage, pageSize: newPageSize });
            }
        } catch (error) {
            logger.error('Fehler beim Seitenwechsel:', error);
        }
    };

    /**
     * Handler für das Archivieren eines Eintrags
     */
    const handleArchiveEntry = (nummer: number) => {
        archiveEinsatztagebuchEintrag.mutate({ nummer }, {
            onSuccess: () => {
                logger.info(`Eintrag ${nummer} erfolgreich archiviert`);
                einsatztagebuch.refetch();
            },
            onError: (error) => {
                logger.error(`Fehler beim Archivieren des Eintrags ${nummer}:`, error);
            }
        });
    };

    /**
     * Öffnet das Modal zum Überschreiben eines Eintrags
     */
    const handleUeberschreibenOpen = (entry: { id: string; beschreibung: string }) => {
        setCurrentEntry(entry);
        form.setFieldsValue({ beschreibung: entry.beschreibung });
        setIsUeberschreibenModalVisible(true);
    };

    /**
     * Speichert die Überschreibung eines Eintrags
     */
    const handleUeberschreibenSubmit = () => {
        if (!currentEntry) return;

        form.validateFields().then(values => {
            ueberschreibeEinsatztagebuchEintrag.mutate({
                id: currentEntry.id,
                beschreibung: values.beschreibung
            }, {
                onSuccess: () => {
                    logger.info(`Eintrag ${currentEntry.id} erfolgreich überschrieben`);
                    setIsUeberschreibenModalVisible(false);
                    setCurrentEntry(null);
                    form.resetFields();
                    einsatztagebuch.refetch();
                },
                onError: (error) => {
                    logger.error(`Fehler beim Überschreiben des Eintrags:`, error);
                }
            });
        });
    };

    /**
     * Schließt das Modal zum Überschreiben eines Eintrags
     */
    const handleUeberschreibenCancel = () => {
        setIsUeberschreibenModalVisible(false);
        setCurrentEntry(null);
        form.resetFields();
    };

    // Debugging-Informationen
    logger.debug('ETBContainer Render:', {
        dataState: {
            items: einsatztagebuch.data.items.length,
            pagination: einsatztagebuch.data.pagination,
            loading: einsatztagebuch.query.isLoading,
            fetching: einsatztagebuch.query.isFetching,
        },
        componentState: {
            page,
            pageSize,
            isModalVisible: isUeberschreibenModalVisible,
        }
    });

    return (
        <div className="etb-container">
            <ETBTable
                entries={einsatztagebuch.data.items}
                isLoading={einsatztagebuch.query.isLoading || einsatztagebuch.query.isFetching}
                isEditing={ueberschreibeEinsatztagebuchEintrag.isPending}
                onArchiveEntry={handleArchiveEntry}
                onUeberschreibeEntry={(entry) => handleUeberschreibenOpen({ id: entry.id, beschreibung: entry.beschreibung })}
                pagination={einsatztagebuch.data.pagination ? {
                    ...einsatztagebuch.data.pagination,
                    hasNextPage: einsatztagebuch.data.pagination.currentPage < einsatztagebuch.data.pagination.totalPages,
                    hasPreviousPage: einsatztagebuch.data.pagination.currentPage > 1
                } : undefined}
                onPageChange={handlePageChange}
            />

            <Modal
                title="Eintrag überschreiben"
                open={isUeberschreibenModalVisible}
                onOk={handleUeberschreibenSubmit}
                onCancel={handleUeberschreibenCancel}
                confirmLoading={ueberschreibeEinsatztagebuchEintrag.isPending}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="beschreibung"
                        label="Beschreibung"
                        rules={[{ required: true, message: 'Bitte geben Sie eine Beschreibung ein' }]}
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}; 