import React from 'react';
import { Form, Input, Select, Switch, Space, Tag, InputNumber } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { ThreatRule } from '../../../../../api/security.types';

const { Option } = Select;
const { TextArea } = Input;

interface ThreatRuleFormProps {
  form: FormInstance;
  onFinish: (values: Partial<ThreatRule>) => void;
  loading?: boolean;
  initialValues?: Partial<ThreatRule>;
}

export const ThreatRuleForm: React.FC<ThreatRuleFormProps> = ({ form, onFinish }) => {
  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item name="name" label="Regelname" rules={[{ required: true, message: 'Bitte Regelnamen eingeben' }]}>
        <Input placeholder="z.B. Brute Force Detection" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Beschreibung"
        rules={[{ required: true, message: 'Bitte Beschreibung eingeben' }]}
      >
        <TextArea rows={3} placeholder="Beschreiben Sie, was diese Regel erkennt" />
      </Form.Item>

      <Form.Item name="type" label="Regeltyp" rules={[{ required: true, message: 'Bitte Regeltyp auswählen' }]}>
        <Select placeholder="Wählen Sie einen Regeltyp">
          <Option value="login_failure">Login-Fehler</Option>
          <Option value="api_abuse">API-Missbrauch</Option>
          <Option value="suspicious_activity">Verdächtige Aktivität</Option>
          <Option value="data_breach">Datenverletzung</Option>
          <Option value="privilege_escalation">Rechteausweitung</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="severity"
        label="Schweregrad"
        rules={[{ required: true, message: 'Bitte Schweregrad auswählen' }]}
      >
        <Select placeholder="Wählen Sie den Schweregrad">
          <Option value="low">
            <Tag color="green">Niedrig</Tag>
          </Option>
          <Option value="medium">
            <Tag color="orange">Mittel</Tag>
          </Option>
          <Option value="high">
            <Tag color="red">Hoch</Tag>
          </Option>
          <Option value="critical">
            <Tag color="red">
              <strong>Kritisch</strong>
            </Tag>
          </Option>
        </Select>
      </Form.Item>

      <Form.Item label="Bedingungen">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item
            name={['conditions', 'failedAttempts']}
            label="Fehlgeschlagene Versuche"
            style={{ marginBottom: 8 }}
          >
            <InputNumber min={1} placeholder="z.B. 5" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name={['conditions', 'requestCount']} label="Anzahl Anfragen" style={{ marginBottom: 8 }}>
            <InputNumber min={1} placeholder="z.B. 100" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name={['conditions', 'timeWindow']} label="Zeitfenster (Sekunden)" style={{ marginBottom: 8 }}>
            <InputNumber min={1} placeholder="z.B. 300" style={{ width: '100%' }} />
          </Form.Item>
        </Space>
      </Form.Item>

      <Form.Item
        name="actions"
        label="Aktionen bei Auslösung"
        rules={[{ required: true, message: 'Bitte mindestens eine Aktion auswählen' }]}
      >
        <Select mode="multiple" placeholder="Wählen Sie Aktionen">
          <Option value="block_ip">IP blockieren</Option>
          <Option value="alert_admin">Admin benachrichtigen</Option>
          <Option value="rate_limit">Rate Limit anwenden</Option>
          <Option value="log_activity">Aktivität protokollieren</Option>
          <Option value="require_2fa">2FA erzwingen</Option>
          <Option value="terminate_session">Session beenden</Option>
        </Select>
      </Form.Item>

      <Form.Item name="enabled" label="Status" valuePropName="checked" initialValue={true}>
        <Switch checkedChildren="Aktiv" unCheckedChildren="Inaktiv" />
      </Form.Item>
    </Form>
  );
};
