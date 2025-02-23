import {
    Button,
    Card,
    Form,
    Input,
    message,
    Modal,
    Radio,
    Select,
    Table,
    Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';
import { PiPlus } from 'react-icons/pi';

/**
 * Typen für Gefahren
 * Du kannst beliebige Kategorien hinzufügen (Hochwasser, Unwetter, Gasleck, ...).
 * severity: Wie kritisch ist es? (gering, mittel, hoch, extrem?)
 * status: ob Gefahr aktiv / im Abklingen / beendet.
 */
type Severity = 'gering' | 'mittel' | 'hoch' | 'extrem';
type GefahrStatus = 'aktiv' | 'beendet' | 'in Beobachtung';

interface Gefahr {
    id: string;
    name: string;              // "Hochwasser", "Gasleck" ...
    kategorie: string;         // "Wetter", "Technische Störung", ...
    beschreibung?: string;     // Freitext
    severity: Severity;        // Wie gefährlich?
    status: GefahrStatus;      // Aktueller Zustand
}

/**
 * MOCK-DATEN
 */
const initialGefahren: Gefahr[] = [
    {
        id: 'G-001',
        name: 'Hochwasser Warnstufe 2',
        kategorie: 'Wetter',
        beschreibung: 'Pegelerhöhung um 1.5m, Deichnähe betroffen',
        severity: 'hoch',
        status: 'aktiv',
    },
    {
        id: 'G-002',
        name: 'Stromausfall in Teilregion',
        kategorie: 'Infrastruktur',
        beschreibung: 'Zwei Stadtteile ohne Strom, Techniker unterwegs',
        severity: 'mittel',
        status: 'in Beobachtung',
    },
];

const severityOptions: Severity[] = ['gering', 'mittel', 'hoch', 'extrem'];
const statusOptions: GefahrStatus[] = ['aktiv', 'beendet', 'in Beobachtung'];

const Gefahren: React.FC = () => {
    // State für alle Gefahren
    const [gefahren, setGefahren] = useState<Gefahr[]>(initialGefahren);

    // Steuerung Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Gefahr | null>(null);

    const [form] = Form.useForm<Gefahr>();

    /**
     * Übersichtszahlen - kleines Dashboard
     */
    const total = gefahren.length;
    const countAktiv = gefahren.filter((g) => g.status === 'aktiv').length;
    const countBeendet = gefahren.filter((g) => g.status === 'beendet').length;
    const countBeobachtung = gefahren.filter((g) => g.status === 'in Beobachtung').length;

    const columns: ColumnsType<Gefahr> = [
        {
            title: 'Gefahr',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: 'Kategorie',
            dataIndex: 'kategorie',
            key: 'kategorie',
            render: (kat) => kat ?? '–',
        },
        {
            title: 'Beschreibung',
            dataIndex: 'beschreibung',
            key: 'beschreibung',
            ellipsis: true,
            render: (desc) => desc ?? '–',
        },
        {
            title: 'Stufe',
            dataIndex: 'severity',
            key: 'severity',
            render: (sev: Severity) => {
                let color = 'blue';
                if (sev === 'gering') color = 'green';
                if (sev === 'mittel') color = 'gold';
                if (sev === 'hoch') color = 'red';
                if (sev === 'extrem') color = 'magenta';
                return <Tag color={color}>{sev.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (stat: GefahrStatus) => {
                switch (stat) {
                    case 'aktiv':
                        return <Tag color="volcano">AKTIV</Tag>;
                    case 'beendet':
                        return <Tag color="green">BEENDET</Tag>;
                    default:
                        return <Tag color="orange">IN BEOBACHTUNG</Tag>;
                }
            },
        },
        {
            title: 'Aktion',
            key: 'aktion',
            render: (_, record) => (
                <div className="flex gap-2">
                    <Button size="small" onClick={() => handleEdit(record)}>
                        Bearbeiten
                    </Button>
                    <Button danger size="small" onClick={() => handleDelete(record.id)}>
                        Löschen
                    </Button>
                </div>
            ),
        },
    ];

    /**
     * Neuer Eintrag
     */
    const handleNew = () => {
        setEditingItem(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    /**
     * Edit
     */
    const handleEdit = (item: Gefahr) => {
        setEditingItem(item);
        form.setFieldsValue(item);
        setIsModalOpen(true);
    };

    /**
     * Delete
     */
    const handleDelete = (id: string) => {
        setGefahren((prev) => prev.filter((g) => g.id !== id));
        message.success('Gefahr gelöscht');
    };

    /**
     * Speichern (neu oder update)
     */
    const handleSave = (values: Gefahr) => {
        if (editingItem) {
            // Update
            setGefahren((prev) =>
                prev.map((g) => (g.id === editingItem.id ? { ...g, ...values } : g))
            );
            message.success('Gefahr aktualisiert');
        } else {
            // Neu
            const newId = `G-${Math.floor(Math.random() * 10000)}`;
            const newItem: Gefahr = { ...values, id: newId };
            setGefahren([...gefahren, newItem]);
            message.success('Neue Gefahr hinzugefügt');
        }
        setIsModalOpen(false);
    };

    return (
        <Card title="Gefahrenmanagement">
            {/* Übersicht: kleine Kennzahlen zu verschiedenen Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="p-3 border rounded">
                    <p className="font-semibold text-gray-600">Aktive Gefahren</p>
                    <p className="text-2xl">{countAktiv}</p>
                </div>
                <div className="p-3 border rounded">
                    <p className="font-semibold text-gray-600">In Beobachtung</p>
                    <p className="text-2xl">{countBeobachtung}</p>
                </div>
                <div className="p-3 border rounded">
                    <p className="font-semibold text-gray-600">Beendet</p>
                    <p className="text-2xl">{countBeendet}</p>
                </div>
            </div>
            <p className="mb-4 text-sm text-gray-500">
                Insgesamt {total} Gefahr(en) erfasst.
            </p>

            {/* Tabelle */}
            <div className="flex justify-end mb-4">
                <Button type="primary" onClick={handleNew} icon={<PiPlus />}>
                    Neue Gefahr
                </Button>
            </div>
            <Table
                dataSource={gefahren}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
            />

            {/* Modal: neue / Bearbeiten */}
            <Modal
                title={editingItem ? 'Gefahr bearbeiten' : 'Neue Gefahr'}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                okText="Speichern"
                cancelText="Abbrechen"
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[{ required: true, message: 'Bitte einen Namen eingeben' }]}
                    >
                        <Input placeholder="z.B. 'Hochwasser Warnstufe 2'" />
                    </Form.Item>
                    <Form.Item label="Kategorie" name="kategorie">
                        <Input placeholder="z.B. Wetter, Infrastruktur, Chemie..." />
                    </Form.Item>
                    <Form.Item label="Beschreibung" name="beschreibung">
                        <Input.TextArea rows={2} placeholder="Kurze Details zur Gefahr" />
                    </Form.Item>
                    <Form.Item
                        label="Schweregrad"
                        name="severity"
                        initialValue="gering"
                        rules={[{ required: true, message: 'Bitte den Schweregrad wählen' }]}
                    >
                        <Radio.Group>
                            {severityOptions.map((s) => (
                                <Radio.Button key={s} value={s}>
                                    {s}
                                </Radio.Button>
                            ))}
                        </Radio.Group>
                    </Form.Item>
                    <Form.Item
                        label="Status"
                        name="status"
                        initialValue="aktiv"
                        rules={[{ required: true, message: 'Bitte einen Status wählen' }]}
                    >
                        <Select>
                            {statusOptions.map((s) => (
                                <Select.Option key={s} value={s}>
                                    {s}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default Gefahren;