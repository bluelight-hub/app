import { Card, message, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';

type FmsStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface FahrzeugFMS {
  id: string;
  fahrzeug: string;
  status: FmsStatus;
  letzteMeldung: string; // Datum/Zeit
}

const initialFmsData: FahrzeugFMS[] = [
  {
    id: 'V-001',
    fahrzeug: 'RTW 1',
    status: 3,
    letzteMeldung: '2025-03-01 09:10',
  },
  {
    id: 'V-002',
    fahrzeug: 'NEF 2',
    status: 2,
    letzteMeldung: '2025-03-01 09:05',
  },
  {
    id: 'V-003',
    fahrzeug: 'KTW 1',
    status: 6,
    letzteMeldung: '2025-03-01 08:50',
  },
];

const fmsOptions = [
  { label: '0 - Dringender Sprechwunsch', value: 0 },
  { label: '1 - einsatzbereit über Funk (auch Einbuchen)', value: 1 },
  { label: '2 - einsatzbereit auf Wache', value: 2 },
  { label: '3 - Einsatz übernommen / Anfahrt zum Einsatzort ("ab")', value: 3 },
  { label: '4 - Ankunft am Einsatzort ("an")', value: 4 },
  { label: '5 - Sprechwunsch', value: 5 },
  { label: '6 - nicht einsatzbereit', value: 6 },
  { label: '7 - Patient aufgenommen', value: 7 },
  { label: '8 - am Transportziel', value: 8 },
  {
    label: '9 - ./.',
    value: 9,
  },
];

const FMS: React.FC = () => {
  const [fmsData, setFmsData] = useState<FahrzeugFMS[]>(initialFmsData);

  const columns: ColumnsType<FahrzeugFMS> = [
    {
      title: 'Fahrzeug',
      dataIndex: 'fahrzeug',
      key: 'fahrzeug',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value, record) => (
        <Select
          style={{ width: 200 }}
          value={value}
          options={fmsOptions}
          onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
        />
      ),
    },
    {
      title: 'Letzte Meldung',
      dataIndex: 'letzteMeldung',
      key: 'letzteMeldung',
    },
  ];

  const handleStatusChange = (id: string, newStatus: FmsStatus) => {
    const newTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setFmsData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus, letzteMeldung: newTime } : item)),
    );
    message.info(`Status für Fahrzeug ${id} auf ${newStatus} geändert.`);
  };

  return (
    <Card title="FMS (Funkmeldesystem)">
      <Table dataSource={fmsData} columns={columns} rowKey="id" pagination={{ pageSize: 5 }} />
    </Card>
  );
};

export default FMS;
