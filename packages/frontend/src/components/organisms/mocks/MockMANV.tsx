import { Card, Col, Row, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';

interface Patient {
  id: number;
  name: string;
  priority: string; // rot, gelb, grün...
}

const initialData: Patient[] = [
  { id: 1, name: 'Patient A', priority: 'rot' },
  { id: 2, name: 'Patient B', priority: 'gelb' },
  { id: 3, name: 'Patient C', priority: 'grün' },
];

const Manv: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(initialData);

  const countByPriority = (priority: string) => patients.filter((p) => p.priority === priority).length;

  const columns: ColumnsType<Patient> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Triage-Stufe',
      dataIndex: 'priority',
      key: 'priority',
      render: (_text: unknown, record: Patient) => (
        <Select value={record.priority} onChange={(value) => handlePriorityChange(record.id, value)}>
          <Select.Option value="rot">Rot</Select.Option>
          <Select.Option value="gelb">Gelb</Select.Option>
          <Select.Option value="grün">Grün</Select.Option>
          <Select.Option value="schwarz">Schwarz</Select.Option>
        </Select>
      ),
    },
  ];

  const handlePriorityChange = (id: number, value: string) => {
    const updated = patients.map((p) => (p.id === id ? { ...p, priority: value } : p));
    setPatients(updated);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>MANV Dashboard</h1>
      <Row gutter={16}>
        <Col span={6}>
          <Card title="Rot" style={{ backgroundColor: '#ffccc7' }}>
            {countByPriority('rot')} Patienten
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Gelb" style={{ backgroundColor: '#ffe58f' }}>
            {countByPriority('gelb')} Patienten
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Grün" style={{ backgroundColor: '#b7eb8f' }}>
            {countByPriority('grün')} Patienten
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Schwarz" style={{ backgroundColor: '#d9d9d9' }}>
            {countByPriority('schwarz')} Patienten
          </Card>
        </Col>
      </Row>
      <Table style={{ marginTop: '1rem' }} columns={columns} dataSource={patients} rowKey="id" />
    </div>
  );
};

export default Manv;
