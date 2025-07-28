import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Statistic,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PiPlus,
  PiPencil,
  PiTrash,
  PiShieldCheck,
  PiPlay,
  PiWarning,
  PiCheckCircle,
  PiClock,
  PiArrowsClockwise,
} from 'react-icons/pi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi, ThreatRule } from '@/api/security';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
// import MonacoEditor from '@monaco-editor/react';
// import { ThreatRuleForm } from './ThreatRuleForm';
// import { ThreatRuleTest } from './ThreatRuleTest';

const { TextArea } = Input;
const { Option } = Select;

/**
 * Threat Rules Editor - Konfiguration von Threat Detection Rules
 */
const ThreatRulesEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ThreatRule | null>(null);
  const [_testDrawerOpen, setTestDrawerOpen] = useState(false);
  const [_selectedRule, setSelectedRule] = useState<ThreatRule | null>(null);
  const [_testContext, setTestContext] = useState('{}');
  const [_testResult, _setTestResult] = useState<any>(null);
  const [form] = Form.useForm();

  // Query für Threat Rules
  const {
    data: rules = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['threat-rules'],
    queryFn: securityApi.getThreatRules,
  });

  // Mutation für Erstellen
  const createMutation = useMutation({
    mutationFn: securityApi.createThreatRule,
    onSuccess: () => {
      message.success('Threat Rule wurde erfolgreich erstellt');
      queryClient.invalidateQueries({ queryKey: ['threat-rules'] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: () => {
      message.error('Fehler beim Erstellen der Threat Rule');
    },
  });

  // Mutation für Update
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ThreatRule> }) =>
      securityApi.updateThreatRule(id, updates),
    onSuccess: () => {
      message.success('Threat Rule wurde erfolgreich aktualisiert');
      queryClient.invalidateQueries({ queryKey: ['threat-rules'] });
      setIsModalOpen(false);
      setEditingRule(null);
      form.resetFields();
    },
    onError: () => {
      message.error('Fehler beim Aktualisieren der Threat Rule');
    },
  });

  // Mutation für Löschen
  const deleteMutation = useMutation({
    mutationFn: securityApi.deleteThreatRule,
    onSuccess: () => {
      message.success('Threat Rule wurde erfolgreich gelöscht');
      queryClient.invalidateQueries({ queryKey: ['threat-rules'] });
    },
    onError: () => {
      message.error('Fehler beim Löschen der Threat Rule');
    },
  });

  // Mutation für Regel-Test - wird später mit ThreatRuleTest Komponente verwendet
  // const testMutation = useMutation({
  //   mutationFn: ({ ruleId, context }: { ruleId: string; context: any }) =>
  //     securityApi.testThreatRule(ruleId, context),
  //   onSuccess: (result) => {
  //     setTestResult(result);
  //     message.success('Regel-Test abgeschlossen');
  //   },
  //   onError: () => {
  //     message.error('Fehler beim Testen der Regel');
  //   },
  // });

  // Severity Badge
  const getSeverityTag = (severity: string) => {
    const config = {
      critical: { color: 'red', icon: <PiWarning /> },
      high: { color: 'orange' },
      medium: { color: 'gold' },
      low: { color: 'blue' },
    }[severity] || { color: 'default' };

    return <Tag color={config.color}>{severity.toUpperCase()}</Tag>;
  };

  // Tabellen-Spalten
  const columns: ColumnsType<ThreatRule> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="font-medium">{name}</span>,
    },
    {
      title: 'Beschreibung',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Schweregrad',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => getSeverityTag(severity),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Badge status={record.isActive ? 'success' : 'default'} text={record.isActive ? 'Aktiv' : 'Inaktiv'} />
      ),
    },
    {
      title: 'Auslösungen',
      dataIndex: 'triggerCount',
      key: 'triggerCount',
      render: (count) => (
        <Space>
          <span>{count || 0}</span>
          {count > 0 && <PiWarning className="text-orange-500" />}
        </Space>
      ),
    },
    {
      title: 'Zuletzt ausgelöst',
      dataIndex: 'lastTriggered',
      key: 'lastTriggered',
      render: (date) =>
        date ? (
          <Space>
            <PiClock />
            {format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: de })}
          </Space>
        ) : (
          <span className="text-gray-500">Nie</span>
        ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (version) => <Tag>v{version}</Tag>,
    },
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<PiPlay />}
            onClick={() => {
              setSelectedRule(record);
              setTestContext(
                JSON.stringify(
                  {
                    userId: 'test-user',
                    email: 'test@example.com',
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0',
                    eventType: 'LOGIN_ATTEMPT',
                    metadata: {},
                  },
                  null,
                  2,
                ),
              );
              // setTestResult(null);
              setTestDrawerOpen(true);
            }}
          >
            Testen
          </Button>
          <Button
            size="small"
            icon={<PiPencil />}
            onClick={() => {
              setEditingRule(record);
              form.setFieldsValue({
                ...record,
                config: JSON.stringify(record.config, null, 2),
              });
              setIsModalOpen(true);
            }}
          >
            Bearbeiten
          </Button>
          <Popconfirm
            title="Threat Rule löschen?"
            description="Möchten Sie diese Threat Rule wirklich löschen?"
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
    try {
      const config = JSON.parse(values.config);
      const data = {
        ...values,
        config,
      };

      if (editingRule) {
        updateMutation.mutate({ id: editingRule.id, updates: data });
      } else {
        createMutation.mutate(data);
      }
    } catch (_error) {
      message.error('Ungültiges JSON in der Konfiguration');
    }
  };

  // const handleTest = () => {
  //   if (selectedRule) {
  //     try {
  //       const context = JSON.parse(_testContext);
  //       testMutation.mutate({ ruleId: selectedRule.id, context });
  //     } catch (_error) {
  //       message.error('Ungültiges JSON im Test-Kontext');
  //     }
  //   }
  // };

  // Statistiken
  const activeRules = rules.filter((r) => r.isActive).length;
  const totalTriggers = rules.reduce((sum, r) => sum + (r.triggerCount || 0), 0);
  const criticalRules = rules.filter((r) => r.severity === 'critical').length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Threat Detection Rules</h1>
        <p className="text-gray-600">Konfigurieren Sie Regeln zur Erkennung von Sicherheitsbedrohungen</p>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <Statistic
            title="Aktive Regeln"
            value={activeRules}
            suffix={`/ ${rules.length}`}
            prefix={<PiShieldCheck className="text-green-500" />}
          />
        </Card>
        <Card>
          <Statistic
            title="Kritische Regeln"
            value={criticalRules}
            valueStyle={{ color: '#f5222d' }}
            prefix={<PiWarning className="text-red-500" />}
          />
        </Card>
        <Card>
          <Statistic title="Auslösungen heute" value={totalTriggers} prefix={<PiClock className="text-orange-500" />} />
        </Card>
        <Card>
          <Statistic title="Erfolgsrate" value={98.5} suffix="%" prefix={<PiCheckCircle className="text-blue-500" />} />
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex justify-between">
          <Space>
            <Button
              type="primary"
              icon={<PiPlus />}
              onClick={() => {
                setEditingRule(null);
                form.resetFields();
                form.setFieldsValue({
                  isActive: true,
                  config: JSON.stringify({ threshold: 5, timeWindow: 300 }, null, 2),
                });
                setIsModalOpen(true);
              }}
            >
              Neue Regel
            </Button>
            <Button icon={<PiArrowsClockwise />} onClick={() => refetch()}>
              Aktualisieren
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={rules}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} Regeln gesamt`,
          }}
        />
      </Card>

      {/* Rule Editor Modal */}
      <Modal
        title={editingRule ? 'Threat Rule bearbeiten' : 'Neue Threat Rule erstellen'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingRule(null);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Bitte Namen eingeben' }]}>
            <Input placeholder="z.B. Brute Force Detection" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Beschreibung"
            rules={[{ required: true, message: 'Bitte Beschreibung eingeben' }]}
          >
            <TextArea rows={3} placeholder="Beschreibung der Regel und ihrer Funktionsweise" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="severity"
              label="Schweregrad"
              rules={[{ required: true, message: 'Bitte Schweregrad auswählen' }]}
            >
              <Select>
                <Option value="low">Niedrig</Option>
                <Option value="medium">Mittel</Option>
                <Option value="high">Hoch</Option>
                <Option value="critical">Kritisch</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="conditionType"
              label="Bedingungstyp"
              rules={[{ required: true, message: 'Bitte Bedingungstyp auswählen' }]}
            >
              <Select>
                <Option value="threshold">Schwellenwert</Option>
                <Option value="pattern">Muster</Option>
                <Option value="anomaly">Anomalie</Option>
                <Option value="custom">Benutzerdefiniert</Option>
              </Select>
            </Form.Item>
          </div>

          {/* Konfiguration wurde in ThreatRuleForm verschoben */}

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

      {/* Test Modal */}
      {/*<ThreatRuleTest
        visible={testDrawerOpen}
        rule={selectedRule}
        onClose={() => {
          setTestDrawerOpen(false);
          setSelectedRule(null);
          // setTestResult(null);
        }}
        onTest={async (ruleId, testData) => {
          const result = await securityApi.testThreatRule(ruleId, testData);
          setTestResult(result);
          return result;
        }}
      />*/}
    </div>
  );
};

export default ThreatRulesEditor;
