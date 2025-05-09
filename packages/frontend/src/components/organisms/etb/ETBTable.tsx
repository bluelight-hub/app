import { formatNatoDateTime } from '@/utils/date';
import { PaginationMeta } from '@bluelight-hub/shared/client';
import { EtbEntryDto, EtbEntryDtoStatusEnum } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import type { TablePaginationConfig, TableProps } from 'antd';
import { Button, Empty, Input, InputRef, Space, Table, TableColumnsType, TableColumnType, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useMemo, useRef } from 'react';
import { PiAmbulance, PiArrowClockwiseBold, PiEmpty, PiMagnifyingGlass, PiPictureInPicture, PiPlus, PiTextStrikethrough, PiUser } from 'react-icons/pi';

/**
 * Mock-Interface für Fahrzeug-Objekte
 */
interface FahrzeugMock {
    optaFunktion: string;
    fullOpta: string;
    id: string;
}

/**
 * Props für die ETBTable-Komponente
 */
interface ETBTableProps {
    /**
     * Liste der anzuzeigenden ETB-Einträge
     */
    entries: EtbEntryDto[];
    /**
     * Fahrzeuge im Einsatz für Filteroption
     */
    fahrzeugeImEinsatz?: FahrzeugMock[];
    /**
     * Callback für die Bearbeitung eines Eintrags
     */
    onEditEntry?: (entry: EtbEntryDto) => void;
    /**
     * Callback für das Archivieren eines Eintrags
     */
    onArchiveEntry?: (nummer: number) => void;
    /**
     * Callback für das Überschreiben eines Eintrags
     */
    onUeberschreibeEntry?: (entry: EtbEntryDto) => void;
    /**
     * Gibt an, ob die Daten gerade geladen werden
     */
    isLoading?: boolean;
    /**
     * Gibt an, ob gerade ein Eintrag bearbeitet wird
     */
    isEditing?: boolean;

    /**
     * Pagination-Daten
     */
    pagination?: PaginationMeta;

    /**
     * Callback für Seitenwechsel
     */
    onPageChange?: (page: number, pageSize: number) => void;

    /**
     * Callback für Filteränderungen
     */
    onFilterChange?: (filters: Record<string, React.Key[] | null>) => void;

    /**
     * Callback für Sortieränderungen
     */
    onSorterChange?: (sorter: Parameters<NonNullable<TableProps<EtbEntryDto>["onChange"]>>[2]) => void;
}

/**
 * Tabellen-Komponente für die Desktop-Ansicht des Einsatztagebuchs
 */
export const ETBTable: React.FC<ETBTableProps> = ({
    entries = [],
    fahrzeugeImEinsatz = [],
    onArchiveEntry,
    onUeberschreibeEntry,
    isLoading = false,
    isEditing = false,
    pagination,
    onPageChange,
    onFilterChange,
    onSorterChange,
}) => {
    // Referenz für das Sucheingabefeld
    const searchInput = useRef<InputRef>(null);

    const kategorieFilter = useMemo(() => {
        const existingFilter = [
            { text: 'Meldung', value: 'USER' },
            { text: 'Lagemeldung', value: 'LAGEMELDUNG' },
            { text: 'Ressourcen', value: 'RESSOURCEN' },
            { text: 'Betroffene | Patienten', value: 'BETROFFENE_PATIENTEN' },
            { text: 'Korrektur', value: 'KORREKTUR' },
        ].filter((filter) => entries.some((entry) => entry.kategorie === filter.value));

        return existingFilter.length > 1 ? existingFilter : undefined;
    }, [entries]);

    /**
     * Konfiguration für die Suchfunktion in Tabellenspalten
     */
    const getColumnSearchProps = (dataIndex: keyof EtbEntryDto): TableColumnType<EtbEntryDto> => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, close }) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={`${dataIndex} durchsuchen`}
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => {
                        confirm();
                        // Wichtig: Führe keine lokale Filterung durch, sondern verwende den onChange-Handler der Tabelle
                    }}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => {
                            confirm();
                            // Wichtig: Führe keine lokale Filterung durch, sondern verwende den onChange-Handler der Tabelle
                        }}
                        icon={<PiMagnifyingGlass />}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Filtern
                    </Button>
                    <Button type="link" size="small" onClick={close}>
                        Abbrechen
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered: boolean) => <PiMagnifyingGlass style={{ color: filtered ? '#1677ff' : undefined }} />,
        // Entferne die lokale onFilter-Implementierung, da die Filterung server-seitig erfolgen soll
    });

    /**
     * Callback für das Überschreiben eines Eintrags
     */
    const ueberschreibeEntry = useCallback((entry: EtbEntryDto) => {
        if (onUeberschreibeEntry) {
            onUeberschreibeEntry(entry);
        }
    }, [onUeberschreibeEntry]);

    /**
     * Prüft, ob ein Eintrag überschrieben ist
     */
    const isUeberschrieben = (entry: EtbEntryDto): boolean => {
        return entry.status === EtbEntryDtoStatusEnum.Ueberschrieben;
    };

    /**
     * Definition der Tabellenspalten
     */
    const columns = useMemo<TableColumnsType<EtbEntryDto>>(() => {
        // Beispiel: rufnahmeFilter
        const fahrzeugTypen = fahrzeugeImEinsatz.reduce(
            (acc: Record<string, { text: string; value: string }[]>, e: FahrzeugMock) => {
                if (!e.optaFunktion) return acc;
                if (!acc[e.optaFunktion]) {
                    acc[e.optaFunktion] = [];
                }
                acc[e.optaFunktion].push({ text: e.fullOpta, value: e.fullOpta });
                return acc;
            },
            {} as Record<string, { text: string; value: string }[]>,
        );

        const rufnahmeFilter = Object.entries(fahrzeugTypen).map(([key, value]) => ({
            text: key,
            value: key,
            children: value,
        }));

        return [
            {
                title: '#',
                dataIndex: 'laufendeNummer',
                key: 'laufendeNummer',
                width: 80,
                sorter: (a, b) => a.laufendeNummer - b.laufendeNummer,
            },
            {
                title: 'Typ',
                dataIndex: 'kategorie',
                key: 'kategorie',
                filterSearch: kategorieFilter && kategorieFilter.length > 3 ? true : false,
                width: 80,
                filters: kategorieFilter,
                render: (value) => {
                    switch (value) {
                        case 'USER':
                            return <Tooltip title="Meldung"><PiUser size={24} className="text-primary-500" /></Tooltip>;
                        case 'LAGEMELDUNG':
                            return <Tooltip title="Lagemeldung"><PiPictureInPicture size={24} className="text-red-500" /></Tooltip>;
                        case 'RESSOURCEN':
                            return <Tooltip title="Ressourcen"><PiAmbulance size={24} className="text-primary-500" /></Tooltip>;
                        case 'BETROFFENE_PATIENTEN':
                            return <Tooltip title="Betroffene"><PiPlus size={24} className="text-primary-500" /></Tooltip>;
                        case 'KORREKTUR':
                            return <Tooltip title="Korrektur"><PiArrowClockwiseBold size={24} className="text-orange-500" /></Tooltip>;
                        default:
                            return value;
                    }
                },
            },
            {
                title: 'Status',
                key: 'status',
                width: 100,
                filters: [
                    { text: 'Aktiv', value: EtbEntryDtoStatusEnum.Aktiv },
                    { text: 'Überschrieben', value: EtbEntryDtoStatusEnum.Ueberschrieben },
                ],
                render: (_, record) => (
                    isUeberschrieben(record) ?
                        <Tag color="warning">Überschrieben</Tag> :
                        <Tag color="success">Aktiv</Tag>
                ),
            },
            {
                title: 'Zeitpunkt',
                key: 'timestampEreignis',
                width: 200,
                render: (_, record) => {
                    const timestampAsNato = formatNatoDateTime(record.timestampEreignis);
                    return <span>{timestampAsNato}</span>;
                },
                sorter: (a, b) => dayjs(a.timestampEreignis).diff(dayjs(b.timestampEreignis)),
                sortDirections: ['ascend', 'descend'],
            },
            {
                title: 'Absender',
                dataIndex: 'autorName',
                key: 'autorName',
                width: 120,
                filters: rufnahmeFilter,
            },
            {
                title: 'Empfänger',
                dataIndex: 'abgeschlossenVon',
                key: 'abgeschlossenVon',
                width: 120,
                filters: rufnahmeFilter,
            },
            {
                title: 'Inhalt',
                dataIndex: 'beschreibung',
                key: 'beschreibung',
                width: 300,
                ...getColumnSearchProps('beschreibung'),
                render: (text, record) => (
                    <div
                        className={
                            (isUeberschrieben(record) ? 'line-through text-opacity-60 ' : '') +
                            'max-w-md break-words whitespace-pre-line'
                        }
                        style={{ wordBreak: 'break-word', whiteSpace: 'pre-line' }}
                    >
                        {text}
                    </div>
                ),
            },
            {
                render: (_, record) => (
                    <div className="flex gap-2">
                        {!record.istAbgeschlossen && !isUeberschrieben(record) && (
                            <>
                                <Tooltip title="Eintrag überschreiben">
                                    <Button
                                        onClick={() => !isEditing && ueberschreibeEntry(record)}
                                        type="dashed"
                                        shape="circle"
                                        icon={<PiArrowClockwiseBold />}
                                    />
                                </Tooltip>
                                <Tooltip title="Eintrag streichen">
                                    <Button
                                        onClick={() => onArchiveEntry && onArchiveEntry(record.laufendeNummer)}
                                        type="default"
                                        danger
                                        shape="circle"
                                        icon={<PiTextStrikethrough />}
                                    />
                                </Tooltip>
                            </>
                        )}
                    </div>
                ),
                dataIndex: 'id',
                width: 150,
            },
        ];
    }, [fahrzeugeImEinsatz, isEditing, onArchiveEntry, ueberschreibeEntry, kategorieFilter]);

    return (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            <div className="w-full py-2 align-middle sm:px-6 lg:px-8">
                <Table
                    className="mb"
                    dataSource={entries}
                    loading={isLoading}
                    columns={columns}
                    rowKey="id"
                    scroll={{ x: 'max-content', y: 1000 }}
                    pagination={{
                        position: ['bottomRight', 'topRight'],
                        current: pagination?.currentPage,
                        pageSize: pagination?.itemsPerPage,
                        total: pagination?.totalItems,
                        showSizeChanger: true,
                        showTotal: (total) => `Gesamt ${total} Einträge`,
                        onChange: onPageChange,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        hideOnSinglePage: pagination?.itemsPerPage === 10,
                        showQuickJumper: true,
                        showTitle: true
                    }}
                    locale={{
                        emptyText: <Empty image={<PiEmpty size={48} />} description="Keine Einträge verfügbar" />,
                    }}
                    rowClassName={(record) => isUeberschrieben(record) ? 'opacity-60' : ''}
                    onChange={(pagination, filters, sorter) => {
                        const pageConfig = pagination as TablePaginationConfig;
                        if (typeof onPageChange === 'function') {
                            onPageChange(pageConfig.current!, pageConfig.pageSize!);
                        }
                        if (typeof onFilterChange === 'function') {
                            onFilterChange(filters as Record<string, React.Key[] | null>);
                        }
                        if (typeof onSorterChange === 'function') {
                            onSorterChange(sorter);
                        }
                    }}
                />
            </div>
        </div>
    );
}; 