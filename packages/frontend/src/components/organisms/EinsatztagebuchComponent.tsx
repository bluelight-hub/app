import {
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    message,
    Modal,
    Table
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useState } from 'react';
import { formatNatoDateTime, parseNatoDateTime } from '../../utils/date';


interface EinsatztagebuchEintrag {
    id: string;
    zeitpunkt: string; // NATO-Format
    meldung: string;
    verfasser: string;
}

interface EinsatztagebuchFormValues {
    zeitpunkt: Dayjs;
    meldung: string;
    verfasser: string;
}

// Beispielhafte Initialdaten
const initialEintraege: EinsatztagebuchEintrag[] = [
    {
        id: '1',
        zeitpunkt: '151030jan25', // NATO-Format
        meldung: 'Alarmierung über Leitstelle, Verkehrsunfall mit 3 PKW',
        verfasser: 'Max Mustermann',
    },
    {
        id: '2',
        zeitpunkt: '151130jan25',
        meldung: 'Ankunft an der Einsatzstelle, Sicherung eingeleitet',
        verfasser: 'Erika Musterfrau',
    },
    {
        id: '3',
        zeitpunkt: '151230jan25',
        meldung: 'Weitere Rettungskräfte angefordert wegen 2 eingeklemmten Personen',
        verfasser: 'Max Mustermann',
    },
];

const EinsatztagebuchComponent: React.FC = () => {
    const [eintraege, setEintraege] = useState<EinsatztagebuchEintrag[]>(initialEintraege);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm<EinsatztagebuchFormValues>();
    const [editingEntry, setEditingEntry] = useState<EinsatztagebuchEintrag | null>(null);

    // Formatiert das Datum für die Anzeige
    const formatDate = (natoDate: string) => {
        try {
            const date = parseNatoDateTime(natoDate);
            return date.format('DD.MM.YYYY HH:mm');
        } catch {
            console.warn('Ungültiges Datumsformat:', natoDate);
            return natoDate;
        }
    };

    // Tabellenspalten
    const columns = [
        {
            title: 'Zeit',
            dataIndex: 'zeitpunkt',
            key: 'zeitpunkt',
            render: (zeitpunkt: string) => formatDate(zeitpunkt),
            sorter: (a: EinsatztagebuchEintrag, b: EinsatztagebuchEintrag) => {
                try {
                    return parseNatoDateTime(a.zeitpunkt).unix() - parseNatoDateTime(b.zeitpunkt).unix();
                } catch {
                    return 0;
                }
            },
            width: '20%',
        },
        {
            title: 'Meldung',
            dataIndex: 'meldung',
            key: 'meldung',
            width: '50%',
        },
        {
            title: 'Verfasser',
            dataIndex: 'verfasser',
            key: 'verfasser',
            width: '20%',
        },
        {
            title: 'Aktionen',
            key: 'actions',
            render: (_: unknown, record: EinsatztagebuchEintrag) => (
                <Button type="link" onClick={() => handleEdit(record)}>
                    Bearbeiten
                </Button>
            ),
            width: '10%',
        },
    ];

    // Modal für neuen Eintrag öffnen
    const showAddModal = () => {
        form.resetFields();
        form.setFieldsValue({
            zeitpunkt: dayjs(), // Aktueller Zeitpunkt als Vorgabe
        });
        setEditingEntry(null);
        setIsModalVisible(true);
    };

    // Bearbeitung eines vorhandenen Eintrags starten
    const handleEdit = (entry: EinsatztagebuchEintrag) => {
        setEditingEntry(entry);
        form.setFieldsValue({
            zeitpunkt: parseNatoDateTime(entry.zeitpunkt),
            meldung: entry.meldung,
            verfasser: entry.verfasser,
        });
        setIsModalVisible(true);
    };

    // Modal schließen
    const handleCancel = () => {
        setIsModalVisible(false);
    };

    // Formular speichern
    const handleSave = (values: EinsatztagebuchFormValues) => {
        // NATO-Format für das Datum erstellen
        const formattedDate = formatNatoDateTime(values.zeitpunkt, 'NATO');

        if (!formattedDate) {
            message.error('Ungültiges Datum');
            return;
        }

        if (editingEntry) {
            // Bestehenden Eintrag aktualisieren
            const updatedEintraege = eintraege.map((eintrag) =>
                eintrag.id === editingEntry.id
                    ? {
                        ...eintrag,
                        zeitpunkt: formattedDate,
                        meldung: values.meldung,
                        verfasser: values.verfasser,
                    }
                    : eintrag
            );
            setEintraege(updatedEintraege);
            message.success('Eintrag aktualisiert');
        } else {
            // Neuen Eintrag hinzufügen
            const newEntry: EinsatztagebuchEintrag = {
                id: `${Date.now()}`, // Einfache ID-Generierung
                zeitpunkt: formattedDate,
                meldung: values.meldung,
                verfasser: values.verfasser,
            };
            setEintraege([...eintraege, newEntry]);
            message.success('Eintrag hinzugefügt');
        }

        setIsModalVisible(false);
    };

    return (
        <Card
            title="Einsatztagebuch"
            extra={
                <Button type="primary" onClick={showAddModal}>
                    Neuer Eintrag
                </Button>
            }
        >
            <Table 
                columns={columns} 
                dataSource={eintraege}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                bordered
            />

            <Modal
                title={editingEntry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        name="zeitpunkt"
                        label="Zeitpunkt"
                        rules={[{ required: true, message: 'Bitte Zeitpunkt wählen' }]}
                    >
                        <DatePicker
                            showTime
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="meldung"
                        label="Meldung"
                        rules={[{ required: true, message: 'Bitte Meldung eingeben' }]}
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>

                    <Form.Item
                        name="verfasser"
                        label="Verfasser"
                        rules={[{ required: true, message: 'Bitte Verfasser eingeben' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item>
                        <div className="flex justify-end gap-2">
                            <Button onClick={handleCancel}>Abbrechen</Button>
                            <Button type="primary" htmlType="submit">
                                Speichern
                            </Button>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default EinsatztagebuchComponent;
