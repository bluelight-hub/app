import { Button, Input, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import React, { useEffect, useState } from "react";

interface Patient {
    id: number;
    name: string;
    status: string;
    priority: string; // z.B. "grün", "gelb", "rot" usw.
}

const dummyData: Patient[] = [
    { id: 1, name: "Max Mustermann", status: "angemeldet", priority: "grün" },
    { id: 2, name: "Erika Mustermann", status: "in Behandlung", priority: "gelb" },
    // ... usw.
];

const PatientsOverview: React.FC = () => {
    const [data, setData] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // Hier würdest du z.B. via API (NestJS) die Daten laden
        setData(dummyData);
    }, []);

    const columns: ColumnsType<Patient> = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
        },
        {
            title: "Priorität",
            dataIndex: "priority",
            key: "priority",
        },
        // ggf. weitere Spalten
    ];

    // Filter-Handler
    const onSearch = () => {
        if (!searchTerm) {
            setData(dummyData);
        } else {
            const filtered = dummyData.filter((p) =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setData(filtered);
        }
    };

    return (
        <div style={{ padding: "1rem" }}>
            <h1>Betroffenenübersicht</h1>
            <div style={{ marginBottom: "1rem" }}>
                <Input
                    placeholder="Nach Name suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: 200, marginRight: "1rem" }}
                />
                <Button type="primary" onClick={onSearch}>
                    Suchen
                </Button>
            </div>
            <Table dataSource={data} columns={columns} rowKey="id" />
        </div>
    );
};

export default PatientsOverview;
