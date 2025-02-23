import { Card, Select, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';

type FmsStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7;
// z.B. 1 = Einsatz klar, 2 = Auf Anfahrt, 3 = Ankunft Einsatzort, 4 = Sprechwunsch, 6 = Außer Dienst, etc.
// (Definition kann variieren, je nach BOS und Land)

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
    { label: '1 - Einsatz klar', value: 1 },
    { label: '2 - Auf Anfahrt', value: 2 },
    { label: '3 - Ankunft Einsatzort', value: 3 },
    { label: '4 - Sprechwunsch', value: 4 },
    { label: '5 - ...', value: 5 },
    { label: '6 - Außer Dienst', value: 6 },
    { label: '7 - ...', value: 7 },
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
            prev.map((item) =>
                item.id === id
                    ? { ...item, status: newStatus, letzteMeldung: newTime }
                    : item
            )
        );
        message.info(`Status für Fahrzeug ${id} auf ${newStatus} geändert.`);
    };

    return (
        <Card title="FMS (Funkmeldesystem)">
            <Table
                dataSource={fmsData}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
            />
        </Card>
    );
};

export default FMS;
