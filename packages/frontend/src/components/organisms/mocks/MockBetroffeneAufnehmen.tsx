import { Button, Form, Input, Select } from 'antd';
import React from 'react';
import { logger } from '@/utils/logger.ts';

const { Option } = Select;

interface Patient {
  name: string;
  status: 'angemeldet' | 'in Behandlung' | 'entlassen';
  priority: 'rot' | 'gelb' | 'grün';
}

const PatientsCreate: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: Patient) => {
    // hier würde man die Werte an den Server (NestJS) senden
    logger.log('Form data:', values);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Neuen Betroffenen aufnehmen</h1>
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 600 }}>
        <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Bitte einen Namen eingeben.' }]}>
          <Input />
        </Form.Item>

        <Form.Item label="Status" name="status" rules={[{ required: true, message: 'Bitte einen Status wählen.' }]}>
          <Select placeholder="Status wählen">
            <Option value="angemeldet">Angemeldet</Option>
            <Option value="in Behandlung">In Behandlung</Option>
            <Option value="entlassen">Entlassen</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Priorität" name="priority" rules={[{ required: true, message: 'Bitte Priorität wählen.' }]}>
          <Select placeholder="Priorität wählen">
            <Option value="rot">Rot</Option>
            <Option value="gelb">Gelb</Option>
            <Option value="grün">Grün</Option>
          </Select>
        </Form.Item>

        {/* Weitere Felder nach Bedarf... */}

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Speichern
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default PatientsCreate;
