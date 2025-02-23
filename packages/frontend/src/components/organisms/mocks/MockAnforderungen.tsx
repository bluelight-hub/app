import {
    Button,
    Card,
    Form,
    Input,
    message,
    Modal,
    Table,
    Tabs,
    Timeline
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';
import { PiPlus } from 'react-icons/pi';

/**
 * Typen für Anforderung & Verlaufseintrag
 */
type AnforderungsStatus = 'offen' | 'in Bearbeitung' | 'erledigt';

interface Anforderung {
    id: string;
    titel: string;
    beschreibung: string;
    status: AnforderungsStatus;
    anforderer: string;   // Wer stellt die Anforderung?
    erstelltAm: string;   // Datum/Uhrzeit
    verlauf: AnforderungVerlauf[]; // Verlaufseinträge
}

interface AnforderungVerlauf {
    timestamp: string;
    aktion: string;
    kommentar?: string;
}

/**
 * MOCK-DATEN: Bitte später durch echte API-Daten ersetzen
 */
const initialData: Anforderung[] = [
    {
        id: 'A-001',
        titel: 'Zusätzliche Einsatzkräfte',
        beschreibung: 'Benötige 5 Helfer zur Unterstützung in Abschnitt Süd',
        status: 'offen',
        anforderer: 'Abschnittsleiter Süd',
        erstelltAm: '2025-03-01 08:15',
        verlauf: [
            {
                timestamp: '2025-03-01 08:15',
                aktion: 'Anforderung erstellt',
                kommentar: 'Dringend, da steigende Patientenzahlen',
            },
        ],
    },
    {
        id: 'A-002',
        titel: 'Material: Verbandsmaterial',
        beschreibung: 'Nachschub an sterilem Verbandsmaterial',
        status: 'in Bearbeitung',
        anforderer: 'Abschnittsleiter Nord',
        erstelltAm: '2025-03-01 09:00',
        verlauf: [
            {
                timestamp: '2025-03-01 09:00',
                aktion: 'Anforderung erstellt',
            },
            {
                timestamp: '2025-03-01 09:20',
                aktion: 'Material in Vorbereitung',
                kommentar: 'Versand aus Lager in 15 Minuten',
            },
        ],
    },
];


const AnforderungenPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('uebersicht');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [anforderungen, setAnforderungen] = useState<Anforderung[]>(initialData);
    const [selectedAnforderung, setSelectedAnforderung] = useState<Anforderung | null>(null);

    const [form] = Form.useForm();

    /**
     * Spalten für die Übersichtstabelle
     */
    const columns: ColumnsType<Anforderung> = [
        {
            title: 'Titel',
            dataIndex: 'titel',
            key: 'titel',
        },
        {
            title: 'Beschreibung',
            dataIndex: 'beschreibung',
            key: 'beschreibung',
            ellipsis: true,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
        },
        {
            title: 'Anforderer',
            dataIndex: 'anforderer',
            key: 'anforderer',
        },
        {
            title: 'Erstellt am',
            dataIndex: 'erstelltAm',
            key: 'erstelltAm',
        },
        {
            title: 'Aktion',
            key: 'aktion',
            render: (_, record) => (
                <Button
                    size="small"
                    onClick={() => {
                        setSelectedAnforderung(record);
                        setActiveTab('verlauf');
                    }}
                >
                    Verlauf
                </Button>
            ),
        },
    ];

    /**
     * Öffnet das Modal, um eine neue Anforderung zu erstellen
     */
    const handleNewAnforderung = () => {
        form.resetFields();
        setIsModalOpen(true);
    };

    /**
     * Speichert eine neue Anforderung (Formular in Modal)
     */
    const handleSaveNew = (values: Anforderung) => {
        // Erstelle eine neue ID
        const newId = `A-${Math.floor(Math.random() * 10000)}`;
        const now = new Date().toISOString().slice(0, 16).replace('T', ' '); // "YYYY-MM-DD HH:mm"

        const neueAnforderung: Anforderung = {
            id: newId,
            titel: values.titel,
            beschreibung: values.beschreibung,
            status: 'offen',
            anforderer: values.anforderer,
            erstelltAm: now,
            verlauf: [
                {
                    timestamp: now,
                    aktion: 'Anforderung erstellt',
                },
            ],
        };

        setAnforderungen([...anforderungen, neueAnforderung]);
        message.success('Neue Anforderung angelegt');
        setIsModalOpen(false);

        // Optional direkt zum Verlauf wechseln:
        setSelectedAnforderung(neueAnforderung);
        setActiveTab('verlauf');
    };

    /**
     * Timeline-Ansicht für eine Anforderung
     */
    const renderVerlauf = (anf: Anforderung) => {
        return (
            <div className="p-4 bg-white rounded">
                <h3 className="text-lg font-bold mb-2">
                    Verlauf: {anf.titel} (Status: {anf.status})
                </h3>
                <Timeline>
                    {anf.verlauf.map((v, idx) => (
                        <Timeline.Item key={idx}>
                            <p className="font-semibold">{v.timestamp}</p>
                            <p>{v.aktion}</p>
                            {v.kommentar && <p className="text-gray-600">{v.kommentar}</p>}
                        </Timeline.Item>
                    ))}
                </Timeline>
            </div>
        );
    };

    return (
        <Card title="Anforderungsmanagement">
            <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key)}
                items={[
                    {
                        key: 'uebersicht',
                        label: 'Übersicht',
                        children: (
                            <>
                                <div className="flex justify-end mb-4">
                                    <Button
                                        type="primary"
                                        icon={<PiPlus />}
                                        onClick={handleNewAnforderung}
                                    >
                                        Neue Anforderung
                                    </Button>
                                </div>
                                <Table
                                    dataSource={anforderungen}
                                    columns={columns}
                                    rowKey="id"
                                    pagination={{ pageSize: 5 }}
                                />
                            </>
                        ),
                    },
                    {
                        key: 'verlauf',
                        label: 'Verlauf',
                        children: selectedAnforderung ? (
                            renderVerlauf(selectedAnforderung)
                        ) : (
                            <p className="p-4">Bitte eine Anforderung aus der Übersicht auswählen.</p>
                        ),
                    },
                ]}
            />

            {/* Modal für Neue Anforderung */}
            <Modal
                title="Neue Anforderung"
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                okText="Speichern"
                cancelText="Abbrechen"
            >
                <Form form={form} layout="vertical" onFinish={handleSaveNew}>
                    <Form.Item
                        label="Titel"
                        name="titel"
                        rules={[{ required: true, message: 'Bitte einen Titel angeben' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Beschreibung"
                        name="beschreibung"
                        rules={[{ required: true, message: 'Bitte eine Beschreibung eingeben' }]}
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item
                        label="Anforderer"
                        name="anforderer"
                        rules={[{ required: true, message: 'Bitte den Anforderer eintragen' }]}
                    >
                        <Input placeholder="z.B. Abschnittsleiter Nord" />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default AnforderungenPage;
