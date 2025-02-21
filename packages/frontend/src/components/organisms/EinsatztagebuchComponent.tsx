import { Input as AntInput, Button, Drawer, Empty, Form, InputRef, Select, Space, Table, TableColumnsType, TableColumnType, Tooltip } from 'antd';
import { format } from 'date-fns';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PiAmbulance, PiEmpty, PiMagnifyingGlass, PiPencil, PiPictureInPicture, PiPlus, PiSwap, PiTextStrikethrough, PiUser } from 'react-icons/pi';
import { twMerge } from 'tailwind-merge';

/**
 * --------------------------------
 * Types & Hilfsfunktionen
 * --------------------------------
 */

type JournalEntryType = 'USER' | 'LAGEMELDUNG' | 'RESSOURCEN' | 'BETROFFENE_PATIENTEN' | 'KORREKTUR';

/** Vereinfachte Variante deines JournalEntryDto */
interface JournalEntryDto {
    id: string;
    nummer: number;
    type: JournalEntryType;
    timestamp: number;
    createdAt: number;
    updatedAt: number;
    archived: boolean;
    sender: string;
    receiver: string;
    content: string;
}

function smallOpta(fullOpta: string) {
    const optaMatch = fullOpta.match(/(?:.*?)(\d+-\d+(?:-\d+)?)(.*)?$/);
    return optaMatch ? `${optaMatch[1]}${optaMatch[2] || ''}` : fullOpta;
}

const natoDateTime = 'dd.MM.yyyy HH:mm';

/**
 * --------------------------------
 * MOCK-HOOKS
 * --------------------------------
 * 
 * Simulieren deine originalen Hooks `useEinsatztagebuch`, `useFahrzeuge` und `useFahrzeugeItems`.
 * Hier werden lokale States & Methoden verwendet, um die Tabelle/Form zu füllen.
 */

// Mock-Fahrzeuge
const MOCK_FAHRZEUGE_IM_EINSATZ = [
    { fullOpta: 'BLA-1-19', optaFunktion: 'Rettungswagen' },
    { fullOpta: 'BLA-2-42', optaFunktion: 'ELW' },
];
const MOCK_FAHRZEUGE_VERFUEGBAR = [
    { fullOpta: 'BLA-3-11', optaFunktion: 'RTW' },
    { fullOpta: 'BLA-4-99', optaFunktion: 'MTW' },
];

// Mock-Einsatztagebuch-Einträge
const INITIAL_EINTRAEGE: JournalEntryDto[] = [
    {
        id: '1',
        nummer: 1,
        type: 'USER',
        timestamp: Date.now() - 100000,
        createdAt: Date.now() - 100000,
        updatedAt: Date.now() - 100000,
        archived: false,
        sender: 'BLA-1-19',
        receiver: 'BLA-2-42',
        content: 'Erster Testeintrag',
    },
    {
        id: '2',
        nummer: 2,
        type: 'LAGEMELDUNG',
        timestamp: Date.now() - 80000,
        createdAt: Date.now() - 80000,
        updatedAt: Date.now() - 80000,
        archived: false,
        sender: 'BLA-2-42',
        receiver: 'BLA-1-19',
        content: 'Aktuelle Lage ist stabil.',
    },
    {
        id: '3',
        nummer: 3,
        type: 'RESSOURCEN',
        timestamp: Date.now() - 50000,
        createdAt: Date.now() - 50000,
        updatedAt: Date.now() - 50000,
        archived: false,
        sender: 'BLA-3-11',
        receiver: 'BLA-1-19',
        content: 'Benötigen weitere medizinische Ausrüstung.',
    },
];

// Simuliert useEinsatztagebuch()
function useMockEinsatztagebuch() {
    const [entries, setEntries] = useState<JournalEntryDto[]>(INITIAL_EINTRAEGE);

    // Archivieren: archived = true setzen
    const archiveEinsatztagebuchEintrag = {
        mutate: (params: { nummer: number }) => {
            setEntries((prev) =>
                prev.map((entry) =>
                    entry.nummer === params.nummer ? { ...entry, archived: true, updatedAt: Date.now() } : entry
                )
            );
        },
        // Optional, falls du die Async-Version brauchst:
        mutateAsync: async (params: { nummer: number }) => {
            archiveEinsatztagebuchEintrag.mutate(params);
        },
    };

    // Neuen Eintrag hinzufügen
    const createEinsatztagebuchEintrag = {
        mutateAsync: async (newEntry: Partial<JournalEntryDto>) => {
            // Minimaler Check
            if (!newEntry.nummer) {
                newEntry.nummer = entries.length + 1;
            }
            if (!newEntry.id) {
                newEntry.id = Math.random().toString(36).substring(7);
            }

            setEntries((prev) => [
                ...prev,
                {
                    ...newEntry,
                    createdAt: newEntry.createdAt ?? Date.now(),
                    updatedAt: newEntry.updatedAt ?? Date.now(),
                    archived: false,
                } as JournalEntryDto,
            ]);
        },
    };

    // Data nach dem Schema deines Codes
    const einsatztagebuch = {
        data: {
            items: entries,
        },
    };

    return {
        einsatztagebuch,
        archiveEinsatztagebuchEintrag,
        createEinsatztagebuchEintrag,
    };
}

// Simuliert useFahrzeuge()
function useMockFahrzeuge() {
    // Data-Shape: data -> data -> fahrzeugeImEinsatz, verfuegbareFahrzeuge
    return {
        fahrzeuge: {
            data: {
                fahrzeugeImEinsatz: MOCK_FAHRZEUGE_IM_EINSATZ,
                verfuegbareFahrzeuge: MOCK_FAHRZEUGE_VERFUEGBAR,
            },
        },
    };
}

// Simuliert useFahrzeugeItems()
function useMockFahrzeugeItems(params: { include: string[] }) {
    const loading = false;

    // In der Realität filterst du hier je nach `params.include`
    const fahrzeugeImEinsatzAsItems = MOCK_FAHRZEUGE_IM_EINSATZ.map((f) => ({
        label: f.fullOpta,
        value: f.fullOpta,
    }));
    const fahrzeugeNichtImEinsatzAsItems = MOCK_FAHRZEUGE_VERFUEGBAR.map((f) => ({
        label: f.fullOpta,
        value: f.fullOpta,
    }));

    return {
        fahrzeugeAsItems: params.include.includes('fahrzeugeImEinsatz')
            ? fahrzeugeImEinsatzAsItems
            : fahrzeugeNichtImEinsatzAsItems,
        fahrzeugeImEinsatzAsItems,
        fahrzeugeNichtImEinsatzAsItems,
        loading,
    };
}

/**
 * --------------------------------
 * Hilfs-Komponenten (Header, Form)
 * --------------------------------
 */

// Minimaler Header: toggelt nur das Form
export function EinsatztagebuchHeaderComponent({
    inputVisible,
    setInputVisible,
}: {
    inputVisible: boolean;
    setInputVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    return (
        <div className="flex items-center justify-between mt-2">
            <h2 className="text-xl font-bold">Einsatztagebuch</h2>
            <Button
                onClick={() => setInputVisible(!inputVisible)}
                icon={<PiPlus />}
                type="primary"
            >
                Neuen Eintrag
            </Button>
        </div>
    );
}

/**
 * Form zum Erstellen eines neuen Eintrags
 */
export function EinsatztagebuchFormWrapperComponent({
    inputVisible,
    closeForm,
    createEinsatztagebuchEintrag,
    fahrzeugeImEinsatzAsItems,
    fahrzeugeNichtImEinsatzAsItems,
}: {
    inputVisible: boolean;
    closeForm: () => void;
    createEinsatztagebuchEintrag: {
        mutateAsync: (newEntry: Partial<JournalEntryDto>) => Promise<void>;
    };
    fahrzeugeImEinsatzAsItems: { label: string; value: string }[];
    fahrzeugeNichtImEinsatzAsItems: { label: string; value: string }[];
}) {
    const [form] = Form.useForm();

    const onFinish = async (values: JournalEntryDto) => {
        await createEinsatztagebuchEintrag.mutateAsync({
            nummer: 0, // wird in mutateAsync korrekt gesetzt
            type: values.type,
            timestamp: Date.now(),
            sender: values.sender,
            receiver: values.receiver,
            content: values.content,
        });
        form.resetFields();
        closeForm();
    };

    if (!inputVisible) return null;

    return (
        <div className="my-4 p-4 border border-gray-200 rounded">
            <h3 className="text-lg font-semibold mb-2">Neuen Eintrag erstellen</h3>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item
                    label="Typ"
                    name="type"
                    rules={[{ required: true, message: 'Bitte Typ auswählen' }]}
                >
                    <Select
                        placeholder="Typ auswählen"
                        options={[
                            { label: 'Meldung', value: 'USER' },
                            { label: 'Lagemeldung', value: 'LAGEMELDUNG' },
                            { label: 'Ressourcen', value: 'RESSOURCEN' },
                            { label: 'Betroffene | Patienten', value: 'BETROFFENE_PATIENTEN' },
                            { label: 'Korrektur', value: 'KORREKTUR' },
                        ]}
                    />
                </Form.Item>

                <Form.Item
                    label="Absender"
                    name="sender"
                    rules={[{ required: true, message: 'Bitte Absender auswählen' }]}
                >
                    <Select
                        showSearch
                        placeholder="Absender auswählen"
                        options={[
                            {
                                label: 'Fahrzeuge im Einsatz',
                                options: fahrzeugeImEinsatzAsItems ?? [],
                            },
                            {
                                label: 'Verfügbare Fahrzeuge',
                                options: fahrzeugeNichtImEinsatzAsItems ?? [],
                            },
                        ]}
                    />
                </Form.Item>

                <Form.Item
                    label="Empfänger"
                    name="receiver"
                    rules={[{ required: true, message: 'Bitte Empfänger auswählen' }]}
                >
                    <Select
                        showSearch
                        placeholder="Empfänger auswählen"
                        options={[
                            {
                                label: 'Fahrzeuge im Einsatz',
                                options: fahrzeugeImEinsatzAsItems ?? [],
                            },
                            {
                                label: 'Verfügbare Fahrzeuge',
                                options: fahrzeugeNichtImEinsatzAsItems ?? [],
                            },
                        ]}
                    />
                </Form.Item>

                <Form.Item
                    label="Inhalt"
                    name="content"
                    rules={[{ required: true, message: 'Bitte Inhalt eingeben' }]}
                >
                    <AntInput.TextArea rows={4} />
                </Form.Item>

                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit" icon={<PiPlus />}>
                            Eintrag erstellen
                        </Button>
                        <Button onClick={closeForm}>Abbrechen</Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    );
}

/**
 * --------------------------------
 * Hauptkomponente mit Mock-Daten
 * --------------------------------
 */
export function EinsatztagebuchComponent() {
    // Ersetzen deine originalen Hooks:
    const { einsatztagebuch, archiveEinsatztagebuchEintrag, createEinsatztagebuchEintrag } = useMockEinsatztagebuch();
    const { fahrzeuge } = useMockFahrzeuge();
    const {
        fahrzeugeImEinsatzAsItems,
        fahrzeugeNichtImEinsatzAsItems,
    } = useMockFahrzeugeItems({ include: ['fahrzeugeImEinsatz'] });


    // Für das Inline-Formular
    const [inputVisible, setInputVisible] = useState(false);

    // Für den Drawer (Editieren/Überschreiben)
    const [isOpen, setIsOpen] = useState(false);
    const [editingEintrag, setEditingEintrag] = useState<JournalEntryDto | null>(null);

    const parentRef = useRef<HTMLDivElement>(null);

    const onDrawerClose = useCallback(() => {
        setEditingEintrag(null);
        setIsOpen(false);
    }, []);

    const searchInput = useRef<InputRef>(null);

    // Filter/ Suche in Tabellen-Spalten
    const getColumnSearchProps = useCallback((dataIndex: keyof JournalEntryDto): TableColumnType<JournalEntryDto> => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, close }) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <AntInput
                    ref={searchInput}
                    placeholder={`Inhalt suchen`}
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => confirm()}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => confirm()}
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
        onFilter: (value, record) =>
            record[dataIndex]?.toString().toLowerCase().includes((value as string).toLowerCase()) ?? false,
        filterDropdownProps: {
            onOpenChange: (visible) => {
                if (visible) {
                    setTimeout(() => searchInput.current?.select(), 100);
                }
            },
        },
    }), []);

    const modifyEntry = useCallback((entry: JournalEntryDto) => {
        setIsOpen(true);
        setEditingEintrag(entry);
    }, []);

    const columns = useMemo<TableColumnsType<JournalEntryDto>>(() => {
        // Nur zur Demo: filtert in "fahrzeugeImEinsatz" nach optaFunktion und fullOpta
        const fahrzeugTypen = (fahrzeuge.data?.fahrzeugeImEinsatz ?? []).reduce(
            (acc: Record<string, { text: string; value: string }[]>, e: { optaFunktion: string; fullOpta: string }) => {
                if (!e.optaFunktion) return acc;
                if (!acc[e.optaFunktion]) {
                    acc[e.optaFunktion] = [];
                }
                acc[e.optaFunktion].push({ text: e.fullOpta, value: e.fullOpta });
                return acc;
            },
            {}
        );

        const rufnahmeFilter = Object.entries(fahrzeugTypen).map(([key, value]) => ({
            text: key,
            value: key,
            children: value,
        }));

        return [
            {
                title: '#',
                dataIndex: 'nummer',
                key: 'nummer',
                fixed: 'left',
                width: 60,
                sorter: (a, b) => a.nummer - b.nummer,
                sortDirections: ['ascend', 'descend', 'ascend'],
            },
            {
                title: 'Typ',
                dataIndex: 'type',
                key: 'type',
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
                            return <Tooltip title="Betroffene | Patienten"><PiPlus size={24} className="text-primary-500" /></Tooltip>;
                        case 'KORREKTUR':
                            return <Tooltip title="Korrektur"><PiPencil size={24} className="text-orange-500" /></Tooltip>;
                        default:
                            return value;
                    }
                },
                filterMultiple: true,
                onFilter: (value, record) => record.type === value,
            },
            {
                title: 'Zeitpunkt',
                key: 'timestamp',
                width: 200,
                sortDirections: ['ascend', 'descend', 'ascend'],
                sorter: (a, b) => a.timestamp - b.timestamp,
                defaultSortOrder: 'descend',
                render: (_, record) => {
                    const timestampAsNato = format(record.timestamp, natoDateTime);
                    const createdAsNato = format(record.createdAt, natoDateTime);
                    const updatedAsNato = format(record.updatedAt, natoDateTime);
                    return (
                        <>
                            <span>{timestampAsNato}</span>
                            {createdAsNato !== timestampAsNato && (
                                <span className="block text-xs text-gray-400 dark:text-gray-200/65">
                                    erstellt: {createdAsNato}
                                </span>
                            )}
                            {record.archived && (
                                <span className="block text-xs text-red-400 dark:text-red-600">
                                    gelöscht: {updatedAsNato}
                                </span>
                            )}
                        </>
                    );
                },
            },
            {
                title: 'Absender',
                dataIndex: 'sender',
                key: 'sender',
                width: 120,
                filters: rufnahmeFilter,
                onFilter: (value, record) => record.sender === value,
                filterMultiple: true,
                filterSearch: true,
                filterMode: 'tree',
                render: (value) => smallOpta(value),
            },
            {
                title: 'Empfänger',
                dataIndex: 'receiver',
                key: 'receiver',
                width: 120,
                filters: rufnahmeFilter,
                onFilter: (value, record) => record.receiver === value,
                filterMultiple: true,
                filterSearch: true,
                filterMode: 'tree',
                render: (value) => smallOpta(value),
            },
            {
                title: 'Inhalt',
                dataIndex: 'content',
                key: 'content',
                width: 400,
                render: (value, record) => (
                    <span
                        className={twMerge(
                            record.type !== 'USER' && 'text-gray-400 dark:text-gray-200/65',
                            record.archived && 'text-gray-400 line-through decoration-red-500/75 dark:text-gray-200/65'
                        )}
                    >
                        {value}
                    </span>
                ),
                ...getColumnSearchProps('content'),
            },
            {
                title: '',
                render: (_, record) => (
                    <div className="flex gap-2">
                        {!record.archived && (
                            <>
                                <Tooltip title="Eintrag überschreiben">
                                    <Button
                                        onClick={() => !isOpen && modifyEntry(record)}
                                        type="dashed"
                                        shape="circle"
                                        icon={<PiSwap />}
                                    />
                                </Tooltip>
                                <Tooltip title="Eintrag streichen">
                                    <Button
                                        onClick={() =>
                                            archiveEinsatztagebuchEintrag.mutate({ nummer: record.nummer })
                                        }
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
    }, [archiveEinsatztagebuchEintrag, fahrzeuge.data, getColumnSearchProps, isOpen, modifyEntry]);

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            {/* Header und Inline-Form */}
            <EinsatztagebuchHeaderComponent
                inputVisible={inputVisible}
                setInputVisible={setInputVisible}
            />
            <EinsatztagebuchFormWrapperComponent
                inputVisible={inputVisible}
                closeForm={() => setInputVisible(false)}
                createEinsatztagebuchEintrag={createEinsatztagebuchEintrag}
                fahrzeugeImEinsatzAsItems={fahrzeugeImEinsatzAsItems}
                fahrzeugeNichtImEinsatzAsItems={fahrzeugeNichtImEinsatzAsItems}
            />

            <div ref={parentRef} className="mt-8">
                <div className="-mx-4 sm:-mx-6 lg:-mx-8">
                    <div className="w-full py-2 align-middle sm:px-6 lg:px-8">
                        <Table
                            className="mb"
                            dataSource={einsatztagebuch.data.items}
                            rowKey={(item) => item.id}
                            columns={columns}
                            scroll={{ y: 600 }}
                            pagination={false}
                            locale={{
                                emptyText: (
                                    <Empty
                                        image={<PiEmpty size={48} />}
                                        description="Keine Einträge verfügbar"
                                    />
                                ),
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Drawer zum Bearbeiten eines Eintrags */}
            <Drawer
                open={isOpen}
                onClose={onDrawerClose}
                title={
                    editingEintrag &&
                    `Eintrag ${editingEintrag.nummer} von ${format(editingEintrag.timestamp, natoDateTime)} bearbeiten`
                }
            >
                {editingEintrag && (
                    <EditForm
                        editingEintrag={editingEintrag}
                        onClose={onDrawerClose}
                        createEinsatztagebuchEintrag={createEinsatztagebuchEintrag}
                        archiveEinsatztagebuchEintrag={archiveEinsatztagebuchEintrag}
                        fahrzeugeImEinsatzAsItems={fahrzeugeImEinsatzAsItems}
                        fahrzeugeNichtImEinsatzAsItems={fahrzeugeNichtImEinsatzAsItems}
                    />
                )}
            </Drawer>
        </div>
    );
}

/**
 * Das Bearbeitungs-Formular im Drawer.
 * Hier wird "KORREKTUR" erstellt und der alte Eintrag archiviert.
 */
function EditForm({
    editingEintrag,
    onClose,
    createEinsatztagebuchEintrag,
    archiveEinsatztagebuchEintrag,
    fahrzeugeImEinsatzAsItems,
    fahrzeugeNichtImEinsatzAsItems,
}: {
    editingEintrag: JournalEntryDto;
    onClose: () => void;
    createEinsatztagebuchEintrag: {
        mutateAsync: (newEntry: Partial<JournalEntryDto>) => Promise<void>;
    };
    archiveEinsatztagebuchEintrag: {
        mutate: (params: { nummer: number }) => void;
        mutateAsync: (params: { nummer: number }) => Promise<void>;
    };
    fahrzeugeImEinsatzAsItems: { label: string; value: string }[];
    fahrzeugeNichtImEinsatzAsItems: { label: string; value: string }[];
}) {
    const [form] = Form.useForm();

    // Initialwerte ins Form laden
    React.useEffect(() => {
        form.setFieldsValue({
            sender: editingEintrag.sender,
            receiver: editingEintrag.receiver,
            content: editingEintrag.content,
        });
    }, [editingEintrag, form]);

    const onFinish = async (values: JournalEntryDto) => {
        // "KORREKTUR"-Eintrag erstellen mit gleichem Timestamp
        await createEinsatztagebuchEintrag.mutateAsync({
            type: 'KORREKTUR',
            timestamp: editingEintrag.timestamp,
            sender: values.sender,
            receiver: values.receiver,
            content: values.content,
        });
        // Alten Eintrag archivieren
        await archiveEinsatztagebuchEintrag.mutateAsync({ nummer: editingEintrag.nummer });
        onClose();
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            style={{ marginTop: 16 }}
        >
            <Form.Item
                label="Absender"
                name="sender"
                rules={[{ required: true, message: 'Bitte Absender auswählen' }]}
            >
                <Select
                    showSearch
                    placeholder="Absender auswählen"
                    options={[
                        {
                            label: 'Fahrzeuge im Einsatz',
                            options: fahrzeugeImEinsatzAsItems ?? [],
                        },
                        {
                            label: 'Verfügbare Fahrzeuge',
                            options: fahrzeugeNichtImEinsatzAsItems ?? [],
                        },
                    ]}
                />
            </Form.Item>

            <Form.Item
                label="Empfänger"
                name="receiver"
                rules={[{ required: true, message: 'Bitte Empfänger auswählen' }]}
            >
                <Select
                    showSearch
                    placeholder="Empfänger auswählen"
                    options={[
                        {
                            label: 'Fahrzeuge im Einsatz',
                            options: fahrzeugeImEinsatzAsItems ?? [],
                        },
                        {
                            label: 'Verfügbare Fahrzeuge',
                            options: fahrzeugeNichtImEinsatzAsItems ?? [],
                        },
                    ]}
                />
            </Form.Item>

            <Form.Item label="Inhalt" name="content">
                <AntInput.TextArea rows={5} />
            </Form.Item>

            <Form.Item>
                <Space>
                    <Button type="primary" htmlType="submit" icon={<PiSwap />}>
                        Eintrag ändern
                    </Button>
                    <Button onClick={onClose}>Abbrechen</Button>
                </Space>
            </Form.Item>
        </Form>
    );
}
