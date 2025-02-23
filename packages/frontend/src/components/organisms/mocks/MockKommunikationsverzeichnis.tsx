import { Button, Card, Form, Input, Modal, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';
import { PiPlus } from 'react-icons/pi';

interface Kontakt {
    id: string;
    name: string;
    funktion: string;       // z.B. "Leitstelle", "Einsatzleiter", "Presse"
    telefon?: string;
    email?: string;
    organisation?: string;  // DRK, Feuerwehr, Polizei etc.
    funkkanal?: string;     // optional
}

const initialKontakte: Kontakt[] = [
    {
        id: 'K-01',
        name: 'Leitstelle Musterstadt',
        funktion: 'Leitstelle',
        telefon: '01234-567890',
        email: 'leitstelle@musterstadt.de',
        organisation: 'Landkreis Musterstadt',
    },
    {
        id: 'K-02',
        name: 'Michael Becker',
        funktion: 'Einsatzleiter',
        telefon: '0151-2345678',
        organisation: 'DRK',
        funkkanal: 'Kanal 1',
    },
];

const Kommunikationsverzeichnis: React.FC = () => {
    const [kontakte, setKontakte] = useState<Kontakt[]>(initialKontakte);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKontakt, setEditingKontakt] = useState<Kontakt | null>(null);

    const [form] = Form.useForm<Kontakt>();

    const columns: ColumnsType<Kontakt> = [
        {
            title: 'Name / Bezeichnung',
            dataIndex: 'name',
            key: 'name',
            width: '20%',
        },
        {
            title: 'Funktion',
            dataIndex: 'funktion',
            key: 'funktion',
            width: '15%',
        },
        {
            title: 'Telefon',
            dataIndex: 'telefon',
            key: 'telefon',
            width: '15%',
            render: (tel) => tel ?? '–',
        },
        {
            title: 'E-Mail',
            dataIndex: 'email',
            key: 'email',
            width: '20%',
            render: (mail) => mail ?? '–',
        },
        {
            title: 'Organisation',
            dataIndex: 'organisation',
            key: 'organisation',
            width: '15%',
            render: (org) => org ?? '–',
        },
        {
            title: 'Funkkanal',
            dataIndex: 'funkkanal',
            key: 'funkkanal',
            width: '10%',
            render: (ch) => ch ?? '–',
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
        setEditingKontakt(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record: Kontakt) => {
        setEditingKontakt(record);
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setKontakte((prev) => prev.filter((k) => k.id !== id));
        message.success('Eintrag gelöscht');
    };

    const handleSave = (values: Kontakt) => {
        if (editingKontakt) {
            // Update
            setKontakte((prev) =>
                prev.map((k) => (k.id === editingKontakt.id ? { ...values, id: editingKontakt.id } : k))
            );
            message.success('Eintrag aktualisiert');
        } else {
            // Neu
            const newId = `K-${Math.floor(Math.random() * 10000)}`;
            setKontakte([...kontakte, { ...values, id: newId }]);
            message.success('Neuer Eintrag angelegt');
        }
        setIsModalOpen(false);
    };

    return (
        <Card
            title="Kommunikationsverzeichnis"
            extra={
                <Button type="primary" icon={<PiPlus />} onClick={handleNew}>
                    Neu
                </Button>
            }
        >
            <Table
                dataSource={kontakte}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
            />

            <Modal
                title={editingKontakt ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                okText="Speichern"
                cancelText="Abbrechen"
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        label="Name / Bezeichnung"
                        name="name"
                        rules={[{ required: true, message: 'Bitte einen Namen eingeben' }]}
                    >
                        <Input placeholder="z.B. Leitstelle Musterstadt" />
                    </Form.Item>
                    <Form.Item
                        label="Funktion / Rolle"
                        name="funktion"
                        rules={[{ required: true, message: 'Bitte eine Funktion eingeben' }]}
                    >
                        <Input placeholder="z.B. Leitstelle, Einsatzleiter, Presse..." />
                    </Form.Item>
                    <Form.Item label="Telefon" name="telefon">
                        <Input />
                    </Form.Item>
                    <Form.Item label="E-Mail" name="email">
                        <Input type="email" />
                    </Form.Item>
                    <Form.Item label="Organisation" name="organisation">
                        <Input placeholder="z.B. DRK, Feuerwehr" />
                    </Form.Item>
                    <Form.Item label="Funkkanal" name="funkkanal">
                        <Input placeholder="z.B. Kanal 1" />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default Kommunikationsverzeichnis;
