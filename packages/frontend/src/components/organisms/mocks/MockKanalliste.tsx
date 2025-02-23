import { Button, Card, Form, Input, Modal, Radio, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';
import { PiPlus } from 'react-icons/pi';

type KanalStatus = 'frei' | 'belegt' | 'reserviert';

interface FunkKanal {
    id: string;
    name: string;       // z.B. "Kanal 1"
    frequenz: string;   // z.B. "123.45 MHz"
    status: KanalStatus;
    beschreibung?: string;
}

/** MOCK-DATEN */
const initialChannels: FunkKanal[] = [
    {
        id: 'CH-01',
        name: 'Kanal 1',
        frequenz: '151.200 MHz',
        status: 'frei',
        beschreibung: 'Hauptkanal Nord',
    },
    {
        id: 'CH-02',
        name: 'Kanal 2',
        frequenz: '155.600 MHz',
        status: 'belegt',
        beschreibung: 'Abschnitt Süd',
    },
    {
        id: 'CH-03',
        name: 'Kanal 3',
        frequenz: '150.000 MHz',
        status: 'reserviert',
    },
];

const statusOptions: KanalStatus[] = ['frei', 'belegt', 'reserviert'];

const Kanalliste: React.FC = () => {
    const [channels, setChannels] = useState<FunkKanal[]>(initialChannels);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChannel, setEditingChannel] = useState<FunkKanal | null>(null);

    const [form] = Form.useForm<FunkKanal>();

    const columns: ColumnsType<FunkKanal> = [
        {
            title: 'Kanal',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Frequenz',
            dataIndex: 'frequenz',
            key: 'frequenz',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
        },
        {
            title: 'Beschreibung',
            dataIndex: 'beschreibung',
            key: 'beschreibung',
            ellipsis: true,
            render: (desc) => desc ?? '–',
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

    const handleNew = () => {
        setEditingChannel(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record: FunkKanal) => {
        setEditingChannel(record);
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setChannels((prev) => prev.filter((ch) => ch.id !== id));
        message.success('Kanal gelöscht');
    };

    const handleSave = (values: FunkKanal) => {
        if (editingChannel) {
            // Update bestehender Kanal
            setChannels((prev) =>
                prev.map((c) => (c.id === editingChannel.id ? { ...values, id: editingChannel.id } : c))
            );
            message.success('Kanal aktualisiert');
        } else {
            // Neuer Kanal
            const newId = `CH-${Math.floor(Math.random() * 10000)}`;
            setChannels([...channels, { ...values, id: newId }]);
            message.success('Neuer Kanal angelegt');
        }
        setIsModalOpen(false);
    };

    return (
        <Card
            title="Kanalliste"
            extra={
                <Button type="primary" icon={<PiPlus />} onClick={handleNew}>
                    Neu
                </Button>
            }
        >
            <Table
                dataSource={channels}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
            />

            <Modal
                title={editingChannel ? 'Kanal bearbeiten' : 'Neuer Kanal'}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                okText="Speichern"
                cancelText="Abbrechen"
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        label="Kanal"
                        name="name"
                        rules={[{ required: true, message: 'Bitte Kanalnamen eingeben' }]}
                    >
                        <Input placeholder="z.B. Kanal 1" />
                    </Form.Item>
                    <Form.Item label="Frequenz" name="frequenz">
                        <Input placeholder="z.B. 151.200 MHz" />
                    </Form.Item>
                    <Form.Item
                        label="Status"
                        name="status"
                        initialValue="frei"
                        rules={[{ required: true, message: 'Bitte einen Status wählen' }]}
                    >
                        <Radio.Group>
                            {statusOptions.map((s) => (
                                <Radio.Button key={s} value={s}>
                                    {s}
                                </Radio.Button>
                            ))}
                        </Radio.Group>
                    </Form.Item>
                    <Form.Item label="Beschreibung" name="beschreibung">
                        <Input.TextArea rows={2} placeholder="Optional: z.B. Abschnitt Nord" />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default Kanalliste;
