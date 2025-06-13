import { formatNatoDateTime } from '@/utils/date';
import { Einsatz } from '@bluelight-hub/shared/client';
import type { TablePaginationConfig } from 'antd';
import { Empty, Table, TableColumnsType, Tooltip } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { PiEmpty } from 'react-icons/pi';

/**
 * Props für die EinsaetzeTable-Komponente
 */
interface EinsaetzeTableProps {
    /**
     * Die anzuzeigenden Einsätze
     */
    einsaetze: Einsatz[];

    /**
     * Loading-State der Tabelle
     */
    loading?: boolean;

    /**
     * Pagination-Konfiguration
     */
    pagination?: {
        current: number;
        pageSize: number;
        total: number;
    };

    /**
     * Callback für Paginierung
     */
    onPageChange?: (page: number, pageSize: number) => void;

    /**
     * Callback für Sortierung
     */
    onSortChange?: (sorter: any) => void;

    /**
     * Callback für Filter-Änderungen
     */
    onFilterChange?: (filters: Record<string, React.Key[] | null>) => void;

    /**
     * Callback für Einsatz-Auswahl
     */
    onEinsatzSelect?: (einsatzId: string) => void;

    /**
     * Ausgewählte Einsätze für Row Selection
     */
    selectedRowKeys?: React.Key[];

    /**
     * Callback für Row Selection Änderungen
     */
    onSelectionChange?: (selectedRowKeys: React.Key[], selectedRows: Einsatz[]) => void;
}

/**
 * Tabellen-Komponente für die Darstellung von Einsätzen
 * Implementiert Sorting, Pagination und responsive Design mit Ant Design Table
 */
export const EinsaetzeTable: React.FC<EinsaetzeTableProps> = ({
    einsaetze,
    loading = false,
    pagination,
    onPageChange,
    onSortChange,
    onFilterChange,
    onEinsatzSelect,
    selectedRowKeys,
    onSelectionChange,
}) => {

    /**
     * Tabellen-Spalten-Definition
     */
    const columns = useMemo<TableColumnsType<Einsatz>>(() => {
        return [
            {
                title: 'ID',
                dataIndex: 'id',
                key: 'id',
                width: 100,
                ellipsis: true,
                render: (id: string) => (
                    <Tooltip title={id}>
                        <span className="font-mono text-sm">{id.slice(0, 8)}...</span>
                    </Tooltip>
                ),
                responsive: ['lg'], // Nur auf größeren Bildschirmen anzeigen
            },
            {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                width: 200,
                ellipsis: true,
                render: (name: string, record) => (
                    <Tooltip title={name}>
                        <span
                            className="font-medium cursor-pointer text-primary-600 hover:text-primary-700"
                            onClick={() => onEinsatzSelect?.(record.id)}
                        >
                            {name}
                        </span>
                    </Tooltip>
                ),
                sorter: (a, b) => a.name.localeCompare(b.name),
            },
            {
                title: 'Beschreibung',
                dataIndex: 'beschreibung',
                key: 'beschreibung',
                width: 300,
                ellipsis: true,
                render: (beschreibung?: string) => (
                    <Tooltip title={beschreibung || 'Keine Beschreibung'}>
                        <span className="text-gray-600">
                            {beschreibung || '-'}
                        </span>
                    </Tooltip>
                ),
                responsive: ['md'], // Auf Tablets und größer anzeigen
            },
            {
                title: 'Erstellt',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 150,
                render: (createdAt: Date) => {
                    const formattedDate = formatNatoDateTime(createdAt);
                    return (
                        <Tooltip title={dayjs(createdAt).format('DD.MM.YYYY HH:mm')}>
                            <span className="font-mono text-sm">{formattedDate}</span>
                        </Tooltip>
                    );
                },
                sorter: (a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt)),
                sortDirections: ['descend', 'ascend'],
                defaultSortOrder: 'descend', // Neueste zuerst als Standard
            },
            {
                title: 'Aktualisiert',
                dataIndex: 'updatedAt',
                key: 'updatedAt',
                width: 150,
                render: (updatedAt: Date) => {
                    const formattedDate = formatNatoDateTime(updatedAt);
                    return (
                        <Tooltip title={dayjs(updatedAt).format('DD.MM.YYYY HH:mm')}>
                            <span className="font-mono text-sm">{formattedDate}</span>
                        </Tooltip>
                    );
                },
                sorter: (a, b) => dayjs(a.updatedAt).diff(dayjs(b.updatedAt)),
                sortDirections: ['descend', 'ascend'],
                responsive: ['lg'], // Nur auf größeren Bildschirmen anzeigen
            },
        ];
    }, [onEinsatzSelect]);

    /**
     * Row Selection Konfiguration für zukünftige Bulk-Operationen
     */
    const rowSelection = useMemo(() => {
        if (!onSelectionChange) return undefined;

        return {
            selectedRowKeys,
            onChange: onSelectionChange,
            getCheckboxProps: (record: Einsatz) => ({
                name: record.name,
            }),
        };
    }, [selectedRowKeys, onSelectionChange]);

    /**
     * Pagination-Konfiguration
     */
    const paginationConfig: TablePaginationConfig = useMemo(() => ({
        position: ['bottomRight', 'topRight'],
        current: pagination?.current || 1,
        pageSize: pagination?.pageSize || 20,
        total: pagination?.total || einsaetze.length,
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} von ${total} Einsätzen`,
        onChange: onPageChange,
        pageSizeOptions: ['10', '20', '50', '100'],
        hideOnSinglePage: false,
        showQuickJumper: true,
        showTitle: false,
    }), [pagination, einsaetze.length, onPageChange]);

    return (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            <div className="w-full py-2 align-middle sm:px-6 lg:px-8">
                <Table<Einsatz>
                    className="mb-4"
                    dataSource={einsaetze}
                    loading={loading}
                    columns={columns}
                    rowKey="id"
                    rowSelection={rowSelection}
                    scroll={{
                        x: 'max-content', // Horizontales Scrollen auf kleinen Bildschirmen
                        y: 600, // Vertikales Scrollen bei vielen Einträgen
                    }}
                    pagination={paginationConfig}
                    locale={{
                        emptyText: (
                            <Empty
                                image={<PiEmpty size={48} />}
                                description="Keine Einsätze verfügbar"
                            />
                        ),
                    }}
                    onChange={(paginationConfig, filters, sorter) => {
                        // Pagination Handler
                        if (onPageChange && paginationConfig.current && paginationConfig.pageSize) {
                            onPageChange(paginationConfig.current, paginationConfig.pageSize);
                        }

                        // Filter Handler
                        if (onFilterChange) {
                            onFilterChange(filters as Record<string, React.Key[] | null>);
                        }

                        // Sorter Handler
                        if (onSortChange) {
                            onSortChange(sorter);
                        }
                    }}
                    size="middle"
                />
            </div>
        </div>
    );
}; 