import React, { useState } from 'react';
import { Button, Input, Space, Table, Tag, Modal, Form, Select, message } from 'antd';
import { PiMagnifyingGlass, PiPlus, PiPencilSimple, PiTrash } from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  organization: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

const UsersPage: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  // Mock-Daten - werden später durch API ersetzt
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'Max Mustermann',
      email: 'max.mustermann@example.com',
      role: 'admin',
      organization: 'Feuerwehr Musterstadt',
      status: 'active',
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Anna Schmidt',
      email: 'anna.schmidt@example.com',
      role: 'user',
      organization: 'DRK Musterstadt',
      status: 'active',
      createdAt: '2024-01-20',
    },
    {
      id: '3',
      name: 'Tom Weber',
      email: 'tom.weber@example.com',
      role: 'viewer',
      organization: 'THW Musterstadt',
      status: 'inactive',
      createdAt: '2024-02-01',
    },
  ]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalOpen(true);
  };

  const handleDelete = (_userId: string) => {
    Modal.confirm({
      title: 'Benutzer löschen?',
      content: 'Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?',
      okText: 'Löschen',
      okType: 'danger',
      cancelText: 'Abbrechen',
      onOk: () => {
        message.success('Benutzer wurde gelöscht');
      },
    });
  };

  const handleModalOk = () => {
    form.validateFields().then((_values) => {
      if (editingUser) {
        message.success('Benutzer wurde aktualisiert');
      } else {
        message.success('Benutzer wurde erstellt');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingUser(null);
    });
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingUser(null);
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      filteredValue: searchText ? ['filtered'] : null,
      onFilter: (_, record) =>
        record.name.toLowerCase().includes(searchText.toLowerCase()) ||
        record.email.toLowerCase().includes(searchText.toLowerCase()),
    },
    {
      title: 'E-Mail',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Rolle',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const colors = {
          admin: 'red',
          user: 'blue',
          viewer: 'default',
        };
        const labels = {
          admin: 'Administrator',
          user: 'Benutzer',
          viewer: 'Betrachter',
        };
        return <Tag color={colors[role as keyof typeof colors]}>{labels[role as keyof typeof labels]}</Tag>;
      },
      filters: [
        { text: 'Administrator', value: 'admin' },
        { text: 'Benutzer', value: 'user' },
        { text: 'Betrachter', value: 'viewer' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Organisation',
      dataIndex: 'organization',
      key: 'organization',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>{status === 'active' ? 'Aktiv' : 'Inaktiv'}</Tag>
      ),
      filters: [
        { text: 'Aktiv', value: 'active' },
        { text: 'Inaktiv', value: 'inactive' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Erstellt am',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button icon={<PiPencilSimple />} size="small" onClick={() => handleEdit(record)} />
          <Button icon={<PiTrash />} size="small" danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
        <p className="text-gray-600 mt-2">Verwalten Sie Benutzer und deren Zugriffsrechte</p>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <Input
          placeholder="Suche nach Name oder E-Mail..."
          prefix={<PiMagnifyingGlass />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Button
          type="primary"
          icon={<PiPlus />}
          onClick={() => {
            setEditingUser(null);
            form.resetFields();
            setIsModalOpen(true);
          }}
        >
          Neuer Benutzer
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Gesamt ${total} Benutzer`,
        }}
      />

      <Modal
        title={editingUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer erstellen'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Bitte Namen eingeben' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="E-Mail"
            rules={[
              { required: true, message: 'Bitte E-Mail eingeben' },
              { type: 'email', message: 'Bitte gültige E-Mail eingeben' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Rolle" rules={[{ required: true, message: 'Bitte Rolle auswählen' }]}>
            <Select>
              <Select.Option value="admin">Administrator</Select.Option>
              <Select.Option value="user">Benutzer</Select.Option>
              <Select.Option value="viewer">Betrachter</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="organization"
            label="Organisation"
            rules={[{ required: true, message: 'Bitte Organisation eingeben' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Bitte Status auswählen' }]}>
            <Select>
              <Select.Option value="active">Aktiv</Select.Option>
              <Select.Option value="inactive">Inaktiv</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
