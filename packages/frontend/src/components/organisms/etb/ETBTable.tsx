import { EtbEntryDto } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import { Button, Empty, Input, InputRef, Space, Table, TableColumnsType, TableColumnType, Tooltip } from 'antd';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import React, { useCallback, useMemo, useRef } from 'react';
import { PiAmbulance, PiEmpty, PiMagnifyingGlass, PiPencil, PiPictureInPicture, PiPlus, PiSwap, PiTextStrikethrough, PiUser } from 'react-icons/pi';

// Mock für natoDateTime
const natoDateTime = 'dd.MM.yyyy HH:mm';

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
     * Die anzuzeigenden Einsatztagebuch-Einträge
     */
    entries: EtbEntryDto[];

    /**
     * Callback für das Bearbeiten eines Eintrags
     */
    onEditEntry?: (entry: EtbEntryDto) => void;

    /**
     * Callback für das Archivieren eines Eintrags
     */
    onArchiveEntry?: (nummer: number) => void;

    /**
     * Liste der verfügbaren Fahrzeuge im Einsatz
     */
    fahrzeugeImEinsatz?: FahrzeugMock[];

    /**
     * Gibt an, ob die Tabelle im Ladezustand ist
     */
    isLoading?: boolean;

    /**
     * Gibt an, ob ein Eintrag gerade bearbeitet wird
     */
    isEditing?: boolean;
}

/**
 * Tabellen-Komponente für die Desktop-Ansicht des Einsatztagebuchs
 */
export const ETBTable: React.FC<ETBTableProps> = ({
    entries,
    onEditEntry,
    onArchiveEntry,
    fahrzeugeImEinsatz = [],
    isLoading = false,
    isEditing = false,
}) => {
    // Referenz für das Sucheingabefeld
    const searchInput = useRef<InputRef>(null);

    /**
     * Konfiguration für die Suchfunktion in Tabellenspalten
     */
    const getColumnSearchProps = (dataIndex: keyof EtbEntryDto): TableColumnType<EtbEntryDto> => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, close }) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder="Inhalt suchen"
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => confirm()}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button type="primary" onClick={() => confirm()} icon={<PiMagnifyingGlass />} size="small" style={{ width: 90 }}>
                        Filtern
                    </Button>
                    <Button type="link" size="small" onClick={close}>
                        Abbrechen
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered: boolean) => <PiMagnifyingGlass style={{ color: filtered ? '#1677ff' : undefined }} />,
        onFilter: (value, record) =>
            record[dataIndex]
                ?.toString()
                .toLowerCase()
                .includes((value as string).toLowerCase()) ?? false,
    });

    /**
     * Callback für das Bearbeiten eines Eintrags
     */
    const modifyEntry = useCallback((entry: EtbEntryDto) => {
        if (onEditEntry) {
            onEditEntry(entry);
        }
    }, [onEditEntry]);

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
                width: 60,
                filters: [
                    { text: 'Meldung', value: 'USER' },
                    { text: 'Lagemeldung', value: 'LAGEMELDUNG' },
                    { text: 'Ressourcen', value: 'RESSOURCEN' },
                    { text: 'Betroffene | Patienten', value: 'BETROFFENE_PATIENTEN' },
                    { text: 'Korrektur', value: 'KORREKTUR' },
                ],
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
                            return <Tooltip title="Korrektur"><PiPencil size={24} className="text-orange-500" /></Tooltip>;
                        default:
                            return value;
                    }
                },
                onFilter: (value, record) => record.kategorie === value,
            },
            {
                title: 'Zeitpunkt',
                key: 'timestampEreignis',
                width: 200,
                render: (_, record) => {
                    const timestampAsNato = format(record.timestampEreignis, natoDateTime);
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
                onFilter: (value, record) => record.autorName === value,
            },
            {
                title: 'Empfänger',
                dataIndex: 'abgeschlossenVon',
                key: 'abgeschlossenVon',
                width: 120,
                filters: rufnahmeFilter,
                onFilter: (value, record) => record.abgeschlossenVon === value,
            },
            {
                title: 'Inhalt',
                dataIndex: 'beschreibung',
                key: 'beschreibung',
                width: 500,
                ...getColumnSearchProps('beschreibung'),
            },
            {
                render: (_, record) => (
                    <div className="flex gap-2">
                        {!record.istAbgeschlossen && (
                            <>
                                <Tooltip title="Eintrag überschreiben">
                                    <Button onClick={() => !isEditing && modifyEntry(record)} type="dashed" shape="circle" icon={<PiSwap />} />
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
    }, [fahrzeugeImEinsatz, isEditing, modifyEntry, onArchiveEntry]);

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
                    pagination={false}
                    locale={{
                        emptyText: <Empty image={<PiEmpty size={48} />} description="Keine Einträge verfügbar" />,
                    }}
                />
            </div>
        </div>
    );
}; 