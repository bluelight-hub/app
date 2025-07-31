import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Space, Spin, Typography } from 'antd';
import { PiTestTube } from 'react-icons/pi';
import type { ThreatRule } from '../../../../../api/security.types';

const { TextArea } = Input;
const { Text } = Typography;

interface ThreatRuleTestProps {
  visible: boolean;
  rule: ThreatRule | null;
  onClose: () => void;
  onTest: (ruleId: string, testData: Record<string, unknown>) => Promise<{ passed: boolean; details?: string }>;
}

export const ThreatRuleTest: React.FC<ThreatRuleTestProps> = ({ visible, rule, onClose, onTest }) => {
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ passed: boolean; details?: string } | null>(null);

  const handleTest = async (values: any) => {
    if (!rule) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await onTest(rule.id, values.testContext);
      setTestResult(result);
    } catch (_error) {
      setTestResult({ passed: false, details: 'Test fehlgeschlagen' });
    } finally {
      setTesting(false);
    }
  };

  const getTestContextExample = () => {
    if (!rule) return '';

    switch (rule.type) {
      case 'login_failure':
        return JSON.stringify(
          {
            ipAddress: '192.168.1.100',
            userId: 'user123',
            failedAttempts: 5,
            timeWindow: 300,
          },
          null,
          2,
        );
      case 'api_abuse':
        return JSON.stringify(
          {
            ipAddress: '10.0.0.50',
            endpoint: '/api/users',
            requestCount: 150,
            timeWindow: 60,
          },
          null,
          2,
        );
      default:
        return JSON.stringify(
          {
            ipAddress: '192.168.1.1',
            userId: 'user456',
            action: 'suspicious_action',
          },
          null,
          2,
        );
    }
  };

  return (
    <Modal
      title={
        <Space>
          <PiTestTube />
          <span>Regel testen: {rule?.name}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Schließen
        </Button>,
        <Button key="test" type="primary" icon={<PiTestTube />} loading={testing} onClick={() => form.submit()}>
          Test ausführen
        </Button>,
      ]}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleTest}>
        <Alert
          message="Test-Kontext"
          description="Geben Sie einen JSON-Kontext ein, um zu testen, ob diese Regel ausgelöst wird."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          name="testContext"
          label="Test-Daten (JSON)"
          rules={[
            { required: true, message: 'Bitte Test-Kontext eingeben' },
            {
              validator: async (_, value) => {
                try {
                  JSON.parse(value);
                  return Promise.resolve();
                } catch {
                  return Promise.reject(new Error('Ungültiges JSON-Format'));
                }
              },
            },
          ]}
          initialValue={getTestContextExample()}
        >
          <TextArea rows={10} style={{ fontFamily: 'monospace' }} />
        </Form.Item>

        {rule && (
          <Alert
            message="Regel-Bedingungen"
            description={
              <Space direction="vertical">
                {rule.conditions?.failedAttempts && (
                  <Text>• Fehlgeschlagene Versuche: {rule.conditions.failedAttempts}</Text>
                )}
                {rule.conditions?.requestCount && <Text>• Anzahl Anfragen: {rule.conditions.requestCount}</Text>}
                {rule.conditions?.timeWindow && <Text>• Zeitfenster: {rule.conditions.timeWindow} Sekunden</Text>}
              </Space>
            }
            type="warning"
            style={{ marginBottom: 16 }}
          />
        )}

        {testing && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin tip="Test wird durchgeführt..." />
          </div>
        )}

        {testResult && !testing && (
          <Alert
            message={testResult.passed ? 'Regel ausgelöst' : 'Regel nicht ausgelöst'}
            description={testResult.details || 'Test abgeschlossen'}
            type={testResult.passed ? 'success' : 'warning'}
            showIcon
          />
        )}
      </Form>
    </Modal>
  );
};
