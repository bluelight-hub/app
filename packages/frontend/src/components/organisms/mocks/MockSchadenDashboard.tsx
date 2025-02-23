import {
    Button,
    Card,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Select,
    Statistic,
    Table,
    Tabs,
    Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';
import { PiPlus } from 'react-icons/pi';

/**
 * Datentypen
 */
interface Personenschaden {
    id: string;
    name: string;
    verletzung?: string;
    status: 'leicht' | 'schwer' | 'kritisch';
    notizen?: string;
}

interface Sachschaden {
    id: string;
    bezeichnung: string;
    beschreibung?: string;
    schaetzwert: number;
    status: 'gemeldet' | 'in Bearbeitung' | 'abgeschlossen';
}

/** Mock-Daten (Personenschäden) */
const initialPersonen: Personenschaden[] = [
    { id: 'P-001', name: 'Max Mustermann', verletzung: 'Armfraktur', status: 'leicht' },
    { id: 'P-002', name: 'Julia Beispiel', verletzung: 'Kopfverletzung', status: 'schwer' },
];

/** Mock-Daten (Sachschäden) */
const initialSachen: Sachschaden[] = [
    { id: 'S-101', bezeichnung: 'Fahrzeugschaden', beschreibung: 'PKW Frontalschaden', schaetzwert: 3000, status: 'in Bearbeitung' },
    { id: 'S-102', bezeichnung: 'Gebäudeschaden', beschreibung: 'Eingestürztes Garagendach', schaetzwert: 1500, status: 'gemeldet' },
];

/** Mögliche Status für Personenschäden */
const statusPersonOptions = [
    { label: 'Leicht', value: 'leicht' },
    { label: 'Schwer', value: 'schwer' },
    { label: 'Kritisch', value: 'kritisch' },
];

/** Mögliche Status für Sachschäden */
const statusSachOptions = [
    { label: 'Gemeldet', value: 'gemeldet' },
    { label: 'In Bearbeitung', value: 'in Bearbeitung' },
    { label: 'Abgeschlossen', value: 'abgeschlossen' },
];

const SchadensManagement: React.FC = () => {
    // Welcher Tab ist aktiv?
    const [activeTab, setActiveTab] = useState('uebersicht');

    // Personenschaden-Stati
    const [personen, setPersonen] = useState<Personenschaden[]>(initialPersonen);
    // Sachschaden-Stati
    const [sachen, setSachen] = useState<Sachschaden[]>(initialSachen);

    // Modal-Steuerung für Personenschaden
    const [personModalOpen, setPersonModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Personenschaden | null>(null);
    const [formPerson] = Form.useForm<Personenschaden>();

    // Modal-Steuerung für Sachschaden
    const [sachModalOpen, setSachModalOpen] = useState(false);
    const [editingSach, setEditingSach] = useState<Sachschaden | null>(null);
    const [formSach] = Form.useForm<Sachschaden>();

    /**
     * Tabellen-Spalten: Personenschäden
     */
    const columnsPerson: ColumnsType<Personenschaden> = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name) => <strong>{name}</strong>,
        },
        {
            title: 'Verletzung',
            dataIndex: 'verletzung',
            key: 'verletzung',
            render: (v) => v ?? '–',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value: string) => {
                let color: string = 'blue';
                if (value === 'leicht') color = 'green';
                else if (value === 'schwer') color = 'orange';
                else if (value === 'kritisch') color = 'red';
                return <Tag color={color}>{value.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Notizen',
            dataIndex: 'notizen',
            key: 'notizen',
            ellipsis: true,
            render: (n) => n ?? '–',
        },
        {
            title: 'Aktion',
            key: 'aktion',
            render: (_, record) => (
                <div className="flex gap-2">
                    <Button size="small" onClick={() => handleEditPerson(record)}>
                        Bearbeiten
                    </Button>
                    <Button danger size="small" onClick={() => handleDeletePerson(record.id)}>
                        Löschen
                    </Button>
                </div>
            ),
        },
    ];

    /**
     * Tabellen-Spalten: Sachschäden
     */
    const columnsSach: ColumnsType<Sachschaden> = [
        {
            title: 'Bezeichnung',
            dataIndex: 'bezeichnung',
            key: 'bezeichnung',
            render: (txt) => <strong>{txt}</strong>,
        },
        {
            title: 'Beschreibung',
            dataIndex: 'beschreibung',
            key: 'beschreibung',
            ellipsis: true,
            render: (d) => d ?? '–',
        },
        {
            title: 'Schätzwert (€)',
            dataIndex: 'schaetzwert',
            key: 'schaetzwert',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value: string) => {
                let color: string = 'blue';
                if (value === 'gemeldet') color = 'green';
                else if (value === 'in Bearbeitung') color = 'orange';
                else if (value === 'abgeschlossen') color = 'red';
                return <Tag color={color}>{value.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Aktion',
            key: 'aktion',
            render: (_, record) => (
                <div className="flex gap-2">
                    <Button size="small" onClick={() => handleEditSach(record)}>
                        Bearbeiten
                    </Button>
                    <Button danger size="small" onClick={() => handleDeleteSach(record.id)}>
                        Löschen
                    </Button>
                </div>
            ),
        },
    ];

    // ----------------------------------
    // CRUD-Funktionen: Personenschäden
    // ----------------------------------

    const handleNewPerson = () => {
        setEditingPerson(null);
        formPerson.resetFields();
        setPersonModalOpen(true);
    };

    const handleEditPerson = (item: Personenschaden) => {
        setEditingPerson(item);
        formPerson.setFieldsValue(item);
        setPersonModalOpen(true);
    };

    const handleDeletePerson = (id: string) => {
        setPersonen((prev) => prev.filter((p) => p.id !== id));
        message.success('Personenschaden gelöscht');
    };

    const handleSavePerson = (values: Personenschaden) => {
        if (editingPerson) {
            // Update
            setPersonen((prev) =>
                prev.map((p) => (p.id === editingPerson.id ? { ...p, ...values } : p))
            );
            message.success('Personenschaden aktualisiert');
        } else {
            // Neu
            const newId = `P-${Math.floor(Math.random() * 10000)}`;
            const newItem: Personenschaden = { ...values, id: newId };
            setPersonen([...personen, newItem]);
            message.success('Neuer Personenschaden angelegt');
        }
        setPersonModalOpen(false);
    };

    // ----------------------------------
    // CRUD-Funktionen: Sachschäden
    // ----------------------------------

    const handleNewSach = () => {
        setEditingSach(null);
        formSach.resetFields();
        setSachModalOpen(true);
    };

    const handleEditSach = (item: Sachschaden) => {
        setEditingSach(item);
        formSach.setFieldsValue(item);
        setSachModalOpen(true);
    };

    const handleDeleteSach = (id: string) => {
        setSachen((prev) => prev.filter((s) => s.id !== id));
        message.success('Sachschaden gelöscht');
    };

    const handleSaveSach = (values: Sachschaden) => {
        if (editingSach) {
            // Update
            setSachen((prev) =>
                prev.map((s) => (s.id === editingSach.id ? { ...s, ...values } : s))
            );
            message.success('Sachschaden aktualisiert');
        } else {
            // Neu
            const newId = `S-${Math.floor(Math.random() * 10000)}`;
            const newItem: Sachschaden = { ...values, id: newId };
            setSachen([...sachen, newItem]);
            message.success('Neuer Sachschaden angelegt');
        }
        setSachModalOpen(false);
    };

    // ----------------------------------
    // Kleiner Überblick
    // ----------------------------------

    const countLeicht = personen.filter((p) => p.status === 'leicht').length;
    const countSchwer = personen.filter((p) => p.status === 'schwer').length;
    const countKritisch = personen.filter((p) => p.status === 'kritisch').length;

    const countGemeldet = sachen.filter((s) => s.status === 'gemeldet').length;
    const countInBearbeitung = sachen.filter((s) => s.status === 'in Bearbeitung').length;
    const countAbgeschlossen = sachen.filter((s) => s.status === 'abgeschlossen').length;

    // ----------------------------------
    // Render
    // ----------------------------------

    return (
        <Card title="Schadensmanagement">
            <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key)}
                items={[
                    {
                        key: 'uebersicht',
                        label: 'Übersicht',
                        children: (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card
                                    title="Personenschäden"
                                    className="shadow-sm"
                                    extra={<span className="text-gray-500">Insgesamt: {personen.length}</span>}
                                >
                                    <div className="space-y-3">
                                        <Statistic
                                            title="Leicht verletzt"
                                            value={countLeicht}
                                            valueStyle={{ color: '#52c41a' }}
                                        />
                                        <Statistic
                                            title="Schwer verletzt"
                                            value={countSchwer}
                                            valueStyle={{ color: '#faad14' }}
                                        />
                                        <Statistic
                                            title="Kritisch"
                                            value={countKritisch}
                                            valueStyle={{ color: '#f5222d' }}
                                        />
                                    </div>
                                </Card>

                                <Card
                                    title="Sachschäden"
                                    className="shadow-sm"
                                    extra={<span className="text-gray-500">Insgesamt: {sachen.length}</span>}
                                >
                                    <div className="space-y-3">
                                        <Statistic
                                            title="Gemeldet"
                                            value={countGemeldet}
                                            valueStyle={{ color: '#1890ff' }}
                                        />
                                        <Statistic
                                            title="In Bearbeitung"
                                            value={countInBearbeitung}
                                            valueStyle={{ color: '#722ed1' }}
                                        />
                                        <Statistic
                                            title="Abgeschlossen"
                                            value={countAbgeschlossen}
                                            valueStyle={{ color: '#52c41a' }}
                                        />
                                    </div>
                                </Card>
                            </div>
                        ),
                    },
                    {
                        key: 'personenschaden',
                        label: 'Personenschaden',
                        children: (
                            <>
                                <div className="mb-4 flex justify-end">
                                    <Button icon={<PiPlus />} type="primary" onClick={handleNewPerson}>
                                        Neuer Personenschaden
                                    </Button>
                                </div>
                                <Table
                                    dataSource={personen}
                                    columns={columnsPerson}
                                    rowKey="id"
                                    pagination={{ pageSize: 5 }}
                                />
                            </>
                        ),
                    },
                    {
                        key: 'sachschaden',
                        label: 'Sachschaden',
                        children: (
                            <>
                                <div className="mb-4 flex justify-end">
                                    <Button icon={<PiPlus />} type="primary" onClick={handleNewSach}>
                                        Neuer Sachschaden
                                    </Button>
                                </div>
                                <Table
                                    dataSource={sachen}
                                    columns={columnsSach}
                                    rowKey="id"
                                    pagination={{ pageSize: 5 }}
                                />
                            </>
                        ),
                    },
                ]}
            />

            {/* MODAL: Personenschaden */}
            <Modal
                title={editingPerson ? 'Personenschaden bearbeiten' : 'Neuer Personenschaden'}
                open={personModalOpen}
                onOk={() => formPerson.submit()}
                onCancel={() => setPersonModalOpen(false)}
                okText="Speichern"
                cancelText="Abbrechen"
            >
                <Form
                    form={formPerson}
                    layout="vertical"
                    onFinish={handleSavePerson}
                >
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[{ required: true, message: 'Bitte einen Namen eingeben' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label="Verletzung" name="verletzung">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Status"
                        name="status"
                        rules={[{ required: true, message: 'Bitte einen Status wählen' }]}
                    >
                        <Select options={statusPersonOptions} />
                    </Form.Item>
                    <Form.Item label="Notizen" name="notizen">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL: Sachschaden */}
            <Modal
                title={editingSach ? 'Sachschaden bearbeiten' : 'Neuer Sachschaden'}
                open={sachModalOpen}
                onOk={() => formSach.submit()}
                onCancel={() => setSachModalOpen(false)}
                okText="Speichern"
                cancelText="Abbrechen"
            >
                <Form
                    form={formSach}
                    layout="vertical"
                    onFinish={handleSaveSach}
                >
                    <Form.Item
                        label="Bezeichnung"
                        name="bezeichnung"
                        rules={[{ required: true, message: 'Bitte eine Bezeichnung eingeben' }]}
                    >
                        <Input placeholder="z.B. PKW beschädigt, Gebäudeschaden" />
                    </Form.Item>
                    <Form.Item label="Beschreibung" name="beschreibung">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item
                        label="Schätzwert (€)"
                        name="schaetzwert"
                        rules={[{ required: true, message: 'Bitte einen Schätzwert angeben' }]}
                    >
                        <InputNumber
                            min={0}
                            step={100}
                            style={{ width: '100%' }}
                            placeholder="z.B. 2000"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Status"
                        name="status"
                        rules={[{ required: true, message: 'Bitte einen Status wählen' }]}
                    >
                        <Select options={statusSachOptions} />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default SchadensManagement;