import React, { useState } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, DatePicker, Switch, message, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PiPlus, PiPencil, PiTrash, PiShieldCheck, PiClock, PiGlobe } from 'react-icons/pi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi, IPWhitelistRule } from '@/api/security';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import dayjs from 'dayjs';

/**
 * IP Whitelist Manager - Verwaltung von IP-Regeln
 */
const IPWhitelistManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<IPWhitelistRule | null>(null);
  const [form] = Form.useForm();

  // Query für IP Whitelist Rules
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['ip-whitelist-rules'],
    queryFn: securityApi.getIPWhitelistRules,
  });

  // Mutation für Erstellen
  const createMutation = useMutation({
    mutationFn: securityApi.createIPWhitelistRule,
    onSuccess: () => {
      message.success('IP-Regel wurde erfolgreich erstellt');
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist-rules'] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: () => {
      message.error('Fehler beim Erstellen der IP-Regel');
    },
  });

  // Mutation für Update
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<IPWhitelistRule> }) =>
      securityApi.updateIPWhitelistRule(id, updates),
    onSuccess: () => {
      message.success('IP-Regel wurde erfolgreich aktualisiert');
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist-rules'] });
      setIsModalOpen(false);
      setEditingRule(null);
      form.resetFields();
    },
    onError: () => {
      message.error('Fehler beim Aktualisieren der IP-Regel');
    },
  });

  // Mutation für Löschen
  const deleteMutation = useMutation({
    mutationFn: securityApi.deleteIPWhitelistRule,
    onSuccess: () => {
      message.success('IP-Regel wurde erfolgreich gelöscht');
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist-rules'] });
    },
    onError: () => {
      message.error('Fehler beim Löschen der IP-Regel');
    },
  });

  // Tabellen-Spalten
  const columns: ColumnsType<IPWhitelistRule> = [
    {
      title: 'IP-Adresse/Bereich',
      key: 'ip',
      render: (_, record) => (
        <Space>
          <PiGlobe className="text-gray-400" />
          <span className="font-mono">{record.ipAddress}</span>
          {record.ipRange && <span className="text-gray-500">({record.ipRange})</span>}
        </Space>
      ),
    },
    {
      title: 'Beschreibung',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (!record.isActive) {
          return <Tag color="red">Inaktiv</Tag>;
        }
        if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
          return <Tag color="orange">Abgelaufen</Tag>;
        }
        return (
          <Tag color="green" icon={<PiShieldCheck />}>
            Aktiv
          </Tag>
        );
      },
    },
    {
      title: 'Erstellt von',
      dataIndex: 'createdBy',
      key: 'createdBy',
    },
    {
      title: 'Gültig bis',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (date) =>
        date ? (
          <Space>
            <PiClock />
            {format(new Date(date), 'dd.MM.yyyy', { locale: de })}
          </Space>
        ) : (
          <span className="text-gray-500">Unbegrenzt</span>
        ),
    },
    {
      title: 'Erstellt am',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: de }),
    },
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<PiPencil />}
            onClick={() => {
              setEditingRule(record);
              form.setFieldsValue({
                ...record,
                expiresAt: record.expiresAt ? dayjs(record.expiresAt) : undefined,
              });
              setIsModalOpen(true);
            }}
          >
            Bearbeiten
          </Button>
          <Popconfirm
            title="IP-Regel löschen?"
            description="Möchten Sie diese IP-Regel wirklich löschen?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Ja"
            cancelText="Nein"
          >
            <Button size="small" danger icon={<PiTrash />}>
              Löschen
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, updates: data });
    } else {
      createMutation.mutate({
        ...data,
        createdBy: 'Current User', // This should come from auth context
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">IP Whitelist Verwaltung</h1>
        <p className="text-gray-600">Verwalten Sie erlaubte IP-Adressen für erweiterte Sicherheitsfunktionen</p>
      </div>

      <Card>
        <div className="mb-4 flex justify-between">
          <Button
            type="primary"
            icon={<PiPlus />}
            onClick={() => {
              setEditingRule(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
          >
            Neue IP-Regel
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={rules}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} IP-Regeln gesamt`,
          }}
        />
      </Card>

      {/* IP-Regel Modal */}
      <Modal
        title={editingRule ? 'IP-Regel bearbeiten' : 'Neue IP-Regel erstellen'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingRule(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="ipAddress"
            label="IP-Adresse"
            rules={[
              { required: true, message: 'Bitte IP-Adresse eingeben' },
              {
                pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
                message: 'Bitte gültige IP-Adresse eingeben (z.B. 192.168.1.1)',
              },
            ]}
          >
            <Input placeholder="192.168.1.1" />
          </Form.Item>

          <Form.Item
            name="ipRange"
            label="IP-Bereich (CIDR-Notation)"
            rules={[
              {
                pattern: /^\/\d{1,2}$/,
                message: 'Bitte gültigen CIDR-Bereich eingeben (z.B. /24)',
              },
            ]}
          >
            <Input placeholder="/24 (optional)" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Beschreibung"
            rules={[{ required: true, message: 'Bitte Beschreibung eingeben' }]}
          >
            <Input.TextArea rows={3} placeholder="Beschreibung der IP-Regel (z.B. Büro-Netzwerk, VPN-Server)" />
          </Form.Item>

          <Form.Item name="expiresAt" label="Gültig bis">
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Unbegrenzt gültig"
              format="DD.MM.YYYY"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item name="isActive" label="Status" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Aktiv" unCheckedChildren="Inaktiv" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalOpen(false)}>Abbrechen</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRule ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IPWhitelistManager;
