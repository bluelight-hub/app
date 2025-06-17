import React, { useState } from 'react';
import { Button, Input, Space, Table, Tag, Modal, Form, Select, message, Card } from 'antd';
import { PiMagnifyingGlass, PiPlus, PiPencilSimple, PiTrash, PiUsersThree } from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';

interface Organization {
    id: string;
    name: string;
    type: 'feuerwehr' | 'drk' | 'thw' | 'polizei' | 'andere';
    address: string;
    contact: string;
    email: string;
    phone: string;
    status: 'active' | 'inactive';
    memberCount: number;
    createdAt: string;
}

const OrganizationsPage: React.FC = () => {
    const [searchText, setSearchText] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [form] = Form.useForm();

    // Mock-Daten - werden später durch API ersetzt
    const [organizations] = useState<Organization[]>([
        {
            id: '1',
            name: 'Feuerwehr Musterstadt',
            type: 'feuerwehr',
            address: 'Feuerwehrstraße 1, 12345 Musterstadt',
            contact: 'Max Mustermann',
            email: 'info@fw-musterstadt.de',
            phone: '0123-456789',
            status: 'active',
            memberCount: 25,
            createdAt: '2024-01-10'
        },
        {
            id: '2',
            name: 'DRK Musterstadt',
            type: 'drk',
            address: 'Rotkreuzstraße 5, 12345 Musterstadt',
            contact: 'Anna Schmidt',
            email: 'info@drk-musterstadt.de',
            phone: '0123-987654',
            status: 'active',
            memberCount: 15,
            createdAt: '2024-01-12'
        },
        {
            id: '3',
            name: 'THW Ortsverband Musterstadt',
            type: 'thw',
            address: 'THW-Platz 3, 12345 Musterstadt',
            contact: 'Tom Weber',
            email: 'ov-musterstadt@thw.de',
            phone: '0123-555555',
            status: 'active',
            memberCount: 30,
            createdAt: '2024-01-15'
        }
    ]);

    const handleEdit = (org: Organization) => {
        setEditingOrg(org);
        form.setFieldsValue(org);
        setIsModalOpen(true);
    };

    const handleDelete = (_orgId: string) => {
        Modal.confirm({
            title: 'Organisation löschen?',
            content: 'Sind Sie sicher, dass Sie diese Organisation löschen möchten? Alle zugehörigen Benutzer verlieren ihre Zuordnung.',
            okText: 'Löschen',
            okType: 'danger',
            cancelText: 'Abbrechen',
            onOk: () => {
                message.success('Organisation wurde gelöscht');
            }
        });
    };

    const handleModalOk = () => {
        form.validateFields().then(_values => {
            if (editingOrg) {
                message.success('Organisation wurde aktualisiert');
            } else {
                message.success('Organisation wurde erstellt');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingOrg(null);
        });
    };

    const handleModalCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
        setEditingOrg(null);
    };

    const typeLabels = {
        feuerwehr: 'Feuerwehr',
        drk: 'DRK',
        thw: 'THW',
        polizei: 'Polizei',
        andere: 'Andere'
    };

    const typeColors = {
        feuerwehr: 'red',
        drk: 'red',
        thw: 'blue',
        polizei: 'green',
        andere: 'default'
    };

    const columns: ColumnsType<Organization> = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            filteredValue: searchText ? ['filtered'] : null,
            onFilter: (_, record) => 
                record.name.toLowerCase().includes(searchText.toLowerCase()) ||
                record.contact.toLowerCase().includes(searchText.toLowerCase()),
        },
        {
            title: 'Typ',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => (
                <Tag color={typeColors[type as keyof typeof typeColors]}>
                    {typeLabels[type as keyof typeof typeLabels]}
                </Tag>
            ),
            filters: Object.entries(typeLabels).map(([value, text]) => ({ text, value })),
            onFilter: (value, record) => record.type === value,
        },
        {
            title: 'Ansprechpartner',
            dataIndex: 'contact',
            key: 'contact',
        },
        {
            title: 'Kontakt',
            key: 'contact_info',
            render: (_, record) => (
                <div>
                    <div className="text-sm">{record.email}</div>
                    <div className="text-sm text-gray-500">{record.phone}</div>
                </div>
            ),
        },
        {
            title: 'Mitglieder',
            dataIndex: 'memberCount',
            key: 'memberCount',
            render: (count: number) => (
                <Space>
                    <PiUsersThree />
                    {count}
                </Space>
            ),
            sorter: (a, b) => a.memberCount - b.memberCount,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'active' ? 'green' : 'default'}>
                    {status === 'active' ? 'Aktiv' : 'Inaktiv'}
                </Tag>
            ),
            filters: [
                { text: 'Aktiv', value: 'active' },
                { text: 'Inaktiv', value: 'inactive' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Aktionen',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    <Button 
                        icon={<PiPencilSimple />} 
                        size="small"
                        onClick={() => handleEdit(record)}
                    />
                    <Button 
                        icon={<PiTrash />} 
                        size="small" 
                        danger
                        onClick={() => handleDelete(record.id)}
                    />
                </Space>
            ),
        },
    ];

    const totalMembers = organizations.reduce((sum, org) => sum + org.memberCount, 0);
    const activeOrgs = organizations.filter(org => org.status === 'active').length;

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Organisationsverwaltung</h1>
                <p className="text-gray-600 mt-2">
                    Verwalten Sie Organisationen und deren Strukturen
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card size="small">
                    <div className="text-2xl font-bold">{organizations.length}</div>
                    <div className="text-gray-500">Organisationen gesamt</div>
                </Card>
                <Card size="small">
                    <div className="text-2xl font-bold text-green-600">{activeOrgs}</div>
                    <div className="text-gray-500">Aktive Organisationen</div>
                </Card>
                <Card size="small">
                    <div className="text-2xl font-bold text-blue-600">{totalMembers}</div>
                    <div className="text-gray-500">Mitglieder gesamt</div>
                </Card>
            </div>

            <div className="mb-4 flex justify-between items-center">
                <Input
                    placeholder="Suche nach Name oder Ansprechpartner..."
                    prefix={<PiMagnifyingGlass />}
                    style={{ width: 300 }}
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                />
                <Button
                    type="primary"
                    icon={<PiPlus />}
                    onClick={() => {
                        setEditingOrg(null);
                        form.resetFields();
                        setIsModalOpen(true);
                    }}
                >
                    Neue Organisation
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={organizations}
                rowKey="id"
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Gesamt ${total} Organisationen`,
                }}
            />

            <Modal
                title={editingOrg ? 'Organisation bearbeiten' : 'Neue Organisation erstellen'}
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            name="name"
                            label="Name"
                            rules={[{ required: true, message: 'Bitte Namen eingeben' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="type"
                            label="Typ"
                            rules={[{ required: true, message: 'Bitte Typ auswählen' }]}
                        >
                            <Select>
                                {Object.entries(typeLabels).map(([value, label]) => (
                                    <Select.Option key={value} value={value}>{label}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </div>
                    <Form.Item
                        name="address"
                        label="Adresse"
                        rules={[{ required: true, message: 'Bitte Adresse eingeben' }]}
                    >
                        <Input />
                    </Form.Item>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            name="contact"
                            label="Ansprechpartner"
                            rules={[{ required: true, message: 'Bitte Ansprechpartner eingeben' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="phone"
                            label="Telefon"
                            rules={[{ required: true, message: 'Bitte Telefonnummer eingeben' }]}
                        >
                            <Input />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            name="email"
                            label="E-Mail"
                            rules={[
                                { required: true, message: 'Bitte E-Mail eingeben' },
                                { type: 'email', message: 'Bitte gültige E-Mail eingeben' }
                            ]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="status"
                            label="Status"
                            rules={[{ required: true, message: 'Bitte Status auswählen' }]}
                        >
                            <Select>
                                <Select.Option value="active">Aktiv</Select.Option>
                                <Select.Option value="inactive">Inaktiv</Select.Option>
                            </Select>
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default OrganizationsPage;